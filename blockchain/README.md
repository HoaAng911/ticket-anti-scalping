# Blockchain — Mạng riêng tư Go Ethereum

Thư mục này chứa mạng Ethereum riêng tư dùng **geth** (Go Ethereum) với cơ chế đồng thuận **Clique PoA** (Proof of Authority). Mạng phục vụ deploy và test smart contract của đồ án Ticket Anti-Scalping.

Hướng dẫn cài đặt đầy đủ: [`private-net/HUONG-DAN.md`](./private-net/HUONG-DAN.md).

## Thông số mạng

| Thông số | Giá trị |
|----------|---------|
| Client | geth 1.13.x |
| Consensus | Clique PoA |
| chainId / networkId | `12345` |
| Block time | ~5 giây |
| Node1 HTTP RPC | `http://127.0.0.1:8545` |
| Node2 HTTP RPC | `http://127.0.0.1:8546` |

## Cấu trúc

```
blockchain/
├── README.md                 # File này
└── private-net/
    ├── HUONG-DAN.md          # Hướng dẫn chi tiết (cài đặt, chạy, MetaMask)
    ├── README.md             # Tóm tắt nhanh
    ├── genesis.json          # Cấu hình genesis Clique
    ├── accounts.json         # Địa chỉ công khai các tài khoản
    ├── password.txt.example  # Mẫu mật khẩu keystore
    ├── metamask/             # Trang kết nối ví MetaMask
    └── scripts/              # init / start / stop / status / serve-metamask
```

## Khởi động nhanh

```bash
cd private-net
chmod +x scripts/*.sh
cp -n password.txt.example password.txt
./scripts/init.sh             # lần đầu (hoặc reset chaindata)
./scripts/start-all.sh        # bật 2 node + nối peer
./scripts/status.sh           # kiểm tra
./scripts/serve-metamask.sh   # http://127.0.0.1:8765/ — kết nối MetaMask
```

Hardhat trỏ mạng này qua network `localhost` trong `smart-contract/hardhat.config.js`
(`url: http://127.0.0.1:8545`, `chainId: 12345`).
