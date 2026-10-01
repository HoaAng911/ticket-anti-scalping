#!/usr/bin/env bash
# Demo nghiệp vụ TicketBlock trên geth private-net:
#   mỗi lần mint vé → sinh node (TicketBlock) mới → prevBlockHash liên kết node trước.
#
# Điều kiện:
#   - node1 RPC :8545 đang chạy
#   - đã deploy EventTicket (backend/.env có TICKET_CONTRACT_ADDRESS)
#   - backend đang chạy :5001 (để mint qua admin API) HOẶC chỉ verify on-chain
#
# Cách dùng:
#   ./scripts/demo-ticket-block-chain.sh           # mint 2 vé lab + verify
#   ./scripts/demo-ticket-block-chain.sh verify    # chỉ đọc / verify chuỗi

set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
REPO="$(cd "$ROOT/../.." && pwd)"
BACKEND_ENV="$REPO/backend/.env"
RPC="${RPC_URL:-http://127.0.0.1:8545}"
API="${API_URL:-http://127.0.0.1:5001}"
MODE="${1:-demo}"

if [[ ! -f "$BACKEND_ENV" ]]; then
  echo "[ERROR] Không thấy $BACKEND_ENV — hãy deploy contract trước."
  exit 1
fi

# shellcheck disable=SC1090
set -a
# đọc ADDRESS từ .env (không export hết secrets thừa nếu có ký tự lạ)
TICKET_CONTRACT_ADDRESS="$(grep -E '^TICKET_CONTRACT_ADDRESS=' "$BACKEND_ENV" | cut -d= -f2- | tr -d '\r')"
set +a

if [[ -z "${TICKET_CONTRACT_ADDRESS:-}" || "$TICKET_CONTRACT_ADDRESS" == 0x... ]]; then
  echo "[ERROR] TICKET_CONTRACT_ADDRESS chưa cấu hình trong backend/.env"
  exit 1
fi

echo "=== TicketBlock chain demo ==="
echo "RPC     : $RPC"
echo "Contract: $TICKET_CONTRACT_ADDRESS"
echo "API     : $API"
echo ""

rpc() {
  local method="$1"
  local params="${2:-[]}"
  curl -s -X POST "$RPC" \
    -H 'Content-Type: application/json' \
    --data "{\"jsonrpc\":\"2.0\",\"method\":\"$method\",\"params\":$params,\"id\":1}"
}

# eth_call helper — data = selector + args hex đã encode sẵn khó; dùng backend API thay.

echo "[1] Kiểm tra geth chainId..."
CHAIN_HEX="$(rpc eth_chainId | python3 -c "import sys,json; print(json.load(sys.stdin).get('result',''))")"
if [[ "$CHAIN_HEX" != "0x3039" ]]; then
  echo "[ERROR] chainId kỳ vọng 0x3039 (12345), nhận: $CHAIN_HEX"
  echo "        Hãy chạy ./scripts/start-all.sh"
  exit 1
fi
echo "    OK chainId=12345"

echo "[2] Đọc tip chuỗi TicketBlock qua API..."
CHAIN_JSON="$(curl -s "$API/api/tickets/chain" || true)"
if ! echo "$CHAIN_JSON" | python3 -c "import sys,json; json.load(sys.stdin)" 2>/dev/null; then
  echo "[ERROR] Backend không trả lời $API/api/tickets/chain — chạy: cd backend && npm run dev"
  exit 1
fi

python3 - <<'PY' "$CHAIN_JSON"
import json, sys
d = json.loads(sys.argv[1])
data = d.get("data") or {}
tip = data.get("tip") or {}
print(f"    tip index = {tip.get('latestBlockIndex')}")
print(f"    tip hash  = {str(tip.get('latestBlockHash') or '')[:18]}…")
print(f"    verify    = {data.get('valid')}")
print(f"    rule      = {data.get('businessRule')}")
blocks = data.get("blocks") or []
for b in blocks[-5:]:
    idx = b.get("index") or b.get("blockIndex")
    prev = str(b.get("prevBlockHash") or "0x0")
    h = str(b.get("blockHash") or "")
    print(f"    node#{idx} token={b.get('tokenId')} prev={prev[:12]}… hash={h[:12]}…")
PY

if [[ "$MODE" == "verify" ]]; then
  echo ""
  echo "[OK] Chỉ verify — xong."
  exit 0
fi

echo ""
echo "[3] Đăng nhập admin + mint 2 vé để sinh 2 node mới..."
TOKEN="$(curl -s -X POST "$API/api/auth/login" \
  -H 'Content-Type: application/json' \
  -d '{"email":"admin@ticket.local","password":"admin123"}' \
  | python3 -c "import sys,json; print(json.load(sys.stdin)['data']['token'])")"

# Tạo 2 ví lab + nạp ít ETH
CREATE="$(curl -s -X POST "$API/api/admin/create-wallets" \
  -H "Authorization: Bearer $TOKEN" \
  -H 'Content-Type: application/json' \
  -d '{"count":2,"amountEth":"1","label":"ticket-block-demo","fund":true}')"

ADDRS="$(echo "$CREATE" | python3 -c "
import sys,json
d=json.load(sys.stdin)
if not d.get('success'):
  raise SystemExit(d.get('error') or 'create-wallets failed')
print(','.join(w['address'] for w in d['data']['wallets']))
")"
echo "    recipients: $ADDRS"

TIP_BEFORE="$(echo "$CHAIN_JSON" | python3 -c "import sys,json; print(json.load(sys.stdin)['data']['tip']['latestBlockIndex'])")"

MINT="$(curl -s -X POST "$API/api/admin/mint-tickets" \
  -H "Authorization: Bearer $TOKEN" \
  -H 'Content-Type: application/json' \
  -d "{\"eventChainId\":1,\"addresses\":\"$ADDRS\"}")"

python3 - <<'PY' "$MINT" "$TIP_BEFORE"
import json, sys
d = json.loads(sys.argv[1])
before = int(sys.argv[2])
if not d.get("success"):
    raise SystemExit("mint failed: " + str(d.get("error")))
data = d["data"]
chain = data.get("chain") or {}
print(f"    tx        = {data.get('txHash')}")
print(f"    tipBefore = {chain.get('tipBefore')} (API trước: {before})")
print(f"    tipAfter  = {chain.get('tipAfter')}")
print(f"    verify    = {chain.get('verifyChain')}")
for b in chain.get("newBlocks") or []:
    print(
        f"    NEW node#{b['index']} token={b['tokenId']} "
        f"prev={b['prevBlockHash'][:14]}… → {b['blockHash'][:14]}…"
    )
after = int(chain.get("tipAfter") or 0)
assert after == before + len(chain.get("newBlocks") or []), "tip không tăng đúng số vé mint"
assert chain.get("verifyChain") is True, "verifyChain phải true"
# node đầu tiên trong batch phải nối tip cũ
blocks = chain.get("newBlocks") or []
if before == 0 and blocks:
    assert blocks[0]["prevBlockHash"].startswith("0x0000") or int(blocks[0]["prevBlockHash"], 16) == 0
print("    liên kết hash: OK")
PY

echo ""
echo "[4] Đọc lại chuỗi sau mint..."
curl -s "$API/api/tickets/chain" | python3 -c "
import sys,json
d=json.load(sys.stdin)['data']
print('    tip=', d['tip']['latestBlockIndex'], 'valid=', d['valid'])
for b in (d.get('blocks') or [])[-4:]:
    idx=b.get('index') or b.get('blockIndex')
    print(f\"    node#{idx} token={b.get('tokenId')} prev={str(b.get('prevBlockHash'))[:12]}…\")
"

echo ""
echo "[OK] Nghiệp vụ TicketBlock trên private-net: mỗi mint = 1 node mới liên kết node trước."
