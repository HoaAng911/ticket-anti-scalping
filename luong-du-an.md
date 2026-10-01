# Luồng dự án — Ticket Anti-Scalping

Tổng quan luồng hoạt động của hệ thống bán vé chống chợ đen trên Ethereum.

## 1. Luồng sơ cấp (mua vé từ ban tổ chức)

```
User chọn sự kiện → Chọn loại vé → Bấm "Mua vé"
→ MetaMask ký giao dịch mintTicket() trên EventTicket.sol
→ Contract kiểm tra: MAX_TICKETS_PER_WALLET, tổng số vé còn lại
→ Emit event TicketMinted(tokenId, owner, eventChainId, price)
→ Backend listener bắt event → đồng bộ DB (Ticket collection)
→ Frontend hiển thị txHash + trạng thái pending/thành công
```

## 2. Luồng thứ cấp (chợ vé resale)

```
Chủ vé muốn bán lại → Nhập giá (≤ 110% giá gốc) → Bấm "Đăng bán"
→ MetaMask ký giao dịch listTicket() trên Marketplace.sol
→ Contract kiểm tra: còn trong thời gian khóa (24h), là chủ sở hữu, giá ≤ trần
→ Emit event TicketListed(tokenId, seller, price, listedAt)
→ Backend listener bắt event → đồng bộ DB (Ticket.status = "listed_for_resale")

Người mua thấy listing → Bấm "Mua lại"
→ MetaMask ký giao dịch buyResaleTicket()
→ Contract kiểm tra: listing còn active, đủ tiền (value + gas)
→ Chuyển NFT cho người mua, chuyển tiền cho người bán, trừ 5% royalty về organizerTreasury
→ Emit event TicketSold(tokenId, seller, buyer, price, royalty)
→ Listing tự chuyển inactive
→ Backend listener bắt event → đồng bộ DB (Ticket.ownerWallet = buyer, status = "owned")
```

## 3. Luồng quản trị (organizer)

```
Organizer đăng nhập → Vào Dashboard
→ Xem thống kê: số vé đã bán, doanh thu sơ cấp, doanh thu resale, royalty
→ Xem cảnh báo giao dịch bất thường (vé bị bán đi bán lại nhiều lần)
→ Backend query Transaction collection + đọc event từ contract
```

## 4. Luồng đồng bộ Blockchain → DB

```
geth private-net (hoặc Sepolia) sinh block mới
→ blockchainListener.js (backend) poll/subcribe event
→ Bắt: TicketMinted, TicketTicketListed, TicketSold
→ Cập nhật DB: Ticket, Transaction
→ KHÔNG BAO GIỜ cho client gọi API để tự đổi Ticket.status
```

## 5. Mạng lưới hoạt động

| Mạng          | Chain ID | RPC                       | Mục đích                         |
| ------------- | -------- | ------------------------- | -------------------------------- |
| Geth Private  | 12345    | `http://127.0.0.1:8545`   | Dev chính (Clique PoA, 2 node)   |
| Hardhat Local | 31337    | `http://127.0.0.1:8545`   | Dev phụ (nhanh, không cần setup) |
| Sepolia       | 11155111 | `https://rpc.sepolia.org` | Demo cuối, public testnet        |

## 6. Điều kiện giao dịch hợp lệ (7 điều)

1. Chữ ký hợp lệ (ecrecover từ v, r, s)
2. Nonce đúng thứ tự (tăng dần theo từng ví)
3. Đủ số dư: `value + gasLimit × maxFeePerGas ≤ balance`
4. Gas tối thiểu: `gasLimit ≥ 21000`
5. Gas không vượt block limit: `gasLimit ≤ block.gasLimit`
6. ChainId đúng: `tx.chainId === network.chainId`
7. Giá gas hợp lệ (EIP-1559): `maxFeePerGas ≥ baseFeePerGas`
