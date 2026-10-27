
# Stage 1: Install dependencies
FROM node:22-alpine AS build

WORKDIR /app

COPY package.json package-lock.json ./
RUN npm ci

COPY src ./src


# Stage 2: Production image
FROM node:22-alpine AS production

ENV NODE_ENV=production
WORKDIR /app

# Create an unprivileged application user
RUN addgroup -S appgroup && \
    adduser -S appuser -G appgroup

# Install only production dependencies
COPY package.json package-lock.json ./
RUN npm ci --omit=dev && npm cache clean --force

# Copy application files with the correct ownership
COPY --from=build --chown=appuser:appgroup /app/src ./src

# Make the application directory owned by the app user
RUN chown -R appuser:appgroup /app

USER appuser

EXPOSE 3000

CMD ["node", "src/app.js"]
