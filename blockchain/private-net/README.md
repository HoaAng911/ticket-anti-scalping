# Private Net — Tóm tắt

Mạng Ethereum riêng tư 2 node geth (Clique PoA), chainId `12345`.

**Hướng dẫn đầy đủ:** [`../README.md`](../README.md) (cài đặt + MetaMask chuẩn dự án) · [`HUONG-DAN.md`](./HUONG-DAN.md)

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

## Kết nối MetaMask (chuẩn dự án)

Luồng chuẩn dùng trang helper trong `metamask/` (chi tiết từng bước: [`../README.md` mục 7–8](../README.md#7-kết-nối-metamask-chuẩn-theo-dự-án)).

```bash
# 1) Mạng geth phải đang chạy
./scripts/start-all.sh

# 2) Mở trang kết nối
./scripts/serve-metamask.sh
# Trình duyệt: http://127.0.0.1:8765/
```

Trên trang:

1. Xác nhận **RPC geth** = OK (chainId 12345).
2. Bấm **Kết nối MetaMask** và Approve thêm mạng **Ticket Private Clique**.
3. (Nếu cần ETH genesis) Import keystore `node1/keystore/` — mật khẩu `password.txt` (`ticket123`).
4. Kiểm tra UI: Chain ID `12345 (0x3039)`, Mạng “Đúng mạng…”, có số dư.

Tham số mạng (khớp `metamask/network-config.js`):

| Trường | Giá trị |
|--------|---------|
| Network name | Ticket Private Clique |
| RPC URL | `http://127.0.0.1:8545` |
| Chain ID | `12345` (`0x3039`) |
| Currency | `ETH` |

## Dừng

```bash
./scripts/stop-nodes.sh
```
