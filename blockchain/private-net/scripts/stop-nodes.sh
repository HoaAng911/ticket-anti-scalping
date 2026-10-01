#!/usr/bin/env bash
# Dung node1 / node2 (theo cong P2P hoac RPC)
set -euo pipefail

stop_port() {
  local port="$1"
  local name="$2"
  local pids
  pids="$(lsof -ti tcp:"$port" -sTCP:LISTEN 2>/dev/null || true)"
  if [[ -z "$pids" ]]; then
    echo "[SKIP] $name (port $port) khong chay"
    return
  fi
  echo "[INFO] Dung $name (pids: $pids)"
  # shellcheck disable=SC2086
  kill $pids 2>/dev/null || true
  sleep 1
  pids="$(lsof -ti tcp:"$port" -sTCP:LISTEN 2>/dev/null || true)"
  if [[ -n "$pids" ]]; then
    # shellcheck disable=SC2086
    kill -9 $pids 2>/dev/null || true
  fi
}

stop_port 8545 "node1 RPC"
stop_port 8546 "node2 RPC"
stop_port 30303 "node1 P2P"
stop_port 30304 "node2 P2P"
echo "[OK] Da dung cac node (neu dang chay)"
