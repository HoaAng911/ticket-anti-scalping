import Ticket from "../models/Ticket.js";
import { asyncHandler } from "../middlewares/errorHandler.js";
import {
  getTicketOnChain,
  getRemainingTickets,
  getTicketChainTip,
  verifyTicketChain,
  listTicketBlocksOnChain,
} from "../services/blockchainService.js";

export const myTickets = asyncHandler(async (req, res) => {
  const wallet = (req.query.wallet || req.user?.walletAddress || "").toLowerCase();
  if (!/^0x[a-f0-9]{40}$/.test(wallet)) {
    return res.status(400).json({
      success: false,
      error: "Cần địa chỉ ví (query wallet=0x... hoặc liên kết ví)",
    });
  }
  const tickets = await Ticket.find({ ownerWallet: wallet })
    .sort({ mintedAt: -1 })
    .populate("event", "title location startTime ticketTypes");
  res.json({ success: true, data: { wallet, tickets } });
});

export const getTicket = asyncHandler(async (req, res) => {
  const tokenId = Number(req.params.tokenId);
  if (!Number.isFinite(tokenId)) {
    return res.status(400).json({ success: false, error: "tokenId không hợp lệ" });
  }
  let ticket = await Ticket.findOne({ tokenId }).populate(
    "event",
    "title location startTime ticketTypes"
  );

  // Bổ sung từ chain nếu chưa có trong cache
  let onChain = null;
  try {
    onChain = await getTicketOnChain(tokenId);
  } catch {
    onChain = null;
  }

  if (!ticket && !onChain) {
    return res.status(404).json({ success: false, error: "Không tìm thấy vé" });
  }

  res.json({
    success: true,
    data: {
      ticket,
      onChain,
    },
  });
});

export const remaining = asyncHandler(async (req, res) => {
  const eventChainId = Number(req.params.eventChainId);
  const remainingCount = await getRemainingTickets(eventChainId);
  res.json({ success: true, data: { eventChainId, remaining: remainingCount } });
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

  // Ưu tiên dữ liệu on-chain (nguồn sự thật), Mongo là cache
  const onChain = await listTicketBlocksOnChain(from, to || tip.latestBlockIndex);

  const mongoBlocks = await Ticket.find({
    blockIndex: { $gte: from, $lte: to || 0 },
  })
    .sort({ blockIndex: 1 })
    .select("tokenId blockIndex prevBlockHash blockHash ownerWallet eventChainId originalPrice");

  res.json({
    success: true,
    data: {
      tip,
      from,
      to,
      valid,
      blocks: onChain.blocks.length ? onChain.blocks : mongoBlocks,
      mongoBlocks,
      businessRule:
        "Mỗi lần mint vé tạo 1 TicketBlock node mới; prevBlockHash = blockHash node trước (0x0 nếu genesis).",
    },
  });
});
