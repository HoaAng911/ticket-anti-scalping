# Hướng dẫn cài đặt và chạy — Ticket Anti-Scalping

Tài liệu này mô tả **toàn bộ** quy trình cài đặt và chạy hệ thống bán vé NFT chống scalping trên máy local (macOS / Linux).

Thứ tự bắt buộc:

1. Mạng geth private-net  
2. Smart contract (Hardhat deploy)  
3. Backend (Express + MongoDB)  
4. Frontend (React + MetaMask)  

---

## 1. Tổng quan kiến trúc


| Thành phần | Thư mục | Vai trò | Cổng mặc định |
|------------|---------|---------|---------------|
| geth Clique PoA (2 node) | `blockchain/private-net/` | Chuỗi lab `chainId = 12345` | RPC `8545` / `8546` |
| Smart contract | `smart-contract/` | `EventTicket` + `Marketplace` | Deploy lên `:8545` |
| Backend API | `backend/` | JWT, MongoDB cache, listener, admin | `5001` |
| Frontend | `frontend/` | UI người dùng + AdminLTE | `5173` |


Luồng dữ liệu ngắn:

```
MetaMask / Hardhat  →  geth :8545  ←  EventTicket / Marketplace
                              ↑
                         backend listener + admin signer
                              ↑
                         frontend (Vite) → proxy /api → backend :5001
                              ↑
                           MongoDB
```

---

## 2. Yêu cầu môi trường

### 2.1. Phần mềm cần có


| Công cụ | Phiên bản gợi ý | Mục đích |
|---------|-----------------|----------|
| Node.js | >= 18 | backend, frontend, Hardhat |
| npm | >= 9 | cài dependency |
| geth | **1.13.x** | mạng private-net (đã kiểm với 1.13.15) |
| MongoDB | 7.x | lưu user, event, ticket cache |
| Docker (tuỳ chọn) | — | chạy Mongo nhanh |
| MetaMask | extension trình duyệt | ký giao dịch on-chain |
| curl, python3, bash | có sẵn trên macOS | script kiểm tra mạng |


### 2.2. Cài Node.js và geth (macOS)

```bash
# Node (ví dụ qua Homebrew hoặc nvm)
brew install node
node -v    # >= v18
npm -v

# geth
brew install ethereum
geth version   # nên là 1.13.x
```

Nếu geth >= 1.14, một số flag mining / API có thể khác — ưu tiên giữ **1.13.x** cho đồ án.

### 2.3. Cổng cần trống


| Cổng | Dịch vụ |
|------|---------|
| 8545 | geth node1 HTTP RPC |
| 8546 | geth node2 HTTP RPC |
| 8551 / 8552 | geth Auth RPC (Engine) |
| 30303 / 30304 | geth P2P |
| 27017 | MongoDB |
| 5001 | Backend API (tránh 5000 vì AirPlay trên macOS) |
| 5173 | Frontend Vite |


### 2.4. Clone / mở thư mục dự án

```bash
cd /đường/dẫn/ticket-platform/ticket-anti-scalping
```

Mọi lệnh bên dưới giả định bạn đang đứng trong thư mục con tương ứng.

---

## 3. Bước 1 — Khởi động mạng geth private-net

Chi tiết đầy đủ: `blockchain/private-net/HUONG-DAN.md`.

### 3.1. Lần đầu (khởi tạo genesis)

```bash
cd blockchain/private-net
chmod +x scripts/*.sh
./scripts/init.sh
```

Chỉ chạy `init.sh` **một lần** (hoặc khi muốn xóa data và tạo lại mạng từ đầu).

### 3.2. Start 2 node

```bash
./scripts/start-all.sh
# hoặc: ./scripts/start-node1.sh rồi ./scripts/start-node2.sh
./scripts/connect-peers.sh
./scripts/status.sh
```

Kiểm tra RPC node1:

```bash
curl -s -X POST http://127.0.0.1:8545 \
  -H 'Content-Type: application/json' \
  --data '{"jsonrpc":"2.0","method":"eth_chainId","params":[],"id":1}'
```

Kết quả mong đợi: `"result":"0x3039"` (hex của `12345`).

### 3.3. Unlock tài khoản deployer (cần cho deploy / faucet / mint)

Địa chỉ deployer lab:

```
0xdecc0bf86a34de96B161b1F910ce2684d36bb4B4
```

Mật khẩu keystore: nội dung file `blockchain/private-net/password.txt` (mặc định `ticket123`).

```bash
curl -s -X POST http://127.0.0.1:8545 \
  -H 'Content-Type: application/json' \
  --data '{"jsonrpc":"2.0","method":"personal_unlockAccount","params":["0xdecc0bf86a34de96B161b1F910ce2684d36bb4B4","ticket123",0],"id":1}'
```

`"result":true` nghĩa là unlock thành công. Script `deploy.js` cũng tự gọi unlock nếu chưa đặt `DEPLOYER_PRIVATE_KEY`.

### 3.4. Dừng mạng

```bash
./scripts/stop-nodes.sh
```

---

## 4. Bước 2 — Smart contract (Hardhat)

Thư mục: `smart-contract/`.

### 4.1. Cài dependency

```bash
cd smart-contract
npm install
```

**Lưu ý quan trọng:** dự án pin OpenZeppelin **`5.0.2`**. Bản OZ mới hơn có thể dùng opcode Cancun — **không tương thích** geth Clique cấu hình `evmVersion: paris`.

### 4.2. Compile và test

```bash
npx hardhat compile
npx hardhat test
```

Test chạy trên mạng in-memory Hardhat (`chainId 31337`), không cần geth.

### 4.3. Deploy lên geth private-net

Điều kiện:

- Node1 RPC `:8545` đang chạy  
- Deployer đã unlock (hoặc có `DEPLOYER_PRIVATE_KEY` trong `smart-contract/.env`)

```bash
npx hardhat run scripts/deploy.js --network localhost
```

`localhost` trong `hardhat.config.js` = RPC `http://127.0.0.1:8545`, `chainId 12345`.

Script sẽ:

1. Deploy `EventTicket` và `Marketplace`
2. Gọi `configureEvent` cho loại vé mẫu (`eventChainId` 1 = Standard 0.01 ETH, 2 = VIP 0.05 ETH)
3. Copy ABI vào:
   - `backend/src/abi/`
   - `frontend/src/services/abi/`
4. Ghi `smart-contract/deployments/localhost.json`
5. Cập nhật địa chỉ contract trong `backend/.env` và `frontend/.env`

Sau deploy, mở file:

```bash
cat deployments/localhost.json
```

Ghi lại `EventTicket` và `Marketplace` nếu cần cấu hình tay.

### 4.4. Biến môi trường smart-contract (tuỳ chọn)

Tạo `smart-contract/.env` nếu muốn ký bằng private key thay vì unlock geth:

```env
DEPLOYER_PRIVATE_KEY=0x...
SEPOLIA_RPC_URL=https://rpc.sepolia.org
```

### 4.5. Deploy lại

Mỗi lần `init.sh` lại mạng (xóa chain data) **bắt buộc deploy lại** contract, rồi restart backend để load địa chỉ mới.

---

## 5. Bước 3 — Backend

Thư mục: `backend/`.

### 5.1. MongoDB

**Cách A — Docker:**

```bash
docker run -d --name ticket-mongo -p 27017:27017 mongo:7
```

**Cách B — MongoDB local / Atlas:** chỉnh `MONGODB_URI` cho khớp.

### 5.2. Cài dependency và cấu hình `.env`

```bash
cd backend
npm install
cp .env.example .env
```

Chỉnh `backend/.env` (sau khi đã deploy, script thường đã điền sẵn địa chỉ contract):


| Biến | Giá trị lab điển ký |
|------|---------------------|
| `PORT` | `5001` |
| `MONGODB_URI` | `mongodb://127.0.0.1:27017/ticket-anti-scalping` |
| `JWT_SECRET` | chuỗi bí mật bất kỳ (đổi khi demo) |
| `CHAIN_ID` | `12345` |
| `RPC_URL` | `http://127.0.0.1:8545` |
| `TICKET_CONTRACT_ADDRESS` | từ `deployments/localhost.json` |
| `MARKETPLACE_CONTRACT_ADDRESS` | từ `deployments/localhost.json` |
| `DEPLOYER_ADDRESS` | `0xdecc0bf86a34de96B161b1F910ce2684d36bb4B4` |
| `CLIENT_ORIGIN` | `http://localhost:5173` |


Tuỳ chọn:

```env
# Mật khẩu unlock geth (nếu khác mặc định)
# GETH_PASSWORD=ticket123

# Hoặc dùng private key thay unlock:
# DEPLOYER_PRIVATE_KEY=0x...
```

### 5.3. Seed dữ liệu mẫu

```bash
npm run seed
```

Tạo / cập nhật:

| Email | Mật khẩu | Vai trò |
|-------|----------|---------|
| `admin@ticket.local` | `admin123` | admin (toàn quyền, quản lý user) |
| `organizer@ticket.local` | `organizer123` | organizer (sự kiện, mint, faucet) |

Đồng thời tạo sự kiện mẫu **Đêm Nhạc Anti-Scalping** (loại vé chainId 1 và 2) nếu chưa có.

### 5.4. Chạy API

```bash
npm run dev
# tương đương: nodemon src/server.js
```

Kiểm tra:

```bash
curl -s http://127.0.0.1:5001/api/health
```

Đăng nhập thử:

```bash
curl -s -X POST http://127.0.0.1:5001/api/auth/login \
  -H 'Content-Type: application/json' \
  -d '{"email":"admin@ticket.local","password":"admin123"}'
```

Production (không hot-reload):

```bash
npm start
```

### 5.5. API quan trọng (tham khảo nhanh)


| Method | Path | Ghi chú |
|--------|------|---------|
| POST | `/api/auth/register` | Đăng ký (luôn role `user`) |
| POST | `/api/auth/login` | Đăng nhập JWT |
| GET | `/api/events` | Danh sách sự kiện |
| GET | `/api/tickets/my?wallet=0x...` | Vé theo ví |
| GET | `/api/tickets/chain` | Chuỗi TicketBlock |
| GET | `/api/admin/dashboard` | Thống kê (organizer/admin) |
| GET/POST | `/api/admin/users` | Quản lý người dùng |
| PATCH | `/api/admin/users/:id` | Đổi role / quyền / khóa |
| POST | `/api/admin/create-wallets` | Tạo ví lab + nạp ETH |
| POST | `/api/admin/mint-tickets` | `adminMintBatch` |

Chi tiết hơn: `backend/README.md`.

Backend cần **geth đang chạy** để listener đồng bộ mint/list/sale và để faucet/mint admin hoạt động.

---

## 6. Bước 4 — Frontend

Thư mục: `frontend/`.

### 6.1. Cài dependency và `.env`

```bash
cd frontend
npm install
cp .env.example .env
```

Sau `deploy.js`, các biến contract thường đã được ghi sẵn. Kiểm tra `frontend/.env`:


| Biến | Giá trị lab |
|------|-------------|
| `VITE_API_BASE_URL` | `/api` (Vite proxy → backend `:5001`) |
| `VITE_CHAIN_ID` | `12345` |
| `VITE_RPC_URL` | `http://127.0.0.1:8545` |
| `VITE_NETWORK_NAME` | `Ticket Private Clique` |
| `VITE_TICKET_CONTRACT_ADDRESS` | địa chỉ sau deploy |
| `VITE_MARKETPLACE_CONTRACT_ADDRESS` | địa chỉ sau deploy |


`vite.config.js` proxy:

```
/api  →  http://localhost:5001
```

### 6.2. Chạy dev server

```bash
npm run dev
```

Mở trình duyệt: **http://localhost:5173**

Build production:

```bash
npm run build
npm run preview
```

### 6.3. Các trang chính


| URL | Mô tả |
|-----|--------|
| `/` | Danh sách sự kiện, mua vé |
| `/user` | Đăng ký / đăng nhập người dùng, liên kết ví |
| `/my-tickets` | Vé của ví đang nối MetaMask |
| `/marketplace` | Chợ resale |
| `/admin` | Panel AdminLTE — sự kiện, faucet, mint, **Người dùng & quyền** |
| `/events/:id` | Chi tiết sự kiện + mint sơ cấp |


---

## 7. Cấu hình MetaMask

### 7.1. Thêm mạng lab


| Trường | Giá trị |
|--------|---------|
| Network name | Ticket Private Clique |
| RPC URL | `http://127.0.0.1:8545` |
| Chain ID | `12345` |
| Currency symbol | ETH |


Frontend cũng có nút chuyển mạng tự động nếu sai chain.

Trợ giúp import: có thể mở trang helper (nếu đang serve):

```bash
cd blockchain/private-net
./scripts/serve-metamask.sh
# http://127.0.0.1:8765/
```

### 7.2. Import tài khoản deployer (lab)

1. MetaMask → Import account  
2. Dùng keystore trong `blockchain/private-net/node1/keystore/` **hoặc** private key lab (nếu nhóm đã xuất)  
3. Mật khẩu keystore: `ticket123` (file `password.txt`)

Sau import, tài khoản phải có số dư ETH lớn (genesis đã cấp).

### 7.3. Ví người mua

Có thể:

- Tạo tài khoản mới trong MetaMask rồi nhờ admin **Cấp ETH / Ví** trên `/admin`  
- Hoặc dùng batch **Tạo ví + nạp ETH** rồi import private key vào MetaMask  

---

## 8. Quy trình kiểm tra end-to-end (smoke test)

Thực hiện lần lượt:

1. `./scripts/status.sh` — 2 node peer, đang seal block  
2. `curl http://127.0.0.1:5001/api/health` — backend OK, có địa chỉ contract  
3. Mở `http://localhost:5173` — thấy sự kiện mẫu  
4. Đăng nhập `/admin` bằng `admin@ticket.local` / `admin123`  
5. Tab **Cấp ETH / Ví** → tạo 1–2 ví lab  
6. Tab **Mint vé** → mint `eventChainId = 1` cho các ví đó  
7. Tab **Chuỗi block vé** → thấy tip tăng, `verifyChain` hợp lệ  
8. Tab **Người dùng & quyền** → tạo user / đổi role  
9. Import ví lab vào MetaMask → `/my-tickets` thấy NFT  
10. Sau thời gian khóa (**60 giây** trên local) → đăng bán resale ≤ 110% giá gốc  

---

## 9. Tài khoản và phân quyền


| Vai trò | Quyền chính |
|---------|-------------|
| `user` | Mua vé, resale, liên kết ví |
| `organizer` | Dashboard, tạo loại vé, mint, faucet, xem danh sách user |
| `admin` | Toàn bộ + tạo/khóa user + ghi đè permission |


Đăng ký công khai trên `/user` **luôn** tạo `user`. Organizer/admin chỉ được tạo từ seed hoặc từ panel admin.

Catalog quyền: `backend/src/constants/permissions.js`.

---

## 10. Anti-scalping (on-chain) — nhắc lại


| Cơ chế | Giá trị |
|--------|---------|
| Tối đa vé / ví / event (mint thường) | **2** |
| Trần giá resale | **110%** giá gốc |
| Khóa chuyển nhượng sau mint | **60s** (local/geth), 24h (Sepolia) |
| Royalty resale | **5%** về treasury organizer |
| TicketBlock | Mỗi mint nối `prevBlockHash` → `blockHash` |


`adminMint` / `adminMintBatch` (chỉ admin backend) bỏ qua giới hạn 2 vé/ví — dùng cho lab / cấp vé.

---

## 11. Thứ tự khởi động hàng ngày (đã cài sẵn)

Khi máy đã `npm install` và đã `init` mạng:

```bash
# Terminal 1 — geth
cd blockchain/private-net
./scripts/start-all.sh
./scripts/connect-peers.sh

# Terminal 2 — Mongo (nếu dùng Docker và container đã tồn tại)
docker start ticket-mongo

# Terminal 3 — backend
cd backend
npm run dev

# Terminal 4 — frontend
cd frontend
npm run dev
```

Mở: http://localhost:5173  

Nếu vừa reset chain (`init.sh` lại), nhớ **deploy lại contract** rồi kiểm tra `.env` backend/frontend.

---

## 12. Xử lý lỗi thường gặp


| Triệu chứng | Nguyên nhân / cách xử lý |
|-------------|---------------------------|
| `eth_chainId` không trả lời | geth chưa start; chạy `start-all.sh`, xem `logs/node1.log` |
| Deploy fail / insufficient funds | Deployer chưa unlock hoặc sai địa chỉ; unlock lại bằng `personal_unlockAccount` |
| Backend không kết nối Mongo | `docker start ticket-mongo` hoặc sửa `MONGODB_URI` |
| API lỗi cổng / frontend 502 | Backend phải chạy **5001**; macOS AirPlay hay chiếm **5000** |
| MetaMask sai mạng | Thêm chainId `12345`, RPC `127.0.0.1:8545` |
| Mint / mua vé revert | Sai địa chỉ contract (deploy lại), sai mạng, hoặc hết vé / vượt 2 vé/ví |
| Faucet / mint admin lỗi signer | Unlock deployer trên geth hoặc set `DEPLOYER_PRIVATE_KEY` |
| `walletAddress` duplicate null | Đã xử lý bằng sparse index; nếu DB cũ lỗi, unset field null rồi tạo lại index sparse |
| Compile OZ / Cancun | Giữ `@openzeppelin/contracts@5.0.2`, `evmVersion: paris` |
| IPC path quá dài (macOS) | Script private-net dùng IPC dưới `/tmp` — xem `HUONG-DAN.md` mạng |


---

## 13. Tài liệu liên quan


| File | Nội dung |
|------|----------|
| `README.md` | Tóm tắt dự án + lệnh nhanh |
| `blockchain/private-net/HUONG-DAN.md` | Chi tiết geth 2 node, MetaMask, troubleshooting mạng |
| `smart-contract/README.md` | Contract, anti-scalping, mạng Hardhat |
| `backend/README.md` | API, listener, seed |
| `frontend/README.md` | Cấu trúc UI |
| `thiet-ke-du-an.md` | Thiết kế tổng thể |


---

## 14. Checklist nghiệm thu lab

- [ ] geth 2 node peer, `chainId = 12345`  
- [ ] `npx hardhat test` pass  
- [ ] Deploy `localhost` thành công, ABI đã copy  
- [ ] MongoDB chạy, `npm run seed` OK  
- [ ] Backend `:5001/api/health` OK  
- [ ] Frontend `:5173` mở được  
- [ ] Admin đăng nhập, tạo ví, mint vé, xem TicketBlock  
- [ ] User MetaMask mua / xem vé / resale sau lock  
- [ ] Admin quản lý user & phân quyền hoạt động  

Khi tất cả mục trên đạt, hệ thống đã sẵn sàng demo đồ án.
