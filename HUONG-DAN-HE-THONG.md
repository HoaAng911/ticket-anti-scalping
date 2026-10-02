# Hướng dẫn hệ thống — Ticket Anti-Scalping

| Mục | Nội dung |
|-----|----------|
| Phiên bản tài liệu | 1.0 |
| Đối tượng | Ban giám khảo, mentor kỹ thuật, thành viên vận hành lab |
| Phạm vi | Kiến trúc, mô hình nghiệp vụ, triển khai local, kiểm thử chấp nhận |
| Môi trường tham chiếu | macOS / Linux · geth Clique `chainId = 12345` |
| Liên quan | [`README.md`](./README.md) (giải thích học thuật) · [`HUONG-DAN-CAI-DAT.md`](./HUONG-DAN-CAI-DAT.md) (checklist cài đặt) |

---

## Mục lục

1. [Tóm tắt điều hành](#1-tóm-tắt-điều-hành)
2. [Mục tiêu và phạm vi](#2-mục-tiêu-và-phạm-vi)
3. [Mô hình nghiệp vụ: sự kiện — hạng vé — NFT — TicketBlock](#3-mô-hình-nghiệp-vụ-sự-kiện--hạng-vé--nft--ticketblock)
4. [Kiến trúc kỹ thuật](#4-kiến-trúc-kỹ-thuật)
5. [Quy tắc chống scalping](#5-quy-tắc-chống-scalping)
6. [Luồng tiền và minh bạch sổ cái](#6-luồng-tiền-và-minh-bạch-sổ-cái)
7. [Vai trò người dùng](#7-vai-trò-người-dùng)
8. [Thủ tục triển khai lab](#8-thủ-tục-triển-khai-lab)
9. [Cấu hình MetaMask](#9-cấu-hình-metamask)
10. [Luồng vận hành chính](#10-luồng-vận-hành-chính)
11. [API và giao diện tham chiếu](#11-api-và-giao-diện-tham-chiếu)
12. [Thông số lab mặc định](#12-thông-số-lab-mặc-định)
13. [Kiểm thử chấp nhận](#13-kiểm-thử-chấp-nhận)
14. [Xử lý sự cố](#14-xử-lý-sự-cố)
15. [Ranh giới trách nhiệm dữ liệu](#15-ranh-giới-trách-nhiệm-dữ-liệu)

---

## 1. Tóm tắt điều hành

**Ticket Anti-Scalping** là nền tảng bán vé sự kiện dưới dạng NFT (ERC-721) trên mạng Ethereum riêng (geth Clique PoA). Các ràng buộc chống đầu cơ — giới hạn số vé mỗi ví, trần giá bán lại, khóa chuyển nhượng, royalty — được thực thi **trên smart contract**, không phụ thuộc lòng tin vào backend.

| Thành phần | Công nghệ | Cổng / định danh |
|------------|-----------|------------------|
| Sổ cái phân tán | geth 1.13.x · 2 node peer | RPC `:8545` / `:8546` · `chainId 12345` |
| Hợp đồng | `EventTicket`, `Marketplace` | Solidity 0.8.28 · OZ 5.0.2 |
| API | Express · ethers.js · JWT | `:5001` |
| Lưu trữ phụ trợ | MongoDB | `:27017` |
| Ứng dụng người dùng | React · Vite · MetaMask | `:5173` |

**Nguyên tắc thiết kế:** trạng thái sở hữu vé, listing, giá mint và chuỗi TicketBlock lấy từ **ledger**. MongoDB phục vụ xác thực, metadata sự kiện và cache write-behind.

---

## 2. Mục tiêu và phạm vi

### 2.1. Mục tiêu

1. Số hóa vé dưới dạng NFT, truy xuất được trên sổ cái.
2. Hạn chế gom vé và đẩy giá trên kênh bán lại nội bộ.
3. Đảm bảo doanh thu sơ cấp về ví ban tổ chức; công khai dòng tiền qua event logs.
4. Duy trì khả năng kiểm chứng lịch sử mint qua chuỗi hash TicketBlock.

### 2.2. Trong phạm vi

- Mạng lab private Clique (và tùy chọn Sepolia).
- Mua sơ cấp, bán lại có kiểm soát, dashboard quản trị, faucet ETH lab.
- Đồng bộ event contract rồi Mongo (cache).

### 2.3. Ngoài phạm vi

- Mainnet production, KYC pháp lý đầy đủ.
- Hóa đơn điện tử đã đăng ký với cơ quan thuế (lab vẫn có **hóa đơn GTGT PDF mô phỏng** — mục 6.4).
- Cầu nối cross-chain; ví ngoài MetaMask chưa chuẩn hóa trong lab.

---

## 3. Mô hình nghiệp vụ: sự kiện — hạng vé — NFT — TicketBlock

### 3.1. Phân tầng khái niệm

Hệ thống tách rõ **ba tầng**. Việc nhầm lẫn các tầng này là nguyên nhân phổ biến khi đánh giá “tạo sự kiện mà chưa thấy node”.

| Tầng | Định danh | Nơi lưu | Hàm / thao tác | Tạo TicketBlock? |
|------|-----------|---------|----------------|------------------|
| **Sự kiện** | Document Mongo `events` | Off-chain | Tạo/sửa qua Admin API | **Không** |
| **Hạng vé** | `eventChainId` (uint) | On-chain `eventConfigs` + `ticketTypes[]` trong Mongo | `configureEvent(...)` | **Không** |
| **Vé NFT** | `tokenId` (ERC-721) | On-chain | `mintTicket` / `adminMint` | **Có — đúng 1 node / 1 vé** |

**Kết luận vận hành:** cấu hình sự kiện và hạng vé chỉ **mở bán**. Chỉ khi mint (người mua hoặc admin) mới sinh NFT và append **một node TicketBlock**.

### 3.2. Quan hệ sự kiện và hạng vé

- Một sự kiện (ví dụ “Đêm Nhạc Anti-Scalping”) có thể gồm nhiều hạng: Standard, VIP, …
- Mỗi hạng map 1–1 với một `eventChainId` trên contract.
- Frontend khi mua vé gọi `mintTicket(eventChainId, priceWei)` — tham số là `eventChainId`, **không** phải `_id` Mongo.

| Trường Mongo (`ticketTypes[]`) | Trường contract (`eventConfigs[id]`) |
|--------------------------------|--------------------------------------|
| `eventChainId` | Khóa mapping |
| `name` | `name` |
| `price` (ETH) | `priceWei` |
| `totalSupply` | `totalSupply` |
| (UI metadata) | `active`, `soldCount` |

### 3.3. TicketBlock (node trên sổ cái)

**TicketBlock** là mắt xích hash gắn với mỗi lần mint, tạo thành linked-list toàn cục trên contract:

```
blockHash = keccak256(index, tokenId, eventChainId, owner, price, mintedAt, prevBlockHash)
```

| Thuật ngữ | Ý nghĩa | Không nhầm với |
|-----------|---------|----------------|
| **geth node** | Máy chạy client Ethereum (node1, node2) | — |
| **TicketBlock node** | Bản ghi hash của một lần mint | Máy geth |

Đặc điểm:

- Chuỗi **chung** cho mọi hạng vé (không tách chuỗi theo sự kiện).
- Resale **không** tạo TicketBlock mới; chỉ đổi chủ / listing.
- Tip hiện tại: `latestBlockIndex` / `latestBlockHash`; xác minh: `verifyChain(from, to)`.

### 3.4. Ma trận thao tác

| Thao tác | Off-chain | On-chain | NFT mới? | TicketBlock mới? |
|----------|-----------|----------|----------|------------------|
| Tạo sự kiện + hạng vé | Insert `Event` | `configureEvent` × N hạng | Không | Không |
| Thêm hạng vé | Push `ticketTypes` | `configureEvent` | Không | Không |
| Mua sơ cấp | Cache listener | `mintTicket` + chuyển ETH treasury | Có | Có |
| Admin mint | Cache listener | `adminMint` / `adminMintBatch` | Có | Có |
| List / mua resale | Cập nhật cache | `listTicket` / `buyResaleTicket` | Không* | Không |

\*Resale chuyển ownership NFT hiện có.

---

## 4. Kiến trúc kỹ thuật

### 4.1. Sơ đồ thành phần

```
┌──────────────────────────────┐
│  Frontend :5173              │
│  React · MetaMask · JWT      │
└───────────┬───────────┬──────┘
            │ /api      │ eth_sendTransaction
            v           v
┌───────────────────┐  ┌────────────────────────────┐
│  Backend :5001    │  │  Ledger (Clique PoA)        │
│  Express · JWT    │  │  node1 :8545 và node2 :8546│
│  Listener (WB)    │--đọc từ--|  EventTicket · Marketplace  │
└─────────┬─────────┘  └────────────────────────────┘
          v
     MongoDB :27017
```

### 4.2. Thứ tự khởi động bắt buộc

1. Private-net geth (2 node, peer sync).
2. Deploy / xác nhận địa chỉ `EventTicket` + `Marketplace`.
3. MongoDB + Backend (seed + listener + sync Mongo sang chain nếu cần).
4. Frontend Vite + MetaMask đúng `chainId`.

### 4.3. Các module chính

| Module | Trách nhiệm |
|--------|-------------|
| `EventTicket.sol` | ERC-721, cấu hình hạng vé, mint, TicketBlock, thanh toán sơ cấp |
| `Marketplace.sol` | List/resale, trần 110%, royalty 5%, khóa chuyển nhượng |
| `blockchainService.js` | Đọc ledger (ownership, listing, money-flow, chain tip) |
| `blockchainListener.js` | Write-behind Mongo từ event logs |
| `adminChainService.js` | `configureEvent`, faucet, admin mint, sync |

---

## 5. Quy tắc chống scalping

| Quy tắc | Tham số lab | Thực thi |
|---------|-------------|---------|
| Giới hạn sở hữu sơ cấp | Tối đa **2** vé / ví / `eventChainId` | `mintTicket` revert `TooManyTicketsPerWallet` |
| Trần giá bán lại | ≤ **110%** giá gốc mint | `listTicket` / mua lại |
| Khóa chuyển nhượng | Local **60 giây**; Sepolia **24 giờ** | `TransferLocked` trước `unlockTime` |
| Royalty ban tổ chức | **5%** giá resale | Chuyển về `organizerTreasury` |
| Chuỗi TicketBlock | 1 node / 1 mint | Toàn vẹn lịch sử mint |

---

## 6. Luồng tiền, thuế GTGT và hóa đơn

### 6.1. Mua sơ cấp

1. Người mua gửi đúng `priceWei` kèm `mintTicket`.
2. Contract chuyển **100%** `msg.value` tới `organizerTreasury`.
3. Emit `PaymentToOrganizer`; cộng `totalPrimaryRevenue` / `primaryRevenueByEvent`.

### 6.2. Mua lại (resale)

1. Người mua gửi đúng giá listing.
2. **5%** về treasury (royalty); **95%** về seller.
3. Emit `TicketSold` và `PaymentSplit`; cập nhật `totalRoyaltyPaid`, `totalResaleVolume`.

### 6.3. Kênh kiểm toán công khai

| Kênh | Địa chỉ / endpoint |
|------|---------------------|
| UI | `/ledger` — trang **Dòng tiền** |
| API | `GET /api/marketplace/money-flow` |
| On-chain | Lọc event `PaymentToOrganizer`, `PaymentSplit` |

Không yêu cầu đăng nhập để xem tổng hợp dòng tiền từ ledger.

### 6.4. Sau khi mua vé sự kiện — luôn xuất hóa đơn và xem được

**Quy tắc vận hành:** mọi lần mua vé sơ cấp gắn sự kiện (trang `/events/:id` hoặc giỏ `/cart`) đều **xuất hóa đơn GTGT PDF** và người dùng **xem lại được**.

| Bước | Nội dung |
|------|----------|
| 1 | Mint NFT; lưu `tokenId`, `txHash` |
| 2 | Tách GTGT 10% (giá đã gồm thuế); TTĐB không áp dụng |
| 3 | Ghi Mongo + file PDF (`backend/storage/invoices/`) |
| 4 | Mở PDF ngay sau thanh toán |

| Ai | Xem ở đâu |
|----|-----------|
| Người mua | `/my-invoices` — danh sách HĐ |
| Người mua | `/my-tickets` — bấm vé rồi xem / in PDF |
| Admin / Organizer | `/admin` → tab **Hóa đơn** |

API: `POST /api/invoices`, `GET /api/invoices/by-wallet/:wallet`, `GET /api/invoices/by-token/:tokenId`, `GET /api/invoices/:id/pdf`.

---

## 7. Vai trò người dùng

| Vai trò | Quyền chính |
|---------|-------------|
| **User** | Đăng ký/đăng nhập, liên kết ví, mua vé, nhận và xem hóa đơn PDF, my-tickets, marketplace, dòng tiền |
| **Organizer** | Quản lý sự kiện/hạng vé, dashboard, faucet lab, mint thử, chuỗi TicketBlock, quản lý hóa đơn |
| **Admin** | Toàn quyền organizer + quản trị người dùng và phân quyền |

Tài khoản seed lab:

| Email | Mật khẩu | Vai trò |
|-------|----------|---------|
| `admin@ticket.local` | `admin123` | Admin |
| `organizer@ticket.local` | `organizer123` | Organizer |

---

## 8. Thủ tục triển khai lab

Giả định thư mục gốc repository: `ticket-anti-scalping/`.

### 8.1. Yêu cầu phần mềm

| Công cụ | Phiên bản khuyến nghị |
|---------|------------------------|
| Node.js | ≥ 18 |
| npm | ≥ 9 |
| geth | **1.13.x** (đã kiểm với 1.13.15) |
| MongoDB | 7.x (hoặc Docker) |
| MetaMask | Extension trình duyệt |

### 8.2. Khởi động sổ cái

```bash
cd blockchain/private-net
chmod +x scripts/*.sh
./scripts/init.sh          # lần đầu hoặc sau khi reset data
./scripts/start-all.sh
./scripts/connect-peers.sh
./scripts/status.sh
```

Kiểm tra `chainId`:

```bash
curl -s -X POST http://127.0.0.1:8545 \
  -H 'Content-Type: application/json' \
  --data '{"jsonrpc":"2.0","method":"eth_chainId","params":[],"id":1}'
# Kỳ vọng: "0x3039" (12345)
```

Unlock deployer (mật khẩu keystore mặc định `ticket123`):

```bash
curl -s -X POST http://127.0.0.1:8545 \
  -H 'Content-Type: application/json' \
  --data '{"jsonrpc":"2.0","method":"personal_unlockAccount","params":["0xdecc0bf86a34de96B161b1F910ce2684d36bb4B4","ticket123",600],"id":1}'
```

### 8.3. Deploy hợp đồng

```bash
cd smart-contract
npm install
npx hardhat test
npx hardhat run scripts/deploy.js --network localhost
```

Script deploy ghi địa chỉ vào `deployments/localhost.json` và cập nhật `backend/.env`, `frontend/.env`, đồng bộ ABI.

### 8.4. Backend

```bash
# Mongo (ví dụ Docker)
docker run -d --name ticket-mongo -p 27017:27017 mongo:7

cd backend
npm install
npm run seed
npm run dev
# hoặc: node src/server.js
```

Xác nhận: `GET http://localhost:5001/api/health`.

### 8.5. Frontend

```bash
cd frontend
npm install
npm run dev
```

Mở `http://localhost:5173`.

---

## 9. Cấu hình MetaMask

| Trường | Giá trị |
|--------|---------|
| Network name | Ticket Private Clique |
| RPC URL | `http://127.0.0.1:8545` |
| Chain ID | `12345` |
| Currency | ETH |

Có thể dùng helper: `blockchain/private-net/scripts/serve-metamask.sh` (mở `http://127.0.0.1:8765/`).

Ví người mua cần ETH lab (faucet tại `/admin`) để trả gas và giá vé.

---

## 10. Luồng vận hành chính

### 10.1. Mở bán (không tạo TicketBlock)

```
Organizer/Admin tạo sự kiện + hạng vé
  1. Mongo lưu metadata
  2. Gọi configureEvent(eventChainId, supply, priceWei, name) trên EventTicket
  3. eventConfigs[id].active = true
```

### 10.2. Mua sơ cấp (NFT + TicketBlock + hóa đơn)

```
User chọn hạng (eventChainId), MetaMask gọi mintTicket
  1. Kiểm tra active / supply / hạn mức ví / msg.value
  2. Mint ERC-721, append TicketBlock, chuyển ETH về treasury
  3. Emit TicketMinted, TicketBlockCreated, PaymentToOrganizer
  4. Listener cập nhật cache Mongo
  5. Lưu hóa đơn GTGT + PDF (gắn tokenId); mở xem/in ngay
  6. User xem lại tại /my-invoices hoặc /my-tickets
```

### 10.3. Bán lại

```
Hết transfer lock, approve Marketplace, listTicket (giá ≤ 110%)
Người mua gọi buyResaleTicket
  1. Royalty 5% về treasury, 95% về seller, chuyển NFT
  2. Emit TicketSold, PaymentSplit
```

---

## 11. API và giao diện tham chiếu

### 11.1. API chính

| Prefix | Mô tả |
|--------|--------|
| `/api/auth` | Đăng ký, đăng nhập, liên kết ví |
| `/api/events` | Danh sách / chi tiết sự kiện |
| `/api/tickets` | Vé theo ví, remaining, chuỗi TicketBlock, ledger-status |
| `/api/marketplace/listings` | Listing đang bán (đọc từ ledger) |
| `/api/marketplace/money-flow` | Dòng tiền công khai từ event logs |
| `/api/invoices` | Tạo / xem hóa đơn PDF; by-wallet; by-token |
| `/api/admin/*` | Dashboard, faucet, mint, sync, **quản lý hóa đơn**, user |

### 11.2. Giao diện

| Đường dẫn | Chức năng |
|-----------|-----------|
| `/` | Danh sách sự kiện |
| `/events/:id` | Chi tiết và mua vé (xuất hóa đơn PDF) |
| `/cart` | Giỏ hàng, thanh toán, xuất hóa đơn PDF |
| `/my-tickets` | Vé theo ví; bấm vé để xem hóa đơn |
| `/my-invoices` | Danh sách hóa đơn của tôi (xem / in / tải PDF) |
| `/marketplace` | Chợ bán lại |
| `/ledger` | Dòng tiền minh bạch |
| `/admin` | Bảng điều khiển (có tab Hóa đơn) |
| `/user` | Tài khoản và liên kết ví |

---

## 12. Thông số lab mặc định

| Hạng mục | Giá trị |
|----------|---------|
| RPC node1 / node2 | `http://127.0.0.1:8545` / `:8546` |
| Chain ID | `12345` |
| API | `http://localhost:5001` |
| UI | `http://localhost:5173` |
| Deployer / treasury (lab) | `0xdecc0bf86a34de96B161b1F910ce2684d36bb4B4` |
| Keystore password | `ticket123` |
| Hạng mẫu | `eventChainId` 1 = Standard @ 0.01 ETH (100); 2 = VIP @ 0.05 ETH (20) |

> Địa chỉ contract thay đổi sau mỗi lần redeploy. Nguồn chân lý: `smart-contract/deployments/localhost.json` và các file `.env`.

---

## 13. Kiểm thử chấp nhận

Thực hiện tuần tự trên môi trường lab sạch hoặc sau redeploy + sync:

| # | Tiêu chí | Cách xác minh | Kỳ vọng |
|---|----------|---------------|---------|
| 1 | Sổ cái sẵn sàng | `status.sh` · `eth_chainId` | 2 node peer; `0x3039` |
| 2 | API sống | `GET /api/health` | Có địa chỉ ticket/marketplace; ledger OK |
| 3 | Cấu hình hạng vé | Tạo sự kiện hoặc seed | `configureEvent` thành công; **tip TicketBlock không đổi** |
| 4 | Mint sơ cấp | User mua hoặc admin mint | NFT xuất hiện; tip **+1**; treasury nhận ETH |
| 5 | Dòng tiền | `/ledger` hoặc money-flow API | Có bản ghi `primary_sale` |
| 6 | Chuỗi hash | Admin, mở chuỗi block / `verifyChain` | Liên kết prev rồi hiện tại hợp lệ |
| 7 | Resale hợp lệ | Hết lock · list ≤ 110% · mua | Ownership đổi; royalty 5% |
| 8 | Resale vượt trần | List > 110% | Transaction revert |
| 9 | Hạn mức ví | Mint lần 3 cùng `eventChainId` | Revert `TooManyTicketsPerWallet` |

---

## 14. Xử lý sự cố

| Hiện tượng | Nguyên nhân thường gặp | Hướng xử lý |
|------------|------------------------|-------------|
| Sai `chainId` | Private-net chưa chạy | `start-all.sh` · `status.sh` |
| Deploy / admin tx fail | Deployer bị khóa | `personal_unlockAccount` hoặc `DEPLOYER_PRIVATE_KEY` |
| Frontend gọi sai contract | Chưa restart Vite sau deploy | Cập nhật `.env` · restart `npm run dev` |
| Tip TicketBlock không tăng sau tạo sự kiện | Đúng thiết kế | Chỉ tăng khi mint |
| Vé Mongo lệch với chain | Redeploy / listener gián đoạn | Restart backend; `POST /api/admin/sync-events-to-chain` |
| MetaMask sai mạng | Chưa thêm chain 12345 | Thêm mạng theo mục 9 |
| `TransferLocked` | Chưa hết thời gian khóa | Đợi ~60s (lab) rồi list lại |
| Cổng 5001 bận | Process cũ còn sống | `lsof -i:5001` rồi kết thúc process |

Checklist chi tiết bổ sung: [`HUONG-DAN-CAI-DAT.md`](./HUONG-DAN-CAI-DAT.md).

---

## 15. Ranh giới trách nhiệm dữ liệu

```
Nguồn chân lý (on-chain)
  · ownerOf(tokenId), TicketInfo, eventConfigs, soldCount
  · Listing Marketplace, unlock time, max resale price
  · TicketBlock chain, PaymentToOrganizer, PaymentSplit
  · totalPrimaryRevenue, totalRoyaltyPaid, …

Dữ liệu phụ trợ (MongoDB)
  · User / JWT / role
  · Title, mô tả, địa điểm, thời gian sự kiện
  · Cache ticket & transaction phục vụ UI
```

Khi xung đột giữa Mongo và ledger: **ưu tiên đọc lại từ geth/contract**. Listener chỉ đồng bộ một chiều từ blockchain xuống cache.

---

## Phụ lục A — Thuật ngữ

| Thuật ngữ | Định nghĩa ngắn |
|-----------|-----------------|
| Scalping | Gom vé rồi bán lại giá cắt cổ |
| `eventChainId` | Định danh hạng vé trên contract |
| Primary sale | Bán sơ cấp từ ban tổ chức |
| Resale | Bán lại trên Marketplace nội bộ |
| Treasury | Ví nhận doanh thu BTO / royalty |
| Write-behind | Ghi cache DB sau khi ledger đã xác nhận |

## Phụ lục B — Tài liệu liên quan

| Tài liệu | Mục đích |
|----------|----------|
| [`README.md`](./README.md) | Tổng quan và giải thích học thuật |
| [`HUONG-DAN-CAI-DAT.md`](./HUONG-DAN-CAI-DAT.md) | Checklist cài đặt mở rộng |
| [`thiet-ke-du-an.md`](./thiet-ke-du-an.md) | Thiết kế schema / API |
| [`luong-du-an.md`](./luong-du-an.md) | Luồng nghiệp vụ rút gọn |
| [`blockchain/private-net/HUONG-DAN.md`](./blockchain/private-net/HUONG-DAN.md) | Vận hành geth 2 node |
| [`blockchain/private-net/TICKET-BLOCK.md`](./blockchain/private-net/TICKET-BLOCK.md) | Chi tiết TicketBlock |

---

*Tài liệu phục vụ triển khai và nghiệm thu môi trường lab. Không sử dụng khóa lab trên mainnet hoặc ví chứa tài sản thật.*
