# Private Net — Tóm tắt

Mạng Ethereum riêng tư 2 node geth (Clique PoA), chainId `12345`.

**Hướng dẫn đầy đủ (tiếng Việt):** [`HUONG-DAN.md`](./HUONG-DAN.md)

## Yêu cầu

- geth 1.13.x (`brew install ethereum`)
- curl, python3
- MetaMask (extension trình duyệt)

## Cài đặt và chạy

```bash
cd blockchain/private-net
chmod +x scripts/*.sh
cp -n password.txt.example password.txt

./scripts/init.sh         # lần đầu: khởi tạo từ genesis.json
./scripts/start-all.sh    # bật node1 + node2 + nối peer
./scripts/status.sh       # kiểm tra chainId / block / peers
```

## Kết nối MetaMask

```bash
# Mạng geth phải đang chạy
./scripts/serve-metamask.sh
# Mở trình duyệt: http://127.0.0.1:8765/
# Bấm "Kết nối MetaMask" rồi Approve thêm mạng chainId 12345
```

Hoặc thêm mạng thủ công:

| Trường | Giá trị |
|--------|---------|
| Network name | Ticket Private Clique |
| RPC URL | `http://127.0.0.1:8545` |
| Chain ID | `12345` |
| Currency | `ETH` |

Code trang kết nối nằm trong thư mục [`metamask/`](./metamask/).

## Dừng

```bash
./scripts/stop-nodes.sh
```
