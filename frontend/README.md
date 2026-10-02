# Frontend — Ticket Anti-Scalping

React (Vite) + MetaMask + ethers v6.

## Trang

| Route | Chức năng |
|-------|-----------|
| `/` | Danh sách sự kiện |
| `/user` | **Khu vực người dùng** — đăng ký/đăng nhập, liên kết ví, lối tắt mua vé |
| `/admin` | **Trang quản trị** — thống kê, tạo sự kiện, xem vé & giao dịch (organizer/admin) |
| `/events/:id` | Chi tiết + mint vé sơ cấp |
| `/my-tickets` | Quản lý vé, đăng bán resale |
| `/marketplace` | Mua vé resale |

Admin seed: `organizer@ticket.local` / `organizer123`.

`WalletContext` tự thêm/chuyển mạng `VITE_CHAIN_ID` (mặc định **12345** — geth private-net).

## Cài đặt

```bash
npm install
cp .env.example .env
# Sau deploy: địa chỉ contract đã có trong .env (hoặc copy từ smart-contract/deployments/localhost.json)

npm run dev   # http://localhost:5173
```

Vite proxy `/api` sang `http://localhost:5001`.

Hướng dẫn cài đặt full stack: [`../HUONG-DAN-CAI-DAT.md`](../HUONG-DAN-CAI-DAT.md).

## Quy trình demo

1. Bật geth: `blockchain/private-net/scripts/start-all.sh`
2. Backend + Mongo đang chạy, đã `npm run seed`
3. Import keystore deployer vào MetaMask (xem `blockchain/private-net/HUONG-DAN.md`)
4. Mở frontend, kết nối MetaMask, mua vé, xem **Vé của tôi**
