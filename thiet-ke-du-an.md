# Thiết kế dự án — Ticket Anti-Scalping

## 1. Cấu trúc thư mục (monorepo)

```
ticket-anti-scalping/
├── blockchain/                    # Mạng geth riêng tư (Go Ethereum)
│   └── private-net/
│       ├── genesis.json           # Cấu hình genesis (chainId 12345, Clique PoA)
│       ├── password.txt           # Password signer (KHÔNG commit)
│       └── README.md              # Hướng dẫn dựng 2 node geth
│
├── smart-contract/                # Smart contract (Solidity + Hardhat)
│   ├── contracts/
│   │   ├── EventTicket.sol        # NFT vé sự kiện (ERC-721)
│   │   └── Marketplace.sol        # Chợ resale chống scalping
│   ├── scripts/
│   │   └── deploy.js              # Deploy lên localhost/sepolia
│   ├── test/
│   │   ├── EventTicket.test.js    # Test mint, chặn mint vượt totalSupply
│   │   └── Marketplace.test.js    # Test resale, giá trần, khóa chuyển nhượng
│   ├── hardhat.config.js          # solidity 0.8.28, evmVersion: "paris"
│   ├── package.json
│   └── .env.example
│
├── backend/                       # Backend (Node.js + Express + MongoDB)
│   ├── src/
│   │   ├── server.js              # Entry point
│   │   ├── models/
│   │   │   ├── User.js
│   │   │   ├── Event.js
│   │   │   ├── Ticket.js          # CACHE — nguồn thật trên contract
│   │   │   └── Transaction.js     # Lịch sử giao dịch
│   │   ├── controllers/
│   │   │   ├── authController.js  # register, login, linkWallet
│   │   │   ├── eventController.js # CRUD sự kiện
│   │   │   ├── ticketController.js# Tra cứu vé theo ví
│   │   │   └── marketplaceController.js # getActiveListings, getTransactionHistory
│   │   ├── routes/
│   │   │   ├── authRoutes.js
│   │   │   ├── eventRoutes.js
│   │   │   ├── ticketRoutes.js
│   │   │   └── marketplaceRoutes.js
│   │   ├── middlewares/
│   │   │   ├── authMiddleware.js  # JWT verify
│   │   │   ├── errorHandler.js    # Bọc response { success, data/error }
│   │   │   └── rateLimiter.js     # Chống bot lúc mở bán
│   │   ├── services/
│   │   │   ├── blockchainService.js    # Đọc contract (ethers.js)
│   │   │   └── blockchainListener.js   # Listen event để đồng bộ DB
│   │   └── abi/
│   │       ├── EventTicket.json    # ABI copy từ artifacts
│   │       └── Marketplace.json
│   ├── .env.example
│   ├── jsconfig.json
│   ├── package.json
│   └── README.md
│
├── frontend/                      # Frontend (React + Vite)
│   ├── src/
│   │   ├── main.jsx               # Entry point React
│   │   ├── pages/
│   │   │   ├── Home.jsx           # Danh sách sự kiện
│   │   │   ├── EventDetail.jsx    # Chi tiết sự kiện + mua vé
│   │   │   ├── Marketplace.jsx    # Chợ vé resale
│   │   │   ├── MyTickets.jsx      # Vé của tôi
│   │   │   └── OrganizerDashboard.jsx # Dashboard quản trị
│   │   ├── components/
│   │   │   ├── event/
│   │   │   │   ├── EventCard.jsx
│   │   │   │   └── TicketTypeSelector.jsx
│   │   │   └── marketplace/
│   │   │       ├── ResellForm.jsx     # Form đăng bán (hiển thị giá trần)
│   │   │       └── ListingCard.jsx
│   │   ├── context/
│   │   │   └── WalletContext.jsx  # Kết nối MetaMask dùng chung
│   │   ├── hooks/
│   │   │   └── useWallet.js       # Hook wrapper WalletContext
│   │   ├── services/
│   │   │   ├── api.js             # Axios instance
│   │   │   ├── contract.js        # Gọi contract (buyPrimaryTicket, listTicketForResale, ...)
│   │   │   └── abi/
│   │   │       ├── EventTicket.json
│   │   │       └── Marketplace.json
│   │   ├── styles/
│   │   └── utils/
│   ├── index.html
│   ├── vite.config.js             # Proxy /api sang localhost:5000
│   ├── .env.example
│   ├── package.json
│   └── README.md
│
├── .gitignore
├── README.md
├── luong-du-an.md                 # Luồng dự án
├── thiet-ke-du-an.md              # File này
└── phan-cong-3-nguoi.md           # Phân công công việc (Hoàng Long Hiếu · Long · Hiếu)
```

## 2. Schema Database (MongoDB)

### 2.1 Collection: `users`

| Field           | Kiểu     | Ràng buộc                                                 | Mô tả                                                |
| --------------- | -------- | --------------------------------------------------------- | ---------------------------------------------------- |
| `_id`           | ObjectId | auto                                                      | ID MongoDB                                           |
| `email`         | String   | unique, required                                          | Email đăng nhập                                      |
| `passwordHash`  | String   | required                                                  | Mật khẩu đã hash (bcrypt)                            |
| `walletAddress` | String   | unique, sparse                                            | Địa chỉ ví MetaMask (lowercase), có thể null lúc đầu |
| `role`          | String   | enum: `["user", "organizer", "admin"]`, default: `"user"` | Vai trò                                              |
| `isVerified`    | Boolean  | default: `false`                                          | Đã xác thực email                                    |
| `createdAt`     | Date     | default: `Date.now`                                       | Thời điểm tạo                                        |
| `updatedAt`     | Date     | default: `Date.now`                                       | Thời điểm cập nhật                                   |

**Indexes:**
- `{ email: 1 }` (unique)
- `{ walletAddress: 1 }` (unique, sparse)

### 2.2 Collection: `events`

| Field                        | Kiểu            | Ràng buộc             | Mô tả                               |
| ---------------------------- | --------------- | --------------------- | ----------------------------------- |
| `_id`                        | ObjectId        | auto                  | ID MongoDB                          |
| `title`                      | String          | required              | Tên sự kiện                         |
| `description`                | String          | required              | Mô tả                               |
| `location`                   | String          | required              | Địa điểm                            |
| `startTime`                  | Date            | required              | Thời gian bắt đầu                   |
| `organizer`                  | ObjectId        | ref: `User`, required | Organizer tạo sự kiện               |
| `ticketTypes`                | Array of Object | required              | Các loại vé                         |
| `ticketTypes[].name`         | String          | required              | Tên loại vé (e.g., "VIP", "Thường") |
| `ticketTypes[].price`        | Number          | required, min: 0      | Giá (ETH hoặc USD)                  |
| `ticketTypes[].totalSupply`  | Number          | required, min: 0      | Tổng số vé phát hành                |
| `ticketTypes[].eventChainId` | Number          | required              | Khớp với `eventId` trên contract    |
| `coverImage`                 | String          |                       | URL ảnh bìa                         |
| `createdAt`                  | Date            | default: `Date.now`   | Thời điểm tạo                       |
| `updatedAt`                  | Date            | default: `Date.now`   | Thời điểm cập nhật                  |

**Indexes:**
- `{ organizer: 1 }`
- `{ startTime: 1 }`

### 2.3 Collection: `tickets` (CACHE — nguồn thật trên contract)

| Field           | Kiểu     | Ràng buộc                                                            | Mô tả                            |
| --------------- | -------- | -------------------------------------------------------------------- | -------------------------------- |
| `_id`           | ObjectId | auto                                                                 | ID MongoDB                       |
| `tokenId`       | Number   | unique, required                                                     | Token ID trên contract (ERC-721) |
| `event`         | ObjectId | ref: `Event`, required                                               | Sự kiện chứa vé này              |
| `ownerWallet`   | String   | required, lowercase                                                  | Địa chỉ ví hiện tại của chủ vé   |
| `originalPrice` | Number   | required, min: 0                                                     | Giá gốc khi mua sơ cấp           |
| `status`        | String   | enum: `["owned", "listed_for_resale", "resold"]`, default: `"owned"` | Trạng thái vé                    |
| `mintedAt`      | Date     | required                                                             | Thời điểm mint trên contract     |
| `createdAt`     | Date     | default: `Date.now`                                                  | Thời điểm tạo bản ghi            |
| `updatedAt`     | Date     | default: `Date.now`                                                  | Thời điểm cập nhật               |

**Indexes:**
- `{ tokenId: 1 }` (unique)
- `{ ownerWallet: 1 }`
- `{ event: 1 }`
- `{ status: 1 }`

**Quy tắc:** `tokenId`, `eventChainId`, `originalPrice` chỉ lấy từ contract, không bao giờ cho client tự đổi.

### 2.4 Collection: `transactions` (lịch sử, chỉ ghi lại)

| Field        | Kiểu     | Ràng buộc                            | Mô tả                             |
| ------------ | -------- | ------------------------------------ | --------------------------------- |
| `_id`        | ObjectId | auto                                 | ID MongoDB                        |
| `tokenId`    | Number   | required                             | Token ID liên quan                |
| `type`       | String   | enum: `["mint", "resale"]`, required | Loại giao dịch                    |
| `fromWallet` | String   | required, lowercase                  | Ví gửi (null nếu mint)            |
| `toWallet`   | String   | required, lowercase                  | Ví nhận                           |
| `price`      | Number   | required, min: 0                     | Giá giao dịch                     |
| `royalty`    | Number   | default: 0                           | Số tiền royalty (chỉ có ở resale) |
| `txHash`     | String   | unique, required                     | Transaction hash trên blockchain  |
| `createdAt`  | Date     | default: `Date.now`                  | Thời điểm ghi                     |

**Indexes:**
- `{ txHash: 1 }` (unique)
- `{ tokenId: 1 }`
- `{ type: 1 }`
- `{ createdAt: -1 }`

## 3. Smart Contract Design

### 3.1 `EventTicket.sol` (ERC-721)

```solidity
// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

contract EventTicket {
    // Constants
    uint256 public constant MAX_TICKETS_PER_WALLET = 2;
    
    // Structs
    struct TicketInfo {
        uint256 eventChainId;
        uint256 price;
        uint256 mintedAt;
    }
    
    // State
    mapping(uint256 => TicketInfo) public tickets;
    mapping(uint256 => mapping(address => uint256)) public ticketsPerWalletPerEvent;
    mapping(uint256 => uint256) public soldCount; // eventChainId => số vé đã bán
    
    // Events
    event TicketMinted(uint256 indexed tokenId, address indexed owner,
                       uint256 eventChainId, uint256 price);
    
    // Errors
    error TooManyTicketsPerWallet(uint256 maxAllowed);
    error SoldOut(uint256 eventChainId);
    
    // Functions
    function mintTicket(uint256 eventChainId, uint256 price) external payable;
    function getTicketInfo(uint256 tokenId) external view returns (TicketInfo memory);
    function getRemainingTickets(uint256 eventChainId) external view returns (uint256);
}
```

### 3.2 `Marketplace.sol`

```solidity
// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

contract Marketplace {
    // Constants
    uint256 public constant MAX_RESALE_PERCENT = 110;      // giá resale ≤ 110% giá gốc
    uint256 public constant TRANSFER_LOCK_SECONDS = 24 hours; // không resale trước 24h
    uint256 public constant ROYALTY_PERCENT = 5;            // % royalty về organizer
    
    // Structs
    struct Listing {
        address seller;
        uint256 price;
        uint256 listedAt;
        bool active;
    }
    
    // State
    mapping(uint256 => Listing) public listings; // tokenId => Listing
    address public organizerTreasury;
    
    // Events
    event TicketListed(uint256 indexed tokenId, address indexed seller,
                       uint256 price, uint256 listedAt);
    event TicketSold(uint256 indexed tokenId, address indexed seller,
                     address indexed buyer, uint256 price, uint256 royalty);
    
    // Errors
    error PriceExceedsResaleCap(uint256 askedPrice, uint256 maxAllowedPrice);
    error TransferLocked(uint256 unlockTime);
    error ListingInactive(uint256 tokenId);
    error NotTicketOwner(uint256 tokenId);
    
    // Functions
    function listTicket(uint256 tokenId, uint256 price) external;
    function buyResaleTicket(uint256 tokenId) external payable;
    function getListing(uint256 tokenId) external view returns (Listing memory);
    function getMaxAllowedPrice(uint256 tokenId) external view returns (uint256);
    function getUnlockTime(uint256 tokenId) external view returns (uint256);
}
```

## 4. API Design

### 4.1 Format Response

**Thành công:**
```json
{ "success": true, "data": { ... } }
```

**Lỗi:**
```json
{ "success": false, "error": "Mô tả lỗi ngắn gọn bằng tiếng Việt" }
```

### 4.2 HTTP Status Codes

| Code | Ý nghĩa                             |
| ---- | ----------------------------------- |
| 200  | OK                                  |
| 201  | Created                             |
| 400  | Lỗi input (validation fail)         |
| 401  | Chưa đăng nhập (không có JWT)       |
| 403  | Không đủ quyền (role không phù hợp) |
| 404  | Không tìm thấy resource             |
| 500  | Lỗi server                          |

### 4.3 API Endpoints

**Auth:**
- `POST /api/auth/register` — Đăng ký
- `POST /api/auth/login` — Đăng nhập
- `POST /api/auth/link-wallet` — Liên kết ví MetaMask

**Events:**
- `GET /api/events` — Danh sách sự kiện (phân trang)
- `GET /api/events/:id` — Chi tiết sự kiện
- `POST /api/events` — Tạo sự kiện (organizer only)
- `PUT /api/events/:id` — Cập nhật sự kiện (organizer only)

**Tickets:**
- `GET /api/tickets/my` — Vé của tôi (theo ví đang kết nối)
- `GET /api/tickets/:tokenId` — Chi tiết vé

**Marketplace:**
- `GET /api/marketplace/listings` — Danh sách vé đang rao bán
- `GET /api/marketplace/history/:tokenId` — Lịch sử giao dịch của vé

## 5. Mạng & Cấu hình

### 5.1 Geth Private Network

- **Chain ID:** 12345
- **Consensus:** Clique PoA (period: 5s, epoch: 30000)
- **Nodes:** 2 (node1 miner + node2 peer)
- **RPC:** `http://127.0.0.1:8545` (node1), `http://127.0.0.1:8546` (node2)
- **geth version:** 1.13.x (bắt buộc — Clique deprecated từ 1.14)

### 5.2 Hardhat Config

```js
solidity: {
  version: "0.8.28",
  settings: {
    evmVersion: "paris",  // BẮT BUỘC với Clique (không có shanghaiTime khiến PUSH0 invalid)
  },
},
networks: {
  hardhat: {},           // chainId 31337
  localhost: {           // geth private-net
    type: "http",
    url: "http://127.0.0.1:8545",
    chainId: 12345,
  },
  sepolia: {
    url: process.env.SEPOLIA_RPC_URL,
    chainId: 11155111,
    accounts: [process.env.DEPLOYER_PRIVATE_KEY],
  },
}
```

### 5.3 MetaMask Networks

| Network       | RPC URL                   | Chain ID | Currency |
| ------------- | ------------------------- | -------- | -------- |
| Geth Private  | `http://127.0.0.1:8545`   | 12345    | ETH      |
| Hardhat Local | `http://127.0.0.1:8545`   | 31337    | ETH      |
| Sepolia       | `https://rpc.sepolia.org` | 11155111 | ETH      |

## 6. Quy tắc chống Scalping

| Quy tắc                                        | Mục đích                      | Vị trí thực thi         |
| ---------------------------------------------- | ----------------------------- | ----------------------- |
| Giá resale ≤ 110% giá gốc                      | Chặn thổi giá                 | `Marketplace.sol`       |
| Không resale trước 24h sau khi mint            | Chặn mua gom rồi bán lại ngay | `Marketplace.sol`       |
| Royalty 5% tự chuyển về organizerTreasury      | Bù đắp cho organizer          | `Marketplace.sol`       |
| Mỗi ví chỉ mint tối đa 2 vé/event              | Chặn bot gom vé               | `EventTicket.sol`       |
| Listing chỉ bán được 1 lần, sau đó tự inactive | Tránh double-sell             | `Marketplace.sol`       |
| Backend chỉ cập nhật Ticket.status từ event    | Chống giả mạo DB              | `blockchainListener.js` |

**Nguyên tắc vàng:** không có đường nào cho phép thay đổi `tokenId`, `eventChainId`, `originalPrice` từ phía backend/frontend. Mọi thứ này chỉ lấy từ contract.
