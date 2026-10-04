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
import {
  buildTicketPass,
  generateTicketPassPdf,
  verifyPassPayload,
  checkInTicket,
  loadTicketPassContext,
} from "../services/ticketPassService.js";
import fs from "fs";

async function enrichWithEventMeta(tickets) {
  const chainIds = [...new Set(tickets.map((t) => t.eventChainId).filter(Boolean))];
  const tokenIds = tickets.map((t) => Number(t.tokenId)).filter(Number.isFinite);
  const [events, mongoTickets] = await Promise.all([
    Event.find({ "ticketTypes.eventChainId": { $in: chainIds } })
      .select("title location startTime ticketTypes")
      .lean(),
    Ticket.find({ tokenId: { $in: tokenIds } })
      .select(
        "tokenId seatId seatLabel zoneCode zoneLabel checkedInAt checkedInBy checkInNote event"
      )
      .lean(),
  ]);
  const byChain = new Map();
  for (const ev of events) {
    for (const t of ev.ticketTypes || []) {
      byChain.set(Number(t.eventChainId), ev);
    }
  }
  const byToken = new Map(mongoTickets.map((m) => [Number(m.tokenId), m]));

  return tickets.map((t) => {
    const ev = byChain.get(Number(t.eventChainId));
    const m = byToken.get(Number(t.tokenId));
    return {
      ...t,
      seatId: m?.seatId || t.seatId || "",
      seatLabel: m?.seatLabel || t.seatLabel || "",
      zoneCode: m?.zoneCode || t.zoneCode || "",
      zoneLabel: m?.zoneLabel || t.zoneLabel || "",
      checkedInAt: m?.checkedInAt || null,
      checkedInBy: m?.checkedInBy || "",
      checkInNote: m?.checkInNote || "",
      checkedIn: Boolean(m?.checkedInAt),
      event: ev
        ? {
            _id: ev._id,
            title: ev.title,
            location: ev.location,
            startTime: ev.startTime,
          }
        : null,
      blockIndex: t.block?.blockIndex ?? t.block?.index ?? null,
      prevBlockHash: t.block?.prevBlockHash ?? null,
      blockHash: t.block?.blockHash ?? null,
    };
  });
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

/** Vé vào cửa + QR (JSON) */
export const getTicketPass = asyncHandler(async (req, res) => {
  const pass = await buildTicketPass(req.params.tokenId);
  res.json({ success: true, data: { pass } });
});

/** PDF vé vào cửa */
export const getTicketPassPdf = asyncHandler(async (req, res) => {
  const { pass, absolutePath, fileName } = await generateTicketPassPdf(req.params.tokenId);
  if (!fs.existsSync(absolutePath)) {
    const err = new Error("Không tạo được file PDF vé");
    err.status = 500;
    throw err;
  }
  res.setHeader("Content-Type", "application/pdf");
  res.setHeader("Content-Disposition", `inline; filename="${fileName}"; filename*=UTF-8''${encodeURIComponent(`ve-vao-cua-${pass.tokenId}.pdf`)}`);
  res.setHeader("X-Ticket-Token-Id", String(pass.tokenId));
  res.setHeader("Cache-Control", "no-store");
  const stream = fs.createReadStream(absolutePath);
  stream.on("error", (e) => {
    if (!res.headersSent) {
      res.status(500).json({ success: false, error: e.message || "Lỗi đọc PDF" });
    } else {
      res.destroy(e);
    }
  });
  stream.pipe(res);
});

/** Xác thực QR / token trước khi vào cửa (không ghi check-in) */
export const verifyTicketEntry = asyncHandler(async (req, res) => {
  let tokenId = req.body?.tokenId != null ? Number(req.body.tokenId) : null;
  let payload = req.body?.qr || req.body?.payload || null;

  if (typeof payload === "string") {
    try {
      payload = JSON.parse(payload);
    } catch {
      return res.status(400).json({ success: false, error: "Chuỗi QR không phải JSON hợp lệ" });
    }
  }

  if (payload) {
    const verified = verifyPassPayload(payload);
    if (!verified.ok) {
      return res.status(400).json({ success: false, error: verified.error });
    }
    tokenId = verified.payload.tokenId;
  }

  if (!Number.isFinite(tokenId)) {
    return res.status(400).json({ success: false, error: "Cần tokenId hoặc mã QR" });
  }

  const ctx = await loadTicketPassContext(tokenId);
  if (payload?.wallet && payload.wallet !== ctx.ownerWallet) {
    return res.status(409).json({
      success: false,
      error: "Ví trên QR không khớp chủ vé hiện tại (có thể đã chuyển nhượng)",
      data: { ticket: ctx },
    });
  }

  res.json({
    success: true,
    data: {
      valid: true,
      checkedIn: Boolean(ctx.checkedInAt),
      ticket: ctx,
      message: ctx.checkedInAt
        ? `Vé hợp lệ nhưng ĐÃ check-in lúc ${new Date(ctx.checkedInAt).toLocaleString("vi-VN")}`
        : "Vé hợp lệ — chưa check-in",
    },
  });
});

/** Check-in vào cửa */
export const checkInTicketEntry = asyncHandler(async (req, res) => {
  let tokenId = req.body?.tokenId != null ? Number(req.body.tokenId) : null;
  let payload = req.body?.qr || req.body?.payload || null;
  const force = req.body?.force === true;
  const note = req.body?.note || "";
  const staffWallet = (req.body?.staffWallet || req.user?.walletAddress || "").toLowerCase();

  if (typeof payload === "string") {
    try {
      payload = JSON.parse(payload);
    } catch {
      return res.status(400).json({ success: false, error: "Chuỗi QR không phải JSON hợp lệ" });
    }
  }

  if (payload) {
    const verified = verifyPassPayload(payload);
    if (!verified.ok) {
      return res.status(400).json({ success: false, error: verified.error });
    }
    tokenId = verified.payload.tokenId;
  }

  if (!Number.isFinite(tokenId)) {
    return res.status(400).json({ success: false, error: "Cần tokenId hoặc mã QR" });
  }

  if (payload?.wallet) {
    const ctx = await loadTicketPassContext(tokenId);
    if (payload.wallet !== ctx.ownerWallet) {
      return res.status(409).json({
        success: false,
        error: "Ví trên QR không khớp chủ vé hiện tại",
      });
    }
  }

  const result = await checkInTicket({ tokenId, staffWallet, note, force });
  if (!result.ok) {
    return res.status(409).json({
      success: false,
      error: result.error,
      data: { ticket: result.ticket, alreadyCheckedIn: true },
    });
  }

  res.json({
    success: true,
    data: {
      checkedIn: true,
      ticket: result.ticket,
      message: `Check-in thành công vé #${tokenId}`,
    },
  });
});
