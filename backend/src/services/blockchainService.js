import { ethers } from "ethers";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

function loadAbi(name) {
  const p = path.join(__dirname, "..", "abi", `${name}.json`);
  if (!fs.existsSync(p)) {
    throw new Error(`Thiếu ABI ${name}.json — hãy deploy contract trước`);
  }
  return JSON.parse(fs.readFileSync(p, "utf8"));
}

let provider;
let ticketContract;
let marketContract;

export function getProvider() {
  if (!provider) {
    const rpc =
      process.env.RPC_URL ||
      process.env.SEPOLIA_RPC_URL ||
      "http://127.0.0.1:8545";
    provider = new ethers.JsonRpcProvider(rpc, Number(process.env.CHAIN_ID || 12345));
  }
  return provider;
}

export function getTicketContract() {
  if (!ticketContract) {
    const addr = process.env.TICKET_CONTRACT_ADDRESS;
    if (!addr || addr.startsWith("0x...")) {
      throw new Error("Chưa cấu hình TICKET_CONTRACT_ADDRESS");
    }
    ticketContract = new ethers.Contract(addr, loadAbi("EventTicket"), getProvider());
  }
  return ticketContract;
}

export function getMarketContract() {
  if (!marketContract) {
    const addr = process.env.MARKETPLACE_CONTRACT_ADDRESS;
    if (!addr || addr.startsWith("0x...")) {
      throw new Error("Chưa cấu hình MARKETPLACE_CONTRACT_ADDRESS");
    }
    marketContract = new ethers.Contract(addr, loadAbi("Marketplace"), getProvider());
  }
  return marketContract;
}

export async function getTicketBlock(tokenId) {
  const c = getTicketContract();
  const b = await c.getTicketBlock(tokenId);
  return {
    index: Number(b.index),
    tokenId: Number(b.tokenId),
    eventChainId: Number(b.eventChainId),
    owner: b.owner.toLowerCase(),
    price: ethers.formatEther(b.price),
    mintedAt: new Date(Number(b.mintedAt) * 1000).toISOString(),
    prevBlockHash: b.prevBlockHash,
    blockHash: b.blockHash,
  };
}

export async function getTicketChainTip() {
  const c = getTicketContract();
  try {
    const tip = await c.getChainTip();
    return {
      latestBlockIndex: Number(tip.index),
      latestBlockHash: tip.blockHash,
      tokenId: Number(tip.tokenId),
    };
  } catch {
    const [latestBlockHash, latestBlockIndex] = await Promise.all([
      c.latestBlockHash(),
      c.latestBlockIndex(),
    ]);
    return {
      latestBlockIndex: Number(latestBlockIndex),
      latestBlockHash,
      tokenId: Number(latestBlockIndex),
    };
  }
}

/** Đọc toàn bộ TicketBlock on-chain theo index (nghiệp vụ: node liên kết prev). */
export async function listTicketBlocksOnChain(fromIndex = 1, toIndex = null) {
  const c = getTicketContract();
  const tip = Number(await c.latestBlockIndex());
  const from = Math.max(1, Number(fromIndex) || 1);
  const to = toIndex == null ? tip : Math.min(tip, Number(toIndex));
  const blocks = [];
  for (let i = from; i <= to; i++) {
    try {
      const b = await c.getTicketBlockByIndex(i);
      blocks.push({
        index: Number(b.index),
        tokenId: Number(b.tokenId),
        eventChainId: Number(b.eventChainId),
        owner: b.owner.toLowerCase(),
        price: ethers.formatEther(b.price),
        mintedAt: new Date(Number(b.mintedAt) * 1000).toISOString(),
        prevBlockHash: b.prevBlockHash,
        blockHash: b.blockHash,
      });
    } catch {
      /* skip */
    }
  }
  return { tip, from, to, blocks };
}

export async function verifyTicketChain(fromIndex, toIndex) {
  const c = getTicketContract();
  return c.verifyChain(Number(fromIndex), Number(toIndex));
}

export async function getTicketOnChain(tokenId) {
  const c = getTicketContract();
  const [info, owner, block] = await Promise.all([
    c.getTicketInfo(tokenId),
    c.ownerOf(tokenId),
    c.getTicketBlock(tokenId).catch(() => null),
  ]);
  return {
    tokenId,
    owner: owner.toLowerCase(),
    eventChainId: Number(info.eventChainId),
    price: ethers.formatEther(info.price),
    priceWei: info.price.toString(),
    mintedAt: new Date(Number(info.mintedAt) * 1000).toISOString(),
    block: block
      ? {
          index: Number(block.index),
          prevBlockHash: block.prevBlockHash,
          blockHash: block.blockHash,
        }
      : null,
  };
}

export async function getRemainingTickets(eventChainId) {
  const c = getTicketContract();
  const n = await c.getRemainingTickets(eventChainId);
  return Number(n);
}

export async function getListingOnChain(tokenId) {
  const c = getMarketContract();
  const listing = await c.getListing(tokenId);
  return {
    seller: listing.seller.toLowerCase(),
    price: ethers.formatEther(listing.price),
    priceWei: listing.price.toString(),
    listedAt: Number(listing.listedAt),
    active: listing.active,
  };
}

export async function getMaxAllowedPrice(tokenId) {
  const c = getMarketContract();
  const p = await c.getMaxAllowedPrice(tokenId);
  return ethers.formatEther(p);
}

export async function getUnlockTime(tokenId) {
  const c = getMarketContract();
  const t = await c.getUnlockTime(tokenId);
  return Number(t);
}

export function weiToEthNumber(wei) {
  return Number(ethers.formatEther(wei));
}
