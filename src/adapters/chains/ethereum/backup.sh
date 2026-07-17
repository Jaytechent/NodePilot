#!/bin/bash
# Ethereum Node Backup Script
set -e

BACKUP_DIR="/var/backups/ethereum"
TIMESTAMP=$(date +%Y%m%d%H%M%S)
BACKUP_PATH="$BACKUP_DIR/geth_backup_$TIMESTAMP.tar.gz"

echo "=== Starting Geth State Backup ==="
mkdir -p $BACKUP_DIR

# Pause the container briefly to avoid dirty database reads
echo "Pausing ethereum-geth container..."
docker pause ethereum-geth

echo "Creating compressed tarball of /srv/ethereum/geth-data/geth/chaindata..."
tar -czf $BACKUP_PATH -C /srv/ethereum/geth-data/geth chaindata

echo "Unpausing ethereum-geth container..."
docker unpause ethereum-geth

echo "BACKUP_FILE: $BACKUP_PATH"
echo "=== Geth Backup Completed ==="
