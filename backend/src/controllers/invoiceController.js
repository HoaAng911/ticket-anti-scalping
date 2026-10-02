import fs from "fs";
import Invoice from "../models/Invoice.js";
import Transaction from "../models/Transaction.js";
import Ticket from "../models/Ticket.js";
import User from "../models/User.js";
import { asyncHandler } from "../middlewares/errorHandler.js";
import { generateInvoicePdf, resolveInvoicePdfPath } from "../services/invoicePdfService.js";
import { calcLineTax, SELLER_PROFILE, VAT_RATE_PERCENT } from "../utils/taxVn.js";

function normalizePayload(body, user) {
  const items = (body.items || []).map((it) => ({
    eventId: it.eventId != null ? String(it.eventId) : "",
    eventTitle: it.eventTitle || "Vé sự kiện",
    eventLocation: it.eventLocation || "",
    eventStartTime: it.eventStartTime ? new Date(it.eventStartTime) : undefined,
    eventChainId: Number(it.eventChainId) || 0,
    tierName: it.tierName || "",
    qty: Number(it.qty) || 1,
    unitPriceGross: Number(it.unitPriceGross ?? it.priceEth) || 0,
    unitPriceNet: Number(it.unitPriceNet) || 0,
    amountNet: Number(it.amountNet) || 0,
    vatAmount: Number(it.vatAmount) || 0,
    amountGross: Number(it.amountGross ?? (Number(it.priceEth) || 0) * (Number(it.qty) || 1)) || 0,
    ratePercent: Number(it.ratePercent) || 10,
    txHashes: Array.isArray(it.txHashes)
      ? it.txHashes
      : Array.isArray(it.txs)
        ? it.txs
        : [],
    tokenIds: Array.isArray(it.tokenIds)
      ? it.tokenIds.map(Number).filter((n) => Number.isFinite(n))
      : it.tokenId != null
        ? [Number(it.tokenId)]
        : [],
  }));

  // Gộp tx + tokenId từ checkoutResults nếu có
  const checkoutResults = body.checkoutResults || [];
  for (const r of checkoutResults) {
    const item = items.find(
      (x) => String(x.eventId) === String(r.eventId) && Number(x.eventChainId) === Number(r.eventChainId)
    );
    if (!item) continue;
    if (r.hash && !item.txHashes.includes(r.hash)) {
      item.txHashes.push(r.hash);
    }
    const tid = Number(r.tokenId);
    if (Number.isFinite(tid) && tid > 0 && !item.tokenIds.includes(tid)) {
      item.tokenIds.push(tid);
    }
  }

  return {
    invoiceNo: body.invoiceNo,
    formSymbol: body.formSymbol || "01GTKT0/001",
    serial: body.serial || "TC-LAB",
    status: body.status === "draft" ? "draft" : "paid",
    issuedAt: body.issuedAt ? new Date(body.issuedAt) : new Date(),
    buyer: {
      name: body.buyer?.name || user?.email?.split("@")[0] || "Khách hàng",
      email: body.buyer?.email || user?.email || "",
      wallet: (body.buyer?.wallet || user?.walletAddress || "").toLowerCase(),
      taxCode: body.buyer?.taxCode || "",
      address: body.buyer?.address || "",
      phone: body.buyer?.phone || "",
      userId: user?._id,
    },
    seller: body.seller || {
      name: "Ban Tổ Chức TicketChain Lab",
      taxCode: "0312345678-LAB",
      address: "Lab blockchain Clique · chainId 12345",
      phone: "1900-0000 (lab)",
      email: "organizer@ticket.local",
      bankAccount: "Ví organizerTreasury trên sổ cái Ethereum lab",
    },
    items,
    amountNet: Number(body.amountNet ?? body.subtotalNet) || 0,
    vatAmount: Number(body.vatAmount) || 0,
    vatRatePercent: Number(body.vatRatePercent) || 10,
    amountGross: Number(body.amountGross ?? body.total) || 0,
    currency: body.currency || "ETH",
    networkName: body.networkName || "",
    chainId: Number(body.chainId) || 12345,
    notes: body.notes || "",
  };
}

function toPublic(doc) {
  const o = doc.toObject ? doc.toObject() : doc;
  return {
    id: String(o._id),
    invoiceNo: o.invoiceNo,
    formSymbol: o.formSymbol,
    serial: o.serial,
    status: o.status,
    issuedAt: o.issuedAt,
    buyer: o.buyer,
    seller: o.seller,
    items: o.items,
    amountNet: o.amountNet,
    vatAmount: o.vatAmount,
    vatRatePercent: o.vatRatePercent,
    amountGross: o.amountGross,
    currency: o.currency,
    networkName: o.networkName,
    chainId: o.chainId,
    pdfFileName: o.pdfFileName,
    hasPdf: Boolean(o.pdfFileName || o.pdfRelativePath),
    pdfUrl: `/api/invoices/${o._id}/pdf`,
    createdAt: o.createdAt,
    updatedAt: o.updatedAt,
    backfilled: Boolean(o.notes && String(o.notes).includes("bổ sung")),
  };
}

/**
 * Chọn giao dịch mint phù hợp nhất với vé hiện tại (sau redeploy có thể có nhiều mint cùng tokenId).
 */
function pickMintTx(mintTxs, ticket) {
  if (!mintTxs?.length) return null;
  const owner = (ticket.ownerWallet || "").toLowerCase();
  const price = Number(ticket.originalPrice);
  const byOwnerPrice = mintTxs.find(
    (t) =>
      (t.toWallet || "").toLowerCase() === owner &&
      Math.abs(Number(t.price) - price) < 1e-9
  );
  if (byOwnerPrice) return byOwnerPrice;
  const byOwner = mintTxs.find((t) => (t.toWallet || "").toLowerCase() === owner);
  if (byOwner) return byOwner;
  const byPrice = mintTxs.find((t) => Math.abs(Number(t.price) - price) < 1e-9);
  return byPrice || mintTxs[0];
}

/**
 * Tạo hóa đơn PDF từ Ticket + Transaction mint khi vé chưa có hóa đơn
 * (mua trước khi bật lưu PDF, admin mint, hoặc client lỗi khi lưu).
 */
async function ensureInvoiceForToken(tokenId) {
  const existing = await Invoice.findOne({
    "items.tokenIds": tokenId,
    status: { $ne: "void" },
  }).sort({ issuedAt: -1 });
  if (existing) return existing;

  const byNo = await Invoice.findOne({ invoiceNo: `TC-LAB-TK-${tokenId}`, status: { $ne: "void" } });
  if (byNo) {
    // Gắn tokenId nếu thiếu
    let changed = false;
    for (const item of byNo.items || []) {
      item.tokenIds = item.tokenIds || [];
      if (!item.tokenIds.includes(tokenId)) {
        item.tokenIds.push(tokenId);
        changed = true;
      }
    }
    if (changed) await byNo.save();
    return byNo;
  }

  const ticket = await Ticket.findOne({ tokenId }).populate(
    "event",
    "title location startTime ticketTypes"
  );
  if (!ticket) return null;

  const mintTxs = await Transaction.find({ tokenId, type: "mint" }).sort({ createdAt: -1 });
  const mintTx = pickMintTx(mintTxs, ticket);

  const event = ticket.event;
  const tier = event?.ticketTypes?.find(
    (t) => Number(t.eventChainId) === Number(ticket.eventChainId)
  );
  const gross = Number(ticket.originalPrice) || Number(mintTx?.price) || 0;
  if (gross <= 0) return null;

  const line = calcLineTax({ unitPriceGross: gross, qty: 1, ratePercent: VAT_RATE_PERCENT });
  const buyerWallet = (mintTx?.toWallet || ticket.ownerWallet || "").toLowerCase();
  const buyerUser = buyerWallet
    ? await User.findOne({ walletAddress: buyerWallet }).select("email displayName")
    : null;

  const txHashes = mintTx?.txHash ? [mintTx.txHash] : [];
  if (ticket.blockHash && !txHashes.includes(ticket.blockHash)) {
    // blockHash là hash TicketBlock, không phải luôn là tx mint — chỉ thêm nếu không có mint tx
    if (!txHashes.length) txHashes.push(ticket.blockHash);
  }

  const data = {
    invoiceNo: `TC-LAB-TK-${tokenId}`,
    formSymbol: "01GTKT0/001",
    serial: "TC-LAB",
    status: "paid",
    issuedAt: ticket.mintedAt || mintTx?.createdAt || new Date(),
    buyer: {
      name:
        buyerUser?.displayName ||
        buyerUser?.email?.split("@")[0] ||
        (buyerWallet ? `Ví ${buyerWallet.slice(0, 6)}…${buyerWallet.slice(-4)}` : "Khách hàng"),
      email: buyerUser?.email || "",
      wallet: buyerWallet,
      taxCode: "",
      address: "",
      phone: "",
      userId: buyerUser?._id,
    },
    seller: { ...SELLER_PROFILE },
    items: [
      {
        eventId: event?._id ? String(event._id) : "",
        eventTitle: event?.title || `eventChainId ${ticket.eventChainId}`,
        eventLocation: event?.location || "",
        eventStartTime: event?.startTime,
        eventChainId: Number(ticket.eventChainId) || 0,
        tierName: tier?.name || `Hạng #${ticket.eventChainId}`,
        qty: 1,
        unitPriceGross: line.unitPriceGross,
        unitPriceNet: line.unitPriceNet,
        amountNet: line.amountNet,
        vatAmount: line.vatAmount,
        amountGross: line.amountGross,
        ratePercent: line.ratePercent,
        txHashes,
        tokenIds: [tokenId],
      },
    ],
    amountNet: line.amountNet,
    vatAmount: line.vatAmount,
    vatRatePercent: VAT_RATE_PERCENT,
    amountGross: line.amountGross,
    currency: "ETH",
    networkName: process.env.NETWORK_NAME || "Ticket Private Clique",
    chainId: Number(process.env.CHAIN_ID) || 12345,
    notes:
      "Hóa đơn bổ sung tự động từ sổ vé / giao dịch mint on-chain (vé chưa có hóa đơn PDF lúc mua).",
  };

  const pdf = await generateInvoicePdf(data);
  try {
    return await Invoice.create({
      ...data,
      pdfFileName: pdf.fileName,
      pdfRelativePath: pdf.relativePath,
    });
  } catch (err) {
    // Race: invoiceNo unique — lấy bản đã có
    if (err?.code === 11000) {
      return Invoice.findOne({ invoiceNo: data.invoiceNo });
    }
    throw err;
  }
}

/** Người dùng lưu hóa đơn sau khi mua (kèm PDF) */
export const createInvoice = asyncHandler(async (req, res) => {
  const data = normalizePayload(req.body, req.user || null);
  if (!data.invoiceNo) {
    return res.status(400).json({ success: false, error: "Thiếu invoiceNo" });
  }
  if (!data.items.length) {
    return res.status(400).json({ success: false, error: "Hóa đơn không có dòng hàng" });
  }

  const exists = await Invoice.findOne({ invoiceNo: data.invoiceNo });
  if (exists) {
    return res.status(409).json({
      success: false,
      error: "Số hóa đơn đã tồn tại",
      data: toPublic(exists),
    });
  }

  const pdf = await generateInvoicePdf(data);
  const doc = await Invoice.create({
    ...data,
    pdfFileName: pdf.fileName,
    pdfRelativePath: pdf.relativePath,
  });

  res.status(201).json({
    success: true,
    data: toPublic(doc),
  });
});

/** Hóa đơn theo ví (trang người dùng / vé của tôi) */
export const listByWallet = asyncHandler(async (req, res) => {
  const wallet = String(req.params.wallet || "").toLowerCase();
  if (!wallet || wallet.length < 10) {
    return res.status(400).json({ success: false, error: "Ví không hợp lệ" });
  }
  const invoices = await Invoice.find({
    "buyer.wallet": wallet,
    status: { $ne: "void" },
  })
    .sort({ issuedAt: -1 })
    .limit(100);
  res.json({ success: true, data: { invoices: invoices.map(toPublic), wallet } });
});

/**
 * Tìm hóa đơn gắn với tokenId.
 * Nếu chưa có (mua trước khi lưu PDF) → tự tạo từ Ticket + mint tx + PDF.
 */
export const getByTokenId = asyncHandler(async (req, res) => {
  const tokenId = Number(req.params.tokenId);
  if (!Number.isFinite(tokenId) || tokenId < 1) {
    return res.status(400).json({ success: false, error: "tokenId không hợp lệ" });
  }

  let doc = await Invoice.findOne({ "items.tokenIds": tokenId, status: { $ne: "void" } }).sort({
    issuedAt: -1,
  });

  if (!doc) {
    const mintTx = await Transaction.findOne({ tokenId, type: "mint" }).sort({ createdAt: -1 });
    if (mintTx?.txHash) {
      doc = await Invoice.findOne({
        "items.txHashes": mintTx.txHash,
        status: { $ne: "void" },
      }).sort({ issuedAt: -1 });

      if (doc) {
        let changed = false;
        for (const item of doc.items || []) {
          if ((item.txHashes || []).includes(mintTx.txHash)) {
            item.tokenIds = item.tokenIds || [];
            if (!item.tokenIds.includes(tokenId)) {
              item.tokenIds.push(tokenId);
              changed = true;
            }
          }
        }
        if (changed) await doc.save();
      }
    }
  }

  if (!doc) {
    doc = await ensureInvoiceForToken(tokenId);
  }

  if (!doc) {
    return res.status(404).json({
      success: false,
      error:
        "Không tạo được hóa đơn: chưa có vé tokenId này trên ledger Mongo (Ticket). Đồng bộ listener hoặc mint lại.",
    });
  }

  // Đảm bảo PDF còn trên disk
  if (!resolveInvoicePdfPath(doc)) {
    const pdf = await generateInvoicePdf(doc.toObject());
    doc.pdfFileName = pdf.fileName;
    doc.pdfRelativePath = pdf.relativePath;
    await doc.save();
  }

  res.json({ success: true, data: toPublic(doc) });
});

/** Hóa đơn của user hiện tại */
export const listMyInvoices = asyncHandler(async (req, res) => {
  const q = { $or: [] };
  if (req.user?._id) q.$or.push({ "buyer.userId": req.user._id });
  if (req.user?.email) q.$or.push({ "buyer.email": req.user.email.toLowerCase() });
  if (req.user?.walletAddress) q.$or.push({ "buyer.wallet": req.user.walletAddress.toLowerCase() });
  if (!q.$or.length) {
    return res.json({ success: true, data: { invoices: [] } });
  }
  const invoices = await Invoice.find(q).sort({ issuedAt: -1 }).limit(100);
  res.json({ success: true, data: { invoices: invoices.map(toPublic) } });
});

export const getInvoice = asyncHandler(async (req, res) => {
  const doc = await Invoice.findById(req.params.id);
  if (!doc) return res.status(404).json({ success: false, error: "Không tìm thấy hóa đơn" });

  // Lab: cho xem metadata theo id; admin UI vẫn dùng quyền riêng
  res.json({ success: true, data: toPublic(doc) });
});

export const downloadInvoicePdf = asyncHandler(async (req, res) => {
  const doc = await Invoice.findById(req.params.id);
  if (!doc) return res.status(404).json({ success: false, error: "Không tìm thấy hóa đơn" });

  let pdfPath = resolveInvoicePdfPath(doc);
  if (!pdfPath) {
    const pdf = await generateInvoicePdf(doc.toObject());
    doc.pdfFileName = pdf.fileName;
    doc.pdfRelativePath = pdf.relativePath;
    await doc.save();
    pdfPath = pdf.absolutePath;
  }

  res.setHeader("Content-Type", "application/pdf");
  res.setHeader(
    "Content-Disposition",
    `${req.query.download === "1" ? "attachment" : "inline"}; filename="${doc.pdfFileName || "invoice.pdf"}"`
  );
  fs.createReadStream(pdfPath).pipe(res);
});

/** Admin: danh sách tất cả hóa đơn */
export const adminListInvoices = asyncHandler(async (req, res) => {
  const { status, q, limit = 100 } = req.query;
  const filter = {};
  if (status) filter.status = status;
  if (q) {
    filter.$or = [
      { invoiceNo: new RegExp(String(q), "i") },
      { "buyer.email": new RegExp(String(q), "i") },
      { "buyer.wallet": new RegExp(String(q), "i") },
      { "buyer.name": new RegExp(String(q), "i") },
    ];
  }
  const invoices = await Invoice.find(filter)
    .sort({ issuedAt: -1 })
    .limit(Math.min(500, Number(limit) || 100));
  const totals = await Invoice.aggregate([
    { $match: { status: { $ne: "void" } } },
    {
      $group: {
        _id: null,
        count: { $sum: 1 },
        amountGross: { $sum: "$amountGross" },
        vatAmount: { $sum: "$vatAmount" },
      },
    },
  ]);
  res.json({
    success: true,
    data: {
      invoices: invoices.map(toPublic),
      stats: totals[0] || { count: 0, amountGross: 0, vatAmount: 0 },
    },
  });
});

export const adminVoidInvoice = asyncHandler(async (req, res) => {
  const doc = await Invoice.findById(req.params.id);
  if (!doc) return res.status(404).json({ success: false, error: "Không tìm thấy hóa đơn" });
  doc.status = "void";
  doc.notes = [doc.notes, req.body?.reason ? `Hủy: ${req.body.reason}` : "Hủy bởi admin"]
    .filter(Boolean)
    .join(" | ");
  await doc.save();
  res.json({ success: true, data: toPublic(doc) });
});
