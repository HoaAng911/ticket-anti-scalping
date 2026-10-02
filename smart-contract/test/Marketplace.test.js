const { expect } = require("chai");
const { ethers } = require("hardhat");
const { time } = require("@nomicfoundation/hardhat-network-helpers");

describe("Marketplace", function () {
  async function deploy(lockSeconds = 60) {
    const [owner, seller, buyer] = await ethers.getSigners();
    const Ticket = await ethers.getContractFactory("EventTicket");
    const ticket = await Ticket.deploy(owner.address, owner.address);
    await ticket.waitForDeployment();
    await ticket.configureEvent(1, 10, ethers.parseEther("0.01"), "Standard");

    const Market = await ethers.getContractFactory("Marketplace");
    const market = await Market.deploy(
      owner.address,
      await ticket.getAddress(),
      owner.address,
      lockSeconds
    );
    await market.waitForDeployment();
    return { ticket, market, owner, seller, buyer };
  }

  it("lists after lock and enforces resale cap", async function () {
    const { ticket, market, seller } = await deploy(60);
    const price = ethers.parseEther("0.01");
    await ticket.connect(seller).mintTicket(1, price, { value: price });
    await ticket.connect(seller).approve(await market.getAddress(), 1);

    await expect(market.connect(seller).listTicket(1, price)).to.be.revertedWithCustomError(
      market,
      "TransferLocked"
    );

    await time.increase(61);
    const tooHigh = ethers.parseEther("0.02");
    await expect(
      market.connect(seller).listTicket(1, tooHigh)
    ).to.be.revertedWithCustomError(market, "PriceExceedsResaleCap");

    const okPrice = ethers.parseEther("0.011"); // 110%
    await expect(market.connect(seller).listTicket(1, okPrice))
      .to.emit(market, "TicketListed");
    expect(await ticket.ownerOf(1)).to.equal(await market.getAddress());
  });

  it("buys resale and pays royalty", async function () {
    const { ticket, market, owner, seller, buyer } = await deploy(1);
    const price = ethers.parseEther("0.01");
    await ticket.connect(seller).mintTicket(1, price, { value: price });
    await time.increase(2);
    await ticket.connect(seller).approve(await market.getAddress(), 1);
    const listPrice = ethers.parseEther("0.011");
    await market.connect(seller).listTicket(1, listPrice);

    const treasuryBefore = await ethers.provider.getBalance(owner.address);
    const royalty = (listPrice * 5n) / 100n;
    const sellerProceeds = listPrice - royalty;

    await expect(market.connect(buyer).buyResaleTicket(1, { value: listPrice }))
      .to.emit(market, "TicketSold")
      .and.to.emit(market, "PaymentSplit")
      .withArgs(1, buyer.address, seller.address, owner.address, sellerProceeds, royalty);

    expect(await ticket.ownerOf(1)).to.equal(buyer.address);
    const treasuryAfter = await ethers.provider.getBalance(owner.address);
    expect(treasuryAfter - treasuryBefore).to.equal(royalty);
    expect(await market.totalRoyaltyPaid()).to.equal(royalty);
    expect(await market.totalResaleVolume()).to.equal(listPrice);
  });

  it("rejects seller buying own listing", async function () {
    const { ticket, market, seller } = await deploy(1);
    const price = ethers.parseEther("0.01");
    await ticket.connect(seller).mintTicket(1, price, { value: price });
    await time.increase(2);
    await ticket.connect(seller).approve(await market.getAddress(), 1);
    const listPrice = ethers.parseEther("0.011");
    await market.connect(seller).listTicket(1, listPrice);
    await expect(
      market.connect(seller).buyResaleTicket(1, { value: listPrice })
    ).to.be.revertedWithCustomError(market, "CannotBuyOwnListing");
  });

  it("cancel listing returns NFT to seller", async function () {
    const { ticket, market, seller } = await deploy(1);
    const price = ethers.parseEther("0.01");
    await ticket.connect(seller).mintTicket(1, price, { value: price });
    await time.increase(2);
    await ticket.connect(seller).approve(await market.getAddress(), 1);
    await market.connect(seller).listTicket(1, ethers.parseEther("0.011"));
    expect(await market.activeListingCount()).to.equal(1n);
    await expect(market.connect(seller).cancelListing(1)).to.emit(market, "ListingCancelled");
    expect(await ticket.ownerOf(1)).to.equal(seller.address);
    expect(await market.activeListingCount()).to.equal(0n);
  });

  it("exposes active token ids on the ledger", async function () {
    const { ticket, market, seller, buyer } = await deploy(1);
    const price = ethers.parseEther("0.01");
    await ticket.connect(seller).mintTicket(1, price, { value: price });
    await ticket.connect(buyer).mintTicket(1, price, { value: price });
    await time.increase(2);
    await ticket.connect(seller).approve(await market.getAddress(), 1);
    await ticket.connect(buyer).approve(await market.getAddress(), 2);
    await market.connect(seller).listTicket(1, ethers.parseEther("0.011"));
    await market.connect(buyer).listTicket(2, ethers.parseEther("0.011"));
    const ids = await market.getActiveTokenIds();
    expect(ids.map((x) => Number(x)).sort()).to.deep.equal([1, 2]);
  });
});
