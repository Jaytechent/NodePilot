#!/bin/bash
# Solana Node Health Check
set -e

echo "=== Checking Solana Node Health ==="

if ! docker ps | grep -q "solana-validator"; then
    echo "STATUS: OFFLINE (Container not running)"
    exit 1
fi

BLOCK_HASH=$(curl -s -X POST -H "Content-Type: application/json" -d '{"jsonrpc":"2.0","id":1,"method":"getLatestBlockhash"}' http://localhost:8899 || echo "failed")

if [ "$BLOCK_HASH" = "failed" ]; then
    echo "STATUS: UNHEALTHY (RPC unresponsive)"
    exit 1
fi

echo "RPC: RESPONDING"
echo "STATUS: HEALTHY"
