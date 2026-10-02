# Nghiệp vụ TicketBlock trên mạng private-net

Tài liệu này mô tả **chuỗi node vé** (TicketBlock) chạy trên geth Clique `chainId = 12345`.  
Không nhầm với **node geth** (node1/node2 sealer): TicketBlock là cấu trúc on-chain trong contract `EventTicket`.

---

## 1. Nghiệp vụ

| Thao tác | On-chain | TicketBlock |
|----------|----------|-------------|
| Tạo loại vé (`configureEvent`) | Cấu hình giá / supply | **Không** tạo node |
| Mint sơ cấp (`mintTicket`) | ERC-721 + thanh toán | **Tạo 1 node mới** |
| Admin mint (`adminMint` / `adminMintBatch`) | Cấp NFT lab | **Mỗi ví nhận = 1 node mới** |
| Resale (`Marketplace`) | Đổi owner NFT | **Không** đổi hash mint (node bất biến) |

Quy tắc liên kết:

```
Node #1:  prevBlockHash = 0x0 (genesis)
Node #2:  prevBlockHash = blockHash(#1)
Node #n:  prevBlockHash = blockHash(#n-1)

blockHash = keccak256(
  index, tokenId, eventChainId, owner, price, mintedAt, prevBlockHash
)
```

Chuỗi là **toàn cục**: mint vé sự kiện A rồi sự kiện B vẫn nối tiếp cùng một tip (`latestBlockIndex` / `latestBlockHash`).

`verifyChain(from, to)` kiểm tra:

1. Hash tự tính khớp `blockHash` lưu trong node  
2. `prevBlockHash` của node `i` bằng `blockHash` của node `i-1`  
3. Node đầu có `prev = 0x0`

---

## 2. Luồng đúng trên lab

1. Start geth: `./scripts/start-all.sh`  
2. Deploy contract (một lần / sau reset chain):  
   `cd ../../smart-contract && npx hardhat run scripts/deploy.js --network localhost`  
3. Backend + seed + frontend  
4. Admin rồi **Mint vé** (hoặc user mua vé)  
5. Admin rồi **Chuỗi block vé**: tip tăng, `verifyChain = HỢP LỆ`  
6. Script demo:

```bash
chmod +x scripts/demo-ticket-block-chain.sh
./scripts/demo-ticket-block-chain.sh          # mint 2 vé + assert liên kết
./scripts/demo-ticket-block-chain.sh verify   # chỉ đọc tip
```

API đọc chuỗi: `GET http://127.0.0.1:5001/api/tickets/chain`

Response mint admin có thêm:

```json
"chain": {
  "tipBefore": 2,
  "tipAfter": 4,
  "verifyChain": true,
  "newBlocks": [
    { "index": 3, "tokenId": 3, "prevBlockHash": "0x…", "blockHash": "0x…" },
    { "index": 4, "tokenId": 4, "prevBlockHash": "0x…", "blockHash": "0x…" }
  ]
}
```

---

## 3. Phân biệt với node geth

| Khái niệm | Ý nghĩa |
|-----------|---------|
| geth node1 / node2 | Máy sealer PoA, tạo **block Ethereum** ~5s |
| TicketBlock node | Bản ghi hash gắn với **mỗi NFT vé** khi mint |

Script `create-accounts.sh` chỉ tạo keystore sealer/deployer — **không** tạo TicketBlock.

---

## 4. Kiểm tra nhanh bằng curl

```bash
# Tip + verify
curl -s http://127.0.0.1:5001/api/tickets/chain | python3 -m json.tool | head -60
```

Kỳ vọng sau vài lần mint: `valid: true`, mỗi phần tử `blocks[]` có `prevBlockHash` trỏ hash node trước.
