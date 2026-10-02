// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import {IERC721} from "@openzeppelin/contracts/token/ERC721/IERC721.sol";
import {ReentrancyGuard} from "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import {Ownable} from "@openzeppelin/contracts/access/Ownable.sol";
import {EventTicket} from "./EventTicket.sol";

/**
 * @title Marketplace
 * @notice Chợ resale chống scalping: trần 110%, khóa 24h (có thể cấu hình), royalty 5%.
 *         Danh sách listing active được lưu on-chain để đọc từ sổ cái (không cần Mongo).
 */
contract Marketplace is Ownable, ReentrancyGuard {
    uint256 public constant MAX_RESALE_PERCENT = 110;
    uint256 public constant ROYALTY_PERCENT = 5;

    struct Listing {
        address seller;
        uint256 price;
        uint256 listedAt;
        bool active;
    }

    EventTicket public immutable ticketContract;
    uint256 public transferLockSeconds;
    address public organizerTreasury;

    /// @notice Tổng volume resale + royalty đã trả treasury (minh bạch on-chain)
    uint256 public totalResaleVolume;
    uint256 public totalRoyaltyPaid;

    mapping(uint256 => Listing) private _listings;

    /// @dev Tập listing đang active trên ledger
    uint256[] private _activeTokenIds;
    mapping(uint256 => uint256) private _activeIndexPlusOne; // 0 = không active

    event TicketListed(
        uint256 indexed tokenId,
        address indexed seller,
        uint256 price,
        uint256 listedAt
    );
    event TicketSold(
        uint256 indexed tokenId,
        address indexed seller,
        address indexed buyer,
        uint256 price,
        uint256 royalty
    );
    /**
     * @notice Tách dòng tiền resale trên sổ cái: buyer sang seller và treasury (royalty).
     */
    event PaymentSplit(
        uint256 indexed tokenId,
        address indexed buyer,
        address seller,
        address treasury,
        uint256 sellerAmountWei,
        uint256 royaltyWei
    );
    event ListingCancelled(uint256 indexed tokenId, address indexed seller);
    event TransferLockUpdated(uint256 seconds_);
    event TreasuryUpdated(address indexed treasury);

    error PriceExceedsResaleCap(uint256 askedPrice, uint256 maxAllowedPrice);
    error TransferLocked(uint256 unlockTime);
    error ListingInactive(uint256 tokenId);
    error NotTicketOwner(uint256 tokenId);
    error IncorrectPayment(uint256 expected, uint256 sent);
    error ZeroAddress();
    error NotSeller(uint256 tokenId);
    error CannotBuyOwnListing(uint256 tokenId);

    constructor(
        address owner_,
        address ticketContract_,
        address treasury_,
        uint256 transferLockSeconds_
    ) Ownable(owner_) {
        if (ticketContract_ == address(0) || treasury_ == address(0)) revert ZeroAddress();
        ticketContract = EventTicket(ticketContract_);
        organizerTreasury = treasury_;
        transferLockSeconds = transferLockSeconds_;
    }

    function setTransferLockSeconds(uint256 seconds_) external onlyOwner {
        transferLockSeconds = seconds_;
        emit TransferLockUpdated(seconds_);
    }

    function setOrganizerTreasury(address treasury_) external onlyOwner {
        if (treasury_ == address(0)) revert ZeroAddress();
        organizerTreasury = treasury_;
        emit TreasuryUpdated(treasury_);
    }

    function getUnlockTime(uint256 tokenId) public view returns (uint256) {
        EventTicket.TicketInfo memory info = ticketContract.getTicketInfo(tokenId);
        return info.mintedAt + transferLockSeconds;
    }

    function getMaxAllowedPrice(uint256 tokenId) public view returns (uint256) {
        EventTicket.TicketInfo memory info = ticketContract.getTicketInfo(tokenId);
        return (info.price * MAX_RESALE_PERCENT) / 100;
    }

    function getListing(uint256 tokenId) external view returns (Listing memory) {
        return _listings[tokenId];
    }

    function activeListingCount() external view returns (uint256) {
        return _activeTokenIds.length;
    }

    function getActiveTokenIds() external view returns (uint256[] memory) {
        return _activeTokenIds;
    }

    /**
     * @notice Đăng bán. Seller phải approve Marketplace cho tokenId trước.
     */
    function listTicket(uint256 tokenId, uint256 price) external nonReentrant {
        if (ticketContract.ownerOf(tokenId) != msg.sender) revert NotTicketOwner(tokenId);

        uint256 unlockAt = getUnlockTime(tokenId);
        if (block.timestamp < unlockAt) revert TransferLocked(unlockAt);

        uint256 maxPrice = getMaxAllowedPrice(tokenId);
        if (price == 0 || price > maxPrice) revert PriceExceedsResaleCap(price, maxPrice);

        // Escrow NFT
        ticketContract.transferFrom(msg.sender, address(this), tokenId);

        _listings[tokenId] = Listing({
            seller: msg.sender,
            price: price,
            listedAt: block.timestamp,
            active: true
        });
        _addActive(tokenId);

        emit TicketListed(tokenId, msg.sender, price, block.timestamp);
    }

    function cancelListing(uint256 tokenId) external nonReentrant {
        Listing memory listing = _listings[tokenId];
        if (!listing.active) revert ListingInactive(tokenId);
        if (listing.seller != msg.sender) revert NotSeller(tokenId);

        _listings[tokenId].active = false;
        _removeActive(tokenId);
        ticketContract.transferFrom(address(this), msg.sender, tokenId);
        emit ListingCancelled(tokenId, msg.sender);
    }

    function buyResaleTicket(uint256 tokenId) external payable nonReentrant {
        Listing memory listing = _listings[tokenId];
        if (!listing.active) revert ListingInactive(tokenId);
        if (msg.sender == listing.seller) revert CannotBuyOwnListing(tokenId);
        if (msg.value != listing.price) revert IncorrectPayment(listing.price, msg.value);

        _listings[tokenId].active = false;
        _removeActive(tokenId);

        uint256 royalty = (listing.price * ROYALTY_PERCENT) / 100;
        uint256 sellerProceeds = listing.price - royalty;
        address treasury = organizerTreasury;

        (bool okRoyalty, ) = treasury.call{value: royalty}("");
        require(okRoyalty, "royalty failed");
        (bool okSeller, ) = listing.seller.call{value: sellerProceeds}("");
        require(okSeller, "seller payout failed");

        ticketContract.transferFrom(address(this), msg.sender, tokenId);

        totalResaleVolume += listing.price;
        totalRoyaltyPaid += royalty;

        emit TicketSold(tokenId, listing.seller, msg.sender, listing.price, royalty);
        emit PaymentSplit(
            tokenId,
            msg.sender,
            listing.seller,
            treasury,
            sellerProceeds,
            royalty
        );
    }

    function _addActive(uint256 tokenId) private {
        if (_activeIndexPlusOne[tokenId] != 0) return;
        _activeTokenIds.push(tokenId);
        _activeIndexPlusOne[tokenId] = _activeTokenIds.length; // 1-based
    }

    function _removeActive(uint256 tokenId) private {
        uint256 idxPlus = _activeIndexPlusOne[tokenId];
        if (idxPlus == 0) return;
        uint256 index = idxPlus - 1;
        uint256 lastIndex = _activeTokenIds.length - 1;
        if (index != lastIndex) {
            uint256 lastTokenId = _activeTokenIds[lastIndex];
            _activeTokenIds[index] = lastTokenId;
            _activeIndexPlusOne[lastTokenId] = index + 1;
        }
        _activeTokenIds.pop();
        delete _activeIndexPlusOne[tokenId];
    }
}
