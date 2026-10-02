import Event from "../models/Event.js";
import Ticket from "../models/Ticket.js";
import { asyncHandler } from "../middlewares/errorHandler.js";
import {
  getTicketOnChain,
  getRemainingTickets,
  getEventConfigOnChain,
  getTicketChainTip,
  verifyTicketChain,
  listTicketBlocksOnChain,
  listTicketsOfOwnerOnChain,
  getLedgerStatus,
  getHistoryFromLogs,
} from "../services/blockchainService.js";

async function enrichWithEventMeta(tickets) {
  const chainIds = [...new Set(tickets.map((t) => t.eventChainId).filter(Boolean))];
  const events = await Event.find({ "ticketTypes.eventChainId": { $in: chainIds } })
    .select("title location startTime ticketTypes")
    .lean();
  const byChain = new Map();
  for (const ev of events) {
    for (const t of ev.ticketTypes || []) {
      byChain.set(Number(t.eventChainId), ev);
    }
  }
  return tickets.map((t) => ({
    ...t,
    event: byChain.get(Number(t.eventChainId))
      ? {
          _id: byChain.get(Number(t.eventChainId))._id,
          title: byChain.get(Number(t.eventChainId)).title,
          location: byChain.get(Number(t.eventChainId)).location,
          startTime: byChain.get(Number(t.eventChainId)).startTime,
        }
      : null,
    // aliases cho UI cũ
    blockIndex: t.block?.blockIndex ?? t.block?.index ?? null,
    prevBlockHash: t.block?.prevBlockHash ?? null,
    blockHash: t.block?.blockHash ?? null,
  }));
}

/** Vé của ví — nguồn chính: ledger (geth). Mongo chỉ gắn metadata sự kiện. */
export const myTickets = asyncHandler(async (req, res) => {
  const wallet = (req.query.wallet || req.user?.walletAddress || "").toLowerCase();
  if (!/^0x[a-f0-9]{40}$/.test(wallet)) {
    return res.status(400).json({
      success: false,
      error: "Cần địa chỉ ví (query wallet=0x... hoặc liên kết ví)",
    });
  }

  const onChainTickets = await listTicketsOfOwnerOnChain(wallet);
  const tickets = await enrichWithEventMeta(onChainTickets);

  // Write-behind cache (không chặn response)
  void Promise.all(
    onChainTickets.map((t) =>
      Ticket.findOneAndUpdate(
        { tokenId: t.tokenId },
        {
          tokenId: t.tokenId,
          eventChainId: t.eventChainId,
          ownerWallet: t.ownerWallet,
          originalPrice: Number(t.originalPrice),
          status: t.status,
          mintedAt: new Date(t.mintedAt),
          listingPrice: t.listingPrice != null ? Number(t.listingPrice) : null,
          listingPriceWei: t.listingPriceWei,
          blockIndex: t.block?.index ?? null,
          prevBlockHash: t.block?.prevBlockHash ?? null,
          blockHash: t.block?.blockHash ?? null,
        },
        { upsert: true }
      ).catch(() => {})
    )
  );

  res.json({
    success: true,
    data: {
      wallet,
      tickets,
      source: "ledger",
      note: "Ownership đọc từ EventTicket.tokensOfOwner / Marketplace listing trên geth nodes",
    },
  });
});

export const getTicket = asyncHandler(async (req, res) => {
  const tokenId = Number(req.params.tokenId);
  if (!Number.isFinite(tokenId)) {
    return res.status(400).json({ success: false, error: "tokenId không hợp lệ" });
  }

  let onChain = null;
  try {
    onChain = await getTicketOnChain(tokenId);
  } catch {
    onChain = null;
  }
  if (!onChain) {
    return res.status(404).json({ success: false, error: "Không tìm thấy vé trên ledger" });
  }

  const [enriched] = await enrichWithEventMeta([onChain]);
  res.json({
    success: true,
    data: {
      ticket: enriched,
      onChain,
      source: "ledger",
    },
  });
});

export const remaining = asyncHandler(async (req, res) => {
  const eventChainId = Number(req.params.eventChainId);
  const remainingCount = await getRemainingTickets(eventChainId);
  let config = null;
  try {
    config = await getEventConfigOnChain(eventChainId);
  } catch {
    config = null;
  }
  res.json({
    success: true,
    data: {
      eventChainId,
      remaining: remainingCount,
      active: config?.active === true && Number(config?.totalSupply) > 0,
      config,
      source: "ledger",
    },
  });
});

/** Chuỗi TicketBlock on-chain (tip + verify + nodes) */
export const getChain = asyncHandler(async (req, res) => {
  const tip = await getTicketChainTip();
  const from = Number(req.query.from || 1);
  const to = Number(req.query.to || tip.latestBlockIndex || 0);
  let valid = null;
  if (tip.latestBlockIndex > 0 && to >= from) {
    valid = await verifyTicketChain(from, to);
  }

  const onChain = await listTicketBlocksOnChain(from, to || tip.latestBlockIndex);

  res.json({
    success: true,
    data: {
      tip,
      from,
      to,
      valid,
      blocks: onChain.blocks,
      source: "ledger",
      businessRule:
        "TicketBlock sống trên state Ethereum (nhân bản giữa các geth node). Mỗi mint = 1 node hash liên kết prev.",
    },
  });
});

export const ledgerStatus = asyncHandler(async (req, res) => {
  const status = await getLedgerStatus();
  res.json({ success: true, data: status });
});

export const ticketHistory = asyncHandler(async (req, res) => {
  const tokenId = Number(req.params.tokenId);
  const history = await getHistoryFromLogs(tokenId);
  res.json({ success: true, data: { tokenId, history, source: "ledger" } });
});
