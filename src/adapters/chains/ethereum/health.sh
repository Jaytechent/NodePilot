#!/bin/bash
# Ethereum Node Health Check Script
set -e

echo "=== Ethereum Node Health Status ==="

# Check container status
if ! docker ps | grep -q "ethereum-geth"; then
    echo "STATUS: OFFLINE (Container ethereum-geth is not running)"
    exit 1
fi

# Request RPC sync status
SYNC_RES=$(curl -s -X POST -H "Content-Type: application/json" --data '{"jsonrpc":"2.0","method":"eth_syncing","params":[],"id":1}' http://localhost:8545 || echo "failed")

if [ "$SYNC_RES" = "failed" ]; then
    echo "STATUS: UNHEALTHY (RPC port 8545 unresponsive)"
    exit 1
fi

echo "RPC: RESPONDING"
if echo "$SYNC_RES" | grep -q "false"; then
    echo "SYNC_STATUS: FULLY_SYNCED"
else
    echo "SYNC_STATUS: SYNCING"
fi

# Request Peer Count
PEER_HEX=$(curl -s -X POST -H "Content-Type: application/json" --data '{"jsonrpc":"2.0","method":"net_peerCount","params":[],"id":1}' http://localhost:8545 | grep -o '"result":"[^"]*"' | cut -d'"' -f4 || echo "0x0")
PEER_DEC=$((PEER_HEX))
echo "PEER_COUNT: $PEER_DEC"

echo "STATUS: HEALTHY"
