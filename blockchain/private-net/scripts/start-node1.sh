#!/usr/bin/env bash
# Node 1 — sealer chinh, HTTP RPC :8545, P2P :30303
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"

SIGNER="0xa98B089Fad3e09f069b41a50F3cb41387ba5e8A2"
# Unlock thêm deployer để Hardhat deploy qua personal_unlockAccount / eth_sendTransaction
DEPLOYER="0xdecc0bf86a34de96B161b1F910ce2684d36bb4B4"
UNLOCK_ACCOUNTS="${SIGNER},${DEPLOYER}"
NETWORK_ID=12345
HTTP_PORT=8545
P2P_PORT=30303
DATADIR="$ROOT/node1"

if [[ ! -d "$DATADIR/geth" ]]; then
  echo "[ERROR] Chua init. Chay: ./scripts/init.sh"
  exit 1
fi

mkdir -p "$ROOT/logs"

echo "[INFO] Starting node1 (signer=$SIGNER) RPC=:$HTTP_PORT P2P=:$P2P_PORT"
exec geth \
  --datadir "$DATADIR" \
  --networkid "$NETWORK_ID" \
  --http \
  --http.addr "127.0.0.1" \
  --http.port "$HTTP_PORT" \
  --http.api "eth,net,web3,personal,admin,miner,clique,txpool,debug" \
  --http.corsdomain "*" \
  --ws \
  --ws.addr "127.0.0.1" \
  --ws.port 8555 \
  --ws.api "eth,net,web3,personal,admin,miner,clique,txpool,debug" \
  --ws.origins "*" \
  --port "$P2P_PORT" \
  --nodiscover \
  --allow-insecure-unlock \
  --unlock "$UNLOCK_ACCOUNTS" \
  --password "$ROOT/password.txt" \
  --mine \
  --miner.etherbase "$SIGNER" \
  --authrpc.addr "127.0.0.1" \
  --authrpc.port 8551 \
  --authrpc.vhosts "localhost" \
  --syncmode full \
  --verbosity 3 \
  --ipcpath "/tmp/geth-ticket-node1.ipc"
