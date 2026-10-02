// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import {ERC721} from "@openzeppelin/contracts/token/ERC721/ERC721.sol";
import {Ownable} from "@openzeppelin/contracts/access/Ownable.sol";
import {ReentrancyGuard} from "@openzeppelin/contracts/utils/ReentrancyGuard.sol";

/**
 * @title EventTicket
 * @notice NFT vé sự kiện (ERC-721) + chuỗi TicketBlock liên kết hash (prev nối sang current).
 *         Mỗi lần mint tạo một "block" mới, hash gắn với block trước — giống linked list on-chain.
 */
contract EventTicket is ERC721, Ownable, ReentrancyGuard {
    uint256 public constant MAX_TICKETS_PER_WALLET = 2;

    struct TicketInfo {
        uint256 eventChainId;
        uint256 price;
        uint256 mintedAt;
    }

    struct EventConfig {
        uint256 totalSupply;
        uint256 priceWei;
        bool active;
        string name;
    }

    /**
     * @dev Một mắt xích trong chuỗi vé.
     * blockHash = keccak256(index, tokenId, eventChainId, owner, price, mintedAt, prevBlockHash)
     */
    struct TicketBlock {
        uint256 index;
        uint256 tokenId;
        uint256 eventChainId;
        address owner;
        uint256 price;
        uint256 mintedAt;
        bytes32 prevBlockHash;
        bytes32 blockHash;
    }

    uint256 private _nextTokenId = 1;

    mapping(uint256 => TicketInfo) private _tickets;
    mapping(uint256 => EventConfig) public eventConfigs;
    mapping(uint256 => mapping(address => uint256)) public ticketsPerWalletPerEvent;
    mapping(uint256 => uint256) public soldCount;

    /// @notice Chuỗi TicketBlock: theo tokenId và theo index block
    mapping(uint256 => TicketBlock) private _ticketBlocks;
    mapping(uint256 => bytes32) public blockHashByIndex;
    mapping(uint256 => uint256) public tokenIdByBlockIndex;
    bytes32 public latestBlockHash;
    uint256 public latestBlockIndex;

    /// @dev Index sở hữu on-chain (đọc từ sổ cái, không cần Mongo)
    mapping(address => uint256[]) private _ownedTokens;
    mapping(uint256 => uint256) private _ownedTokensIndex; // tokenId => index trong mảng owner

    address public organizerTreasury;

    /// @notice Tổng ETH đã chuyển về treasury từ bán sơ cấp (on-chain, ai cũng đọc được)
    uint256 public totalPrimaryRevenue;
    /// @notice Doanh thu sơ cấp theo từng eventChainId
    mapping(uint256 => uint256) public primaryRevenueByEvent;

    event EventConfigured(
        uint256 indexed eventChainId,
        uint256 totalSupply,
        uint256 priceWei,
        string name
    );
    event TicketMinted(
        uint256 indexed tokenId,
        address indexed owner,
        uint256 eventChainId,
        uint256 price
    );
    /**
     * @notice Dòng tiền sơ cấp trên sổ cái: buyer sang organizerTreasury.
     *         Ai cũng có thể lọc event này để kiểm toán minh bạch.
     */
    event PaymentToOrganizer(
        uint256 indexed tokenId,
        address indexed buyer,
        address indexed treasury,
        uint256 eventChainId,
        uint256 amountWei
    );
    event TicketBlockCreated(
        uint256 indexed index,
        uint256 indexed tokenId,
        bytes32 prevBlockHash,
        bytes32 blockHash,
        address owner,
        uint256 eventChainId
    );
    event TreasuryUpdated(address indexed treasury);

    error TooManyTicketsPerWallet(uint256 maxAllowed);
    error SoldOut(uint256 eventChainId);
    error EventNotActive(uint256 eventChainId);
    error IncorrectPayment(uint256 expected, uint256 sent);
    error ZeroAddress();
    error InvalidConfig();
    error InvalidBlockIndex(uint256 index);

    constructor(address owner_, address treasury_)
        ERC721("Ticket Anti-Scalping", "TIX")
        Ownable(owner_)
    {
        if (treasury_ == address(0)) revert ZeroAddress();
        organizerTreasury = treasury_;
        // Genesis sentinel — chưa có vé nào
        latestBlockHash = bytes32(0);
        latestBlockIndex = 0;
    }

    function setOrganizerTreasury(address treasury_) external onlyOwner {
        if (treasury_ == address(0)) revert ZeroAddress();
        organizerTreasury = treasury_;
        emit TreasuryUpdated(treasury_);
    }

    function configureEvent(
        uint256 eventChainId,
        uint256 totalSupply,
        uint256 priceWei,
        string calldata name
    ) external onlyOwner {
        if (totalSupply == 0 || priceWei == 0) revert InvalidConfig();
        eventConfigs[eventChainId] = EventConfig({
            totalSupply: totalSupply,
            priceWei: priceWei,
            active: true,
            name: name
        });
        emit EventConfigured(eventChainId, totalSupply, priceWei, name);
    }

    function setEventActive(uint256 eventChainId, bool active) external onlyOwner {
        if (eventConfigs[eventChainId].totalSupply == 0) revert EventNotActive(eventChainId);
        eventConfigs[eventChainId].active = active;
    }

    function adminMint(address to, uint256 eventChainId)
        external
        onlyOwner
        nonReentrant
        returns (uint256 tokenId)
    {
        if (to == address(0)) revert ZeroAddress();
        EventConfig memory cfg = eventConfigs[eventChainId];
        if (!cfg.active || cfg.totalSupply == 0) revert EventNotActive(eventChainId);
        if (soldCount[eventChainId] >= cfg.totalSupply) revert SoldOut(eventChainId);

        tokenId = _issueTicket(to, eventChainId, cfg.priceWei, false);
    }

    function adminMintBatch(address[] calldata recipients, uint256 eventChainId)
        external
        onlyOwner
        nonReentrant
        returns (uint256[] memory tokenIds)
    {
        EventConfig memory cfg = eventConfigs[eventChainId];
        if (!cfg.active || cfg.totalSupply == 0) revert EventNotActive(eventChainId);
        uint256 n = recipients.length;
        if (soldCount[eventChainId] + n > cfg.totalSupply) revert SoldOut(eventChainId);

        tokenIds = new uint256[](n);
        for (uint256 i = 0; i < n; i++) {
            address to = recipients[i];
            if (to == address(0)) revert ZeroAddress();
            tokenIds[i] = _issueTicket(to, eventChainId, cfg.priceWei, false);
        }
    }

    function mintTicket(uint256 eventChainId, uint256 price)
        external
        payable
        nonReentrant
        returns (uint256 tokenId)
    {
        EventConfig memory cfg = eventConfigs[eventChainId];
        if (!cfg.active || cfg.totalSupply == 0) revert EventNotActive(eventChainId);
        if (price != cfg.priceWei) revert IncorrectPayment(cfg.priceWei, price);
        if (msg.value != cfg.priceWei) revert IncorrectPayment(cfg.priceWei, msg.value);
        if (soldCount[eventChainId] >= cfg.totalSupply) revert SoldOut(eventChainId);
        if (ticketsPerWalletPerEvent[eventChainId][msg.sender] >= MAX_TICKETS_PER_WALLET) {
            revert TooManyTicketsPerWallet(MAX_TICKETS_PER_WALLET);
        }

        tokenId = _issueTicket(msg.sender, eventChainId, cfg.priceWei, true);

        address treasury = organizerTreasury;
        (bool ok, ) = treasury.call{value: msg.value}("");
        require(ok, "treasury transfer failed");

        totalPrimaryRevenue += msg.value;
        primaryRevenueByEvent[eventChainId] += msg.value;

        emit PaymentToOrganizer(tokenId, msg.sender, treasury, eventChainId, msg.value);
    }

    /**
     * @dev Mint NFT + append TicketBlock liên kết prevBlockHash nối sang blockHash mới.
     *      enforceWalletLimit=true: đếm vào hạn mức 2 vé/ví (mint sơ cấp).
     *      enforceWalletLimit=false: admin mint — không tính vào hạn mức user.
     */
    function _issueTicket(
        address to,
        uint256 eventChainId,
        uint256 priceWei,
        bool enforceWalletLimit
    ) internal returns (uint256 tokenId) {
        tokenId = _nextTokenId++;
        uint256 mintedAt = block.timestamp;

        _tickets[tokenId] = TicketInfo({
            eventChainId: eventChainId,
            price: priceWei,
            mintedAt: mintedAt
        });
        if (enforceWalletLimit) {
            ticketsPerWalletPerEvent[eventChainId][to] += 1;
        }
        soldCount[eventChainId] += 1;

        _safeMint(to, tokenId);

        // --- Ticket block chain ---
        bytes32 prev = latestBlockHash;
        uint256 index = latestBlockIndex + 1;
        bytes32 hash = keccak256(
            abi.encode(index, tokenId, eventChainId, to, priceWei, mintedAt, prev)
        );

        _ticketBlocks[tokenId] = TicketBlock({
            index: index,
            tokenId: tokenId,
            eventChainId: eventChainId,
            owner: to,
            price: priceWei,
            mintedAt: mintedAt,
            prevBlockHash: prev,
            blockHash: hash
        });
        blockHashByIndex[index] = hash;
        tokenIdByBlockIndex[index] = tokenId;
        latestBlockHash = hash;
        latestBlockIndex = index;

        emit TicketMinted(tokenId, to, eventChainId, priceWei);
        emit TicketBlockCreated(index, tokenId, prev, hash, to, eventChainId);
    }

    function getTicketInfo(uint256 tokenId) external view returns (TicketInfo memory) {
        _requireOwned(tokenId);
        return _tickets[tokenId];
    }

    function getTicketBlock(uint256 tokenId) external view returns (TicketBlock memory) {
        TicketBlock memory b = _ticketBlocks[tokenId];
        if (b.index == 0) revert InvalidBlockIndex(0);
        return b;
    }

    function getTicketBlockByIndex(uint256 index) external view returns (TicketBlock memory) {
        if (index == 0 || index > latestBlockIndex) revert InvalidBlockIndex(index);
        uint256 tokenId = tokenIdByBlockIndex[index];
        if (tokenId == 0) revert InvalidBlockIndex(index);
        return _ticketBlocks[tokenId];
    }

    /**
     * @notice Tip của chuỗi TicketBlock (node mới nhất).
     */
    function getChainTip()
        external
        view
        returns (uint256 index, bytes32 blockHash, uint256 tokenId)
    {
        index = latestBlockIndex;
        blockHash = latestBlockHash;
        tokenId = index == 0 ? 0 : tokenIdByBlockIndex[index];
    }

    /**
     * @notice Kiểm tra liên kết hash từ block `fromIndex` đến `toIndex`.
     *         Mỗi node: prevBlockHash == blockHash của node trước; hash tự tính khớp.
     */
    function verifyChain(uint256 fromIndex, uint256 toIndex) external view returns (bool) {
        if (fromIndex == 0 || toIndex < fromIndex || toIndex > latestBlockIndex) {
            return false;
        }
        for (uint256 i = fromIndex; i <= toIndex; i++) {
            uint256 tid = tokenIdByBlockIndex[i];
            if (tid == 0) return false;
            TicketBlock memory b = _ticketBlocks[tid];
            if (b.index != i || b.tokenId != tid) return false;
            bytes32 expected = keccak256(
                abi.encode(
                    b.index,
                    b.tokenId,
                    b.eventChainId,
                    b.owner,
                    b.price,
                    b.mintedAt,
                    b.prevBlockHash
                )
            );
            if (expected != b.blockHash) return false;
            if (i > 1) {
                uint256 prevTid = tokenIdByBlockIndex[i - 1];
                TicketBlock memory prev = _ticketBlocks[prevTid];
                if (b.prevBlockHash != prev.blockHash) return false;
            } else if (b.prevBlockHash != bytes32(0)) {
                return false;
            }
        }
        return true;
    }

    function getRemainingTickets(uint256 eventChainId) external view returns (uint256) {
        EventConfig memory cfg = eventConfigs[eventChainId];
        if (cfg.totalSupply == 0) return 0;
        uint256 sold = soldCount[eventChainId];
        if (sold >= cfg.totalSupply) return 0;
        return cfg.totalSupply - sold;
    }

    function totalMinted() external view returns (uint256) {
        return _nextTokenId - 1;
    }

    /**
     * @notice Danh sách tokenId đang sở hữu bởi `owner` — nguồn từ ledger on-chain.
     */
    function tokensOfOwner(address owner) external view returns (uint256[] memory) {
        return _ownedTokens[owner];
    }

    function balanceOfOwnerIndexed(address owner) external view returns (uint256) {
        return _ownedTokens[owner].length;
    }

    /**
     * @dev Cập nhật index sở hữu khi mint / transfer / burn (ERC-721 OZ v5).
     */
    function _update(address to, uint256 tokenId, address auth) internal override returns (address) {
        address from = _ownerOf(tokenId);
        if (from != address(0)) {
            _removeTokenFromOwnerEnumeration(from, tokenId);
        }
        address previous = super._update(to, tokenId, auth);
        if (to != address(0)) {
            _addTokenToOwnerEnumeration(to, tokenId);
        }
        return previous;
    }

    function _addTokenToOwnerEnumeration(address to, uint256 tokenId) private {
        _ownedTokensIndex[tokenId] = _ownedTokens[to].length;
        _ownedTokens[to].push(tokenId);
    }

    function _removeTokenFromOwnerEnumeration(address from, uint256 tokenId) private {
        uint256 lastIndex = _ownedTokens[from].length - 1;
        uint256 tokenIndex = _ownedTokensIndex[tokenId];
        if (tokenIndex != lastIndex) {
            uint256 lastTokenId = _ownedTokens[from][lastIndex];
            _ownedTokens[from][tokenIndex] = lastTokenId;
            _ownedTokensIndex[lastTokenId] = tokenIndex;
        }
        _ownedTokens[from].pop();
        delete _ownedTokensIndex[tokenId];
    }
}
