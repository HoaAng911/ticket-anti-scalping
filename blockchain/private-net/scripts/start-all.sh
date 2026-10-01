#!/usr/bin/env bash
# Khoi dong node1 -> doi RPC -> node2 -> noi peer
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"
mkdir -p logs

wait_rpc() {
  local url="$1"
  local name="$2"
  local i
  for i in $(seq 1 30); do
    if curl -s --connect-timeout 1 -X POST "$url" \
      -H "Content-Type: application/json" \
      --data '{"jsonrpc":"2.0","method":"web3_clientVersion","params":[],"id":1}' \
      | grep -q result; then
      echo "[OK] $name ready"
      return 0
    fi
    sleep 1
  done
  echo "[ERROR] Timeout cho $name ($url)"
  return 1
}

echo "[INFO] Start node1..."
nohup ./scripts/start-node1.sh > logs/node1.log 2>&1 &
wait_rpc "http://127.0.0.1:8545" "node1"

echo "[INFO] Start node2..."
nohup ./scripts/start-node2.sh > logs/node2.log 2>&1 &
wait_rpc "http://127.0.0.1:8546" "node2"

./scripts/connect-peers.sh
sleep 2
./scripts/status.sh
echo "Log: logs/node1.log , logs/node2.log"
echo "Dung: ./scripts/stop-nodes.sh"
