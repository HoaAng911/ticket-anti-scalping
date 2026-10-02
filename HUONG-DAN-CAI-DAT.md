# Hướng dẫn cài đặt và chạy sau khi clone Git

Dành cho người **clone repo lần đầu** trên máy mới: làm lần lượt các bước dưới đây để chạy được full stack lab (geth + contract + backend + frontend + MetaMask).

| Mục | Giá trị |
|-----|---------|
| Repo | `ticket-anti-scalping` |
| Môi trường | macOS / Linux / Windows (WSL2 khuyến nghị) |
| Mạng lab | geth Clique · `chainId = 12345` · RPC `http://127.0.0.1:8545` |
| Tài liệu liên quan | [`README.md`](./README.md) · [`blockchain/README.md`](./blockchain/README.md) · [`HUONG-DAN-HE-THONG.md`](./HUONG-DAN-HE-THONG.md) |

**Thứ tự bắt buộc (không đảo):**

1. Cài công cụ hệ thống (Node, geth, Mongo)  
2. Clone repo  
3. Bật mạng geth private-net  
4. Deploy smart contract  
5. Chạy backend + seed  
6. Chạy frontend  
7. Kết nối MetaMask  
8. Smoke test  

---

## Mục lục

1. [Yêu cầu phần mềm](#1-yêu-cầu-phần-mềm)
2. [Clone repository](#2-clone-repository)
3. [Bước A — Mạng geth private-net](#3-bước-a--mạng-geth-private-net)
4. [Bước B — Smart contract](#4-bước-b--smart-contract)
5. [Bước C — Backend + MongoDB](#5-bước-c--backend--mongodb)
6. [Bước D — Frontend](#6-bước-d--frontend)
7. [Bước E — MetaMask](#7-bước-e--metamask)
8. [Tài khoản lab để đăng nhập](#8-tài-khoản-lab-để-đăng-nhập)
9. [Kiểm tra hệ thống đã chạy](#9-kiểm-tra-hệ-thống-đã-chạy)
10. [Khởi động lại vào ngày hôm sau](#10-khởi-động-lại-vào-ngày-hôm-sau)
11. [Lỗi thường gặp khi clone mới](#11-lỗi-thường-gặp-khi-clone-mới)

---

## 1. Yêu cầu phần mềm

| Công cụ | Phiên bản | Mục đích |
|---------|-----------|----------|
| Git | bất kỳ | clone repo |
| Node.js | ≥ 18 | backend, frontend, Hardhat |
| npm | ≥ 9 | cài package |
| geth | **1.13.x** | private-net |
| MongoDB 7 hoặc Docker | — | database |
| curl, python3, bash | — | script mạng |
| MetaMask | extension trình duyệt | ký giao dịch |

### Cổng cần trống

`8545`, `8546`, `27017`, `5001`, `5173`, (tuỳ chọn) `8765` cho trang MetaMask helper.

### Cài nhanh theo OS

**macOS**

```bash
brew install git node ethereum curl python3
# Mongo qua Docker:
brew install --cask docker
# Sau khi mở Docker Desktop:
docker run -d --name ticket-mongo -p 27017:27017 mongo:7
```

**Linux (Ubuntu)**

```bash
sudo apt update
sudo apt install -y git curl python3 build-essential
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt install -y nodejs
# geth 1.13.x: PPA ethereum hoặc tải binary từ https://geth.ethereum.org/downloads/
sudo docker run -d --name ticket-mongo -p 27017:27017 mongo:7
```

**Windows:** dùng **WSL2 + Ubuntu**, rồi làm giống Linux. Chi tiết geth / MetaMask: [`blockchain/README.md`](./blockchain/README.md).

Kiểm tra:

```bash
git --version && node -v && npm -v && geth version && docker --version
```

---

## 2. Clone repository

```bash
git clone https://github.com/HoaAng911/ticket-anti-scalping.git
cd ticket-anti-scalping
```

(Thay URL nếu bạn clone từ fork / remote khác.)

Từ đây gọi thư mục này là **gốc dự án**. Mọi lệnh `cd ...` bên dưới tính từ gốc, trừ khi đang ở trong một bước và đã `cd` sẵn.

---

## 3. Bước A — Mạng geth private-net

Chi tiết MetaMask / geth: [`blockchain/README.md`](./blockchain/README.md).

```bash
cd blockchain/private-net
chmod +x scripts/*.sh
cp -n password.txt.example password.txt

# Lần đầu trên máy này (hoặc khi muốn xóa chain cũ)
./scripts/init.sh

# Mỗi lần làm việc
./scripts/start-all.sh
./scripts/status.sh
```

Kỳ vọng `status.sh`: `chainId: 12345`, `peers` ≥ 1, số block tăng dần.

Kiểm tra RPC:

```bash
curl -s -X POST http://127.0.0.1:8545 \
  -H 'Content-Type: application/json' \
  --data '{"jsonrpc":"2.0","method":"eth_chainId","params":[],"id":1}'
# "result":"0x3039"  (= 12345)
```

**Giữ terminal / process geth chạy** khi làm các bước sau. Đừng tắt mạng trước khi deploy xong.

Mật khẩu keystore lab (file `password.txt`): `ticket123`.

---

## 4. Bước B — Smart contract

Mở **terminal mới**, về gốc dự án:

```bash
cd smart-contract
npm install
cp -n .env.example .env
# Lab: có thể để trống DEPLOYER_PRIVATE_KEY — deploy sẽ unlock geth

npx hardhat compile
npx hardhat test

# geth :8545 phải đang chạy
npm run deploy:local
# tương đương: npx hardhat run scripts/deploy.js --network localhost
```

Sau deploy thành công, script sẽ:

- Ghi `smart-contract/deployments/localhost.json`
- Copy ABI sang `backend/src/abi/` và `frontend/src/services/abi/`
- Cố gắng cập nhật địa chỉ contract trong `backend/.env` và `frontend/.env` (nếu file đã tồn tại)

Xem địa chỉ vừa deploy:

```bash
cat deployments/localhost.json
```

Ghi nhớ hai field: `EventTicket` và `Marketplace` — sẽ cần nếu `.env` chưa được tự điền.

OpenZeppelin phải là **5.0.2** (đã pin trong `package.json`). Không nâng OZ tùy tiện (lỗi opcode với Clique `paris`).

---

## 5. Bước C — Backend + MongoDB

### 5.1. MongoDB

Nếu chưa chạy container ở mục 1:

```bash
docker run -d --name ticket-mongo -p 27017:27017 mongo:7
```

Hoặc dùng Mongo đã cài sẵn trên máy, URI mặc định: `mongodb://127.0.0.1:27017/ticket-anti-scalping`.

### 5.2. Cài và cấu hình backend

```bash
cd backend
npm install
cp -n .env.example .env
```

Mở `backend/.env` và đảm bảo tối thiểu:

```env
PORT=5001
MONGODB_URI=mongodb://127.0.0.1:27017/ticket-anti-scalping
JWT_SECRET=lab-secret-doi-neu-can
JWT_EXPIRES_IN=7d
CHAIN_ID=12345
RPC_URL=http://127.0.0.1:8545
DEPLOYER_ADDRESS=0xdecc0bf86a34de96B161b1F910ce2684d36bb4B4
CLIENT_ORIGIN=http://localhost:5173
TICKET_CONTRACT_ADDRESS=0x...   # từ deployments/localhost.json
MARKETPLACE_CONTRACT_ADDRESS=0x...
```

Nếu đã `cp .env` **trước** khi deploy, thường hai địa chỉ contract đã được script deploy ghi sẵn. Nếu vẫn là `0x...`, copy thủ công từ `smart-contract/deployments/localhost.json`.

### 5.3. Seed và chạy API

```bash
npm run seed
npm run dev
```

Kỳ vọng: server lắng nghe `http://localhost:5001`.

Kiểm tra:

```bash
curl -s http://localhost:5001/api/health
```

Giữ terminal backend chạy.

---

## 6. Bước D — Frontend

Mở **terminal mới**:

```bash
cd frontend
npm install
cp -n .env.example .env
```

Mở `frontend/.env`:

```env
VITE_API_BASE_URL=/api
VITE_NETWORK_NAME=Ticket Private Clique
VITE_CHAIN_ID=12345
VITE_RPC_URL=http://127.0.0.1:8545
VITE_TICKET_CONTRACT_ADDRESS=0x...      # cùng EventTicket với backend
VITE_MARKETPLACE_CONTRACT_ADDRESS=0x... # cùng Marketplace với backend
```

Hai địa chỉ contract **phải trùng** `backend/.env` và `localhost.json`.

```bash
npm run dev
```

Mở trình duyệt: [http://localhost:5173](http://localhost:5173)

Vite proxy chuyển `/api` sang backend `:5001`. Sau mỗi lần sửa `.env` frontend phải **tắt rồi chạy lại** `npm run dev`.

---

## 7. Bước E — MetaMask

Hướng dẫn chuẩn theo code dự án: [`blockchain/README.md` mục 7–8](./blockchain/README.md#7-kết-nối-metamask-chuẩn-theo-dự-án).

### 7.1. Thêm mạng lab (trang helper)

```bash
cd blockchain/private-net
./scripts/serve-metamask.sh
```

Mở [http://127.0.0.1:8765/](http://127.0.0.1:8765/)

1. Xác nhận **RPC geth** = OK (`chainId 12345`).
2. Bấm **Kết nối MetaMask** và Approve mạng **Ticket Private Clique**.
3. Trên trang: Chain ID `12345 (0x3039)`, dòng Mạng = “Đúng mạng…”.

### 7.2. Thêm mạng thủ công (nếu không dùng helper)

| Trường | Giá trị |
|--------|---------|
| Network name | Ticket Private Clique |
| RPC URL | `http://127.0.0.1:8545` |
| Chain ID | `12345` |
| Currency | ETH |

### 7.3. Import ví lab có ETH

1. MetaMask → Import account → JSON file.
2. Chọn keystore Deployer:  
   `blockchain/private-net/node1/keystore/UTC--...--decc0bf86a34de96b161b1f910ce2684d36bb4b4`
3. Mật khẩu: `ticket123`
4. Chọn mạng Ticket Private Clique — số dư phải rất lớn (alloc genesis).

Địa chỉ deployer: `0xdecc0bf86a34de96B161b1F910ce2684d36bb4B4`

---

## 8. Tài khoản lab để đăng nhập

Tạo bởi `npm run seed` ở backend:

| Email | Mật khẩu | Vai trò |
|-------|----------|---------|
| `admin@ticket.local` | `admin123` | Admin (toàn quyền `/admin`) |
| `organizer@ticket.local` | `organizer123` | Organizer |

Trên UI:

1. Vào [http://localhost:5173/user](http://localhost:5173/user) — đăng nhập.
2. Kết nối / liên kết ví MetaMask (đúng mạng `12345`).
3. Admin: [http://localhost:5173/admin](http://localhost:5173/admin) — faucet ETH cho ví mua vé nếu cần.

---

## 9. Kiểm tra hệ thống đã chạy

| Kiểm tra | Cách | Kỳ vọng |
|----------|------|---------|
| geth | `./scripts/status.sh` trong `private-net` | chainId 12345 |
| Contract | `cat smart-contract/deployments/localhost.json` | Có EventTicket + Marketplace |
| API | `curl http://localhost:5001/api/health` | OK / 200 |
| UI | Mở `http://localhost:5173` | Trang sự kiện load được |
| MetaMask | Helper `:8765` hoặc network picker | Ticket Private Clique |
| Mua vé thử | `/events/:id` + ký MetaMask | Có NFT + hóa đơn PDF |
| Dòng tiền | `/ledger` | Có bản ghi sau khi mua |

---

## 10. Khởi động lại vào ngày hôm sau

**Không** cần `init.sh` hay deploy lại nếu chưa xóa chain.

```bash
# Terminal 1 — geth
cd blockchain/private-net && ./scripts/start-all.sh

# Terminal 2 — backend (Mongo phải đang chạy)
cd backend && npm run dev

# Terminal 3 — frontend
cd frontend && npm run dev

# Tuỳ chọn — trang MetaMask
cd blockchain/private-net && ./scripts/serve-metamask.sh
```

Chỉ khi đã chạy `./scripts/init.sh` (reset chain): phải **deploy lại** contract, cập nhật `.env` backend + frontend, seed lại nếu cần, rồi restart API/UI.

---

## 11. Lỗi thường gặp khi clone mới

| Hiện tượng | Nguyên nhân / cách xử lý |
|------------|--------------------------|
| `geth: command not found` | Cài geth 1.13.x, kiểm tra PATH |
| Deploy revert / không gửi tx | geth chưa chạy; unlock deployer; sai network Hardhat |
| Backend không kết nối Mongo | Docker Mongo chưa start; sai `MONGODB_URI` |
| `EADDRINUSE :5001` | Tắt process cũ chiếm cổng |
| Frontend 404 `/api` | Backend chưa chạy; sai proxy / `VITE_API_BASE_URL` |
| MetaMask wrong chain | Phải là `12345`, không phải `31337` |
| Mint OK nhưng không thấy vé | Sai địa chỉ contract trong `.env`; restart backend sau deploy |
| Sau `init.sh` mọi thứ mất | Deploy lại + sửa `.env` + seed + restart |
| Windows script `.sh` lỗi | Dùng WSL2; tránh chỉ dùng PowerShell cho private-net |

---

## Tóm tắt một trang (checklist)

```text
[ ] Node >= 18, geth 1.13.x, Mongo/Docker, MetaMask
[ ] git clone && cd ticket-anti-scalping
[ ] private-net: init.sh (lần đầu) + start-all.sh + status.sh OK
[ ] smart-contract: npm i + deploy:local + có localhost.json
[ ] backend: npm i + .env đúng địa chỉ contract + seed + npm run dev
[ ] frontend: npm i + .env khớp contract + npm run dev
[ ] MetaMask: mạng 12345 + import keystore deployer (ticket123)
[ ] Đăng nhập admin@ticket.local / admin123
[ ] Smoke: health API + mở :5173 + mint thử
```

Xong checklist này là máy clone đã chạy được hệ thống lab.
