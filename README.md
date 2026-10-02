# Ticket Anti-Scalping

Đồ án bán vé sự kiện bằng **NFT (ERC-721)** trên mạng Ethereum lab (geth Clique), kèm marketplace chống scalping.

| Lớp | Công nghệ |
|-----|-----------|
| Blockchain | geth 1.13.x · Clique PoA · `chainId = 12345` |
| Smart contract | Solidity · Hardhat · OpenZeppelin 5.0.2 |
| Backend | Node.js · Express · MongoDB · ethers.js · JWT |
| Frontend | React · Vite · MetaMask |

**Nguyên tắc:** trạng thái vé thật nằm **trên contract**. Mongo chỉ dùng cho auth, metadata sự kiện và cache.

**Clone repo lần đầu — làm theo:** [`HUONG-DAN-CAI-DAT.md`](./HUONG-DAN-CAI-DAT.md) (cài đặt và chạy từ Git đến full stack).

Tài liệu sâu hơn: [`HUONG-DAN-HE-THONG.md`](./HUONG-DAN-HE-THONG.md) · [`blockchain/README.md`](./blockchain/README.md) · [`smart-contract/README.md`](./smart-contract/README.md)

---

## Mục lục

0. [Luồng hoạt động chi tiết từng thành phần](#0-luồng-hoạt-động-chi-tiết-từng-thành-phần)
1. [Yêu cầu môi trường](#1-yêu-cầu-môi-trường)
2. [Cài đặt phụ thuộc theo hệ điều hành](#2-cài-đặt-phụ-thuộc-theo-hệ-điều-hành)
3. [Thứ tự cài đặt dự án (bắt buộc)](#3-thứ-tự-cài-đặt-dự-án-bắt-buộc)
4. [File `.env` — cách lấy và điền thông số](#4-file-env--cách-lấy-và-điền-thông-số)
5. [MetaMask](#5-metamask)
6. [Tài khoản lab](#6-tài-khoản-lab)
7. [Khởi động hàng ngày](#7-khởi-động-hàng-ngày)
8. [Smoke test](#8-smoke-test)
9. [Xử lý lỗi thường gặp](#9-xử-lý-lỗi-thường-gặp)

---

## 0. Luồng hoạt động chi tiết từng thành phần

### 0.1. Sơ đồ tổng thể

```
┌─────────────────────────────────────────────────────────────────┐
│  Người dùng / Ban tổ chức / Admin                               │
│  Browser :5173  ·  MetaMask (ký tx)  ·  JWT (API)               │
└───────────────┬───────────────────────────────┬─────────────────┘
                │ REST /api                     │ eth_sendTransaction
                v                               v
┌───────────────────────────────┐   ┌─────────────────────────────┐
│  Backend Express :5001        │   │  geth private-net           │
│  Auth · Events · Tickets      │   │  node1 :8545 · node2 :8546  │
│  Marketplace · Invoices       │đọc/ghi│ EventTicket · Marketplace│
│  Admin (GP, hồ sơ BTC, faucet)│   │  TicketBlock · payments     │
│  blockchainListener (WB)      │đọc logs│ event logs              │
└───────────────┬───────────────┘   └─────────────────────────────┘
                v
         MongoDB :27017
         (user, event, cache vé,
          invoice, license, profile)
```

Người dùng thao tác trên trình duyệt (`:5173`), gọi API bằng JWT và ký giao dịch bằng MetaMask. Backend Express (`:5001`) đọc/ghi sổ cái qua RPC geth và lắng nghe event logs để cập nhật cache Mongo. Trạng thái vé thật nằm trên contract; Mongo chỉ giữ auth, metadata và cache.

**Nguyên tắc phân tầng dữ liệu**

| Tầng | Định danh | Nơi lưu | Khi nào tạo TicketBlock? |
|------|-----------|---------|--------------------------|
| Sự kiện (metadata) | Mongo `_id` | Off-chain | Không |
| Hạng vé | `eventChainId` (uint) | On-chain + `ticketTypes[]` Mongo | Không |
| Vé NFT | `tokenId` ERC-721 | On-chain (Mongo chỉ cache) | **Có — 1 node / 1 mint** |

---

### 0.2. `blockchain/private-net` — sổ cái geth

| Thành phần | Vai trò |
|------------|---------|
| node1 `:8545` | RPC chính (Hardhat deploy, MetaMask, backend) |
| node2 `:8546` | Peer đồng bộ Clique |
| Clique PoA | Seal block không cần miner công cộng |
| `accounts.json` / keystore | Deployer, buyer, treasury lab |
| `scripts/*.sh` | Lần lượt: `init`, rồi `start-all`, rồi `connect-peers`, cuối cùng `status` |

**Luồng khởi động**

1. Chạy `init.sh` (lần đầu hoặc khi reset) để tạo genesis và data directory.
2. Chạy `start-all.sh` để khởi động hai process geth (node1, node2).
3. Chạy `connect-peers.sh` để nối peer giữa node1 và node2.
4. Chạy `status.sh` hoặc gọi `eth_chainId`; kỳ vọng `chainId = 12345` (`0x3039`).

Nếu deploy không dùng private key: gọi `personal_unlockAccount` cho địa chỉ deployer (mật khẩu lab `ticket123`). Sau khi unlock, script Hardhat `deploy.js` ký giao dịch qua RPC.

---

### 0.3. `smart-contract` — EventTicket & Marketplace

| Contract | Trách nhiệm chính |
|----------|-------------------|
| `EventTicket` | ERC-721, `configureEvent`, `mintTicket` / `adminMint*`, TicketBlock; chuyển toàn bộ ETH mua sơ cấp về treasury |
| `Marketplace` | `listTicket` / `buyResaleTicket`, trần 110%, khóa 60s, royalty 5% |

**Luồng deploy (local only)**

1. Đảm bảo geth đang lắng nghe `:8545`.
2. Chạy `npx hardhat run scripts/deploy.js --network localhost`.
3. Script deploy hai contract `EventTicket` và `Marketplace`.
4. Gọi `configureEvent` cho hạng 1 (Standard) và 2 (VIP).
5. Ghi địa chỉ vào `deployments/localhost.json`.
6. Copy ABI sang thư mục `backend/` và `frontend/`.
7. Cập nhật địa chỉ contract trong `backend/.env` và `frontend/.env`.

**Luồng mint sơ cấp (on-chain)**

Người mua gọi `mintTicket(eventChainId, { value: priceWei })`. Contract lần lượt:

1. Kiểm tra hạng đang active, còn supply, ví chưa vượt 2 vé mỗi hạng, và `msg.value` đúng giá.
2. Gọi `_safeMint` để tạo `tokenId` mới.
3. Append TicketBlock: nối `prevBlockHash` với `blockHash` mới.
4. Chuyển 100% ETH về `organizerTreasury`.
5. Emit các event `TicketMinted`, `TicketBlockCreated`, `PaymentToOrganizer`.

**Luồng resale (on-chain)**

1. Chủ vé gọi `approve(Marketplace)`, rồi `listTicket(tokenId, price)` với giá không vượt 110% giá gốc.
2. Sau `unlockTime` (lab: 60 giây), người mua gọi `buyResaleTicket(tokenId, { value })`.
3. Contract chia: 5% royalty về treasury, 95% về seller, rồi chuyển NFT.
4. Emit `TicketSold` và `PaymentSplit`. Resale không tạo TicketBlock mới.

---

### 0.4. `backend` — API, listener, nghiệp vụ off-chain

#### a) Khởi động

1. MongoDB sẵn sàng tại `:27017`.
2. `server.js` lắng nghe cổng `:5001` và gắn các route `/api/*`.
3. `blockchainListener` quét event logs và ghi cache vé/giao dịch vào Mongo (write-behind).
4. Tuỳ cấu hình, backend có thể sync sự kiện Mongo lên chain bằng `configureEvent` nếu dữ liệu lệch.

#### b) Module theo thư mục

| Module | Luồng / trách nhiệm |
|--------|---------------------|
| `auth` | Đăng ký/đăng nhập JWT · liên kết ví · phân quyền Admin/Organizer/User |
| `events` | CRUD metadata sự kiện · map `ticketTypes[].eventChainId` |
| `tickets` | Đọc vé theo ví (ưu tiên ledger) · remaining · TicketBlock tip/verify |
| `marketplace` | Listings từ chain · **money-flow** công khai theo sự kiện |
| `invoices` | Sau mint: tách GTGT 10% · lưu Mongo · PDF `storage/invoices/` |
| `admin` | Dashboard, faucet, mint, sync, **GP tổ chức**, **hồ sơ BTC**, users |
| `blockchainService` | ethers đọc contract / parse logs dòng tiền |
| `blockchainListener` | Theo dõi mint/sale rồi cập nhật Mongo cache |
| `adminChainService` | `configureEvent`, faucet ETH, `adminMint`, sync |

#### c) Luồng mở bán sự kiện (Admin/Organizer)

1. Admin/Organizer tạo hoặc cập nhật sự kiện và hạng vé trên Mongo (`POST`/`PUT`).
2. `adminChainService` gọi `configureEvent(eventChainId, supply, priceWei, name)`.
3. Trên chain, `eventConfigs[id].active = true`.
4. Frontend hiện nút mua; lúc này chưa có NFT và chưa có TicketBlock.

#### d) Luồng sau khi user mua vé (hóa đơn)

1. Frontend nhận mint thành công (`tokenId`, `txHash`).
2. Gọi `POST /api/invoices` với `tokenId`, `eventId`, `wallet`, số tiền, …
3. Backend tách GTGT (giá đã gồm thuế 10%), ghi bản ghi Invoice và sinh file PDF.
4. Người mua xem lại tại `/my-invoices` hoặc `/my-tickets`.
5. Admin mở `/admin`, vào tab Hóa đơn để liệt kê hoặc void.

#### e) Luồng giấy phép tổ chức sự kiện (GP)

1. Admin chọn sự kiện trên UI.
2. Điền thông tin GP hoặc upload bản scan.
3. Gọi `PUT /api/admin/licenses/:eventId`.
4. Tuỳ chọn: sinh PDF GP và lưu vào `storage/licenses/`.
5. Gắn trạng thái duyệt; theo UI admin, sự kiện có thể yêu cầu GP trước khi mở bán.

#### f) Luồng hồ sơ năng lực BTC (OrganizerProfile)

1. Admin CRUD hồ sơ ban tổ chức.
2. Trong `members[]` khai báo vai trò (ca sĩ, kỹ thuật, …), bằng cấp, chứng chỉ.
3. Bấm từng thành viên để mở popup hồ sơ (nhiều tab).
4. Seed lab đã có dữ liệu mẫu để demo.

#### g) Luồng tiền công khai

1. Client gọi `GET /api/marketplace/money-flow?scope=public_per_event`.
2. `blockchainService` quét event `PaymentToOrganizer` và `PaymentSplit`.
3. Backend gộp theo sự kiện, không lộ đầy đủ địa chỉ ví nhạy cảm.
4. Trang `/ledger` hiển thị cho mọi người, không bắt buộc đăng nhập.

---

### 0.5. `frontend` — React user & admin

#### a) Lớp user (`frontend/src/user`)

| Route | Thành phần | Luồng |
|-------|------------|-------|
| `/` | Home | Gọi API events rồi hiển thị danh sách |
| `/events/:id` | EventDetail | Chọn hạng, MetaMask gọi `mintTicket`, sau đó tạo hóa đơn |
| `/cart` | Cart | Giỏ nhiều hạng; mint lần lượt rồi xuất hóa đơn |
| `/my-tickets` | MyTickets | API tickets kết hợp ownership trên ledger; xem HĐ PDF |
| `/my-invoices` | MyInvoices | API invoices theo ví; xem hoặc tải PDF |
| `/marketplace` | Marketplace | Xem listings; approve/list hoặc `buyResale` |
| `/ledger` | Ledger | money-flow công khai theo sự kiện |
| `/user` | UserPortal | Đăng nhập JWT và liên kết ví MetaMask |

**Luồng mua vé (end-to-end)**

1. User đăng nhập, MetaMask đúng network `12345`, ví đủ ETH (faucet từ admin).
2. Chọn sự kiện và hạng (`eventChainId`).
3. MetaMask ký `mintTicket`, chờ receipt.
4. Backend listener cập nhật cache vé; frontend gọi `POST` tạo hóa đơn.
5. Mở PDF hóa đơn; vé xuất hiện tại `/my-tickets`.

**Luồng bán lại**

1. Chờ hết khóa 60 giây sau mint.
2. Chủ vé `approve` Marketplace rồi `listTicket` (giá không quá 110% gốc).
3. Người mua gọi `buyResaleTicket`; contract trừ royalty 5%.
4. Ownership đổi; trang `/marketplace` và `/my-tickets` cập nhật.

#### b) Lớp admin (`frontend/src/admin`)

| Panel | Luồng |
|-------|-------|
| Dashboard | Thống kê vé/tx từ API admin |
| Sự kiện / hạng vé | Tạo metadata rồi sync `configureEvent` |
| Mint / faucet | Cấp ETH lab và `adminMint` tới ví |
| Users | CRUD kèm phân quyền |
| Hóa đơn | Liệt kê hoặc void HĐ GTGT |
| Giấy phép (GP) | Upsert GP theo sự kiện; PDF hoặc upload |
| Hồ sơ BTC | CRUD profile và members; popup hồ sơ |
| Theme | Day/night dùng chung ThemeContext |

`/admin` không dùng Layout user — `App.jsx` tách nhánh riêng vào `AdminDashboard`.

#### c) Context dùng chung

| Context | Vai trò trong luồng |
|---------|---------------------|
| `AuthContext` | JWT và role; quyết định hiện `/admin` và gọi API có bảo vệ |
| `WalletContext` | MetaMask account, chainId, ký contract |
| `CartContext` | Giỏ hạng vé trước khi mint |
| `ThemeContext` | Theme user và admin |

---

### 0.6. Ma trận thao tác (tóm tắt)

| Thao tác | Frontend | Backend / Mongo | On-chain | NFT? | TicketBlock? | Hóa đơn? |
|----------|----------|-----------------|----------|------|--------------|----------|
| Tạo sự kiện + hạng | Admin | Insert Event | `configureEvent` | Không | Không | Không |
| Cấp / duyệt GP | Admin licenses | License + PDF | — | Không | Không | Không |
| Hồ sơ BTC | Admin profiles | OrganizerProfile | — | Không | Không | Không |
| Mua sơ cấp | EventDetail/Cart + MM | Cache + Invoice | `mintTicket` | Có | Có | **Có** |
| Admin mint | Admin | Cache (+ HĐ nếu gắn) | `adminMint*` | Có | Có | Tuỳ |
| List / mua resale | Marketplace + MM | Cache listing | Marketplace | Đổi chủ | Không | Không* |
| Xem dòng tiền | `/ledger` | money-flow API | Đọc logs | — | — | — |

\*Resale lab hiện không xuất HĐ GTGT mới (chỉ mua sơ cấp gắn sự kiện).

---

### 0.7. Thứ tự chạy khi demo

1. Khởi động private-net và nối peers.
2. Deploy smart-contract trên mạng `localhost`.
3. Bật Mongo, seed backend, chạy `npm run dev`.
4. Chạy frontend `npm run dev`.
5. Cấu hình MetaMask đúng chain `12345`.
6. Trên Admin: faucet, rồi mở bán / GP / hồ sơ (tuỳ nội dung demo).
7. Trên User: mua vé, nhận hóa đơn, đợi 60 giây rồi resale, cuối cùng xem `/ledger`.

Chi tiết học thuật / checklist chấp nhận: [`HUONG-DAN-HE-THONG.md`](./HUONG-DAN-HE-THONG.md).

---

## 1. Yêu cầu môi trường

| Công cụ | Phiên bản | Mục đích |
|---------|-----------|----------|
| Node.js | ≥ 18 | backend, frontend, Hardhat |
| npm | ≥ 9 | cài dependency |
| geth | **1.13.x** | private-net (đã kiểm với 1.13.15) |
| MongoDB | 7.x | user, event, cache vé |
| Docker (tuỳ chọn) | — | chạy Mongo nhanh |
| Git | — | clone repo |
| bash / Git Bash / WSL | — | chạy script `blockchain/private-net/scripts/*.sh` |
| curl, python3 | — | script status / kiểm tra RPC |
| MetaMask | extension Chrome/Firefox/Edge | ký giao dịch |

### Cổng cần trống

| Cổng | Dịch vụ |
|------|---------|
| `8545` / `8546` | geth HTTP RPC (node1 / node2) |
| `8551` / `8552` | geth Auth RPC |
| `30303` / `30304` | geth P2P |
| `27017` | MongoDB |
| `5001` | Backend API (tránh `5000` vì AirPlay trên macOS) |
| `5173` | Frontend Vite |

```bash
cd /đường/dẫn/ticket-anti-scalping
```

---

## 2. Cài đặt phụ thuộc theo hệ điều hành

Script private-net là **bash** (`init.sh`, `start-all.sh`, …).  
- **macOS / Linux:** chạy trực tiếp trong Terminal.  
- **Windows:** nên dùng **WSL2 (Ubuntu)** hoặc Git Bash; không khuyến nghị PowerShell thuần cho bước geth.

Sau khi cài xong công cụ, kiểm tra:

```bash
node -v          # >= v18
npm -v           # >= 9
geth version     # 1.13.x
mongod --version # hoặc: docker --version
git --version
curl --version
python3 --version
```

---

### 2.1. macOS

```bash
# Homebrew (nếu chưa có): https://brew.sh
brew install node git curl python3

# geth 1.13.x
brew install ethereum
geth version

# MongoDB (chọn 1 trong 2)
# A) Docker
brew install --cask docker   # mở Docker Desktop, rồi:
docker run -d --name ticket-mongo -p 27017:27017 mongo:7

# B) MongoDB Community qua Homebrew
brew tap mongodb/brew
brew install mongodb-community@7.0
brew services start mongodb-community@7.0
```

Nếu `brew install ethereum` ra geth ≥ 1.14: ưu tiên tải bản **1.13.x** từ [geth releases](https://geth.ethereum.org/downloads/) hoặc giữ pin phiên bản cũ.

---

### 2.2. Linux (Ubuntu / Debian)

```bash
sudo apt update
sudo apt install -y curl git build-essential python3

# Node.js 20 LTS (NodeSource)
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt install -y nodejs
node -v && npm -v

# geth — cách A: PPA ethereum (có thể ra bản mới hơn 1.13)
sudo add-apt-repository -y ppa:ethereum/ethereum
sudo apt update
sudo apt install -y ethereum
geth version

# geth — cách B (khuyến nghị nếu cần đúng 1.13.x): tải binary
# https://geth.ethereum.org/downloads/  (chọn Linux amd64 1.13.x)
# Giải nén, đưa `geth` vào PATH, ví dụ:
#   sudo mv geth /usr/local/bin/
#   geth version

# MongoDB — cách A: Docker
sudo apt install -y docker.io
sudo usermod -aG docker "$USER"   # đăng xuất/đăng nhập lại
sudo docker run -d --name ticket-mongo -p 27017:27017 mongo:7

# MongoDB — cách B: cài native (tóm tắt)
# Làm theo docs MongoDB 7 cho Ubuntu: https://www.mongodb.com/docs/manual/tutorial/install-mongodb-on-ubuntu/
```

**Fedora / RHEL (tóm tắt):**

```bash
sudo dnf install -y git curl python3 nodejs npm
# geth: tải binary 1.13.x từ geth.ethereum.org hoặc dùng package ethereum nếu có
# Mongo: docker run ... mongo:7  (giống trên)
```

**Firewall (nếu RPC không gọi được từ máy khác trong LAN):** lab chỉ cần `127.0.0.1` — không mở cổng ra ngoài trừ khi chủ đích.

---

### 2.3. Windows

#### Khuyến nghị: WSL2 + Ubuntu

Private-net dùng bash/geth giống Linux. Cách ổn định nhất trên Windows:

1. Cài **WSL2** (PowerShell Admin):

```powershell
wsl --install
# Khởi động lại máy nếu được yêu cầu, rồi mở Ubuntu từ Start Menu
```

2. Trong Ubuntu (WSL), làm **giống mục 2.2 Linux** (Node, geth, Docker hoặc Mongo).

3. Clone / mở project **trong filesystem Linux** (tránh ` /mnt/c/...` nếu có thể — nhanh và ít lỗi quyền file):

```bash
cd ~
git clone <url-repo> ticket-anti-scalping
cd ticket-anti-scalping
```

4. Docker trên WSL: cài **Docker Desktop for Windows**, vào Settings, rồi Resources, rồi WSL Integration, và bật distro Ubuntu.

5. MetaMask chạy trên **Windows browser** (Chrome/Edge). RPC vẫn là `http://127.0.0.1:8545` — WSL2 thường forward localhost tới Windows ổn.

Kiểm tra từ PowerShell Windows:

```powershell
curl http://127.0.0.1:8545 -Method POST -ContentType "application/json" -Body '{"jsonrpc":"2.0","method":"eth_chainId","params":[],"id":1}'
```

#### Cách thay thế: Git Bash + geth Windows (hạn chế hơn)

1. Cài [Git for Windows](https://git-scm.com/download/win) (có Git Bash).  
2. Cài [Node.js LTS](https://nodejs.org/) (Windows installer).  
3. Tải **geth Windows 1.13.x** từ [geth.ethereum.org/downloads](https://geth.ethereum.org/downloads/), giải nén, thêm thư mục có `geth.exe` vào **PATH**.  
4. Cài [MongoDB Community](https://www.mongodb.com/try/download/community) hoặc Docker Desktop + container `mongo:7`.  
5. Mở **Git Bash**, `cd` vào repo, chạy:

```bash
cd blockchain/private-net
chmod +x scripts/*.sh
./scripts/init.sh
./scripts/start-all.sh
```

Nếu script báo lỗi đường dẫn / `python3` / `geth` not found: kiểm tra PATH trong Git Bash (`which geth`, `which python`, `which python3`). Đôi khi trên Windows lệnh là `python` — có thể tạo alias:

```bash
alias python3=python
```

**Lưu ý Windows:**

| Vấn đề | Cách xử lý |
|--------|------------|
| CRLF làm script `.sh` lỗi | Trong repo: `git config core.autocrlf input` rồi checkout lại; hoặc `sed -i 's/\r$//' scripts/*.sh` |
| Cổng bị chiếm | `netstat -ano \| findstr :5001` rồi Task Manager / `taskkill /PID … /F` |
| Antivirus chặn geth | Thêm exception cho thư mục `blockchain/private-net` |
| MetaMask “RPC lỗi” | Đảm bảo geth listen `127.0.0.1:8545`; tắt VPN thử lại |

---

## 3. Thứ tự cài đặt dự án (bắt buộc)

```
1) geth private-net, rồi 2) deploy smart-contract, rồi 3) backend + Mongo, cuối cùng 4) frontend
```

Mỗi lần chạy lại `init.sh` (xóa chain) phải **deploy lại contract** và cập nhật địa chỉ trong `.env`.

Các lệnh bên dưới dùng chung cho macOS / Linux / WSL (và Git Bash nếu PATH đã ổn).

---

### Bước 1 — Mạng geth private-net

```bash
cd blockchain/private-net
chmod +x scripts/*.sh

# Chỉ lần đầu (hoặc khi muốn reset chain từ đầu)
./scripts/init.sh

# Mỗi lần làm việc
./scripts/start-all.sh
./scripts/connect-peers.sh
./scripts/status.sh
```

Kiểm tra RPC:

```bash
curl -s -X POST http://127.0.0.1:8545 \
  -H 'Content-Type: application/json' \
  --data '{"jsonrpc":"2.0","method":"eth_chainId","params":[],"id":1}'
# Kỳ vọng result "0x3039" (= 12345)
```

Unlock deployer (nếu cần ký qua `personal_unlockAccount`):

```bash
curl -s -X POST http://127.0.0.1:8545 \
  -H 'Content-Type: application/json' \
  --data '{"jsonrpc":"2.0","method":"personal_unlockAccount","params":["0xdecc0bf86a34de96B161b1F910ce2684d36bb4B4","ticket123",0],"id":1}'
```

Địa chỉ lab xem trong `blockchain/private-net/accounts.json`.  
Mật khẩu keystore mặc định: `ticket123` (`password.txt`).

---

### Bước 2 — Smart contract (compile + deploy)

```bash
cd smart-contract
npm install
cp .env.example .env          # xem mục 4.1 — thường để trống DEPLOYER_PRIVATE_KEY trên lab
npx hardhat compile
npx hardhat test              # không cần geth

# geth :8545 phải đang chạy
npx hardhat run scripts/deploy.js --network localhost
```

Sau deploy, script sẽ:

1. Ghi `smart-contract/deployments/localhost.json`
2. Copy ABI vào `backend/src/abi/` và `frontend/src/services/abi/`
3. **Tự cập nhật** địa chỉ contract trong `backend/.env` và `frontend/.env` (nếu file đã tồn tại)
4. In ra gợi ý `.env` trên terminal

Lưu địa chỉ từ file deploy:

```bash
cat smart-contract/deployments/localhost.json
# EventTicket, Marketplace, deployer, chainId
```

---

### Bước 3 — MongoDB + Backend

**MongoDB bằng Docker:**

```bash
docker run -d --name ticket-mongo -p 27017:27017 mongo:7
# lần sau: docker start ticket-mongo
```

Hoặc Mongo cài sẵn / Atlas — chỉnh `MONGODB_URI`.

```bash
cd backend
npm install
cp .env.example .env
# Điền theo mục 4.2 (địa chỉ contract lấy từ bước 2)
npm run seed
npm run dev
```

Kiểm tra:

```bash
curl -s http://127.0.0.1:5001/api/health
```

---

### Bước 4 — Frontend

```bash
cd frontend
npm install
cp .env.example .env
# Điền theo mục 4.3 (địa chỉ contract khớp backend)
npm run dev
```

Mở **http://localhost:5173**  
Vite proxy chuyển `/api` sang `http://localhost:5001`.

---

## 4. File `.env` — cách lấy và điền thông số

Có **3 file `.env`** (không commit lên git — chỉ commit `*.env.example`):

| File | Vai trò |
|------|---------|
| `smart-contract/.env` | Deploy Hardhat local (private key tuỳ chọn) |
| `backend/.env` | API, Mongo, JWT, RPC, địa chỉ contract, faucet |
| `frontend/.env` | Vite: API base, chain, RPC, địa chỉ contract (prefix `VITE_`) |

**Quy tắc chung**

1. Copy từ example: `cp .env.example .env`
2. Địa chỉ contract **chỉ có sau khi deploy** — lấy từ `smart-contract/deployments/localhost.json` hoặc log deploy
3. Backend và frontend phải dùng **cùng** `EventTicket` / `Marketplace` và cùng `CHAIN_ID`
4. Đổi contract (deploy lại) thì sửa cả `backend/.env` và `frontend/.env`, rồi **restart** backend cùng frontend

---

### 4.1. `smart-contract/.env`

```bash
cd smart-contract
cp .env.example .env
```

| Biến | Bắt buộc? | Cách lấy / giá trị lab | Ghi chú |
|------|-----------|------------------------|---------|
| `DEPLOYER_PRIVATE_KEY` | Không | Private key ví test (prefix `0x`) | Lab geth thường **unlock** deployer — để trống là được |
| `RELAYER_ADDRESS` | Không | Ví relayer (bridge hardhat chainA/B) | Có thể để trống / comment |

**Lab local only:** không dùng Sepolia/Etherscan. File `.env` có thể gần như trống. Deploy:

```bash
npm run deploy:local
# = npx hardhat run scripts/deploy.js --network localhost
```

RPC lấy từ Hardhat config (`http://127.0.0.1:8545`, chainId `12345`) + tài khoản unlock trên geth.

**Nếu muốn ký bằng private key:** export key từ keystore deployer (node1), ghi vào `DEPLOYER_PRIVATE_KEY=0x...` — **không** dùng ví thật có tiền.

---

### 4.2. `backend/.env`

```bash
cd backend
cp .env.example .env
```

#### a) Server & Mongo & JWT

| Biến | Cách lấy / giá trị | Giải thích |
|------|-------------------|------------|
| `PORT` | `5001` | Cổng API. macOS hay chiếm `5000` (AirPlay) nên dùng `5001` |
| `NODE_ENV` | `development` | Môi trường chạy |
| `MONGODB_URI` | `mongodb://127.0.0.1:27017/ticket-anti-scalping` | URI Mongo local/Docker. Atlas: lấy connection string trên cloud.mongodb.com |
| `JWT_SECRET` | Tự đặt chuỗi dài, bí mật | Dùng ký JWT đăng nhập. **Đổi** khi lên môi trường thật |
| `JWT_EXPIRES_IN` | `7d` | Thời hạn token (vd `7d`, `24h`) |
| `CLIENT_ORIGIN` | `http://localhost:5173` | Origin frontend cho CORS |

Tạo JWT secret nhanh:

```bash
openssl rand -hex 32
```

#### b) Blockchain / RPC

| Biến | Cách lấy / giá trị lab | Giải thích |
|------|------------------------|------------|
| `NETWORK_NAME` | `ticket-private-clique` | Tên mạng (hiển thị / hóa đơn) |
| `CHAIN_ID` | `12345` | Khớp genesis private-net (`accounts.json`) |
| `RPC_URL` | `http://127.0.0.1:8545` | RPC **node1**. Dự phòng: `:8546` (node2) |
| `SEPOLIA_RPC_URL` | URL Sepolia (tuỳ chọn) | Chỉ khi backend trỏ testnet |

Kiểm tra RPC sống:

```bash
curl -s -X POST "$RPC_URL" -H 'Content-Type: application/json' \
  --data '{"jsonrpc":"2.0","method":"eth_blockNumber","params":[],"id":1}'
```

#### c) Địa chỉ smart contract (quan trọng)

| Biến | Cách lấy |
|------|----------|
| `TICKET_CONTRACT_ADDRESS` | Sau deploy, lấy trong `deployments/localhost.json`, field `EventTicket` |
| `MARKETPLACE_CONTRACT_ADDRESS` | Cùng file, field `Marketplace` |

```bash
# Ví dụ đọc nhanh
node -e 'const j=require("./smart-contract/deployments/localhost.json"); console.log(j.EventTicket); console.log(j.Marketplace)'
```

Hoặc chép từ log cuối lệnh deploy (`--- .env hints ---`).  
Nếu đã `cp .env.example .env` **trước** khi deploy, script deploy thường **tự ghi** hai địa chỉ này.

#### d) Deployer / faucet admin

| Biến | Cách lấy / giá trị lab | Giải thích |
|------|------------------------|------------|
| `DEPLOYER_ADDRESS` | `0xdecc0bf86a34de96B161b1F910ce2684d36bb4B4` | Trong `blockchain/private-net/accounts.json`, mục `accounts.deployer.address` |
| `GETH_PASSWORD` | `ticket123` (tuỳ chọn) | Mật khẩu unlock keystore geth |
| `DEPLOYER_PRIVATE_KEY` | Tuỳ chọn | Nếu không dùng unlock geth — backend ký bằng key này |

**Lab khuyến nghị:** để geth unlock deployer; chỉ cần đúng `DEPLOYER_ADDRESS`.

#### e) Mẫu `backend/.env` (lab đầy đủ)

```env
PORT=5001
NODE_ENV=development

MONGODB_URI=mongodb://127.0.0.1:27017/ticket-anti-scalping

JWT_SECRET=lab-doi-chuoi-nay-bang-openssl-rand
JWT_EXPIRES_IN=7d

NETWORK_NAME=ticket-private-clique
CHAIN_ID=12345
RPC_URL=http://127.0.0.1:8545

# Thay bằng địa chỉ thật sau deploy
TICKET_CONTRACT_ADDRESS=0x83e94d633898cc3f31E89183E2aFC4e5c572F6b7
MARKETPLACE_CONTRACT_ADDRESS=0x6378075fAd0B4B65D8d77735828a6898589AD488

DEPLOYER_ADDRESS=0xdecc0bf86a34de96B161b1F910ce2684d36bb4B4

CLIENT_ORIGIN=http://localhost:5173
```

> Địa chỉ contract ở trên chỉ là **ví dụ** từ một lần deploy — máy bạn lấy từ `localhost.json` của chính mình.

---

### 4.3. `frontend/.env`

```bash
cd frontend
cp .env.example .env
```

Biến Vite **phải** bắt đầu bằng `VITE_` thì mới vào được `import.meta.env`.

| Biến | Cách lấy / giá trị lab | Giải thích |
|------|------------------------|------------|
| `VITE_API_BASE_URL` | `/api` | Gọi qua proxy Vite tới backend `:5001`. Production có thể đặt URL tuyệt đối |
| `VITE_NETWORK_NAME` | `Ticket Private Clique` | Tên hiện khi MetaMask add chain |
| `VITE_CHAIN_ID` | `12345` | **Phải khớp** `backend` `CHAIN_ID` và geth |
| `VITE_RPC_URL` | `http://127.0.0.1:8545` | RPC MetaMask / ethers phía browser |
| `VITE_TICKET_CONTRACT_ADDRESS` | = `TICKET_CONTRACT_ADDRESS` backend | Từ `localhost.json`, field `EventTicket` |
| `VITE_MARKETPLACE_CONTRACT_ADDRESS` | = `MARKETPLACE_CONTRACT_ADDRESS` backend | Từ `localhost.json`, field `Marketplace` |

#### Mẫu `frontend/.env`

```env
VITE_API_BASE_URL=/api

VITE_NETWORK_NAME=Ticket Private Clique
VITE_CHAIN_ID=12345
VITE_RPC_URL=http://127.0.0.1:8545

VITE_TICKET_CONTRACT_ADDRESS=0x83e94d633898cc3f31E89183E2aFC4e5c572F6b7
VITE_MARKETPLACE_CONTRACT_ADDRESS=0x6378075fAd0B4B65D8d77735828a6898589AD488
```

Sau khi sửa `.env` frontend: **tắt rồi chạy lại** `npm run dev` (Vite chỉ đọc env lúc start).

---

### 4.4. Checklist đồng bộ `.env`

| Kiểm tra | Backend | Frontend |
|----------|---------|----------|
| Chain ID | `CHAIN_ID=12345` | `VITE_CHAIN_ID=12345` |
| RPC | `RPC_URL=…:8545` | `VITE_RPC_URL=…:8545` |
| EventTicket | `TICKET_CONTRACT_ADDRESS` | `VITE_TICKET_CONTRACT_ADDRESS` |
| Marketplace | `MARKETPLACE_CONTRACT_ADDRESS` | `VITE_MARKETPLACE_CONTRACT_ADDRESS` |
| Giá trị hai bên | **Giống hệt** (checksum không phân biệt hoa thường) | |

```bash
# So nhanh (từ root repo)
grep -E 'TICKET_CONTRACT|MARKETPLACE_CONTRACT|CHAIN_ID|VITE_CHAIN' backend/.env frontend/.env
```

---

## 5. MetaMask

| Trường | Giá trị |
|--------|---------|
| Network name | Ticket Private Clique |
| RPC URL | `http://127.0.0.1:8545` |
| Chain ID | `12345` |
| Currency | ETH |

Import deployer (lab): keystore trong `blockchain/private-net/node1/keystore/` · mật khẩu `ticket123`.

Helper UI (tuỳ chọn):

```bash
cd blockchain/private-net
./scripts/serve-metamask.sh
# http://127.0.0.1:8765/
```

---

## 6. Tài khoản lab

| Email | Mật khẩu | Vai trò |
|-------|----------|---------|
| `admin@ticket.local` | `admin123` | admin |
| `organizer@ticket.local` | `organizer123` | organizer |

Tạo bằng `cd backend && npm run seed`.

| URL | Mô tả |
|-----|--------|
| http://localhost:5173 | Trang người dùng |
| http://localhost:5173/admin | Admin / organizer |
| http://localhost:5173/ledger | Dòng tiền công khai theo sự kiện |

---

## 7. Khởi động hàng ngày

Khi đã `npm install` và đã `init` mạng:

```bash
# Terminal 1 — geth
cd blockchain/private-net
./scripts/start-all.sh && ./scripts/connect-peers.sh

# Terminal 2 — Mongo (Docker)
docker start ticket-mongo

# Terminal 3 — backend
cd backend && npm run dev

# Terminal 4 — frontend
cd frontend && npm run dev
```

Dừng geth: `cd blockchain/private-net && ./scripts/stop-nodes.sh`

---

## 8. Smoke test

1. `./scripts/status.sh` — 2 node peer, đang seal block  
2. `curl http://127.0.0.1:5001/api/health` — có địa chỉ ticket/marketplace  
3. Mở `http://localhost:5173` — thấy sự kiện  
4. `/admin` đăng nhập `admin@ticket.local` / `admin123`  
5. Tab **Cấp ETH / Ví** — tạo ví lab  
6. Tab **Mint vé** — mint `eventChainId = 1`  
7. Tab **Chuỗi block vé** — tip tăng  
8. MetaMask đúng chain `12345` — `/my-tickets` thấy NFT  
9. Sau ~**60s** khóa chuyển nhượng — thử resale ≤ **110%** giá gốc  
10. `/ledger` — dòng tiền công khai theo sự kiện  

---

## 9. Xử lý lỗi thường gặp

| Hiện tượng | Cách xử lý |
|------------|------------|
| `EADDRINUSE :5001` | macOS/Linux: `lsof -i :5001` rồi `kill` PID. Windows: `netstat -ano \| findstr :5001` rồi `taskkill /PID … /F` |
| Deploy revert / không gửi tx | Unlock deployer hoặc set `DEPLOYER_PRIVATE_KEY`; kiểm tra số dư |
| Backend không sync vé | Sai địa chỉ contract trong `.env`; restart sau deploy; RPC down |
| Frontend CORS / 404 API | Backend `:5001`, `VITE_API_BASE_URL=/api`, proxy Vite |
| MetaMask sai mạng | Add chain `12345`, RPC `127.0.0.1:8545` |
| Sau `init.sh` mọi thứ “mất” | Deploy lại contract, cập nhật `.env`, seed lại, rồi restart backend/frontend |
| OpenZeppelin / opcode lỗi | Giữ OZ **5.0.2** (pin trong `package.json`) — bản mới hơn có thể không khớp Clique Paris |
| Script `.sh` lỗi trên Windows | Dùng **WSL2**; hoặc sửa CRLF (`sed -i 's/\r$//' scripts/*.sh`); kiểm tra `which geth` |
| `geth: command not found` (Linux) | Cài binary 1.13.x vào `/usr/local/bin` hoặc `export PATH=...` |
| Docker permission denied (Linux) | `sudo usermod -aG docker $USER` rồi đăng nhập lại |

---

## Cấu trúc thư mục (tóm tắt)

```
ticket-anti-scalping/
├── blockchain/private-net/   # geth Clique, scripts start/init
├── smart-contract/           # EventTicket, Marketplace, deploy
├── backend/                  # Express API, listener, Mongo
├── frontend/                 # React user + admin
├── README.md                 # File này
├── HUONG-DAN-CAI-DAT.md
└── HUONG-DAN-HE-THONG.md
```

---

## Cơ chế chống scalping (on-chain)

| Cơ chế | Giá trị lab |
|--------|-------------|
| Tối đa vé / ví / hạng (mint thường) | **2** |
| Trần giá resale | **110%** giá gốc |
| Khóa chuyển nhượng sau mint | **60s** (local lab) |
| Royalty resale | **5%** về treasury ban tổ chức |
| TicketBlock | Mỗi mint nối `prevBlockHash` với `blockHash` mới |
