#!/usr/bin/env bash
# Mo trang ket noi MetaMask tai http://127.0.0.1:8765/
# Can mang geth dang chay (RPC 8545) de doc chainId / so du.
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
DIR="$ROOT/metamask"
PORT="${1:-8765}"

if [[ ! -d "$DIR" ]]; then
  echo "[ERROR] Khong thay thu muc metamask/"
  exit 1
fi

echo "[INFO] Trang MetaMask: http://127.0.0.1:${PORT}/"
echo "[INFO] Thu muc: $DIR"
echo "[INFO] Dam bao geth dang chay: ./scripts/start-all.sh"
echo "[INFO] Ctrl+C de dung server"
echo ""

cd "$DIR"
exec python3 -m http.server "$PORT" --bind 127.0.0.1
