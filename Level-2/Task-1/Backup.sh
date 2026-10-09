#!/bin/bash

set -euo pipefail

BACKUP_DIR="/home/karem/web-server"
OUTPUT_DIR="/home/karem/backups"
FORMATTED_DATE=$(date +%Y-%m-%d)
OUTPUT_FILE="${OUTPUT_DIR}/${FORMATTED_DATE}.tar.gz"

echo "Starting backup of ${BACKUP_DIR}..."

mkdir -p "${OUTPUT_DIR}"

tar -czvf "${OUTPUT_FILE}" "${BACKUP_DIR}"

echo "Backup finished successfully: ${OUTPUT_FILE}"

~
~
~
~
