# Ticket Anti-Scalping

**Hệ thống bán vé sự kiện bằng NFT trên Ethereum — chống chợ đen (scalping) bằng ràng buộc on-chain.**

Đồ án tốt nghiệp / monorepo lab: mạng geth Clique riêng, smart contract ERC-721 + marketplace, backend Express/MongoDB đồng bộ sự kiện blockchain, frontend React + MetaMask.

---

## Mục lục

1. [Giới thiệu dự án](#1-giới-thiệu-dự-án)
2. [Kiến trúc tổng thể](#2-kiến-trúc-tổng-thể)
3. [Cơ chế chống scalping](#3-cơ-chế-chống-scalping)
4. [Cấu trúc thư mục](#4-cấu-trúc-thư-mục)
5. [Yêu cầu môi trường](#5-yêu-cầu-môi-trường)
6. [Cài đặt và chạy (chi tiết)](#6-cài-đặt-và-chạy-chi-tiết)
7. [Cấu hình MetaMask](#7-cấu-hình-metamask)
8. [Luồng hoạt động chi tiết](#8-luồng-hoạt-động-chi-tiết)
9. [Giải thích từng thành phần](#9-giải-thích-từng-thành-phần)
10. [Tài khoản & cổng lab](#10-tài-khoản--cổng-lab)
11. [Smoke test end-to-end](#11-smoke-test-end-to-end)
12. [Xử lý lỗi thường gặp](#12-xử-lý-lỗi-thường-gặp)
13. [Tài liệu liên quan](#13-tài-liệu-liên-quan)

---

## 1. Giới thiệu dự án

### Bài toán

Thị trường vé truyền thống dễ bị **scalping**: bot mua số lượng lớn lúc mở bán, rồi bán lại với giá cắt cổ. Người dùng thật khó mua được vé đúng giá; ban tổ chức mất kiểm soát kênh phụ.

### Giải pháp

Dự án mã hóa mỗi vé thành **NFT (ERC-721)** trên Ethereum (mạng lab geth hoặc Sepolia) và đưa các quy tắc chống scalping **trực tiếp vào smart contract**, không chỉ dựa vào backend:

| Quy tắc | Mô tả |
|--------|--------|
| Giới hạn sở hữu | Tối đa **2 vé / ví / loại sự kiện** (`eventChainId`) |
| Trần giá resale | Giá bán lại ≤ **110%** giá gốc khi mint |
| Khóa chuyển nhượng | Không list/resale trước khi hết thời gian khóa (**60 giây** trên local, **24 giờ** trên Sepolia) |
| Royalty | **5%** mỗi giao dịch resale về `organizerTreasury` |
| Chuỗi TicketBlock | Mỗi mint tạo một “block” hash nối với block trước — lịch sử mint có thể xác minh on-chain |

### Vai trò người dùng


| Vai trò | Khả năng chính |
|---------|----------------|
| **User** | Đăng ký/đăng nhập, liên kết ví, mua vé sơ cấp, xem vé, đăng bán / mua lại trên marketplace |
| **Organizer** | Quản lý sự kiện, xem dashboard, faucet ETH lab, mint hàng loạt (admin API) |
| **Admin** | Toàn quyền organizer + quản lý người dùng / phân quyền |

### Stack công nghệ


| Lớp | Công nghệ |
|-----|-----------|
| Blockchain | geth 1.13.x, Clique PoA, `chainId = 12345` |
| Smart contract | Solidity 0.8.28, Hardhat, OpenZeppelin 5.0.2, `evmVersion: paris` |
| Backend | Node.js, Express, MongoDB, ethers.js, JWT, bcrypt |
| Frontend | React, Vite, MetaMask (`window.ethereum`) |
| Đồng bộ | Backend listener bắt event contract → cập nhật MongoDB (cache) |

**Nguyên tắc thiết kế quan trọng:** nguồn chân lý của vé nằm **trên contract**. MongoDB chỉ là cache / chỉ mục để UI và báo cáo nhanh; client **không** được tự đổi `tokenId`, giá gốc hay trạng thái on-chain qua API.

---

## 2. Kiến trúc tổng thể

```
┌─────────────────────────────────────────────────────────────────┐
│  Frontend (React + Vite)  ·  http://localhost:5173              │
│  · Auth JWT  ·  MetaMask ký tx  ·  Proxy /api → backend         │
└───────────────┬─────────────────────────────┬───────────────────┘
                │ HTTP /api                   │ eth_sendTransaction
                ▼                             ▼
┌───────────────────────────┐    ┌────────────────────────────────┐
│  Backend (Express :5001)  │    │  geth private-net              │
│  · JWT / CRUD / Admin     │◄───│  Node1 RPC :8545 (chainId 12345)│
│  · blockchainListener     │    │  Node2 RPC :8546               │
│  · admin signer / faucet  │    │  EventTicket + Marketplace      │
└─────────────┬─────────────┘    └────────────────────────────────┘
              │
              ▼
       MongoDB :27017
       (users, events, tickets cache, transactions)
```

Thứ tự khởi động **bắt buộc**:

1. **geth private-net** (RPC sống)  
2. **Deploy smart contract** (lần đầu hoặc sau khi reset chain)  
3. **MongoDB + Backend** (listener + API)  
4. **Frontend + MetaMask**

---

## 3. Cơ chế chống scalping

### On-chain (`EventTicket` + `Marketplace`)

1. **`MAX_TICKETS_PER_WALLET = 2`**  
   Mỗi địa chỉ chỉ mint tối đa 2 NFT cho cùng một `eventChainId`. Chặn bot gom vé bằng một ví.

2. **Trần resale 110%**  
   `maxAllowed = originalPrice * 110 / 100`. `listTicket` / mua lại bị revert nếu vượt trần.

3. **Transfer lock**  
   `unlockTime = mintedAt + transferLockSeconds`. Trước thời điểm này không được list. Local dùng khóa ngắn (60s) để demo; Sepolia dùng 24h sát thực tế.

4. **Royalty 5%**  
   Khi `buyResaleTicket`, một phần ETH chuyển về treasury organizer; phần còn lại cho seller.

5. **TicketBlock (chuỗi hash)**  
   Mỗi mint tạo `TicketBlock` với  
   `blockHash = keccak256(index, tokenId, eventChainId, owner, price, mintedAt, prevBlockHash)`.  
   Backend/UI có thể gọi API chuỗi block để kiểm tra toàn vẹn lịch sử mint.

### Off-chain (hỗ trợ)

- Rate limit API lúc mở bán  
- Phân quyền admin/organizer  
- Dashboard theo dõi mint / resale / royalty  
- Faucet lab cấp ETH cho ví test (không thay thế quy tắc on-chain)

---

## 4. Cấu trúc thư mục

```
ticket-anti-scalping/
├── README.md                      # Tài liệu này
├── HUONG-DAN-CAI-DAT.md           # Checklist cài đặt bổ sung
├── luong-du-an.md                 # Tóm tắt luồng nghiệp vụ
├── thiet-ke-du-an.md              # Schema DB, API, thiết kế chi tiết
├── phan-cong-3-nguoi.md           # Phân công nhóm
│
├── blockchain/
│   └── private-net/               # geth Clique 2 node, genesis, scripts
│       ├── genesis.json
│       ├── accounts.json
│       ├── scripts/               # init, start-all, status, stop, …
│       ├── metamask/              # Helper thêm mạng vào MetaMask
│       └── HUONG-DAN.md
│
├── smart-contract/
│   ├── contracts/
│   │   ├── EventTicket.sol        # NFT vé + TicketBlock
│   │   └── Marketplace.sol        # Resale chống scalping
│   ├── scripts/deploy.js
│   ├── test/
│   ├── hardhat.config.js
│   └── deployments/localhost.json # Địa chỉ sau deploy
│
├── backend/
│   └── src/
│       ├── server.js
│       ├── models/                # User, Event, Ticket, Transaction, LabWallet
│       ├── controllers/ · routes/ · middlewares/
│       ├── services/              # blockchainService, listener, adminChain
│       ├── scripts/seed.js
│       └── abi/                   # ABI đồng bộ từ Hardhat
│
└── frontend/
    └── src/
        ├── pages/                 # Home, EventDetail, MyTickets, Marketplace, Admin, UserPortal
        ├── context/               # AuthContext, WalletContext
        ├── services/              # api.js, contract.js, abi/
        └── components/
```

---

## 5. Yêu cầu môi trường


| Công cụ | Phiên bản gợi ý | Mục đích |
|---------|-----------------|----------|
| Node.js | ≥ 18 | Backend, frontend, Hardhat |
| npm | ≥ 9 | Cài dependency |
| geth | **1.13.x** (đã kiểm với 1.13.15) | Private-net Clique |
| MongoDB | 7.x | Cache & tài khoản |
| Docker (tuỳ chọn) | — | Chạy Mongo nhanh |
| MetaMask | Extension trình duyệt | Ký giao dịch |
| curl / bash | Có sẵn macOS/Linux | Script kiểm tra |


### Cổng cần trống


| Cổng | Dịch vụ |
|------|---------|
| 8545 / 8546 | geth HTTP RPC (node1 / node2) |
| 8551 / 8552 | geth Auth RPC |
| 30303 / 30304 | geth P2P |
| 27017 | MongoDB |
| **5001** | Backend API (tránh 5000 — AirPlay trên macOS) |
| 5173 | Frontend Vite |


### Cài nhanh trên macOS

```bash
brew install node ethereum
node -v && npm -v && geth version
```

Nếu geth ≥ 1.14, một số flag mining/API có thể khác — ưu tiên giữ **1.13.x** cho lab đồ án.

---

## 6. Cài đặt và chạy (chi tiết)

Giả định thư mục gốc dự án:

```bash
cd /đường/dẫn/ticket-anti-scalping
```

### 6.1. Bước 1 — Khởi động geth private-net

```bash
cd blockchain/private-net
chmod +x scripts/*.sh

# Chỉ lần đầu (hoặc khi muốn xóa data chain và tạo lại)
./scripts/init.sh

./scripts/start-all.sh
./scripts/connect-peers.sh
./scripts/status.sh
```

Kiểm tra `chainId`:

```bash
curl -s -X POST http://127.0.0.1:8545 \
  -H 'Content-Type: application/json' \
  --data '{"jsonrpc":"2.0","method":"eth_chainId","params":[],"id":1}'
```

Kết quả mong đợi: `"result":"0x3039"` (hex của **12345**).

**Unlock deployer** (cần cho deploy / faucet / mint admin):

```text
Địa chỉ: 0xdecc0bf86a34de96B161b1F910ce2684d36bb4B4
Mật khẩu keystore: ticket123  (file password.txt)
```

```bash
curl -s -X POST http://127.0.0.1:8545 \
  -H 'Content-Type: application/json' \
  --data '{"jsonrpc":"2.0","method":"personal_unlockAccount","params":["0xdecc0bf86a34de96B161b1F910ce2684d36bb4B4","ticket123",0],"id":1}'
```

Dừng mạng: `./scripts/stop-nodes.sh`.

Chi tiết thêm: [`blockchain/private-net/HUONG-DAN.md`](./blockchain/private-net/HUONG-DAN.md).

---

### 6.2. Bước 2 — Compile, test và deploy smart contract

```bash
cd smart-contract
npm install
npx hardhat compile
npx hardhat test          # chạy trên Hardhat in-memory (không cần geth)
```

**Lưu ý:** dự án pin OpenZeppelin **`5.0.2`**. Bản OZ mới hơn có thể dùng opcode Cancun — **không tương thích** cấu hình Clique `evmVersion: paris`.

Deploy lên geth (RPC `:8545` đang chạy, deployer đã unlock hoặc có `DEPLOYER_PRIVATE_KEY` trong `.env`):

```bash
npx hardhat run scripts/deploy.js --network localhost
```

Script `deploy.js` sẽ:

1. Deploy `EventTicket` và `Marketplace`
2. Gọi `configureEvent` cho loại vé mẫu (`eventChainId` 1 = Standard 0.01 ETH, 2 = VIP 0.05 ETH)
3. Copy ABI vào `backend/src/abi/` và `frontend/src/services/abi/`
4. Ghi `deployments/localhost.json`
5. Cập nhật địa chỉ contract trong `backend/.env` và `frontend/.env` (nếu file đã tồn tại)

Mỗi lần chạy lại `init.sh` (xóa chain) → **bắt buộc deploy lại** → restart backend.

---

### 6.3. Bước 3 — MongoDB và Backend

**MongoDB (Docker):**

```bash
docker run -d --name ticket-mongo -p 27017:27017 mongo:7
```

Hoặc dùng Mongo local / Atlas và chỉnh `MONGODB_URI`.

```bash
cd backend
npm install
cp .env.example .env
# Kiểm tra PORT=5001, RPC, địa chỉ contract sau deploy
npm run seed
npm run dev
```

Seed tạo:

| Email | Mật khẩu | Vai trò |
|-------|----------|---------|
| `admin@ticket.local` | `admin123` | admin |
| `organizer@ticket.local` | `organizer123` | organizer |

và sự kiện mẫu **Đêm Nhạc Anti-Scalping** (Standard / VIP khớp `eventChainId` 1 và 2).

Kiểm tra health:

```bash
curl -s http://127.0.0.1:5001/api/health
```

---

### 6.4. Bước 4 — Frontend

```bash
cd frontend
npm install
cp .env.example .env
# VITE_CHAIN_ID=12345, VITE_RPC_URL, địa chỉ contract sau deploy
npm run dev
```

Mở **http://localhost:5173**.  
Vite proxy: `/api` → `http://localhost:5001`.

Build production: `npm run build && npm run preview`.

---

### 6.5. Chạy nhanh (đã quen cấu hình)

```bash
# Terminal 1 — geth
cd blockchain/private-net && ./scripts/start-all.sh

# Terminal 2 — deploy (lần đầu / sau reset chain)
cd smart-contract && npx hardhat run scripts/deploy.js --network localhost

# Terminal 3 — backend
cd backend && npm run seed && npm run dev

# Terminal 4 — frontend
cd frontend && npm run dev
```

---

## 7. Cấu hình MetaMask


| Trường | Giá trị |
|--------|---------|
| Network name | Ticket Private Clique |
| RPC URL | `http://127.0.0.1:8545` |
| Chain ID | `12345` |
| Currency symbol | ETH |

Frontend có thể gợi ý chuyển mạng nếu đang sai chain.

Helper thêm mạng:

```bash
cd blockchain/private-net
./scripts/serve-metamask.sh
# http://127.0.0.1:8765/
```

**Import ví lab:** dùng keystore trong `node1/keystore/` (mật khẩu `ticket123`) hoặc private key ví do admin tạo trên `/admin`. Ví người mua cần có ETH (faucet admin) để trả gas + giá vé.

---

## 8. Luồng hoạt động chi tiết

### 8.1. Luồng sơ cấp — mua vé từ ban tổ chức

```
User mở Event Detail → chọn loại vé (eventChainId) → "Mua vé"
    → MetaMask ký mintTicket(eventChainId) + gửi đúng priceWei
    → EventTicket kiểm tra:
          · event active
          · còn slot totalSupply
          · ticketsPerWalletPerEvent < 2
          · msg.value == priceWei
    → Mint ERC-721, ghi TicketInfo, tạo TicketBlock (hash nối prev)
    → Emit TicketMinted + TicketBlockCreated
    → Backend listener bắt event → upsert Ticket + Transaction (type: mint)
    → UI /my-tickets hiển thị NFT (đọc DB cache + có thể verify on-chain)
```

### 8.2. Luồng thứ cấp — chợ resale

```
Chủ vé hết thời gian khóa → nhập giá ≤ 110% giá gốc → approve Marketplace → listTicket
    → Emit TicketListed → listener: Ticket.status = listed_for_resale

Người mua thấy listing → buyResaleTicket{ value: price }
    → Kiểm tra listing active, đủ ETH, vẫn trong quy tắc
    → Chuyển NFT buyer; ETH: royalty 5% → treasury, còn lại → seller
    → Listing inactive
    → Emit TicketSold → listener: ownerWallet = buyer, status = owned, ghi Transaction (resale)
```

### 8.3. Luồng quản trị

```
Admin/Organizer đăng nhập /admin (JWT)
    → Dashboard: thống kê mint, resale, royalty
    → Cấp ETH / tạo ví lab
    → Mint batch (adminMint) cho địa chỉ test
    → Xem chuỗi TicketBlock / verifyChain
    → Quản lý user: role, khóa tài khoản (admin)
```

### 8.4. Luồng đồng bộ Blockchain → DB

```
geth seal block mới
    → blockchainListener.js poll/subscribe
    → TicketMinted | TicketListed | TicketSold | TicketBlockCreated
    → Cập nhật tickets / transactions
    → Không cho client API tự ghi đè trạng thái on-chain
```

### 8.5. Mạng hỗ trợ


| Mạng | Chain ID | RPC | Mục đích |
|------|----------|-----|----------|
| Geth Private Clique | 12345 | `http://127.0.0.1:8545` | Dev chính |
| Hardhat in-memory | 31337 | (nội bộ) | Unit test |
| Sepolia | 11155111 | RPC công khai / Infura | Demo public |

---

## 9. Giải thích từng thành phần

### 9.1. `blockchain/private-net` — Mạng lab

- **Clique PoA**, 2 node (signer peer), `chainId 12345`.
- Genesis cấp ETH lớn cho deployer để deploy và faucet.
- Scripts: `init`, `start-all`, `connect-peers`, `status`, `stop-nodes`, demo TicketBlock, serve MetaMask helper.
- Đây là “Ethereum thu nhỏ” trên máy local: không phụ thuộc testnet công cộng khi phát triển.

### 9.2. `smart-contract/EventTicket.sol`

- ERC-721 tên **Ticket Anti-Scalping** (`TIX`).
- `configureEvent(eventChainId, totalSupply, priceWei, name)` — owner cấu hình loại vé.
- `mintTicket(eventChainId)` payable — mua sơ cấp.
- Mapping `ticketsPerWalletPerEvent`, `soldCount`, `TicketInfo(eventChainId, price, mintedAt)`.
- **TicketBlock**: chuỗi hash liên kết; `latestBlockHash` / `latestBlockIndex` cho tip.
- Ownable + ReentrancyGuard; treasury organizer có thể cập nhật.

### 9.3. `smart-contract/Marketplace.sol`

- Giữ tham chiếu bất biến tới `EventTicket`.
- `listTicket`, `buyResaleTicket`, hủy listing (seller).
- Hằng số: `MAX_RESALE_PERCENT = 110`, `ROYALTY_PERCENT = 5`.
- `transferLockSeconds` cấu hình được (local ngắn / Sepolia dài).
- View helpers: `getMaxAllowedPrice`, `getUnlockTime`, `getListing`.

### 9.4. `smart-contract/scripts/deploy.js` & Hardhat

- Mạng `localhost` → geth `:8545` / chainId 12345.
- Sau deploy đồng bộ ABI + địa chỉ sang backend/frontend — giảm cấu hình tay.
- Test: `EventTicket.test.js`, `Marketplace.test.js` (mint vượt supply, trần giá, khóa chuyển nhượng).

### 9.5. Backend — Express API

**Entry:** `src/server.js` — CORS, JSON, Morgan, rate limit `/api`, gắn routes, kết nối Mongo, start listener.

**Models (MongoDB):**

| Collection | Vai trò |
|------------|---------|
| `users` | Email, passwordHash, walletAddress, role (`user` / `organizer` / `admin`) |
| `events` | Metadata sự kiện + `ticketTypes[].eventChainId` khớp contract |
| `tickets` | **Cache** NFT: tokenId, ownerWallet, originalPrice, status |
| `transactions` | Lịch sử mint/resale theo `txHash` |
| `labwallets` | Ví lab tạo bởi admin (faucet) |

**Routes chính:**

| Prefix | Chức năng |
|--------|-----------|
| `/api/auth` | register, login, link-wallet |
| `/api/events` | danh sách / chi tiết / CRUD (theo quyền) |
| `/api/tickets` | vé theo ví, chuỗi TicketBlock |
| `/api/marketplace` | listing active, lịch sử giao dịch |
| `/api/admin` | dashboard, users, create-wallets, mint-tickets, faucet |

**Services:**

- `blockchainService.js` — đọc contract (ethers).
- `blockchainListener.js` — đồng bộ event → DB.
- `adminChainService.js` — unlock/ký bằng deployer: chuyển ETH, `adminMintBatch`.

**Middlewares:** JWT (`authMiddleware`), rate limiter, error handler chuẩn `{ success, data | error }`.

### 9.6. Frontend — React + Vite

| Route | Mô tả |
|-------|--------|
| `/` | Danh sách sự kiện |
| `/events/:id` | Chi tiết + mua vé sơ cấp |
| `/my-tickets` | Vé của ví MetaMask đang kết nối |
| `/marketplace` | Xem listing / mua lại / (luồng đăng bán) |
| `/user` | Đăng ký, đăng nhập, liên kết ví |
| `/admin` | AdminLTE: sự kiện, faucet, mint, chuỗi block, quản lý user |

**Context:**

- `AuthContext` — JWT session.
- `WalletContext` / `useWallet` — kết nối MetaMask, đúng chainId, gọi contract qua `services/contract.js`.

Giao dịch thay đổi ownership **chỉ** qua MetaMask → contract; API chỉ phục vụ đọc metadata và admin lab.

### 9.7. Vai trò dữ liệu: on-chain vs off-chain

```
On-chain (thật):     ownership NFT, giá mint, listing, royalty, TicketBlock
Off-chain (cache):   email/role, mô tả sự kiện, ảnh bìa, index tìm kiếm, thống kê UI
```

Nếu DB lệch, ưu tiên đọc lại từ RPC/contract hoặc chạy lại listener từ block đã biết.

---

## 10. Tài khoản & cổng lab


| Hạng mục | Giá trị |
|----------|---------|
| RPC | `http://127.0.0.1:8545` |
| Chain ID | `12345` |
| API | `http://localhost:5001` |
| UI | `http://localhost:5173` |
| Admin | `admin@ticket.local` / `admin123` |
| Organizer | `organizer@ticket.local` / `organizer123` |
| Deployer | `0xdecc0bf86a34de96B161b1F910ce2684d36bb4B4` |
| Keystore password | `ticket123` |
| Transfer lock (local) | ~60 giây |
| Resale cap | 110% giá gốc |
| Royalty | 5% |

---

## 11. Smoke test end-to-end

1. `blockchain/private-net/./scripts/status.sh` — 2 node peer, đang seal block.  
2. `curl http://127.0.0.1:5001/api/health` — có địa chỉ `ticket` + `marketplace`.  
3. Mở `http://localhost:5173` — thấy sự kiện mẫu.  
4. Đăng nhập `/admin` bằng admin seed.  
5. Tab **Cấp ETH / Ví** → tạo 1–2 ví lab.  
6. Tab **Mint vé** → mint `eventChainId = 1` cho các ví đó.  
7. Tab **Chuỗi block vé** — tip tăng, verify chain hợp lệ.  
8. Import ví lab vào MetaMask → `/my-tickets` thấy NFT.  
9. Đợi hết khóa (~60s) → list resale ≤ 110% → ví khác mua lại → kiểm tra royalty treasury.  
10. Tab **Người dùng & quyền** — đổi role / khóa user thử phân quyền.

---

## 12. Xử lý lỗi thường gặp


| Hiện tượng | Hướng xử lý |
|------------|-------------|
| `eth_chainId` không trả `0x3039` | Chưa start geth / sai cổng; chạy `start-all.sh` + `status.sh` |
| Deploy revert / không gửi được tx | Unlock deployer hoặc set `DEPLOYER_PRIVATE_KEY`; kiểm tra số dư |
| Backend không sync vé | Sai địa chỉ contract trong `.env`; restart sau deploy; RPC down |
| Frontend gọi API lỗi CORS / 404 | Backend `:5001`, `VITE_API_BASE_URL=/api`, proxy Vite |
| MetaMask sai mạng | Thêm chain 12345, RPC `127.0.0.1:8545` |
| `listTicket` revert TransferLocked | Chưa hết thời gian khóa sau mint |
| `listTicket` / buy revert PriceExceedsResaleCap | Giá > 110% giá gốc |
| Compile OZ / opcode lạ | Giữ OpenZeppelin 5.0.2 + `evmVersion: paris` |
| Reset chain mất contract | `init.sh` lại → deploy lại → cập nhật `.env` → restart backend |

---

## 13. Tài liệu liên quan

| File | Nội dung |
|------|----------|
| [`HUONG-DAN-CAI-DAT.md`](./HUONG-DAN-CAI-DAT.md) | Checklist cài đặt đầy đủ, biến môi trường, troubleshooting mở rộng |
| [`blockchain/private-net/HUONG-DAN.md`](./blockchain/private-net/HUONG-DAN.md) | Chi tiết geth 2 node |
| [`luong-du-an.md`](./luong-du-an.md) | Luồng nghiệp vụ ngắn |
| [`thiet-ke-du-an.md`](./thiet-ke-du-an.md) | Schema MongoDB, API, thiết kế contract |
| [`phan-cong-3-nguoi.md`](./phan-cong-3-nguoi.md) | Phân công nhóm |
| [`smart-contract/README.md`](./smart-contract/README.md) | Hardhat / contract |
| [`backend/README.md`](./backend/README.md) | API backend |
| [`frontend/README.md`](./frontend/README.md) | UI React |

---

## Giấy phép & ghi chú

Mã nguồn phục vụ mục đích học tập / đồ án. **Không** dùng private key lab trên mainnet hoặc ví có tiền thật. File `.env`, `password.txt`, keystore chứa bí mật — đã nằm trong `.gitignore`; không commit lên GitHub.
