
require("dotenv").config();

const express = require("express");
const { Pool } = require("pg");
const { createClient } = require("redis");

const app = express();
app.use(express.json());

const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    });

    const redis = createClient({
    url: process.env.REDIS_URL,
    });

    redis.on("error", (err) => console.error("Redis error:", err));

    const PORT = process.env.PORT || 3000;

    async function start() {
    await redis.connect();

    await pool.query(`
        CREATE TABLE IF NOT EXISTS books (
        id SERIAL PRIMARY KEY,
        name VARCHAR(255) NOT NULL,
        author VARCHAR(255) NOT NULL,
        date_published DATE,
        page_count INTEGER CHECK (page_count > 0),
        category VARCHAR(100)
        )
    `);

    app.get("/books", async (req, res, next) => {
        try {
        const cached = await redis.get("books:all");

        if (cached) {
            return res.json(JSON.parse(cached));
        }

        const { rows } = await pool.query(
            "SELECT * FROM books ORDER BY id"
        );

        await redis.set("books:all", JSON.stringify(rows), {
            EX: 60,
        });

        res.json(rows);
        } catch (err) {
        next(err);
        }
    });

    app.get("/books/:id", async (req, res, next) => {
        try {
        const id = Number(req.params.id);

        if (!Number.isInteger(id) || id < 1) {
            return res.status(400).json({ error: "Invalid book ID" });
        }

        const key = `books:${id}`;
        const cached = await redis.get(key);

        if (cached) {
            return res.json(JSON.parse(cached));
        }

        const { rows } = await pool.query(
            "SELECT * FROM books WHERE id = $1",
            [id]
        );

        if (!rows.length) {
            return res.status(404).json({ error: "Book not found" });
        }

        await redis.set(key, JSON.stringify(rows[0]), { EX: 60 });
        res.json(rows[0]);
        } catch (err) {
        next(err);
        }
    });

    app.post("/books", async (req, res, next) => {
        try {
        const { name, author, date_published, page_count, category } =
            req.body;

        if (!name?.trim() || !author?.trim()) {
            return res.status(400).json({
            error: "Name and author are required",
            });
        }

        if (
            page_count != null &&
            (!Number.isInteger(page_count) || page_count < 1)
        ) {
            return res.status(400).json({
            error: "page_count must be a positive integer",
            });
        }

        const { rows } = await pool.query(
            `INSERT INTO books
            (name, author, date_published, page_count, category)
            VALUES ($1, $2, $3, $4, $5)
            RETURNING *`,
            [name.trim(), author.trim(), date_published || null,
            page_count ?? null, category ?? null]
        );

        await redis.del("books:all");
        res.status(201).json(rows[0]);
        } catch (err) {
        next(err);
        }
    });

    app.patch("/books/:id", async (req, res, next) => {
        try {
        const id = Number(req.params.id);

        if (!Number.isInteger(id) || id < 1) {
            return res.status(400).json({ error: "Invalid book ID" });
        }

        const allowed = [
            "name", "author", "date_published", "page_count", "category",
        ];

        const entries = Object.entries(req.body);

        if (!entries.length || entries.some(([key]) => !allowed.includes(key))) {
            return res.status(400).json({ error: "Invalid or empty fields" });
        }

        if (
            ("name" in req.body && !req.body.name?.trim()) ||
            ("author" in req.body && !req.body.author?.trim())
        ) {
            return res.status(400).json({ error: "Name and author cannot be empty" });
        }

        if (
            "page_count" in req.body &&
            req.body.page_count != null &&
            (!Number.isInteger(req.body.page_count) || req.body.page_count < 1)
        ) {
            return res.status(400).json({ error: "Invalid page_count" });
        }

        const values = entries.map(([key, value]) =>
            ["name", "author"].includes(key) ? value.trim() : value
        );
        const setClause = entries
            .map(([key], i) => `"${key}" = $${i + 1}`)
            .join(", ");

        const { rows } = await pool.query(
            `UPDATE books SET ${setClause}
            WHERE id = $${values.length + 1} RETURNING *`,
            [...values, id]
        );

        if (!rows.length) {
            return res.status(404).json({ error: "Book not found" });
        }

        await redis.del("books:all", `books:${id}`);
        res.json(rows[0]);
        } catch (err) {
        next(err);
        }
    });

    app.delete("/books/:id", async (req, res, next) => {
        try {
        const id = Number(req.params.id);

        if (!Number.isInteger(id) || id < 1) {
            return res.status(400).json({ error: "Invalid book ID" });
        }

        const { rows } = await pool.query(
            "DELETE FROM books WHERE id = $1 RETURNING id",
            [id]
        );

        if (!rows.length) {
            return res.status(404).json({ error: "Book not found" });
        }

        await redis.del("books:all", `books:${id}`);
        res.status(204).end();
        } catch (err) {
        next(err);
        }
    });

    app.get("/health", (req, res) => res.json({ status: "ok" }));

    app.use((err, req, res, next) => {
        console.error(err);
        res.status(500).json({ error: "Internal server error" });
    });

    app.listen(PORT, "0.0.0.0", () => {
        console.log(`API listening on port ${PORT}`);
    });
}

start().catch((err) => {
    console.error("Startup failed:", err);
    process.exit(1);
});
