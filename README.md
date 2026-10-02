# Ticket Anti-Scalping

Đồ án bán vé sự kiện bằng **NFT (ERC-721)** trên mạng Ethereum lab (geth Clique), kèm marketplace chống scalping.

| Lớp | Công nghệ |
|-----|-----------|
| Blockchain | geth 1.13.x · Clique PoA · `chainId = 12345` |
| Smart contract | Solidity · Hardhat · OpenZeppelin 5.0.2 |
| Backend | Node.js · Express · MongoDB · ethers.js · JWT |
| Frontend | React · Vite · MetaMask |

**Nguyên tắc:** trạng thái vé thật nằm **trên contract**. Mongo chỉ dùng cho auth, metadata sự kiện và cache.

Tài liệu sâu hơn: [`HUONG-DAN-HE-THONG.md`](./HUONG-DAN-HE-THONG.md) · [`HUONG-DAN-CAI-DAT.md`](./HUONG-DAN-CAI-DAT.md) · [`blockchain/private-net/HUONG-DAN.md`](./blockchain/private-net/HUONG-DAN.md)

---

## Mục lục

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
# https://geth.ethereum.org/downloads/  → Linux amd64 1.13.x
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

4. Docker trên WSL: cài **Docker Desktop for Windows** → Settings → Resources → WSL Integration → bật distro Ubuntu.

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

### 2.4. So sánh nhanh

| Hạng mục | macOS | Linux | Windows |
|----------|-------|-------|---------|
| Shell chạy private-net | Terminal (zsh/bash) | bash | **WSL2** (khuyên) hoặc Git Bash |
| Cài Node | Homebrew / nvm | NodeSource / apt | Installer nodejs.org hoặc apt trong WSL |
| Cài geth | `brew install ethereum` | PPA hoặc binary 1.13.x | Binary trong WSL / Windows PATH |
| Mongo | Docker hoặc brew | Docker hoặc apt/official | Docker Desktop hoặc Mongo installer |
| MetaMask | Browser macOS | Browser Linux | Browser Windows (RPC `127.0.0.1`) |

---

## 3. Thứ tự cài đặt dự án (bắt buộc)

```
1) geth private-net  →  2) deploy smart-contract  →  3) backend + Mongo  →  4) frontend
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
# → result "0x3039" (= 12345)
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
Vite proxy: `/api` → `http://localhost:5001`.

---

## 4. File `.env` — cách lấy và điền thông số

Có **3 file `.env`** (không commit lên git — chỉ commit `*.env.example`):

| File | Vai trò |
|------|---------|
| `smart-contract/.env` | Deploy Hardhat (Sepolia / private key tuỳ chọn) |
| `backend/.env` | API, Mongo, JWT, RPC, địa chỉ contract, faucet |
| `frontend/.env` | Vite: API base, chain, RPC, địa chỉ contract (prefix `VITE_`) |

**Quy tắc chung**

1. Copy từ example: `cp .env.example .env`
2. Địa chỉ contract **chỉ có sau khi deploy** — lấy từ `smart-contract/deployments/localhost.json` hoặc log deploy
3. Backend và frontend phải dùng **cùng** `EventTicket` / `Marketplace` và cùng `CHAIN_ID`
4. Đổi contract (deploy lại) → sửa cả `backend/.env` + `frontend/.env` → **restart** backend & frontend

---

### 4.1. `smart-contract/.env`

```bash
cd smart-contract
cp .env.example .env
```

| Biến | Bắt buộc? | Cách lấy / giá trị lab | Ghi chú |
|------|-----------|------------------------|---------|
| `SEPOLIA_RPC_URL` | Không (lab) | `https://rpc.sepolia.org` hoặc Infura/Alchemy | Chỉ khi deploy mạng Sepolia |
| `DEPLOYER_PRIVATE_KEY` | Không (lab) | Private key ví test (prefix `0x`) | Lab geth thường **unlock** deployer — để trống là được |
| `ETHERSCAN_API_KEY` | Không | [etherscan.io/apis](https://etherscan.io/apis) | Verify source trên explorer |
| `RELAYER_ADDRESS` | Không | Ví relayer (nếu dùng bridge buổi 5) | Có thể để trống |

**Lab local:** file có thể gần như trống. Deploy qua `--network localhost` dùng RPC Hardhat config (`http://127.0.0.1:8545`) và tài khoản đã unlock trên geth.

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
| `PORT` | `5001` | Cổng API. macOS hay chiếm `5000` (AirPlay) → dùng `5001` |
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
| `TICKET_CONTRACT_ADDRESS` | Sau deploy → `deployments/localhost.json` → field `EventTicket` |
| `MARKETPLACE_CONTRACT_ADDRESS` | Cùng file → field `Marketplace` |

```bash
# Ví dụ đọc nhanh
node -e 'const j=require("./smart-contract/deployments/localhost.json"); console.log(j.EventTicket); console.log(j.Marketplace)'
```

Hoặc chép từ log cuối lệnh deploy (`--- .env hints ---`).  
Nếu đã `cp .env.example .env` **trước** khi deploy, script deploy thường **tự ghi** hai địa chỉ này.

#### d) Deployer / faucet admin

| Biến | Cách lấy / giá trị lab | Giải thích |
|------|------------------------|------------|
| `DEPLOYER_ADDRESS` | `0xdecc0bf86a34de96B161b1F910ce2684d36bb4B4` | Trong `blockchain/private-net/accounts.json` → `accounts.deployer.address` |
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
| `VITE_API_BASE_URL` | `/api` | Gọi qua proxy Vite → backend `:5001`. Production có thể đặt URL tuyệt đối |
| `VITE_NETWORK_NAME` | `Ticket Private Clique` | Tên hiện khi MetaMask add chain |
| `VITE_CHAIN_ID` | `12345` | **Phải khớp** `backend` `CHAIN_ID` và geth |
| `VITE_RPC_URL` | `http://127.0.0.1:8545` | RPC MetaMask / ethers phía browser |
| `VITE_TICKET_CONTRACT_ADDRESS` | = `TICKET_CONTRACT_ADDRESS` backend | Từ `localhost.json` → `EventTicket` |
| `VITE_MARKETPLACE_CONTRACT_ADDRESS` | = `MARKETPLACE_CONTRACT_ADDRESS` backend | Từ `localhost.json` → `Marketplace` |

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
| Sau `init.sh` mọi thứ “mất” | Deploy lại contract → cập nhật `.env` → seed lại → restart backend/frontend |
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
| Khóa chuyển nhượng sau mint | **60s** (local), ~24h (Sepolia) |
| Royalty resale | **5%** về treasury ban tổ chức |
| TicketBlock | Mỗi mint nối `prevBlockHash` → `blockHash` |
