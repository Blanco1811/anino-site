#!/bin/bash

# Navigate to the project root directory
cd "$(dirname "$0")/.." || exit 1

# Define backup directory and filename
BACKUP_DIR="backups"
mkdir -p "$BACKUP_DIR"
chmod 700 "$BACKUP_DIR"
FILENAME="$BACKUP_DIR/anino_db_$(date +%F_%H%M%S).sql.gz"

# Run pg_dump using the credentials from ~/.pgpass (must be pre-configured with 600 permissions)
pg_dump -U anino_user -h localhost -d anino_db | gzip > "$FILENAME"

# Verify backup was successful
if [ ${PIPESTATUS[0]} -eq 0 ] && [ -s "$FILENAME" ]; then
  echo "Backup successfully created: $FILENAME"
  # Keep only the last 30 days of backups
  find "$BACKUP_DIR" -type f -name "anino_db_*.sql.gz" -mtime +30 -delete
else
  echo "Error: Backup failed!" >&2
  rm -f "$FILENAME"
  exit 1
fi
