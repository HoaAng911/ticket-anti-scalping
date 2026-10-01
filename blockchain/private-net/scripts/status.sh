#!/usr/bin/env bash
# Kiem tra RPC node1 / node2
set -euo pipefail

rpc() {
  local url="$1"
  local method="$2"
  local params="${3:-[]}"
  curl -s -X POST "$url" \
    -H "Content-Type: application/json" \
    --data "{\"jsonrpc\":\"2.0\",\"method\":\"$method\",\"params\":$params,\"id\":1}"
}

check_node() {
  local name="$1"
  local url="$2"
  echo "=== $name ($url) ==="
  if ! curl -s -o /dev/null -w "%{http_code}" --connect-timeout 2 "$url" >/dev/null 2>&1; then
    if ! rpc "$url" "web3_clientVersion" >/dev/null 2>&1; then
      echo "  [ERROR] Khong ket noi duoc"
      echo ""
      return
    fi
  fi
  local ver block peers chain
  ver="$(rpc "$url" "web3_clientVersion" | python3 -c "import sys,json; print(json.load(sys.stdin).get('result','?'))" 2>/dev/null || echo "?")"
  block="$(rpc "$url" "eth_blockNumber" | python3 -c "import sys,json; print(int(json.load(sys.stdin).get('result','0x0'),16))" 2>/dev/null || echo "?")"
  peers="$(rpc "$url" "net_peerCount" | python3 -c "import sys,json; print(int(json.load(sys.stdin).get('result','0x0'),16))" 2>/dev/null || echo "?")"
  chain="$(rpc "$url" "eth_chainId" | python3 -c "import sys,json; print(int(json.load(sys.stdin).get('result','0x0'),16))" 2>/dev/null || echo "?")"
  echo "  client : $ver"
  echo "  chainId: $chain"
  echo "  block  : $block"
  echo "  peers  : $peers"
  echo ""
}

check_node "node1" "http://127.0.0.1:8545"
check_node "node2" "http://127.0.0.1:8546"
