import { ethers } from "ethers";
import Event from "../models/Event.js";
import Ticket from "../models/Ticket.js";
import Transaction from "../models/Transaction.js";
import {
  getTicketContract,
  getMarketContract,
  getTicketBlock,
  weiToEthNumber,
} from "./blockchainService.js";

let started = false;

async function resolveEventDoc(eventChainId) {
  return Event.findOne({ "ticketTypes.eventChainId": eventChainId });
}

async function attachBlockMeta(tokenIdN, update) {
  try {
    const block = await getTicketBlock(tokenIdN);
    update.blockIndex = block.index;
    update.prevBlockHash = block.prevBlockHash;
    update.blockHash = block.blockHash;
  } catch (err) {
    console.warn(`[listener] Không đọc TicketBlock #${tokenIdN}:`, err.message);
  }
  return update;
}

async function onTicketMinted(tokenId, owner, eventChainId, price, event) {
  const txHash = event.log?.transactionHash || event.transactionHash;
  const tokenIdN = Number(tokenId);
  const eventChainIdN = Number(eventChainId);
  const priceEth = weiToEthNumber(price);
  const ownerWallet = owner.toLowerCase();

  const existingTx = await Transaction.findOne({ txHash });
  if (existingTx) {
    // vẫn cập nhật block meta nếu thiếu
    const t = await Ticket.findOne({ tokenId: tokenIdN });
    if (t && !t.blockHash) {
      const update = await attachBlockMeta(tokenIdN, {});
      if (update.blockHash) await Ticket.updateOne({ tokenId: tokenIdN }, update);
    }
    return;
  }

  const eventDoc = await resolveEventDoc(eventChainIdN);
  if (!eventDoc) {
    console.warn(
      `[listener] TicketMinted token=${tokenIdN} nhưng chưa có Event Mongo với eventChainId=${eventChainIdN}`
    );
  }

  const update = await attachBlockMeta(tokenIdN, {
    tokenId: tokenIdN,
    event: eventDoc?._id,
    eventChainId: eventChainIdN,
    ownerWallet,
    originalPrice: priceEth,
    status: "owned",
    mintedAt: new Date(),
    listingPrice: null,
  });

  await Ticket.findOneAndUpdate({ tokenId: tokenIdN }, update, {
    upsert: true,
    new: true,
    setDefaultsOnInsert: true,
  });

  await Transaction.create({
    tokenId: tokenIdN,
    type: "mint",
    fromWallet: null,
    toWallet: ownerWallet,
    price: priceEth,
    royalty: 0,
    txHash,
  });

  console.log(
    `[listener] Minted token #${tokenIdN} block#${update.blockIndex ?? "?"} ` +
      `prev=${(update.prevBlockHash || "0x0").slice(0, 10)}… hash=${(update.blockHash || "").slice(0, 10)}…`
  );
}

async function onTicketBlockCreated(index, tokenId, prevBlockHash, blockHash, owner, eventChainId) {
  const tokenIdN = Number(tokenId);
  await Ticket.findOneAndUpdate(
    { tokenId: tokenIdN },
    {
      blockIndex: Number(index),
      prevBlockHash: prevBlockHash,
      blockHash: blockHash,
      ownerWallet: owner.toLowerCase(),
      eventChainId: Number(eventChainId),
    },
    { upsert: false }
  );
  console.log(
    `[listener] TicketBlock #${index} token=#${tokenIdN} ` +
      `prev=${String(prevBlockHash).slice(0, 10)}… sang ${String(blockHash).slice(0, 10)}…`
  );
}

async function onTicketListed(tokenId, seller, price) {
  const tokenIdN = Number(tokenId);
  const priceEth = weiToEthNumber(price);
  await Ticket.findOneAndUpdate(
    { tokenId: tokenIdN },
    {
      status: "listed_for_resale",
      ownerWallet: seller.toLowerCase(),
      listingPrice: priceEth,
      listingPriceWei: price.toString(),
    }
  );
  console.log(`[listener] Listed token #${tokenIdN} @ ${priceEth} ETH`);
}

async function onListingCancelled(tokenId, seller) {
  const tokenIdN = Number(tokenId);
  await Ticket.findOneAndUpdate(
    { tokenId: tokenIdN },
    {
      status: "owned",
      ownerWallet: seller.toLowerCase(),
      listingPrice: null,
      listingPriceWei: null,
    }
  );
  console.log(`[listener] Cancelled listing token #${tokenIdN}`);
}

async function onTicketTransfer(from, to, tokenId) {
  const tokenIdN = Number(tokenId);
  const fromAddr = String(from).toLowerCase();
  const toAddr = String(to).toLowerCase();
  const zero = "0x0000000000000000000000000000000000000000";
  if (fromAddr === zero) return; // mint — handled by TicketMinted

  let marketAddr = "";
  try {
    marketAddr = (process.env.MARKETPLACE_CONTRACT_ADDRESS || "").toLowerCase();
  } catch {
    /* ignore */
  }

  // Marketplace escrow / sale / cancel — handled by market events
  if (marketAddr && (toAddr === marketAddr || fromAddr === marketAddr)) return;

  await Ticket.findOneAndUpdate(
    { tokenId: tokenIdN },
    {
      ownerWallet: toAddr,
      status: "owned",
      listingPrice: null,
      listingPriceWei: null,
    }
  );
  console.log(`[listener] Transfer token #${tokenIdN} ${fromAddr.slice(0, 10)}… sang ${toAddr.slice(0, 10)}…`);
}

async function onTicketSold(tokenId, seller, buyer, price, royalty, event) {
  const txHash = event.log?.transactionHash || event.transactionHash;
  const tokenIdN = Number(tokenId);
  const priceEth = weiToEthNumber(price);
  const royaltyEth = weiToEthNumber(royalty);
  const buyerWallet = buyer.toLowerCase();

  const existingTx = await Transaction.findOne({ txHash });
  if (existingTx) return;

  await Ticket.findOneAndUpdate(
    { tokenId: tokenIdN },
    {
      ownerWallet: buyerWallet,
      status: "owned",
      listingPrice: null,
      listingPriceWei: null,
    }
  );

  await Transaction.create({
    tokenId: tokenIdN,
    type: "resale",
    fromWallet: seller.toLowerCase(),
    toWallet: buyerWallet,
    price: priceEth,
    royalty: royaltyEth,
    txHash,
  });

  console.log(`[listener] Sold token #${tokenIdN} -> ${buyerWallet}`);
}

export async function startBlockchainListener() {
  if (started) return;
  if (!process.env.TICKET_CONTRACT_ADDRESS || process.env.TICKET_CONTRACT_ADDRESS.startsWith("0x...")) {
    console.warn("[listener] Bỏ qua — chưa có địa chỉ contract");
    return;
  }

  try {
    const ticket = getTicketContract();
    const market = getMarketContract();

    ticket.on("TicketMinted", (...args) => {
      const event = args[args.length - 1];
      onTicketMinted(args[0], args[1], args[2], args[3], event).catch(console.error);
    });

    ticket.on("TicketBlockCreated", (...args) => {
      onTicketBlockCreated(args[0], args[1], args[2], args[3], args[4], args[5]).catch(
        console.error
      );
    });

    market.on("TicketListed", (...args) => {
      onTicketListed(args[0], args[1], args[2]).catch(console.error);
    });

    market.on("ListingCancelled", (...args) => {
      onListingCancelled(args[0], args[1]).catch(console.error);
    });

    market.on("TicketSold", (...args) => {
      const event = args[args.length - 1];
      onTicketSold(args[0], args[1], args[2], args[3], args[4], event).catch(console.error);
    });

    ticket.on("Transfer", (...args) => {
      onTicketTransfer(args[0], args[1], args[2]).catch(console.error);
    });

    started = true;
    console.log(
      "[listener] TicketMinted / TicketBlockCreated / Transfer / TicketListed / ListingCancelled / TicketSold"
    );

    const provider = ticket.runner?.provider;
    if (provider) {
      const latest = await provider.getBlockNumber();
      const from = Math.max(0, latest - 2000);
      const minted = await ticket.queryFilter(ticket.filters.TicketMinted(), from, latest);
      for (const ev of minted) {
        await onTicketMinted(
          ev.args.tokenId,
          ev.args.owner,
          ev.args.eventChainId,
          ev.args.price,
          ev
        );
      }
      const blocks = await ticket.queryFilter(ticket.filters.TicketBlockCreated(), from, latest);
      for (const ev of blocks) {
        await onTicketBlockCreated(
          ev.args.index,
          ev.args.tokenId,
          ev.args.prevBlockHash,
          ev.args.blockHash,
          ev.args.owner,
          ev.args.eventChainId
        );
      }
      const listed = await market.queryFilter(market.filters.TicketListed(), from, latest);
      for (const ev of listed) {
        await onTicketListed(ev.args.tokenId, ev.args.seller, ev.args.price);
      }
      const cancelled = await market.queryFilter(market.filters.ListingCancelled(), from, latest);
      for (const ev of cancelled) {
        await onListingCancelled(ev.args.tokenId, ev.args.seller);
      }
      const sold = await market.queryFilter(market.filters.TicketSold(), from, latest);
      for (const ev of sold) {
        await onTicketSold(
          ev.args.tokenId,
          ev.args.seller,
          ev.args.buyer,
          ev.args.price,
          ev.args.royalty,
          ev
        );
      }
      // Heal ownership from Transfer after market events (last write wins for OTC transfers)
      const transfers = await ticket.queryFilter(ticket.filters.Transfer(), from, latest);
      for (const ev of transfers) {
        await onTicketTransfer(ev.args.from, ev.args.to, ev.args.tokenId);
      }
      console.log(`[listener] Backfill xong từ block ${from} đến ${latest}`);
    }
  } catch (err) {
    console.error("[listener] Không start được:", err.message);
  }
}

void ethers;
