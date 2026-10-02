# Blockchain — Mạng riêng tư Go Ethereum

Thư mục này chứa mạng Ethereum lab dùng **geth** (Go Ethereum) với đồng thuận **Clique PoA**. Mạng phục vụ deploy / test smart contract đồ án Ticket Anti-Scalping và kết nối MetaMask trên máy local.

Tài liệu sâu hơn trong thư mục private-net: [`private-net/HUONG-DAN.md`](./private-net/HUONG-DAN.md) · [`private-net/README.md`](./private-net/README.md)

---

## Mục lục

1. [Thông số mạng](#1-thông-số-mạng)
2. [Cấu trúc thư mục](#2-cấu-trúc-thư-mục)
3. [Yêu cầu môi trường](#3-yêu-cầu-môi-trường)
4. [Cài đặt geth theo hệ điều hành](#4-cài-đặt-geth-theo-hệ-điều-hành)
5. [Cài đặt và khởi động mạng (chi tiết)](#5-cài-đặt-và-khởi-động-mạng-chi-tiết)
6. [Kiểm tra mạng đã sẵn sàng](#6-kiểm-tra-mạng-đã-sẵn-sàng)
7. [Kết nối MetaMask (chuẩn theo dự án)](#7-kết-nối-metamask-chuẩn-theo-dự-án)
8. [Import tài khoản lab vào MetaMask](#8-import-tài-khoản-lab-vào-metamask)
9. [Dừng / reset mạng](#9-dừng--reset-mạng)
10. [Lỗi thường gặp](#10-lỗi-thường-gặp)

---

## 1. Thông số mạng

| Thông số | Giá trị |
|----------|---------|
| Client | geth **1.13.x** (đã kiểm với 1.13.15) |
| Consensus | Clique PoA |
| chainId / networkId | `12345` (`0x3039`) |
| Block time | ~5 giây |
| Node1 HTTP RPC | `http://127.0.0.1:8545` |
| Node2 HTTP RPC | `http://127.0.0.1:8546` |
| WebSocket node1 / node2 | `ws://127.0.0.1:8555` / `:8556` |
| MetaMask helper page | `http://127.0.0.1:8765/` |

Hardhat trong monorepo dùng network `localhost` trỏ node1 (`8545`, chainId `12345`). Không chạy `npx hardhat node` cùng cổng `8545` khi geth đang bật.

---

## 2. Cấu trúc thư mục

```
blockchain/
├── README.md                 # File hướng dẫn này
└── private-net/
    ├── HUONG-DAN.md          # Tài liệu vận hành đầy đủ
    ├── README.md             # Tóm tắt nhanh
    ├── genesis.json          # Genesis Clique
    ├── accounts.json         # Địa chỉ công khai lab
    ├── password.txt.example  # Mẫu mật khẩu keystore
    ├── password.txt          # Mật khẩu thật (không commit)
    ├── metamask/             # Trang web thêm mạng vào MetaMask
    ├── node1/ · node2/       # Datadir + keystore (gitignore chaindata)
    ├── logs/                 # Log khi start-all
    └── scripts/              # init, start, stop, status, serve-metamask, …
```

Mọi lệnh bên dưới chạy từ thư mục `blockchain/private-net` trừ khi ghi rõ khác.

---

## 3. Yêu cầu môi trường

| Công cụ | Mục đích |
|---------|----------|
| geth 1.13.x | Client Ethereum |
| bash / Git Bash / WSL | Chạy `scripts/*.sh` |
| curl, python3 | Script status / peer |
| MetaMask | Extension Chrome / Firefox / Edge / Brave |
| (Tuỳ chọn) trình duyệt mở `127.0.0.1:8765` | Trang kết nối MetaMask tự động |

### Cổng cần trống

| Cổng | Dịch vụ |
|------|---------|
| `8545` / `8546` | HTTP RPC node1 / node2 |
| `8555` / `8556` | WebSocket |
| `8551` / `8552` | Auth RPC (Engine API) |
| `30303` / `30304` | P2P |
| `8765` | Trang MetaMask helper (khi chạy `serve-metamask.sh`) |

Kiểm tra nhanh (macOS / Linux):

```bash
lsof -iTCP:8545 -sTCP:LISTEN
lsof -iTCP:8546 -sTCP:LISTEN
```

Nếu còn process cũ: `./scripts/stop-nodes.sh`.

---

## 4. Cài đặt geth theo hệ điều hành

Sau khi cài, kiểm tra:

```bash
geth version
# Kỳ vọng: Version: 1.13.x-stable
```

Ưu tiên giữ **1.13.x**. Bản 1.14+ có thể đổi flag mining / API.

### 4.1. macOS

```bash
brew install ethereum
geth version
```

Cài thêm (nếu thiếu): `brew install curl python3`.

### 4.2. Linux (Ubuntu / Debian)

```bash
sudo apt update
sudo apt install -y curl python3

# Cách A — PPA (có thể ra bản mới hơn 1.13)
sudo add-apt-repository -y ppa:ethereum/ethereum
sudo apt update
sudo apt install -y ethereum

# Cách B (khuyến nghị nếu cần đúng 1.13.x): tải binary
# https://geth.ethereum.org/downloads/  (Linux amd64 1.13.x)
# Giải nén rồi: sudo mv geth /usr/local/bin/ && geth version
```

### 4.3. Windows

**Khuyến nghị:** WSL2 + Ubuntu, rồi làm giống mục 4.2 và chạy script bash trong WSL.

Hoặc:

1. Cài [Git for Windows](https://git-scm.com/download/win) (Git Bash).
2. Tải **geth Windows 1.13.x** từ [geth.ethereum.org/downloads](https://geth.ethereum.org/downloads/).
3. Thêm thư mục có `geth.exe` vào PATH hệ thống.
4. Mở Git Bash, `cd` vào `blockchain/private-net`, chạy các script như dưới.

MetaMask chạy trên trình duyệt Windows; RPC `http://127.0.0.1:8545` vẫn dùng được khi geth chạy trên cùng máy (hoặc WSL2 đã forward localhost).

---

## 5. Cài đặt và khởi động mạng (chi tiết)

### Bước 1 — Vào thư mục và cấp quyền script

```bash
cd /đường/dẫn/ticket-anti-scalping/blockchain/private-net
chmod +x scripts/*.sh
```

### Bước 2 — Tạo file mật khẩu keystore

```bash
cp -n password.txt.example password.txt
```

Mật khẩu lab mặc định trong `password.txt.example`:

```
ticket123
```

Chỉ dùng trên mạng lab local. Không dùng trên mainnet / testnet thật.

### Bước 3 — Khởi tạo chain từ genesis (lần đầu hoặc khi reset)

```bash
./scripts/init.sh
```

Script giữ keystore trong `node1/` và `node2/`, xóa chaindata cũ (nếu có), rồi `geth init` từ `genesis.json`.

Máy lab chuẩn đã có sẵn keystore khớp `accounts.json` và `genesis.json`. Chỉ chạy `create-accounts.sh` khi cố ý tạo cặp khóa mới (lúc đó phải cập nhật genesis / accounts).

### Bước 4 — Bật 2 node và nối peer

```bash
./scripts/start-all.sh
```

Lệnh này khởi động node1 + node2 nền, ghi log vào `logs/node1.log` và `logs/node2.log`, rồi nối peer.

**Cách thủ công (xem log trực tiếp):** mở 3 terminal:

```bash
# Terminal 1
./scripts/start-node1.sh

# Terminal 2
./scripts/start-node2.sh

# Terminal 3
./scripts/connect-peers.sh
./scripts/status.sh
```

### Bước 5 — Xác nhận mạng ổn định

Xem mục [6. Kiểm tra mạng đã sẵn sàng](#6-kiểm-tra-mạng-đã-sẵn-sàng).

---

## 6. Kiểm tra mạng đã sẵn sàng

```bash
./scripts/status.sh
```

Kỳ vọng:

- `chainId: 12345` trên cả hai node
- `peers: 1` (hoặc nhiều hơn) trên mỗi node
- Số `block` tăng dần theo thời gian (~5 giây / block)

Gọi RPC thủ công:

```bash
curl -s -X POST http://127.0.0.1:8545 \
  -H "Content-Type: application/json" \
  --data '{"jsonrpc":"2.0","method":"eth_chainId","params":[],"id":1}'
# Kỳ vọng result "0x3039" (= 12345)

curl -s -X POST http://127.0.0.1:8545 \
  -H "Content-Type: application/json" \
  --data '{"jsonrpc":"2.0","method":"eth_blockNumber","params":[],"id":1}'
```

Unlock deployer (khi deploy Hardhat không dùng private key):

```bash
curl -s -X POST http://127.0.0.1:8545 \
  -H "Content-Type: application/json" \
  --data '{"jsonrpc":"2.0","method":"personal_unlockAccount","params":["0xdecc0bf86a34de96B161b1F910ce2684d36bb4B4","ticket123",600],"id":1}'
```

---

## 7. Kết nối MetaMask (chuẩn theo dự án)

Dự án có sẵn trang kết nối trong `private-net/metamask/`, phục vụ bởi script `scripts/serve-metamask.sh`. Đây là **cách chuẩn** để thêm mạng Clique lab vào MetaMask (không cần gõ tay RPC / chainId nếu dùng trang helper).

Tham số mạng được khai báo một nơi trong [`private-net/metamask/network-config.js`](./private-net/metamask/network-config.js):

| Tham số | Giá trị chuẩn dự án |
|---------|---------------------|
| Tên mạng | `Ticket Private Clique` |
| Chain ID (thập phân) | `12345` |
| Chain ID (hex) | `0x3039` |
| RPC URL | `http://127.0.0.1:8545` (node1) |
| Currency | `ETH` · 18 decimals |
| Block explorer | không dùng (mảng rỗng) |

Logic trang helper (`connect.js`):

1. `eth_requestAccounts` — xin quyền đọc tài khoản MetaMask.
2. `wallet_switchEthereumChain` sang `0x3039`.
3. Nếu MetaMask trả lỗi `4902` (chưa có mạng): gọi `wallet_addEthereumChain` với đúng tham số trên.
4. Đọc `eth_chainId` và `eth_getBalance` để hiện trạng thái trên UI.

### 7.1. Điều kiện trước khi kết nối

1. Đã cài extension [MetaMask](https://metamask.io) trên Chrome / Firefox / Edge / Brave.
2. Mạng geth lab đang chạy và RPC node1 trả lời:

```bash
cd blockchain/private-net
./scripts/start-all.sh
./scripts/status.sh
# Kỳ vọng chainId 12345, peers >= 1
```

3. Chỉ mở trang helper qua `http://127.0.0.1:...` (localhost). Không mở file `index.html` bằng `file://` — trình duyệt sẽ chặn gọi MetaMask / RPC.

### 7.2. Cách chuẩn — trang helper của dự án

**Bước 1.** Trong một terminal (giữ chạy):

```bash
cd blockchain/private-net
./scripts/serve-metamask.sh
```

Script chạy `python3 -m http.server` tại thư mục `metamask/`, bind `127.0.0.1`, cổng mặc định **8765**.

```
[INFO] Trang MetaMask: http://127.0.0.1:8765/
```

Đổi cổng nếu cần: `./scripts/serve-metamask.sh 8766`.

**Bước 2.** Mở trình duyệt (cùng máy, đã cài MetaMask):

[http://127.0.0.1:8765/](http://127.0.0.1:8765/)

Trang tự gọi **Kiểm tra RPC geth** khi load. Phần **RPC geth** phải hiện dạng: `RPC OK — chainId 12345 (http://127.0.0.1:8545)`. Nếu lỗi: quay lại bật `./scripts/start-all.sh`.

**Bước 3.** Trên trang có ba nút — dùng đúng thứ tự khuyến nghị:

| Nút trên UI | Việc xảy ra |
|-------------|-------------|
| **Kiểm tra RPC geth** | Gọi JSON-RPC `eth_chainId` tới `:8545` (không cần MetaMask) |
| **Kết nối MetaMask** | Xin tài khoản, rồi tự thêm/chuyển mạng `12345` |
| **Thêm / chuyển mạng 12345** | Chỉ thêm hoặc chuyển mạng (khi đã connect nhưng đang sai chain) |

**Bước 4.** Bấm **Kết nối MetaMask**. Trên popup MetaMask:

1. Chọn tài khoản cần dùng, bấm **Next** / **Connect**.
2. Nếu mạng chưa từng thêm: hiện yêu cầu **Approve** thêm mạng `Ticket Private Clique` (`12345`, RPC `127.0.0.1:8545`) — bấm Approve.
3. Nếu mạng đã có: MetaMask chuyển sang chain đó.

**Bước 5.** Kiểm tra khung **Trạng thái** trên trang helper:

| Ô trên trang | Kỳ vọng khi thành công |
|--------------|------------------------|
| RPC geth | `RPC OK — chainId 12345 (...)` |
| Tài khoản / Địa chỉ đầy đủ | Địa chỉ ví đang chọn (không còn “(chưa kết nối)”) |
| Chain ID | `12345 (0x3039)` |
| Mạng | `Đúng mạng Ticket Private Clique` |
| Số dư | Có số ETH (nếu ví đã được fund trong genesis hoặc faucet) |

Nếu **Mạng** hiện `Sai mạng — bấm 'Thêm / chuyển mạng'`: bấm nút **Thêm / chuyển mạng 12345**, rồi Approve trên MetaMask.

### 7.3. Cách dự phòng — thêm mạng thủ công trong MetaMask

Dùng khi không chạy được trang helper. Tham số **phải khớp** `network-config.js`:

1. Mở MetaMask → biểu tượng mạng (góc trên) → **Add a custom network** / **Add network manually**  
   (hoặc Settings → Networks → Add network → Add a network manually).
2. Điền:

| Trường MetaMask | Giá trị |
|-----------------|---------|
| Network name | `Ticket Private Clique` |
| Default RPC URL | `http://127.0.0.1:8545` |
| Chain ID | `12345` |
| Currency symbol | `ETH` |
| Block explorer URL | để trống |

3. Save, rồi chọn mạng **Ticket Private Clique** trên thanh mạng MetaMask.

Không dùng chainId `31337` / `31338` (Hardhat chain A/B) hay Sepolia cho lab geth này.

### 7.4. Dùng MetaMask với frontend đồ án

Sau khi đã đúng mạng `12345`:

1. Chạy frontend (`cd frontend && npm run dev`) tại `http://localhost:5173`.
2. Vào `/user` để đăng nhập JWT và liên kết ví (cùng địa chỉ MetaMask đang chọn).
3. Khi mua vé / list / buy resale, MetaMask sẽ hỏi ký giao dịch trên **Ticket Private Clique**.
4. Ví cần đủ ETH lab (import keystore mục 8, hoặc faucet trong `/admin`).

`VITE_CHAIN_ID` / RPC trong `frontend/.env` phải là `12345` và `http://127.0.0.1:8545`.

---

## 8. Import tài khoản lab vào MetaMask

Trang helper chỉ **thêm mạng và kết nối** ví hiện có. Để có ETH genesis (~1,000,000 ETH) và khớp địa chỉ trong `accounts.json`, cần **import keystore** lab (hoặc nhận faucet từ admin).

### 8.1. Tài khoản công khai (genesis alloc)

Nguồn chân lý: [`private-net/accounts.json`](./private-net/accounts.json) và danh sách trên trang helper.

| Vai trò | Địa chỉ | File keystore |
|---------|---------|---------------|
| Signer 1 (node1) | `0xa98B089Fad3e09f069b41a50F3cb41387ba5e8A2` | `node1/keystore/UTC--...--a98b089f...` |
| Deployer (test) | `0xdecc0bf86a34de96B161b1F910ce2684d36bb4B4` | `node1/keystore/UTC--...--decc0bf8...` |
| Signer 2 (node2) | `0xd07f0A707A3A6eA439a2B8cb18A7dA016A6056B4` | `node2/keystore/UTC--...--d07f0a70...` |

Mật khẩu keystore lab: nội dung file `password.txt` (tạo từ `password.txt.example`), mặc định:

```
ticket123
```

### 8.2. Các bước import keystore trên MetaMask

1. Đảm bảo đã thêm mạng **Ticket Private Clique** (mục 7) và đang chọn mạng đó.
2. MetaMask → biểu tượng tài khoản (góc trên phải) → **Import account**.
3. Chọn kiểu **JSON file** / **Import my account** bằng keystore (không phải Seed Phrase trừ khi bạn tự export).
4. Chọn đúng file UTC:
   - Demo mua vé / deploy: nên import **Deployer** từ `private-net/node1/keystore/` (đuôi địa chỉ `...bb4b4`).
   - Signer chỉ cần khi thao tác sealer; người mua thường dùng Deployer hoặc ví đã được faucet.
5. Nhập mật khẩu `ticket123` (hoặc đúng `password.txt`).
6. Sau import, chọn tài khoản vừa thêm, vẫn giữ mạng Ticket Private Clique.
7. Quay lại [http://127.0.0.1:8765/](http://127.0.0.1:8765/), bấm **Kết nối MetaMask**, chọn đúng địa chỉ vừa import. Ô **Số dư** phải hiện ETH lớn (alloc genesis).

Liệt kê keystore trên máy:

```bash
cd blockchain/private-net
geth account list --datadir node1
geth account list --datadir node2
ls node1/keystore
ls node2/keystore
```

### 8.3. Checklist hoàn tất kết nối ví

| Hạng mục | OK khi |
|----------|--------|
| geth | `status.sh` báo chainId `12345` |
| Trang helper | RPC OK; Chain ID `12345 (0x3039)`; Mạng “Đúng mạng…” |
| MetaMask network picker | Đang chọn **Ticket Private Clique** |
| Tài khoản | Địa chỉ trùng một dòng trong `accounts.json` (hoặc ví đã faucet) |
| Số dư | > 0 ETH trên mạng `12345` |
| Frontend | Mint / ký tx không báo wrong chain id |

### 8.4. Bảo mật lab

- Keystore và `password.txt` chỉ dùng mạng private local của đồ án.
- Không commit `password.txt` / private key lên git.
- Không dùng cùng khóa trên mainnet hoặc testnet có tiền thật.

---

## 9. Dừng / reset mạng

Dừng 2 node:

```bash
./scripts/stop-nodes.sh
```

Reset chain (giữ keystore, xóa block đã mine), rồi bật lại:

```bash
./scripts/stop-nodes.sh
./scripts/init.sh
./scripts/start-all.sh
```

Sau mỗi lần `init.sh`, contract đã deploy trước đó **không còn** trên chain mới. Cần deploy lại smart-contract và cập nhật `.env` backend / frontend.

---

## 10. Lỗi thường gặp

| Hiện tượng | Cách xử lý |
|------------|------------|
| `geth: command not found` | Cài geth 1.13.x và kiểm tra PATH (`which geth`) |
| Cổng `8545` đã bị chiếm | `./scripts/stop-nodes.sh` hoặc tắt process cũ; không chạy Hardhat node cùng cổng |
| `peers: 0` | Chạy lại `./scripts/connect-peers.sh`; đợi vài giây rồi `status.sh` |
| MetaMask “Could not fetch chain ID” / RPC error | Bật geth (`start-all.sh`); RPC đúng `http://127.0.0.1:8545`; tắt VPN; thử nút **Kiểm tra RPC geth** trên `:8765` |
| Trang helper báo chưa có MetaMask | Cài extension, tắt ví khác che `window.ethereum`, reload `http://127.0.0.1:8765/` (không mở `file://`) |
| “Sai mạng” trên trang helper | Bấm **Thêm / chuyển mạng 12345**; Approve; không dùng chain `31337` |
| Số dư 0 sau import | Đang chọn Ticket Private Clique? Đúng file UTC `decc0bf8…` / genesis? Mật khẩu `ticket123`? |
| Script `.sh` lỗi trên Windows | Dùng WSL2; hoặc sửa CRLF; chạy trong Git Bash với PATH đã có `geth` và `python3` |

---

## Liên kết tiếp theo

| Việc cần làm | Nơi hướng dẫn |
|--------------|---------------|
| Deploy contract lên mạng này | [`../smart-contract/README.md`](../smart-contract/README.md) — `npm run deploy:local` |
| Full stack (backend + frontend) | [`../README.md`](../README.md) |
| Chi tiết Clique / ticket-block | [`private-net/HUONG-DAN.md`](./private-net/HUONG-DAN.md) · [`private-net/TICKET-BLOCK.md`](./private-net/TICKET-BLOCK.md) |
