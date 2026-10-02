# Luồng dự án — Ticket Anti-Scalping

Tổng quan luồng hoạt động của hệ thống bán vé chống chợ đen trên Ethereum.

## 1. Luồng sơ cấp (mua vé từ ban tổ chức)

```
1. User chọn sự kiện, chọn loại vé, bấm "Mua vé"
2. MetaMask ký giao dịch mintTicket() trên EventTicket.sol
3. Contract kiểm tra: MAX_TICKETS_PER_WALLET, tổng số vé còn lại
4. Emit event TicketMinted(tokenId, owner, eventChainId, price)
5. Backend listener bắt event để đồng bộ DB (Ticket collection)
6. Frontend hiển thị txHash và trạng thái pending/thành công
```

## 2. Luồng thứ cấp (chợ vé resale)

```
1. Chủ vé muốn bán lại, nhập giá (≤ 110% giá gốc), bấm "Đăng bán"
2. MetaMask ký giao dịch listTicket() trên Marketplace.sol
3. Contract kiểm tra: còn trong thời gian khóa (24h), là chủ sở hữu, giá ≤ trần
4. Emit event TicketListed(tokenId, seller, price, listedAt)
5. Backend listener bắt event để đồng bộ DB (Ticket.status = "listed_for_resale")

6. Người mua thấy listing, bấm "Mua lại"
7. MetaMask ký giao dịch buyResaleTicket()
8. Contract kiểm tra: listing còn active, đủ tiền (value + gas)
9. Chuyển NFT cho người mua, chuyển tiền cho người bán, trừ 5% royalty về organizerTreasury
10. Emit event TicketSold(tokenId, seller, buyer, price, royalty)
11. Listing tự chuyển inactive
12. Backend listener bắt event để đồng bộ DB (Ticket.ownerWallet = buyer, status = "owned")
```

## 3. Luồng quản trị (organizer)

```
1. Organizer đăng nhập, vào Dashboard
2. Xem thống kê: số vé đã bán, doanh thu sơ cấp, doanh thu resale, royalty
3. Xem cảnh báo giao dịch bất thường (vé bị bán đi bán lại nhiều lần)
4. Backend query Transaction collection và đọc event từ contract
```

## 4. Luồng đồng bộ Blockchain sang DB

```
1. Smart contract emit event khi có giao dịch
2. blockchainListener.js (backend) poll/subscribe event
3. Bắt: TicketMinted, TicketListed, TicketSold
4. Cập nhật DB: Ticket, Transaction
5. KHÔNG BAO GIỜ cho client gọi API để tự đổi Ticket.status
```

## 5. Mạng hỗ trợ

- Geth Private Clique: chainId 12345 (dev chính)
- Hardhat local: chainId 31337 (unit test)
- Sepolia testnet: chainId 11155111 (demo public)
