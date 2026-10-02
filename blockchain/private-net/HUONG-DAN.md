# Hướng dẫn chi tiết — Mạng riêng tư Go Ethereum (2 node geth)

Tài liệu này mô tả cách cài đặt, khởi động, kiểm tra và sử dụng mạng Ethereum riêng tư của đồ án **Ticket Anti-Scalping**.

Mục tiêu: chạy **2 node geth** trên cùng máy, đồng thuận **Clique PoA**, `chainId = 12345`, để deploy / test smart contract bằng Hardhat và tương tác qua MetaMask.

---

## 1. Tổng quan


| Hạng mục        | Giá trị                       |
| --------------- | ----------------------------- |
| Client          | Go Ethereum (geth) 1.13.x     |
| Đồng thuận      | Clique (Proof of Authority)   |
| chainId         | `12345`                       |
| networkId       | `12345`                       |
| Thời gian block | ~5 giây (`clique.period = 5`) |
| Số node         | 2 (cả hai đều là sealer)      |
| Node1 RPC       | `http://127.0.0.1:8545`       |
| Node2 RPC       | `http://127.0.0.1:8546`       |


**Clique PoA** khác Proof of Work: không đào coin. Chỉ các địa chỉ được liệt kê trong `extraData` của genesis (sealer) mới được phép ký / tạo block. Trên mạng lab 2 sealer, mỗi node xen kẽ ký block; log `signed recently, must wait for others` là hành vi bình thường.

Hardhat trong monorepo dùng network `localhost` trỏ tới node1 (`8545`). Hardhat chain A/B dùng cổng `8547` / `8548` để không đụng mạng geth.

---



## 2. Yêu cầu môi trường



### 2.1. Phần mềm


| Công cụ     | Mục đích                              | Ghi chú                   |
| ----------- | ------------------------------------- | ------------------------- |
| geth 1.13.x | Client Ethereum                       | Đã kiểm tra với `1.13.15` |
| curl        | Gọi JSON-RPC trong script             | Có sẵn trên macOS         |
| python3     | Parse JSON trong script status / peer | Có sẵn trên macOS         |
| bash        | Chạy script trong `scripts/`          | zsh/bash đều được         |




### 2.2. Cài geth (macOS)

```bash
brew install ethereum
geth version
```

Cần thấy dòng tương tự:

```
Geth
Version: 1.13.x-stable
```

Nếu dùng bản 1.14 trở lên, một số flag mining / API có thể đổi; ưu tiên giữ 1.13.x cho đồ án.

### 2.3. Cổng mạng cần trống

Đảm bảo các cổng sau **chưa bị chiếm** trước khi start:


| Cổng  | Dịch vụ                     |
| ----- | --------------------------- |
| 8545  | HTTP RPC node1              |
| 8546  | HTTP RPC node2              |
| 8555  | WebSocket node1             |
| 8556  | WebSocket node2             |
| 8551  | Auth RPC (Engine API) node1 |
| 8552  | Auth RPC (Engine API) node2 |
| 30303 | P2P node1                   |
| 30304 | P2P node2                   |


Kiểm tra nhanh:

```bash
lsof -iTCP:8545 -sTCP:LISTEN
lsof -iTCP:8546 -sTCP:LISTEN
```

Nếu có process cũ, chạy `./scripts/stop-nodes.sh`.

---



## 3. Cấu trúc thư mục

```
blockchain/private-net/
├── HUONG-DAN.md              # File hướng dẫn này
├── README.md                 # Tóm tắt nhanh
├── genesis.json              # Cấu hình genesis (commit)
├── accounts.json             # Địa chỉ công khai (commit)
├── password.txt.example      # Mẫu mật khẩu (commit)
├── password.txt              # Mật khẩu thật (gitignore)
├── node1/                    # Datadir node 1 (gitignore)
│   ├── keystore/             # Khóa ký signer1 + deployer
│   └── geth/                 # Chaindata sau khi init / chạy
├── node2/                    # Datadir node 2 (gitignore)
│   ├── keystore/             # Khóa ký signer2
│   └── geth/
├── logs/                     # Log khi dùng start-all.sh (gitignore)
│   ├── node1.log
│   └── node2.log
└── scripts/
    ├── create-accounts.sh    # Tạo keystore mới
    ├── init.sh               # geth init từ genesis.json
    ├── start-node1.sh        # Chạy node1 (foreground)
    ├── start-node2.sh        # Chạy node2 (foreground)
    ├── start-all.sh          # Bật 2 node nền + nối peer
    ├── connect-peers.sh      # admin_addPeer node2 -> node1
    ├── status.sh             # In chainId / block / peers
    └── stop-nodes.sh         # Kill process theo cổng
```

**Lưu ý:** `node1/`, `node2/`, `password.txt`, `logs/` không commit. Khi clone máy mới cần tạo lại keystore hoặc copy keystore + password từ máy đã setup (xem mục 9).

---



## 4. Giải thích genesis.json

File `genesis.json` định nghĩa block số 0 và luật mạng.

### 4.1. Các trường chính


| Trường                 | Ý nghĩa                                                            |
| ---------------------- | ------------------------------------------------------------------ |
| `config.chainId`       | `12345` — MetaMask / Hardhat phải trùng                            |
| `config.clique.period` | `5` — mỗi ~5 giây tạo 1 block (nếu có sealer)                      |
| `config.clique.epoch`  | `30000` — chu kỳ reset vote Clique                                 |
| Hard fork block        | Đặt `0` đến London / Gray Glacier; **chưa** bật Shanghai / Cancun  |
| `difficulty`           | `"1"` — Clique không dùng difficulty như PoW                       |
| `gasLimit`             | `"8000000"` — giới hạn gas mỗi block                               |
| `extraData`            | Vanity 32 byte + danh sách sealer (20 byte/địa chỉ) + seal 65 byte |
| `alloc`                | Số dư ban đầu (wei, hex) cho từng địa chỉ                          |


Hardhat compile với `evmVersion: "paris"` để khớp genesis (tránh opcode `PUSH0` của Shanghai).

### 4.2. Định dạng Clique extraData

```
0x
  + 64 ký tự hex (32 byte vanity, thường toàn 0)
  + địa chỉ sealer1 (40 ký tự hex, không có 0x)
  + địa chỉ sealer2 (40 ký tự hex)
  + 130 ký tự hex (65 byte signature, toàn 0 ở genesis)
```

Trong đồ án hiện tại, hai sealer là:

1. `a98b089fad3e09f069b41a50f3cb41387ba5e8a2` (node1)
2. `d07f0a707a3a6ea439a2b8cb18a7da016a6056b4` (node2)



### 4.3. alloc

Mỗi tài khoản trong `alloc` nhận balance `0xD3C21BCECCEDA1000000` (~1,000,000 ETH) để đủ gas deploy / giao dịch test.

---



## 5. Tài khoản

Thông tin công khai nằm trong `accounts.json`.


| Vai trò  | Địa chỉ                                      | Datadir | Mô tả                            |
| -------- | -------------------------------------------- | ------- | -------------------------------- |
| Signer 1 | `0xa98B089Fad3e09f069b41a50F3cb41387ba5e8A2` | node1   | Sealer / miner node1             |
| Deployer | `0xdecc0bf86a34de96B161b1F910ce2684d36bb4B4` | node1   | Tài khoản deploy / test (có ETH) |
| Signer 2 | `0xd07f0A707A3A6eA439a2B8cb18A7dA016A6056B4` | node2   | Sealer / miner node2             |


Mật khẩu keystore mặc định (file `password.txt`, tạo từ `password.txt.example`):

```
ticket123
```

Chỉ dùng cho mạng lab cục bộ. Không dùng password / key này trên mainnet hay testnet thật.

Liệt kê account:

```bash
cd blockchain/private-net
geth account list --datadir node1
geth account list --datadir node2
```

Import vào MetaMask: chọn **Import Account** bằng file keystore UTC trong `node1/keystore/` hoặc `node2/keystore/`, nhập mật khẩu trong `password.txt`.

---



## 6. Cài đặt lần đầu (máy đã có genesis + keystore)

Nếu bạn đang ở máy đã được setup (có `node1/keystore`, `node2/keystore` khớp `genesis.json`):

```bash
# 1) Vào thư mục
cd ticket-anti-scalping/blockchain/private-net

# 2) Cấp quyền script
chmod +x scripts/*.sh

# 3) Tạo password.txt (nếu chưa có)
cp -n password.txt.example password.txt

# 4) Init chaindata từ genesis (giữ keystore, xóa chain cũ nếu có)
./scripts/init.sh

# 5) Bật cả 2 node, tự động nối peer
./scripts/start-all.sh
```

Kết quả mong đợi của `./scripts/status.sh` (hoặc cuối `start-all.sh`):

- `chainId: 12345` trên cả hai node
- `peers: 1` trên mỗi node
- `block` tăng dần theo thời gian (~5 giây / block)

Log:

- `logs/node1.log`
- `logs/node2.log`

---



## 7. Khởi động thủ công (hai terminal)

Dùng khi cần xem log trực tiếp trên console.

**Terminal 1 — node1:**

```bash
cd ticket-anti-scalping/blockchain/private-net
./scripts/start-node1.sh
```

**Terminal 2 — node2:**

```bash
cd ticket-anti-scalping/blockchain/private-net
./scripts/start-node2.sh
```

**Terminal 3 — nối peer và kiểm tra:**

```bash
cd ticket-anti-scalping/blockchain/private-net
./scripts/connect-peers.sh
./scripts/status.sh
```

`start-node2.sh` sẽ thử lấy `enode` của node1 qua HTTP RPC để thêm `--bootnodes`. Nếu node1 chưa sẵn sàng, vẫn start được node2; sau đó bắt buộc chạy `connect-peers.sh`.

---



## 8. Kiểm tra mạng



### 8.1. Script có sẵn

```bash
./scripts/status.sh
```

In ra client version, chainId, số block, số peer của từng node.

### 8.2. Gọi JSON-RPC bằng tay

```bash
# chainId (hex 0x3039 = 12345)
curl -s -X POST http://127.0.0.1:8545 \
  -H "Content-Type: application/json" \
  --data '{"jsonrpc":"2.0","method":"eth_chainId","params":[],"id":1}'

# số block hiện tại
curl -s -X POST http://127.0.0.1:8545 \
  -H "Content-Type: application/json" \
  --data '{"jsonrpc":"2.0","method":"eth_blockNumber","params":[],"id":1}'

# số dư deployer
curl -s -X POST http://127.0.0.1:8545 \
  -H "Content-Type: application/json" \
  --data '{"jsonrpc":"2.0","method":"eth_getBalance","params":["0xdecc0bf86a34de96B161b1F910ce2684d36bb4B4","latest"],"id":1}'

# số peer
curl -s -X POST http://127.0.0.1:8545 \
  -H "Content-Type: application/json" \
  --data '{"jsonrpc":"2.0","method":"net_peerCount","params":[],"id":1}'
```



### 8.3. Tiêu chí mạng ổn định

1. Cả hai RPC `8545` và `8546` trả lời.
2. `eth_chainId` = `0x3039` (12345).
3. `net_peerCount` >= 1 trên mỗi node.
4. `eth_blockNumber` tăng sau mỗi ~5–10 giây (với 2 sealer).

---



## 9. Setup trên máy mới (clone repo, chưa có keystore)

`node1/` và `node2/` bị gitignore. Có hai cách:

### Cách A — Copy keystore từ máy đã setup (khuyến nghị nếu muốn giữ nguyên địa chỉ trong genesis)

Copy các mục sau (giữ đúng cấu trúc):

- `private-net/password.txt`
- `private-net/node1/keystore/` (toàn bộ file UTC--)
- `private-net/node2/keystore/` (toàn bộ file UTC--)

Sau đó:

```bash
cd blockchain/private-net
chmod +x scripts/*.sh
./scripts/init.sh
./scripts/start-all.sh
```



### Cách B — Tạo account mới và sửa genesis

```bash
cd blockchain/private-net
cp password.txt.example password.txt
./scripts/create-accounts.sh
geth account list --datadir node1
geth account list --datadir node2
```

Cập nhật `genesis.json`:

1. `extraData`: ghép vanity (32 byte 0) + địa chỉ sealer (không `0x`) + seal (65 byte 0).
2. `alloc`: thêm từng địa chỉ (không `0x`) với balance hex.

Cập nhật `accounts.json` và địa chỉ `SIGNER` trong:

- `scripts/start-node1.sh`
- `scripts/start-node2.sh`

Rồi:

```bash
./scripts/init.sh
./scripts/start-all.sh
```

---



## 10. Kết nối MetaMask

**Hướng dẫn chuẩn theo dự án (chi tiết từng bước, khớp trang helper):** xem [`../README.md` mục 7–8](../README.md#7-kết-nối-metamask-chuẩn-theo-dự-án).

Tóm tắt nhanh:

```bash
cd blockchain/private-net
./scripts/start-all.sh
./scripts/serve-metamask.sh
# Mở http://127.0.0.1:8765/ → Kết nối MetaMask → Approve mạng Ticket Private Clique
```

Tham số (khớp `metamask/network-config.js`):

| Trường          | Giá trị                 |
| --------------- | ----------------------- |
| Network name    | Ticket Private Clique   |
| Default RPC URL | `http://127.0.0.1:8545` |
| Chain ID        | `12345` (`0x3039`)      |
| Currency symbol | `ETH`                   |
| Block explorer  | (để trống)              |

Import tài khoản lab bằng keystore UTC trong `node1/keystore/` hoặc `node2/keystore/`, mật khẩu `password.txt` (`ticket123`). Node geth phải đang chạy thì MetaMask mới kết nối RPC được.

---



## 11. Deploy smart contract bằng Hardhat

Cấu hình sẵn trong `smart-contract/hardhat.config.js`:

```js
localhost: {
  type: "http",
  url: "http://127.0.0.1:8545",
  chainId: 12345,
},
```

Quy trình:

```bash
# Terminal A: mạng geth đang chạy
cd blockchain/private-net
./scripts/status.sh

# Terminal B: deploy
cd smart-contract
npm install
npx hardhat compile
npx hardhat run scripts/deploy.js --network localhost
```

Lưu ý:

- Cần cấu hình account / private key deployer trong Hardhat (ví dụ qua `.env`) nếu script ký giao dịch bằng key ngoài.
- Compiling với `evmVersion: "paris"` bắt buộc khi deploy lên mạng Clique này.
- Không chạy `npx hardhat node` cùng cổng `8545` lúc mạng geth đang bật.

---



## 12. Dừng mạng

```bash
cd blockchain/private-net
./scripts/stop-nodes.sh
```

Script dừng process đang listen trên các cổng RPC/P2P của node1 và node2.

Reset toàn bộ chain (giữ keystore, xóa block đã mine):

```bash
./scripts/stop-nodes.sh
./scripts/init.sh
./scripts/start-all.sh
```

---



## 13. Mô tả từng script


| Script               | Chức năng                                                                             |
| -------------------- | ------------------------------------------------------------------------------------- |
| `create-accounts.sh` | Tạo keystore trong node1 (signer1 + deployer) và node2 (signer2) nếu chưa có          |
| `init.sh`            | Kiểm tra geth / password / keystore; xóa chaindata cũ; `geth init` cho cả 2 node      |
| `start-node1.sh`     | Chạy geth node1: unlock signer1, `--mine`, RPC 8545, P2P 30303                        |
| `start-node2.sh`     | Chạy geth node2: unlock signer2, `--mine`, RPC 8546, P2P 30304; thử bootnode từ node1 |
| `start-all.sh`       | `nohup` start node1, đợi RPC, start node2, `connect-peers`, `status`                  |
| `connect-peers.sh`   | Gọi `admin_nodeInfo` trên node1, `admin_addPeer` trên node2                           |
| `status.sh`          | In client, chainId, block, peers                                                      |
| `stop-nodes.sh`      | Kill theo cổng 8545, 8546, 30303, 30304                                               |


IPC dùng đường dẫn ngắn (giới hạn unix socket trên macOS):

- `/tmp/geth-ticket-node1.ipc`
- `/tmp/geth-ticket-node2.ipc`

---



## 14. Xử lý sự cố thường gặp



### 14.1. `listen tcp 127.0.0.1:8551: bind: address already in use`

Hai node không được dùng chung cổng Auth RPC. Script đã tách `8551` (node1) và `8552` (node2). Nếu vẫn lỗi: `./scripts/stop-nodes.sh` rồi start lại; kiểm tra process geth cũ:

```bash
lsof -iTCP:8551 -sTCP:LISTEN
lsof -iTCP:8552 -sTCP:LISTEN
```



### 14.2. IPC `bind: invalid argument` / path quá dài

Không đặt `--ipcpath` trong thư mục project (đường dẫn dài). Script dùng `/tmp/geth-ticket-node*.ipc`.

### 14.3. Block đứng ở 1, log `signed recently, must wait for others`

Với **2 sealer**, một node không thể ký liên tiếp. Cần **cả hai** node đang mine và đã peer. Chạy:

```bash
./scripts/connect-peers.sh
./scripts/status.sh
```



### 14.4. `peers: 0`

```bash
./scripts/connect-peers.sh
```

Đảm bảo node1 start trước, firewall không chặn localhost P2P `30303`/`30304`.

### 14.5. MetaMask báo wrong chain id / không kết nối

- Geth đang chạy? `./scripts/status.sh`
- Chain ID MetaMask phải là `12345` (không phải 31337 của Hardhat).
- RPC đúng `http://127.0.0.1:8545`.



### 14.6. Init báo thiếu keystore

```bash
./scripts/create-accounts.sh
# nếu địa chỉ mới: cập nhật genesis.json + start-node*.sh (mục 9)
./scripts/init.sh
```



### 14.7. Hai genesis hash khác nhau giữa node1 và node2

Cả hai node phải init **cùng** file `genesis.json`. Nếu lệch, stop, chạy lại `./scripts/init.sh` cho cả hai, rồi start.

---



## 15. Liên kết với các phần khác của monorepo


| Phần                               | Liên quan                                                                     |
| ---------------------------------- | ----------------------------------------------------------------------------- |
| `smart-contract/hardhat.config.js` | Network `localhost` -> `8545`, chainId `12345`                                |
| `smart-contract` compile           | `evmVersion: "paris"`                                                         |
| Hardhat chain A/B                  | Cổng `8547`/`8548`, chainId `31337`/`31338` — song song, không đụng cổng geth |
| Frontend / Backend                 | Khi demo local geth: RPC và chainId phải trùng MetaMask (`12345`)             |


---



## 16. TicketBlock (chuỗi vé — khác node geth)

Khi **mint vé mới**, contract tạo một **TicketBlock node** mới và gắn `prevBlockHash` với node trước (genesis = `0x0`).
Đây **không** phải tạo thêm node geth.

Chi tiết nghiệp vụ + script demo:

- `TICKET-BLOCK.md`
- `./scripts/demo-ticket-block-chain.sh`

---

## 17. Checklist nhanh

- [ ] Đã cài `geth` 1.13.x (`geth version`)
- [ ] Có `password.txt` (từ `password.txt.example`)
- [ ] Có keystore trong `node1/keystore` và `node2/keystore`
- [ ] Đã chạy `./scripts/init.sh`
- [ ] Đã chạy `./scripts/start-all.sh`
- [ ] `status.sh`: chainId 12345, peers >= 1, tip tăng
- [ ] MetaMask thêm mạng `12345` / RPC `8545`
- [ ] Hardhat deploy `--network localhost` thành công
- [ ] Mint vé rồi tip TicketBlock tăng, `verifyChain` hợp lệ (`TICKET-BLOCK.md`)
