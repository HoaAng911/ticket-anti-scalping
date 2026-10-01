# Phân công công việc — Nhóm 3 người

| #   | Thành viên          | Vai trò                     |
| --- | ------------------- | --------------------------- |
| 1   | **Hoàng** | Blockchain / Smart Contract |
| 2   | **Long**            | Backend                     |
| 3   | **Hiếu**            | Frontend                    |

Chia theo **feature slice**: mỗi feature gồm việc của cả 3 người, ai làm phần của mình rồi tích hợp lại.

> Chi tiết kiến trúc, schema DB, API: [`thiet-ke-du-an.md`](thiet-ke-du-an.md)
> Luồng hoạt động: [`luong-du-an.md`](luong-du-an.md)

---

## Feature 1 — Nền tảng Blockchain & Smart Contract

| Người               | Công việc                                                                                                                                                                                                                                                                                                                                                                                                                                           |
| ------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Hoàng ** | Dựng geth private-net 2 node (chainId 12345, Clique PoA, extradata 234 ký tự); viết [`EventTicket.sol`](smart-contract/contracts/EventTicket.sol) (`MAX_TICKETS_PER_WALLET = 2`); viết [`Marketplace.sol`](smart-contract/contracts/Marketplace.sol) (`MAX_RESALE_PERCENT = 110`, `TRANSFER_LOCK_SECONDS = 24h`, `ROYALTY_PERCENT = 5`); viết test; deploy lên localhost + Sepolia; copy ABI vào `backend/src/abi/` và `frontend/src/services/abi/` |
| **Long**            | Cài MongoDB, tạo 4 models theo schema mục 2 của [`thiet-ke-du-an.md`](thiet-ke-du-an.md); cấu hình `.env` (`CHAIN_ID`, `TICKET_CONTRACT_ADDRESS`, `MARKETPLACE_CONTRACT_ADDRESS`)                                                                                                                                                                                                                                                                   |
| **Hiếu**            | Setup MetaMask 3 mạng (Geth Private 12345, Hardhat 31337, Sepolia 11155111)                                                                                                                                                                                                                                                                                                                                                                         |

---

## Feature 2 — Auth & Users

| Người               | Công việc                                                                                                                                                                                                                                                                                                                          |
| ------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Hoàng** | —                                                                                                                                                                                                                                                                                                                                  |
| **Long**            | `models/User.js` (email unique, passwordHash, walletAddress lowercase sparse unique, role, isVerified); `controllers/authController.js` (`register`, `login`, `linkWallet` — chặn 1 ví gắn 2 tài khoản); `middlewares/authMiddleware.js` (verify JWT, gắn `req.user`); `middlewares/errorHandler.js`; `middlewares/rateLimiter.js` |
| **Hiếu**            | Trang đăng ký / đăng nhập; nút "Liên kết ví MetaMask" gọi `POST /api/auth/link-wallet`                                                                                                                                                                                                                                             |

---

## Feature 3 — Events (Sự kiện)

| Người               | Công việc                                                                                                                                                             |
| ------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Hoàng** | —                                                                                                                                                                     |
| **Long**            | `models/Event.js` (ticketTypes[] gồm name/price/totalSupply/eventChainId); `controllers/eventController.js` + `routes/eventRoutes.js` — CRUD sự kiện (organizer only) |
| **Hiếu**            | `pages/Home.jsx` — danh sách sự kiện; `pages/EventDetail.jsx` — chi tiết sự kiện; `components/event/EventCard.jsx`, `TicketTypeSelector.jsx`                          |

---

## Feature 4 — Tickets (Vé sự kiện)

| Người               | Công việc                                                                                                                                                                                                                         |
| ------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Hoàng** | `mintTicket(eventChainId, price)` trong [`EventTicket.sol`](smart-contract/contracts/EventTicket.sol) — chặn vượt `MAX_TICKETS_PER_WALLET`, chặn sold out; emit `TicketMinted`; custom error `TooManyTicketsPerWallet`, `SoldOut` |
| **Long**            | `models/Ticket.js` (tokenId unique, ownerWallet, originalPrice, status enum, mintedAt); `controllers/ticketController.js` + `routes/ticketRoutes.js` — vé theo ví, chi tiết vé                                                    |
| **Hiếu**            | `pages/EventDetail.jsx` — nút mua vé, hiển thị số vé còn lại (`totalSupply - soldCount`); `pages/MyTickets.jsx` — vé của tôi theo ví đang kết nối                                                                                 |

---

## Feature 5 — Marketplace (Chợ resale chống scalping)

| Người               | Công việc                                                                                                                                                                                                                                                                                          |
| ------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Hoàng** | `listTicket(tokenId, price)` — kiểm tra chủ vé, khóa 24h, giá ≤ 110%; `buyResaleTicket(tokenId)` payable — chuyển NFT, chia tiền 95/5, listing → `inactive`; emit `TicketListed`, `TicketSold`; custom error `PriceExceedsResaleCap`, `TransferLocked`, `ListingInactive`, `NotTicketOwner`        |
| **Long**            | `models/Transaction.js` (tokenId, type, from/toWallet, price, royalty, txHash unique); `controllers/marketplaceController.js` + `routes/marketplaceRoutes.js` — `getActiveListings`, `getTransactionHistory` (chỉ đọc)                                                                             |
| **Hiếu**            | `pages/Marketplace.jsx` — danh sách vé đang rao bán; `components/marketplace/ResellForm.jsx` — hiện giá trần = `originalPrice × 110%` và thời điểm mở khóa, chặn submit vượt trần; `components/marketplace/ListingCard.jsx` — đếm ngược thời gian mở khóa; parse custom error → message tiếng Việt |

---

## Feature 6 — Blockchain Listener (Đồng bộ DB từ event)

| Người               | Công việc                                                                                                                                                                                                                                                                                                                                                      |
| ------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Hoàng** | Hướng dẫn Long đọc event `TicketMinted` / `TicketListed` / `TicketSold` từ ethers.js                                                                                                                                                                                                                                                                           |
| **Long**            | `services/blockchainService.js` — ethers.js `JsonRpcProvider` theo `RPC_URL`, đọc contract qua ABI; `services/blockchainListener.js` — lắng nghe event → cập nhật `Ticket` + `Transaction`; chống chạy trùng (check `txHash` unique); **quy tắc vàng: chỉ đọc event, không bao giờ nhận request từ client để đổi `Ticket.status`, `tokenId`, `originalPrice`** |
| **Hiếu**            | —                                                                                                                                                                                                                                                                                                                                                              |

---

## Feature 7 — Wallet & Contract Integration (Frontend)

| Người               | Công việc                                                                                                                                                                                                                                                                                                                                                                  |
| ------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Hoàng** | Hướng dẫn Hiếu gọi contract (encode/decode custom error → message tiếng Việt)                                                                                                                                                                                                                                                                                              |
| **Long**            | —                                                                                                                                                                                                                                                                                                                                                                          |
| **Hiếu**            | `context/WalletContext.jsx` + `hooks/useWallet.js` — kết nối MetaMask, kiểm tra `chainId`, chuyển mạng, theo dõi `accountsChanged` / `chainChanged`; `services/api.js` — axios instance, đọc `res.data.data` / `res.data.error`; `services/contract.js` — ethers.js `BrowserProvider`, `buyPrimaryTicket()`, `listTicketForResale()`, `buyResaleTicket()`, trả về `txHash` |

---

## Feature 8 — Organizer Dashboard

| Người               | Công việc                                                                          |
| ------------------- | ---------------------------------------------------------------------------------- |
| **Hoàng** | —                                                                                  |
| **Long**            | API thống kê doanh thu, cảnh báo giao dịch bất thường                              |
| **Hiếu**            | `pages/OrganizerDashboard.jsx` — thống kê doanh thu, cảnh báo giao dịch bất thường |

---

## 🤝 Việc chung 3 người

| Việc                                                   | Ai chủ trì                             | Ghi chú                                                     |
| ------------------------------------------------------ | -------------------------------------- | ----------------------------------------------------------- |
| Dựng geth private-net (2 node)                         | Hoàng                        | Cả nhóm cùng làm để ai cũng biết khởi động                  |
| Thiết kế schema DB                                     | Long đề xuất, cả nhóm duyệt            | Đã có sẵn trong `thiet-ke-du-an.md`                         |
| Thống nhất hằng số, event, custom error chống scalping | Hoàng đề xuất, cả nhóm duyệt | Không ai tự đổi sau khi duyệt                               |
| Setup MetaMask cho cả 3                                | Hiếu                                   | 3 mạng: Geth Private 12345, Hardhat 31337, Sepolia 11155111 |
| Format response API                                    | Cả nhóm                                | `{ success, data }` / `{ success, error }`                  |
| Tạo 3 nhánh `feature/...`                              | Cả nhóm                                | Merge về `main` sau khi test luồng riêng                    |

---

## ⚠️ Quy tắc bắt buộc cho cả nhóm

1. **geth phải là bản 1.13.x** — Clique PoA bị deprecated từ 1.14
2. **Hardhat config bắt buộc `evmVersion: "paris"`** khi deploy lên geth private-net — Clique không có `shanghaiTime`, opcode `PUSH0` sẽ invalid
3. **`extradata` trong `genesis.json` phải đúng 234 ký tự** — 64 zeros + 40 chars (địa chỉ node1) + 130 zeros
4. **Không commit** `blockchain/private-net/password.txt` và thư mục `keystore/` lên GitHub
5. **Mọi thay đổi contract phải deploy lại** rồi cập nhật ABI (2 nơi) + địa chỉ trong cả 2 `.env`
6. **Không ai tự đổi** `tokenId`, `eventChainId`, `originalPrice`, hằng số chống scalping đã cả nhóm duyệt
7. **Backend chỉ đồng bộ DB từ event** — không bao giờ để client tự quyết định trạng thái giao dịch
8. **Mỗi người một nhánh riêng**, không push thẳng vào `main`; trước khi merge phải pull `main` mới nhất và test lại luồng của mình
