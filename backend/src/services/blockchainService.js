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

function rpcList() {
  const primary = process.env.RPC_URL || "http://127.0.0.1:8545";
  const secondary =
    process.env.RPC_URL_2 ||
    (primary.includes("8545") ? primary.replace("8545", "8546") : "");
  return [primary, secondary].filter(Boolean);
}

export function getProvider() {
  if (!provider) {
    const urls = rpcList();
    // Primary node; failover thủ công qua getLedgerStatus / readFromNode
    provider = new ethers.JsonRpcProvider(urls[0], Number(process.env.CHAIN_ID || 12345));
  }
  return provider;
}

export function getTicketContract(runner = null) {
  if (!ticketContract || runner) {
    const addr = process.env.TICKET_CONTRACT_ADDRESS;
    if (!addr || addr.startsWith("0x...")) {
      throw new Error("Chưa cấu hình TICKET_CONTRACT_ADDRESS");
    }
    const c = new ethers.Contract(addr, loadAbi("EventTicket"), runner || getProvider());
    if (!runner) ticketContract = c;
    return c;
  }
  return ticketContract;
}

export function getMarketContract(runner = null) {
  if (!marketContract || runner) {
    const addr = process.env.MARKETPLACE_CONTRACT_ADDRESS;
    if (!addr || addr.startsWith("0x...")) {
      throw new Error("Chưa cấu hình MARKETPLACE_CONTRACT_ADDRESS");
    }
    const c = new ethers.Contract(addr, loadAbi("Marketplace"), runner || getProvider());
    if (!runner) marketContract = c;
    return c;
  }
  return marketContract;
}

/**
 * Trạng thái sổ cái phân tán trên các geth node (cùng chainId, đồng bộ block).
 */
export async function getLedgerStatus() {
  const chainId = Number(process.env.CHAIN_ID || 12345);
  const urls = rpcList();
  const nodes = [];

  for (let i = 0; i < urls.length; i++) {
    const url = urls[i];
    try {
      const p = new ethers.JsonRpcProvider(url, chainId);
      const [network, blockNumber, peerCountRaw] = await Promise.all([
        p.getNetwork(),
        p.getBlockNumber(),
        p.send("net_peerCount", []).catch(() => "0x0"),
      ]);
      nodes.push({
        name: i === 0 ? "node1" : `node${i + 1}`,
        rpc: url,
        chainId: Number(network.chainId),
        blockNumber,
        peers: Number(peerCountRaw),
        ok: true,
      });
    } catch (err) {
      nodes.push({
        name: i === 0 ? "node1" : `node${i + 1}`,
        rpc: url,
        ok: false,
        error: err.message,
      });
    }
  }

  const okNodes = nodes.filter((n) => n.ok);
  const blocks = okNodes.map((n) => n.blockNumber);
  const synced =
    okNodes.length >= 2 && Math.max(...blocks) - Math.min(...blocks) <= 1;

  let tip = null;
  try {
    tip = await getTicketChainTip();
  } catch {
    tip = null;
  }

  return {
    network: process.env.NETWORK_NAME || "ticket-private-clique",
    chainId,
    consensus: "Clique PoA — cùng genesis, dữ liệu ledger nhân bản giữa các node",
    sourceOfTruth: "Ethereum state trên geth nodes (không phải MongoDB)",
    mongoRole: "cache / auth / metadata sự kiện (off-chain)",
    nodes,
    synced,
    ticketContract: process.env.TICKET_CONTRACT_ADDRESS,
    marketplaceContract: process.env.MARKETPLACE_CONTRACT_ADDRESS,
    ticketBlockTip: tip,
  };
}

export async function getTicketBlock(tokenId) {
  const c = getTicketContract();
  const b = await c.getTicketBlock(tokenId);
  return normalizeTicketBlock(b);
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
    const tipIndex = Number(latestBlockIndex);
    let tokenId = 0;
    if (tipIndex > 0) {
      try {
        tokenId = Number(await c.tokenIdByBlockIndex(tipIndex));
      } catch {
        tokenId = 0;
      }
    }
    return {
      latestBlockIndex: tipIndex,
      latestBlockHash,
      tokenId,
    };
  }
}

function normalizeTicketBlock(b) {
  return {
    index: Number(b.index),
    blockIndex: Number(b.index),
    tokenId: Number(b.tokenId),
    eventChainId: Number(b.eventChainId),
    owner: b.owner.toLowerCase(),
    ownerWallet: b.owner.toLowerCase(),
    price: ethers.formatEther(b.price),
    mintedAt: new Date(Number(b.mintedAt) * 1000).toISOString(),
    prevBlockHash: b.prevBlockHash,
    blockHash: b.blockHash,
  };
}

export async function listTicketBlocksOnChain(fromIndex = 1, toIndex = null) {
  const c = getTicketContract();
  const tip = Number(await c.latestBlockIndex());
  const from = Math.max(1, Number(fromIndex) || 1);
  const to = toIndex == null ? tip : Math.min(tip, Number(toIndex));
  const blocks = [];
  for (let i = from; i <= to; i++) {
    try {
      const b = await c.getTicketBlockByIndex(i);
      blocks.push(normalizeTicketBlock(b));
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
  const market = getMarketContract();
  const [info, owner, block] = await Promise.all([
    c.getTicketInfo(tokenId),
    c.ownerOf(tokenId),
    c.getTicketBlock(tokenId).catch(() => null),
  ]);

  let listing = null;
  try {
    const l = await market.getListing(tokenId);
    if (l.active) {
      listing = {
        seller: l.seller.toLowerCase(),
        price: ethers.formatEther(l.price),
        priceWei: l.price.toString(),
        listedAt: Number(l.listedAt),
        active: true,
      };
    }
  } catch {
    /* ignore */
  }

  const ownerLower = owner.toLowerCase();
  const marketAddr = (process.env.MARKETPLACE_CONTRACT_ADDRESS || "").toLowerCase();
  const status =
    listing?.active || ownerLower === marketAddr ? "listed_for_resale" : "owned";

  return {
    tokenId: Number(tokenId),
    owner: ownerLower,
    ownerWallet: listing?.active ? listing.seller : ownerLower,
    eventChainId: Number(info.eventChainId),
    originalPrice: ethers.formatEther(info.price),
    price: ethers.formatEther(info.price),
    priceWei: info.price.toString(),
    mintedAt: new Date(Number(info.mintedAt) * 1000).toISOString(),
    status,
    listingPrice: listing?.price ?? null,
    listingPriceWei: listing?.priceWei ?? null,
    block: block
      ? {
          index: Number(block.index),
          blockIndex: Number(block.index),
          prevBlockHash: block.prevBlockHash,
          blockHash: block.blockHash,
        }
      : null,
    source: "ledger",
  };
}

/**
 * Vé của ví — đọc trực tiếp từ ledger (tokensOfOwner + listing active của seller).
 */
export async function listTicketsOfOwnerOnChain(wallet) {
  const addr = ethers.getAddress(wallet);
  const ticket = getTicketContract();
  const market = getMarketContract();

  let tokenIds = [];
  try {
    tokenIds = (await ticket.tokensOfOwner(addr)).map((x) => Number(x));
  } catch {
    // Fallback scan nếu ABI cũ chưa có tokensOfOwner
    const total = Number(await ticket.totalMinted());
    for (let id = 1; id <= total; id++) {
      try {
        const owner = await ticket.ownerOf(id);
        if (owner.toLowerCase() === addr.toLowerCase()) tokenIds.push(id);
      } catch {
        /* skip */
      }
    }
  }

  // Vé đang list: NFT nằm ở Marketplace nhưng seller = wallet
  let activeIds = [];
  try {
    activeIds = (await market.getActiveTokenIds()).map((x) => Number(x));
  } catch {
    const total = Number(await ticket.totalMinted());
    for (let id = 1; id <= total; id++) {
      try {
        const l = await market.getListing(id);
        if (l.active) activeIds.push(id);
      } catch {
        /* skip */
      }
    }
  }

  const listedMine = [];
  for (const id of activeIds) {
    try {
      const l = await market.getListing(id);
      if (l.active && l.seller.toLowerCase() === addr.toLowerCase()) {
        listedMine.push(id);
      }
    } catch {
      /* skip */
    }
  }

  const allIds = [...new Set([...tokenIds, ...listedMine])].sort((a, b) => b - a);
  const tickets = [];
  for (const id of allIds) {
    tickets.push(await getTicketOnChain(id));
  }
  return tickets;
}

export async function listActiveListingsOnChain() {
  const market = getMarketContract();
  let ids = [];
  try {
    ids = (await market.getActiveTokenIds()).map((x) => Number(x));
  } catch {
    const ticket = getTicketContract();
    const total = Number(await ticket.totalMinted());
    for (let id = 1; id <= total; id++) {
      try {
        const l = await market.getListing(id);
        if (l.active) ids.push(id);
      } catch {
        /* skip */
      }
    }
  }

  const listings = [];
  for (const id of ids) {
    const t = await getTicketOnChain(id);
    if (t.status !== "listed_for_resale") continue;
    let maxAllowedPrice = null;
    let unlockTime = null;
    try {
      maxAllowedPrice = await getMaxAllowedPrice(id);
      unlockTime = await getUnlockTime(id);
    } catch {
      /* ignore */
    }
    listings.push({
      tokenId: id,
      ownerWallet: t.ownerWallet,
      originalPrice: Number(t.originalPrice),
      listingPrice: Number(t.listingPrice),
      listingPriceWei: t.listingPriceWei,
      eventChainId: t.eventChainId,
      status: t.status,
      chainListing: {
        seller: t.ownerWallet,
        price: t.listingPrice,
        priceWei: t.listingPriceWei,
        active: true,
      },
      maxAllowedPrice,
      unlockTime,
      source: "ledger",
    });
  }
  return listings;
}

export async function getRemainingTickets(eventChainId) {
  const c = getTicketContract();
  const n = await c.getRemainingTickets(eventChainId);
  return Number(n);
}

export async function getEventConfigOnChain(eventChainId) {
  const c = getTicketContract();
  const cfg = await c.eventConfigs(Number(eventChainId));
  return {
    eventChainId: Number(eventChainId),
    totalSupply: Number(cfg.totalSupply),
    priceWei: cfg.priceWei.toString(),
    priceEth: ethers.formatEther(cfg.priceWei),
    active: Boolean(cfg.active),
    name: cfg.name,
  };
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

/**
 * Lịch sử từ event logs trên ledger (không phụ thuộc Mongo Transaction).
 */
export async function getHistoryFromLogs(tokenId) {
  const ticket = getTicketContract();
  const market = getMarketContract();
  const provider = getProvider();
  const latest = await provider.getBlockNumber();
  const from = Math.max(0, latest - 5000);
  const id = BigInt(tokenId);

  const [minted, listed, sold, cancelled] = await Promise.all([
    ticket.queryFilter(ticket.filters.TicketMinted(id), from, latest),
    market.queryFilter(market.filters.TicketListed(id), from, latest),
    market.queryFilter(market.filters.TicketSold(id), from, latest),
    market.queryFilter(market.filters.ListingCancelled(id), from, latest),
  ]);

  const rows = [];
  for (const ev of minted) {
    rows.push({
      type: "mint",
      tokenId: Number(tokenId),
      fromWallet: null,
      toWallet: ev.args.owner.toLowerCase(),
      price: weiToEthNumber(ev.args.price),
      royalty: 0,
      txHash: ev.transactionHash,
      blockNumber: ev.blockNumber,
      source: "ledger",
    });
  }
  for (const ev of listed) {
    rows.push({
      type: "list",
      tokenId: Number(tokenId),
      fromWallet: ev.args.seller.toLowerCase(),
      toWallet: null,
      price: weiToEthNumber(ev.args.price),
      royalty: 0,
      txHash: ev.transactionHash,
      blockNumber: ev.blockNumber,
      source: "ledger",
    });
  }
  for (const ev of cancelled) {
    rows.push({
      type: "cancel",
      tokenId: Number(tokenId),
      fromWallet: ev.args.seller.toLowerCase(),
      toWallet: ev.args.seller.toLowerCase(),
      price: 0,
      royalty: 0,
      txHash: ev.transactionHash,
      blockNumber: ev.blockNumber,
      source: "ledger",
    });
  }
  for (const ev of sold) {
    rows.push({
      type: "resale",
      tokenId: Number(tokenId),
      fromWallet: ev.args.seller.toLowerCase(),
      toWallet: ev.args.buyer.toLowerCase(),
      price: weiToEthNumber(ev.args.price),
      royalty: weiToEthNumber(ev.args.royalty),
      txHash: ev.transactionHash,
      blockNumber: ev.blockNumber,
      source: "ledger",
    });
  }
  rows.sort((a, b) => (b.blockNumber || 0) - (a.blockNumber || 0));
  return rows;
}

/**
 * Dòng tiền minh bạch từ sổ cái: PaymentToOrganizer + PaymentSplit + counters on-chain.
 * Ai cũng đọc được — không cần auth.
 * Bổ sung eventChainId cho resale (tra getTicketInfo) để nhóm theo sự kiện.
 */
export async function getMoneyFlowFromLedger({ fromBlock, toBlock, limit = 100 } = {}) {
  const ticket = getTicketContract();
  const market = getMarketContract();
  const provider = getProvider();
  const latest = await provider.getBlockNumber();
  const from = fromBlock != null ? Number(fromBlock) : Math.max(0, latest - 10000);
  const to = toBlock != null ? Number(toBlock) : latest;

  const [
    treasury,
    totalPrimaryRevenue,
    totalResaleVolume,
    totalRoyaltyPaid,
    treasuryBalanceWei,
    primaryPayments,
    resaleSplits,
  ] = await Promise.all([
    ticket.organizerTreasury(),
    ticket.totalPrimaryRevenue(),
    market.totalResaleVolume(),
    market.totalRoyaltyPaid(),
    provider.getBalance(await ticket.organizerTreasury()),
    ticket.queryFilter(ticket.filters.PaymentToOrganizer(), from, to),
    market.queryFilter(market.filters.PaymentSplit(), from, to),
  ]);

  const flows = [];

  for (const ev of primaryPayments) {
    flows.push({
      kind: "primary_sale",
      label: "Mua vé sơ cấp về ban tổ chức",
      tokenId: Number(ev.args.tokenId),
      eventChainId: Number(ev.args.eventChainId),
      from: ev.args.buyer.toLowerCase(),
      to: ev.args.treasury.toLowerCase(),
      amountWei: ev.args.amountWei.toString(),
      amountEth: weiToEthNumber(ev.args.amountWei),
      sellerAmountEth: 0,
      royaltyEth: 0,
      txHash: ev.transactionHash,
      blockNumber: ev.blockNumber,
      source: "ledger",
    });
  }

  const resaleTokenIds = [
    ...new Set(resaleSplits.map((ev) => Number(ev.args.tokenId))),
  ];
  const chainIdByToken = new Map();
  await Promise.all(
    resaleTokenIds.map(async (tid) => {
      try {
        const info = await ticket.getTicketInfo(tid);
        chainIdByToken.set(tid, Number(info.eventChainId));
      } catch {
        chainIdByToken.set(tid, null);
      }
    })
  );

  for (const ev of resaleSplits) {
    const royalty = weiToEthNumber(ev.args.royaltyWei);
    const sellerAmt = weiToEthNumber(ev.args.sellerAmountWei);
    const tokenId = Number(ev.args.tokenId);
    flows.push({
      kind: "resale_split",
      label: "Resale — royalty về ban tổ chức",
      tokenId,
      eventChainId: chainIdByToken.get(tokenId) ?? null,
      from: ev.args.buyer.toLowerCase(),
      to: ev.args.treasury.toLowerCase(),
      seller: ev.args.seller.toLowerCase(),
      amountWei: (ev.args.sellerAmountWei + ev.args.royaltyWei).toString(),
      amountEth: sellerAmt + royalty,
      sellerAmountEth: sellerAmt,
      royaltyEth: royalty,
      txHash: ev.transactionHash,
      blockNumber: ev.blockNumber,
      source: "ledger",
    });
  }

  flows.sort((a, b) => (b.blockNumber || 0) - (a.blockNumber || 0));
  const capped = flows.slice(0, Math.min(500, Math.max(1, Number(limit) || 100)));

  const chainIds = [
    ...new Set(
      capped.map((f) => f.eventChainId).filter((id) => id != null && Number.isFinite(id))
    ),
  ];
  const revenueByEvent = {};
  await Promise.all(
    chainIds.map(async (cid) => {
      try {
        const wei = await ticket.primaryRevenueByEvent(cid);
        revenueByEvent[cid] = {
          wei: wei.toString(),
          eth: weiToEthNumber(wei),
        };
      } catch {
        revenueByEvent[cid] = { wei: "0", eth: 0 };
      }
    })
  );

  return {
    treasury: treasury.toLowerCase(),
    treasuryBalanceEth: weiToEthNumber(treasuryBalanceWei),
    totals: {
      primaryRevenueEth: weiToEthNumber(totalPrimaryRevenue),
      primaryRevenueWei: totalPrimaryRevenue.toString(),
      resaleVolumeEth: weiToEthNumber(totalResaleVolume),
      royaltyPaidEth: weiToEthNumber(totalRoyaltyPaid),
      organizerReceivedEth:
        weiToEthNumber(totalPrimaryRevenue) + weiToEthNumber(totalRoyaltyPaid),
    },
    primaryRevenueByEvent: revenueByEvent,
    range: { fromBlock: from, toBlock: to, latest },
    count: capped.length,
    flows: capped,
  };
}

/** Bản ghi dòng tiền chỉ gồm trường công khai (không lộ địa chỉ ví đầy đủ). */
export function toPublicFlow(flow) {
  if (!flow) return null;
  const tx = flow.txHash || "";
  return {
    kind: flow.kind,
    label: flow.label,
    tokenId: flow.tokenId,
    eventChainId: flow.eventChainId,
    amountEth: flow.amountEth,
    royaltyEth: flow.royaltyEth || 0,
    sellerShareEth: flow.sellerAmountEth || 0,
    organizerReceivedEth:
      flow.kind === "primary_sale" ? flow.amountEth : flow.royaltyEth || 0,
    parties:
      flow.kind === "primary_sale"
        ? { from: "Người mua", to: "Ban tổ chức" }
        : { from: "Người mua", to: "Người bán + Ban tổ chức (royalty 5%)" },
    blockNumber: flow.blockNumber,
    txHash: tx,
    txShort: tx ? `${tx.slice(0, 10)}…${tx.slice(-6)}` : "",
    source: "ledger",
  };
}
