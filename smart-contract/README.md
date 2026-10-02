# Smart Contract — Ticket Anti-Scalping (local lab)

Solidity + Hardhat: `EventTicket` (ERC-721) và `Marketplace` (resale chống scalping).  
**Chỉ chạy local** — geth private-net (`chainId 12345`) hoặc Hardhat node.

## Contracts

| Contract | Vai trò |
|----------|---------|
| `EventTicket.sol` | NFT vé, max 2 vé/ví/event, mint sơ cấp |
| `Marketplace.sol` | Resale ≤ 110%, khóa chuyển nhượng, royalty 5% |

Anti-scalping (giá trị lab):

- `MAX_TICKETS_PER_WALLET = 2` (mint mua thường)
- `MAX_RESALE_PERCENT = 110`
- `TRANSFER_LOCK_SECONDS` — **60s** khi deploy local
- `ROYALTY_PERCENT = 5`

Admin lab:

- `configureEvent` — tạo loại vé mới on-chain
- `adminMint` / `adminMintBatch` — cấp NFT miễn phí cho nhiều ví (bỏ qua limit 2 vé/ví)

Chuỗi TicketBlock (mỗi lần mint):

- `prevBlockHash` lấy từ hash block vé trước (`0x0` nếu là vé đầu)
- `blockHash = keccak256(index, tokenId, eventChainId, owner, price, mintedAt, prevBlockHash)`
- Event `TicketBlockCreated` + `verifyChain(from, to)`

## Cài đặt

```bash
npm install
npx hardhat compile
npx hardhat test
```

OpenZeppelin **pin `5.0.2`** (bản mới hơn dùng opcode Cancun — không tương thích geth Clique `paris`).

## Deploy lên geth private-net (chainId 12345)

1. Bật mạng: `cd ../blockchain/private-net && ./scripts/start-all.sh`
2. Copy env (tuỳ chọn — lab có thể để trống):

```bash
cp .env.example .env
```

3. Deploy (tài khoản deployer unlock trên node1 — không bắt buộc private key):

```bash
npm run deploy:local
# tương đương: npx hardhat run scripts/deploy.js --network localhost
```

Script sẽ:

- Deploy 2 contract
- `configureEvent(1=Standard 0.01 ETH, 2=VIP 0.05 ETH)`
- Copy ABI sang `backend/src/abi/` và `frontend/src/services/abi/`
- Ghi `deployments/localhost.json` + cập nhật `.env` backend/frontend

Tuỳ chọn: đặt `DEPLOYER_PRIVATE_KEY` trong `.env` nếu muốn ký bằng key thay vì unlock geth.

## Mạng local

| Mạng | URL | chainId |
|------|-----|---------|
| geth private-net (lab chính) | `http://127.0.0.1:8545` | `12345` |
| Hardhat in-memory / chain A | `:8547` | `31337` |
| Hardhat chain B | `:8548` | `31338` |

Hướng dẫn full stack: [`../README.md`](../README.md).
