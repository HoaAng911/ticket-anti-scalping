# Ticket Anti-Scalping — Hệ thống bán vé chống chợ đen trên Ethereum

Dự án đồ án tốt nghiệp: bán vé sự kiện bằng NFT trên Ethereum, chống scalping bằng logic trên smart contract.

## Hướng dẫn đầy đủ

**Xem file:** `[HUONG-DAN-CAI-DAT.md](./HUONG-DAN-CAI-DAT.md)`

Tài liệu đó mô tả chi tiết: yêu cầu môi trường, khởi động geth, deploy contract, cấu hình MongoDB/backend/frontend, MetaMask, tài khoản seed, smoke test và xử lý lỗi.

Hướng dẫn mạng riêng: `[blockchain/private-net/HUONG-DAN.md](./blockchain/private-net/HUONG-DAN.md)`.

## Cấu trúc

```
ticket-anti-scalping/
├── HUONG-DAN-CAI-DAT.md      # Hướng dẫn cài đặt & chạy (chi tiết)
├── blockchain/private-net/   # geth Clique PoA, chainId 12345
├── smart-contract/           # EventTicket + Marketplace (Hardhat)
├── backend/                  # Express + MongoDB + event listener
├── frontend/                 # React + MetaMask
├── luong-du-an.md
├── thiet-ke-du-an.md
└── phan-cong-3-nguoi.md
```



## Yêu cầu nhanh

- Node.js >= 18, npm >= 9
- geth 1.13.x
- MongoDB (local / Docker / Atlas)
- MetaMask



## Chạy nhanh (đã hiểu cấu hình)

```bash
# 1) geth
cd blockchain/private-net && ./scripts/start-all.sh

# 2) deploy (lần đầu hoặc sau khi reset chain)
cd ../../smart-contract && npm install
npx hardhat run scripts/deploy.js --network localhost

# 3) Mongo + backend
docker run -d --name ticket-mongo -p 27017:27017 mongo:7   # lần đầu
cd ../backend && npm install && npm run seed && npm run dev

# 4) frontend
cd ../frontend && npm install && npm run dev
```


| Hạng mục  | Giá trị                                   |
| --------- | ----------------------------------------- |
| RPC       | `http://127.0.0.1:8545`                   |
| chainId   | `12345`                                   |
| API       | `http://localhost:5001`                   |
| UI        | `http://localhost:5173`                   |
| Admin     | `admin@ticket.local` / `admin123`         |
| Organizer | `organizer@ticket.local` / `organizer123` |




## Anti-scalping (on-chain)

- Tối đa **2 vé / ví / event**
- Resale ≤ **110%** giá gốc
- Khóa chuyển nhượng sau mint (**60s** trên local, 24h trên Sepolia)
- Royalty **5%** về treasury organizer
- Mỗi mint tạo **TicketBlock** liên kết hash với block trước

Xem thêm: `thiet-ke-du-an.md`, `smart-contract/README.md`, `backend/README.md`.