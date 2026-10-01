#!/usr/bin/env bash
# Ket noi node2 -> node1 qua admin_addPeer (HTTP RPC)
set -euo pipefail

NODE1="http://127.0.0.1:8545"
NODE2="http://127.0.0.1:8546"

rpc() {
  local url="$1"
  local method="$2"
  local params="${3:-[]}"
  curl -s --connect-timeout 3 -X POST "$url" \
    -H "Content-Type: application/json" \
    --data "{\"jsonrpc\":\"2.0\",\"method\":\"$method\",\"params\":$params,\"id\":1}"
}

if ! rpc "$NODE1" "web3_clientVersion" | grep -q result; then
  echo "[ERROR] node1 chua chay ($NODE1)"
  exit 1
fi
if ! rpc "$NODE2" "web3_clientVersion" | grep -q result; then
  echo "[ERROR] node2 chua chay ($NODE2)"
  exit 1
fi

ENODE="$(rpc "$NODE1" "admin_nodeInfo" | python3 -c "
import json,sys
d=json.load(sys.stdin)
e=d.get('result',{}).get('enode','')
print(e.replace('@[::]','@127.0.0.1').replace('@[::1]','@127.0.0.1'))
")"

if [[ -z "$ENODE" ]]; then
  echo "[ERROR] Khong lay duoc enode tu node1"
  exit 1
fi

echo "[INFO] node1 enode: $ENODE"
echo "[INFO] admin_addPeer tren node2..."
rpc "$NODE2" "admin_addPeer" "[\"$ENODE\"]" | python3 -m json.tool

sleep 1
PEERS1="$(rpc "$NODE1" "net_peerCount" | python3 -c "import sys,json; print(int(json.load(sys.stdin)['result'],16))")"
PEERS2="$(rpc "$NODE2" "net_peerCount" | python3 -c "import sys,json; print(int(json.load(sys.stdin)['result'],16))")"
echo "--- node1 peers: $PEERS1"
echo "--- node2 peers: $PEERS2"
echo "[OK] Xong"
