#!/bin/bash
# Ethereum Node Deployment Script
# Usage: ./deploy.sh [sync_mode] [rpc_port] [execution_image]

set -e

SYNC_MODE=${1:-"snap"}
RPC_PORT=${2:-8545}
EXEC_IMAGE=${3:-"ethereum/client-go:v1.13.15"}

echo "=== Starting Ethereum Node Deployment ==="
echo "Sync Mode: $SYNC_MODE"
echo "RPC Port: $RPC_PORT"
echo "Image: $EXEC_IMAGE"

# 1. Create directory structures
echo "[Step 1/5] Creating data directories..."
mkdir -p /srv/ethereum/geth-data
mkdir -p /srv/ethereum/consensus-data

# 2. Write docker-compose or run direct docker container
echo "[Step 2/5] Creating Docker container configurations..."
docker pull $EXEC_IMAGE

# 3. Spin up Geth client
echo "[Step 3/5] Starting Geth Execution Client container..."
if docker ps -a | grep -q "ethereum-geth"; then
    echo "Stopping and removing existing Geth container..."
    docker stop ethereum-geth || true
    docker rm ethereum-geth || true
fi

docker run -d \
  --name ethereum-geth \
  --restart unless-stopped \
  -v /srv/ethereum/geth-data:/root/.ethereum \
  -p $RPC_PORT:8545 \
  -p 30303:30303 \
  -p 30303:30303/udp \
  $EXEC_IMAGE \
  --syncmode "$SYNC_MODE" \
  --http \
  --http.addr "0.0.0.0" \
  --http.port 8545 \
  --http.api "eth,net,web3,txpool,debug" \
  --http.vhosts "*" \
  --http.corsdomain "*"

echo "[Step 4/5] Verifying execution client startup..."
sleep 5
if docker ps | grep -q "ethereum-geth"; then
    echo "Execution client is running."
else
    echo "Error: Geth container failed to start!"
    exit 1
fi

echo "[Step 5/5] Registration completed successfully!"
echo "=== Ethereum Node Deployment Completed ==="
