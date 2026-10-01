const { expect } = require("chai");
const { ethers } = require("hardhat");

describe("EventTicket", function () {
  async function deploy() {
    const [owner, buyer, other] = await ethers.getSigners();
    const Ticket = await ethers.getContractFactory("EventTicket");
    const ticket = await Ticket.deploy(owner.address, owner.address);
    await ticket.waitForDeployment();
    await ticket.configureEvent(1, 10, ethers.parseEther("0.01"), "Standard");
    return { ticket, owner, buyer, other };
  }

  it("mints a ticket and stores TicketInfo", async function () {
    const { ticket, buyer } = await deploy();
    const price = ethers.parseEther("0.01");
    await expect(ticket.connect(buyer).mintTicket(1, price, { value: price }))
      .to.emit(ticket, "TicketMinted")
      .withArgs(1, buyer.address, 1, price);

    const info = await ticket.getTicketInfo(1);
    expect(info.eventChainId).to.equal(1n);
    expect(info.price).to.equal(price);
    expect(await ticket.ownerOf(1)).to.equal(buyer.address);
    expect(await ticket.getRemainingTickets(1)).to.equal(9n);
  });

  it("links each new ticket block to the previous block hash", async function () {
    const { ticket, buyer, other } = await deploy();
    const price = ethers.parseEther("0.01");

    await expect(ticket.connect(buyer).mintTicket(1, price, { value: price })).to.emit(
      ticket,
      "TicketBlockCreated"
    );

    const b1 = await ticket.getTicketBlock(1);
    expect(b1.index).to.equal(1n);
    expect(b1.prevBlockHash).to.equal(ethers.ZeroHash);
    expect(b1.blockHash).to.not.equal(ethers.ZeroHash);
    expect(await ticket.latestBlockHash()).to.equal(b1.blockHash);
    expect(await ticket.latestBlockIndex()).to.equal(1n);

    await ticket.connect(other).mintTicket(1, price, { value: price });
    const b2 = await ticket.getTicketBlock(2);
    expect(b2.index).to.equal(2n);
    expect(b2.prevBlockHash).to.equal(b1.blockHash);
    expect(await ticket.latestBlockHash()).to.equal(b2.blockHash);

    expect(await ticket.verifyChain(1, 2)).to.equal(true);
  });

  it("reverts when wallet mints more than MAX_TICKETS_PER_WALLET", async function () {
    const { ticket, buyer } = await deploy();
    const price = ethers.parseEther("0.01");
    await ticket.connect(buyer).mintTicket(1, price, { value: price });
    await ticket.connect(buyer).mintTicket(1, price, { value: price });
    await expect(
      ticket.connect(buyer).mintTicket(1, price, { value: price })
    ).to.be.revertedWithCustomError(ticket, "TooManyTicketsPerWallet");
  });

  it("reverts when sold out", async function () {
    const { ticket, owner, buyer, other } = await deploy();
    await ticket.configureEvent(2, 3, ethers.parseEther("0.01"), "Limited");
    const price = ethers.parseEther("0.01");
    await ticket.connect(buyer).mintTicket(2, price, { value: price });
    await ticket.connect(buyer).mintTicket(2, price, { value: price });
    await ticket.connect(other).mintTicket(2, price, { value: price });
    await expect(
      ticket.connect(owner).mintTicket(2, price, { value: price })
    ).to.be.revertedWithCustomError(ticket, "SoldOut");
  });

  it("adminMintBatch mints to many wallets and extends the block chain", async function () {
    const { ticket, owner, buyer, other } = await deploy();
    await expect(ticket.connect(owner).adminMintBatch([buyer.address, other.address], 1)).to.emit(
      ticket,
      "TicketBlockCreated"
    );
    expect(await ticket.ownerOf(1)).to.equal(buyer.address);
    expect(await ticket.ownerOf(2)).to.equal(other.address);
    const b1 = await ticket.getTicketBlock(1);
    const b2 = await ticket.getTicketBlock(2);
    expect(b2.prevBlockHash).to.equal(b1.blockHash);
    expect(await ticket.verifyChain(1, 2)).to.equal(true);

    const byIdx = await ticket.getTicketBlockByIndex(2);
    expect(byIdx.tokenId).to.equal(2n);
    expect(byIdx.blockHash).to.equal(b2.blockHash);

    const tip = await ticket.getChainTip();
    expect(tip.index).to.equal(2n);
    expect(tip.blockHash).to.equal(b2.blockHash);
    expect(tip.tokenId).to.equal(2n);
  });

  it("new event type still appends to the same global TicketBlock chain", async function () {
    const { ticket, buyer, other } = await deploy();
    const price = ethers.parseEther("0.01");
    await ticket.connect(buyer).mintTicket(1, price, { value: price });
    const b1 = await ticket.getTicketBlock(1);

    await ticket.configureEvent(9, 5, ethers.parseEther("0.02"), "NewShow");
    const price2 = ethers.parseEther("0.02");
    await ticket.connect(other).mintTicket(9, price2, { value: price2 });
    const b2 = await ticket.getTicketBlock(2);

    expect(b2.eventChainId).to.equal(9n);
    expect(b2.prevBlockHash).to.equal(b1.blockHash);
    expect(await ticket.verifyChain(1, 2)).to.equal(true);
  });
});
