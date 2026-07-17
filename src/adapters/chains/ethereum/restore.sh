#!/bin/bash
# Ethereum Node Restore Script
set -e

BACKUP_PATH=$1

if [ -z "$BACKUP_PATH" ]; then
    echo "Error: No backup path provided!"
    echo "Usage: ./restore.sh /path/to/backup.tar.gz"
    exit 1
fi

if [ ! -f "$BACKUP_PATH" ]; then
    echo "Error: Backup file $BACKUP_PATH does not exist!"
    exit 1
fi

echo "=== Restoring Geth Database ==="
echo "Stopping ethereum-geth container..."
docker stop ethereum-geth || true

echo "Wiping existing Geth chaindata..."
rm -rf /srv/ethereum/geth-data/geth/chaindata

echo "Extracting backup archive $BACKUP_PATH..."
mkdir -p /srv/ethereum/geth-data/geth
tar -xzf $BACKUP_PATH -C /srv/ethereum/geth-data/geth

echo "Restarting ethereum-geth container..."
docker start ethereum-geth

echo "=== Geth Restore Completed successfully ==="
