#!/usr/bin/env bash
# Node 2 — sealer phu, HTTP RPC :8546, P2P :30304
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"

SIGNER="0xd07f0A707A3A6eA439a2B8cb18A7dA016A6056B4"
NETWORK_ID=12345
HTTP_PORT=8546
P2P_PORT=30304
DATADIR="$ROOT/node2"

if [[ ! -d "$DATADIR/geth" ]]; then
  echo "[ERROR] Chua init. Chay: ./scripts/init.sh"
  exit 1
fi

mkdir -p "$ROOT/logs"

# Lay enode node1 qua HTTP RPC (on dinh hon IPC tren geth 1.13)
BOOTNODE=""
ENODE_JSON="$(curl -s --connect-timeout 2 -X POST http://127.0.0.1:8545 \
  -H "Content-Type: application/json" \
  --data '{"jsonrpc":"2.0","method":"admin_nodeInfo","params":[],"id":1}' || true)"

if [[ -n "$ENODE_JSON" ]]; then
  BOOTNODE="$(python3 -c "
import json,sys
try:
    d=json.loads(sys.argv[1])
    e=d.get('result',{}).get('enode','')
    e=e.replace('@[::]','@127.0.0.1').replace('@[::1]','@127.0.0.1')
    print(e)
except Exception:
    print('')
" "$ENODE_JSON")"
fi

if [[ -n "$BOOTNODE" ]]; then
  echo "[INFO] Peer voi node1: $BOOTNODE"
else
  echo "[WARN] Khong lay duoc enode node1 — start node1 truoc, roi chay ./scripts/connect-peers.sh"
fi

echo "[INFO] Starting node2 (signer=$SIGNER) RPC=:$HTTP_PORT P2P=:$P2P_PORT"

GETH_ARGS=(
  --datadir "$DATADIR"
  --networkid "$NETWORK_ID"
  --http
  --http.addr "127.0.0.1"
  --http.port "$HTTP_PORT"
  --http.api "eth,net,web3,personal,admin,miner,clique,txpool,debug"
  --http.corsdomain "*"
  --ws
  --ws.addr "127.0.0.1"
  --ws.port 8556
  --ws.api "eth,net,web3,personal,admin,miner,clique,txpool,debug"
  --ws.origins "*"
  --port "$P2P_PORT"
  --nodiscover
  --allow-insecure-unlock
  --unlock "$SIGNER"
  --password "$ROOT/password.txt"
  --mine
  --miner.etherbase "$SIGNER"
  --authrpc.addr "127.0.0.1"
  --authrpc.port 8552
  --authrpc.vhosts "localhost"
  --syncmode full
  --verbosity 3
  --ipcpath "/tmp/geth-ticket-node2.ipc"
)

if [[ -n "$BOOTNODE" ]]; then
  GETH_ARGS+=(--bootnodes "$BOOTNODE")
fi

exec geth "${GETH_ARGS[@]}"
