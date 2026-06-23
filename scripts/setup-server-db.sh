#!/bin/bash
# setup-server-db.sh
# Automates setting up PostgreSQL, user, database, backups, and verification on the staging server for ANINO.

set -e

echo "============================================="
echo " ANINO PostgreSQL Server Setup & Verification"
echo "============================================="

# Ensure run as root
if [ "$EUID" -ne 0 ]; then
  echo "Please run as root or using sudo!" >&2
  exit 1
fi

# Step 1: Install PostgreSQL if not installed
if ! command -v psql &> /dev/null; then
  echo "[-] PostgreSQL is not installed. Installing..."
  apt-get update
  apt-get install -y postgresql postgresql-contrib
else
  echo "[+] PostgreSQL is already installed."
fi

# Ensure PostgreSQL service is running
systemctl enable postgresql --now

# Step 2: Generate a strong random password for the database user
DB_USER="anino_user"
DB_NAME="anino_db"
DB_PASS=$(openssl rand -hex 24)

echo "[+] Creating PostgreSQL user '$DB_USER' and database '$DB_NAME'..."

# Create user and database
sudo -u postgres psql -c "CREATE USER $DB_USER WITH PASSWORD '$DB_PASS';" || echo "User may already exist, proceeding..."
sudo -u postgres psql -c "ALTER USER $DB_USER WITH PASSWORD '$DB_PASS';"
sudo -u postgres psql -c "CREATE DATABASE $DB_NAME OWNER $DB_USER;" || echo "Database may already exist, proceeding..."
sudo -u postgres psql -c "GRANT ALL PRIVILEGES ON DATABASE $DB_NAME TO $DB_USER;"

# Step 3: Configure PostgreSQL to only listen on localhost
PG_CONF_DIR=$(sudo -u postgres psql -t -A -c "show config_file;")
PG_CONF_PATH=$(dirname "$PG_CONF_DIR")

echo "[+] Verifying PostgreSQL is bound to localhost only..."
# In postgresql.conf, listen_addresses should be 'localhost'
if grep -q "^listen_addresses" "$PG_CONF_PATH/postgresql.conf"; then
  sed -i "s/^listen_addresses.*/listen_addresses = 'localhost'/" "$PG_CONF_PATH/postgresql.conf"
else
  echo "listen_addresses = 'localhost'" >> "$PG_CONF_PATH/postgresql.conf"
fi

# Restart PostgreSQL to apply bind changes
systemctl restart postgresql

# Step 4: Create backups folder with appropriate permissions
BACKUP_DIR="/home/anino-site/backups"
echo "[+] Creating backup directory at $BACKUP_DIR..."
mkdir -p "$BACKUP_DIR"
chmod 700 "$BACKUP_DIR"

# Step 5: Perform a test backup
echo "[+] Performing a test backup of '$DB_NAME'..."
TEST_BACKUP_FILE="$BACKUP_DIR/test_backup_$(date +%s).sql.gz"

# We use PGPWORD here locally to run the test backup
PGPASSWORD="$DB_PASS" pg_dump -U "$DB_USER" -h localhost -d "$DB_NAME" | gzip > "$TEST_BACKUP_FILE"

if [ -s "$TEST_BACKUP_FILE" ]; then
  echo "[+] Test backup created successfully: $TEST_BACKUP_FILE"
else
  echo "[-] Test backup failed or file is empty!" >&2
  exit 1
fi

# Step 6: Perform a test restore to a temporary database to verify integrity
TEST_TEMP_DB="anino_test_restore_db"
echo "[+] Creating temporary database '$TEST_TEMP_DB' for restore test..."
sudo -u postgres psql -c "DROP DATABASE IF EXISTS $TEST_TEMP_DB;"
sudo -u postgres psql -c "CREATE DATABASE $TEST_TEMP_DB OWNER $DB_USER;"

echo "[+] Performing test restore of '$TEST_BACKUP_FILE' into '$TEST_TEMP_DB'..."
gunzip -c "$TEST_BACKUP_FILE" | PGPASSWORD="$DB_PASS" psql -U "$DB_USER" -h localhost -d "$TEST_TEMP_DB"

# Check if restore succeeded by listing tables (should have no errors)
echo "[+] Verifying restore integrity..."
sudo -u postgres psql -d "$TEST_TEMP_DB" -c "\dt"

# Cleanup temporary database and test backup file
sudo -u postgres psql -c "DROP DATABASE $TEST_TEMP_DB;"
rm -f "$TEST_BACKUP_FILE"
echo "[+] Restore test succeeded and temporary database cleaned up."

# Step 7: Setup the daily backup cron job
CRON_JOB="0 2 * * * /bin/bash /home/anino-site/scripts/backup-db.sh > /dev/null 2>&1"
# Let's check if the cron job is already installed
(crontab -l 2>/dev/null | grep -F "backup-db.sh") || (crontab -l 2>/dev/null; echo "$CRON_JOB") | crontab -
echo "[+] Daily backup cron job registered successfully."

echo "============================================="
echo " SETUP COMPLETED SUCCESSFULLY"
echo "============================================="
echo "Add the following DATABASE_URL to your server .env file:"
echo "DATABASE_URL=\"postgresql://$DB_USER:$DB_PASS@localhost:5432/$DB_NAME?schema=public\""
echo "============================================="
