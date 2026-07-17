#!/bin/bash
# Solana Node Deployment Script
set -e

RPC_PORT=${1:-8899}
IMAGE=${2:-"solanalabs/solana:v1.18.11"}

echo "=== Deploying Solana Node ==="
echo "RPC Port: $RPC_PORT"
echo "Image: $IMAGE"

mkdir -p /srv/solana/ledger
mkdir -p /srv/solana/accounts

docker pull $IMAGE

if docker ps -a | grep -q "solana-validator"; then
    docker stop solana-validator || true
    docker rm solana-validator || true
fi

docker run -d \
  --name solana-validator \
  --restart unless-stopped \
  -v /srv/solana/ledger:/ledger \
  -v /srv/solana/accounts:/accounts \
  -p $RPC_PORT:8899 \
  -p 8000-8020:8000-8020 \
  $IMAGE \
  solana-validator \
  --ledger /ledger \
  --accounts /accounts \
  --rpc-port 8899 \
  --dynamic-port-range 8000-8020 \
  --entrypoint entrypoint.mainnet-beta.solana.com:8001 \
  --expected-genesis-hash 5eykt4UsFv8P8NJdZO528A739QfA3eF186Sg5A9st7Qs \
  --no-voting \
  --limit-ledger-size 50000000

echo "=== Solana Node Deployed successfully ==="
