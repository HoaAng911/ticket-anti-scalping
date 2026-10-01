#!/usr/bin/env bash
# Tao lai tai khoan signer1, deployer (node1) va signer2 (node2).
# Chi dung khi setup moi hoan toan — sau do phai cap nhat genesis.json extraData + alloc.
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"

if ! command -v geth >/dev/null 2>&1; then
  echo "[ERROR] Chua cai geth. Cai bang: brew install ethereum"
  exit 1
fi

if [[ ! -f password.txt ]]; then
  cp password.txt.example password.txt
  echo "[INFO] Da tao password.txt tu password.txt.example"
fi

mkdir -p node1 node2

create_if_empty() {
  local dir="$1"
  local label="$2"
  local count
  count="$(find "$dir/keystore" -type f 2>/dev/null | wc -l | tr -d ' ')"
  if [[ "$count" -gt 0 ]]; then
    echo "[SKIP] $dir da co $count keystore — bo qua ($label)"
    return
  fi
  echo "[INFO] Tao account $label trong $dir..."
  geth account new --datadir "$dir" --password password.txt
}

create_if_empty node1 "signer1"
# deployer: chi tao them neu node1 moi co dung 1 key
NODE1_KEYS="$(find node1/keystore -type f 2>/dev/null | wc -l | tr -d ' ')"
if [[ "$NODE1_KEYS" -lt 2 ]]; then
  echo "[INFO] Tao account deployer trong node1..."
  geth account new --datadir node1 --password password.txt
else
  echo "[SKIP] node1 da co du keystore"
fi

create_if_empty node2 "signer2"

echo ""
echo "[OK] Accounts:"
echo "--- node1 ---"
geth account list --datadir node1
echo "--- node2 ---"
geth account list --datadir node2
echo ""
echo "[WARN] Neu day la lan tao MOI (dia chi khac accounts.json),"
echo "  hay cap nhat genesis.json (extraData + alloc) roi chay ./scripts/init.sh"
