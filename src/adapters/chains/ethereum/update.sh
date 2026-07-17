#!/bin/bash
# Ethereum Node Update Script
set -e

EXEC_IMAGE=${1:-"ethereum/client-go:latest"}

echo "=== Updating Ethereum Geth Container ==="
docker pull $EXEC_IMAGE

if docker ps -a | grep -q "ethereum-geth"; then
    echo "Backing up running configuration..."
    # Retrieve existing ports/volumes info if needed, or simply run standard recreation
    docker stop ethereum-geth
    docker rm ethereum-geth
fi

docker run -d \
  --name ethereum-geth \
  --restart unless-stopped \
  -v /srv/ethereum/geth-data:/root/.ethereum \
  -p 8545:8545 \
  -p 30303:30303 \
  -p 30303:30303/udp \
  $EXEC_IMAGE \
  --syncmode "snap" \
  --http \
  --http.addr "0.0.0.0" \
  --http.port 8545 \
  --http.api "eth,net,web3,txpool,debug" \
  --http.vhosts "*" \
  --http.corsdomain "*"

echo "=== Geth Update Completed ==="
