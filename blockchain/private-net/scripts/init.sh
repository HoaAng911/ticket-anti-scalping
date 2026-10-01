#!/usr/bin/env bash
# Khoi tao datadir node1 / node2 tu genesis.json
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"

if ! command -v geth >/dev/null 2>&1; then
  echo "[ERROR] Chua cai geth. Cai bang: brew install ethereum"
  exit 1
fi

GETH_VER="$(geth version | head -n 2 | tr '\n' ' ')"
echo "[INFO] geth: $GETH_VER"

if [[ ! -f password.txt ]]; then
  if [[ -f password.txt.example ]]; then
    cp password.txt.example password.txt
    echo "[INFO] Da tao password.txt tu password.txt.example"
  else
    echo "[ERROR] Thieu password.txt"
    exit 1
  fi
fi

if [[ ! -f genesis.json ]]; then
  echo "[ERROR] Thieu genesis.json"
  exit 1
fi

if [[ ! -d node1/keystore ]] || [[ -z "$(ls -A node1/keystore 2>/dev/null || true)" ]]; then
  echo "[ERROR] Thieu keystore node1. Chay: ./scripts/create-accounts.sh"
  exit 1
fi

if [[ ! -d node2/keystore ]] || [[ -z "$(ls -A node2/keystore 2>/dev/null || true)" ]]; then
  echo "[ERROR] Thieu keystore node2. Chay: ./scripts/create-accounts.sh"
  exit 1
fi

echo "[INFO] Xoa chaindata cu (giu keystore)..."
rm -rf node1/geth node1/lightweight node1/blobpool 2>/dev/null || true
rm -rf node2/geth node2/lightweight node2/blobpool 2>/dev/null || true

echo "[INFO] geth init node1..."
geth init --datadir node1 genesis.json

echo "[INFO] geth init node2..."
geth init --datadir node2 genesis.json

echo "[OK] Init xong. Tiep theo:"
echo "   ./scripts/start-all.sh"
echo "   # hoac: ./scripts/start-node1.sh  va  ./scripts/start-node2.sh"
