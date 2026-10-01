# Backend — Ticket Anti-Scalping

API Express + MongoDB + ethers.js. Lắng nghe sự kiện contract và phục vụ frontend.

## API chính (quản lý vé)

| Method | Path | Mô tả |
|--------|------|--------|
| GET | `/api/health` | Trạng thái + địa chỉ contract |
| POST | `/api/auth/register` | Đăng ký |
| POST | `/api/auth/login` | Đăng nhập |
| POST | `/api/auth/link-wallet` | Liên kết ví (JWT) |
| GET | `/api/events` | Danh sách sự kiện |
| GET | `/api/events/:id` | Chi tiết sự kiện |
| POST | `/api/events` | Tạo sự kiện (organizer) |
| GET | `/api/tickets/my?wallet=0x...` | Vé của ví |
| GET | `/api/tickets/chain` | Chuỗi TicketBlock (tip + verify + danh sách) |
| GET | `/api/tickets/:tokenId` | Chi tiết vé (+ on-chain) |
| GET | `/api/tickets/remaining/:eventChainId` | Vé còn lại |
| GET | `/api/marketplace/listings` | Listing đang bán |
| GET | `/api/marketplace/history/:tokenId` | Lịch sử giao dịch |
| GET | `/api/admin/dashboard` | Thống kê + quỹ deployer |
| GET | `/api/admin/tickets` | Toàn bộ vé cache |
| GET | `/api/admin/transactions` | Lịch sử giao dịch |
| GET | `/api/admin/lab-wallets` | Ví lab đã tạo (kèm private key) |
| POST | `/api/admin/create-wallets` | Tạo N ví + nạp ETH |
| POST | `/api/admin/fund` | Nạp ETH cho danh sách địa chỉ |
| POST | `/api/admin/create-ticket-type` | Tạo sự kiện + nhiều hạng vé (`ticketTypes[]`) on-chain + Mongo |
| POST | `/api/admin/events/:id/ticket-types` | Thêm hạng vé vào sự kiện đã có |
| POST | `/api/admin/mint-tickets` | `adminMintBatch` cấp NFT cho nhiều ví |
| GET | `/api/admin/roles` | Catalog vai trò + permissions |
| GET | `/api/admin/users` | Danh sách người dùng (`q`, `role`, `active`) |
| POST | `/api/admin/users` | Tạo user (cần `users:write`) |
| PATCH | `/api/admin/users/:id` | Đổi role / permissions / khóa / mật khẩu |
| DELETE | `/api/admin/users/:id` | Khóa tài khoản (soft-delete) |

Vai trò: `user` | `organizer` | `admin`. Quyền chi tiết trong `src/constants/permissions.js`. Đăng ký công khai luôn tạo `user`.

Response: `{ "success": true, "data": ... }` hoặc `{ "success": false, "error": "..." }`.

## Listener

`blockchainListener.js` đồng bộ:

- `TicketMinted` → Ticket `owned` + Transaction `mint`
- `TicketListed` → status `listed_for_resale`
- `TicketSold` → đổi `ownerWallet`, Transaction `resale`

## Cài đặt

```bash
# MongoDB (ví dụ Docker)
docker run -d --name ticket-mongo -p 27017:27017 mongo:7

npm install
cp .env.example .env
# Điền TICKET_CONTRACT_ADDRESS / MARKETPLACE_CONTRACT_ADDRESS
# (hoặc chạy deploy.js — tự ghi .env)

npm run seed    # admin@ticket.local / admin123 + organizer@… / organizer123 + sự kiện mẫu
npm run dev     # http://localhost:5000 (hoặc PORT trong .env)
```

Mặc định `.env` trỏ geth private-net: `CHAIN_ID=12345`, `RPC_URL=http://127.0.0.1:8545`.

Hướng dẫn cài đặt full stack: [`../HUONG-DAN-CAI-DAT.md`](../HUONG-DAN-CAI-DAT.md).
