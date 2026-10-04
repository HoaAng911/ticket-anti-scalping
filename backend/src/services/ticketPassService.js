import crypto from "crypto";
import path from "path";
import fs from "fs";
import { fileURLToPath } from "url";
import PDFDocument from "pdfkit";
import QRCode from "qrcode";
import Event from "../models/Event.js";
import Ticket from "../models/Ticket.js";
import { getTicketOnChain } from "./blockchainService.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.join(__dirname, "../..");
const PASS_DIR = path.join(ROOT, "storage/passes");
const FONT_REG = path.join(ROOT, "assets/fonts/NotoSans-Regular.ttf");
const FONT_BOLD = path.join(ROOT, "assets/fonts/NotoSans-Bold.ttf");

function ensureDir() {
  if (!fs.existsSync(PASS_DIR)) fs.mkdirSync(PASS_DIR, { recursive: true });
}

function secret() {
  return process.env.JWT_SECRET || "ticket-dev-secret-change-me";
}

export function signPassPayload(payload) {
  const body = {
    v: 1,
    tokenId: Number(payload.tokenId),
    eventChainId: Number(payload.eventChainId),
    seatId: payload.seatId || "",
    wallet: String(payload.wallet || "").toLowerCase(),
    ts: Number(payload.ts) || Date.now(),
  };
  const base = `${body.v}|${body.tokenId}|${body.eventChainId}|${body.seatId}|${body.wallet}|${body.ts}`;
  const sig = crypto.createHmac("sha256", secret()).update(base).digest("hex").slice(0, 24);
  return { ...body, sig };
}

export function verifyPassPayload(raw) {
  if (!raw || typeof raw !== "object") {
    return { ok: false, error: "Mã QR không hợp lệ" };
  }
  const tokenId = Number(raw.tokenId);
  const eventChainId = Number(raw.eventChainId);
  const seatId = String(raw.seatId || "");
  const wallet = String(raw.wallet || "").toLowerCase();
  const ts = Number(raw.ts);
  const sig = String(raw.sig || "");
  if (!Number.isFinite(tokenId) || !Number.isFinite(eventChainId) || !sig) {
    return { ok: false, error: "Thiếu tokenId / eventChainId / chữ ký" };
  }
  const expected = signPassPayload({ tokenId, eventChainId, seatId, wallet, ts }).sig;
  if (sig !== expected) {
    return { ok: false, error: "Chữ ký QR không hợp lệ (có thể giả mạo)" };
  }
  const ageMs = Date.now() - (ts || 0);
  if (Number.isFinite(ts) && ageMs > 365 * 24 * 60 * 60 * 1000) {
    return { ok: false, error: "Mã QR quá cũ — yêu cầu mở lại vé trên app" };
  }
  return { ok: true, payload: { tokenId, eventChainId, seatId, wallet, ts, sig } };
}

export async function loadTicketPassContext(tokenId) {
  const tid = Number(tokenId);
  if (!Number.isFinite(tid)) {
    const err = new Error("tokenId không hợp lệ");
    err.status = 400;
    throw err;
  }

  let onChain = null;
  try {
    onChain = await getTicketOnChain(tid);
  } catch {
    onChain = null;
  }
  if (!onChain) {
    const err = new Error("Không tìm thấy vé trên ledger");
    err.status = 404;
    throw err;
  }

  const mongo = await Ticket.findOne({ tokenId: tid }).lean();
  const event =
    (await Event.findOne({ "ticketTypes.eventChainId": onChain.eventChainId })
      .select("title location startTime ticketTypes seatingChart")
      .lean()) || null;

  const tier =
    (event?.ticketTypes || []).find((t) => Number(t.eventChainId) === Number(onChain.eventChainId)) ||
    null;

  return {
    tokenId: tid,
    eventChainId: Number(onChain.eventChainId),
    ownerWallet: String(onChain.ownerWallet || "").toLowerCase(),
    originalPrice: Number(onChain.originalPrice),
    status: onChain.status,
    mintedAt: onChain.mintedAt,
    seatId: mongo?.seatId || "",
    seatLabel: mongo?.seatLabel || "",
    zoneCode: mongo?.zoneCode || "",
    zoneLabel: mongo?.zoneLabel || "",
    checkedInAt: mongo?.checkedInAt || null,
    checkedInBy: mongo?.checkedInBy || "",
    checkInNote: mongo?.checkInNote || "",
    event: event
      ? {
          _id: String(event._id),
          title: event.title,
          location: event.location,
          startTime: event.startTime,
        }
      : null,
    tierName: tier?.name || `Hạng #${onChain.eventChainId}`,
  };
}

export async function buildTicketPass(tokenId) {
  const ctx = await loadTicketPassContext(tokenId);
  const signed = signPassPayload({
    tokenId: ctx.tokenId,
    eventChainId: ctx.eventChainId,
    seatId: ctx.seatId,
    wallet: ctx.ownerWallet,
    ts: Date.now(),
  });
  const qrText = JSON.stringify(signed);
  const qrDataUrl = await QRCode.toDataURL(qrText, {
    errorCorrectionLevel: "M",
    margin: 1,
    width: 280,
    color: { dark: "#0f172a", light: "#ffffff" },
  });

  return {
    ...ctx,
    qrPayload: signed,
    qrText,
    qrDataUrl,
    entryCode: `TC-${ctx.tokenId}-${(ctx.seatLabel || ctx.seatId || "GA").replace(/\s+/g, "")}`,
    checkedIn: Boolean(ctx.checkedInAt),
  };
}

function moneyEth(n) {
  const v = Number(n) || 0;
  if (v === 0) return "0 ETH";
  return `${v.toFixed(6).replace(/\.?0+$/, "")} ETH`;
}

function fmt(d) {
  try {
    return new Date(d).toLocaleString("vi-VN", { hour12: false });
  } catch {
    return "—";
  }
}

function registerVnFonts(doc) {
  const hasFont = fs.existsSync(FONT_REG);
  if (hasFont) {
    doc.registerFont("VN", FONT_REG);
    doc.registerFont("VN-Bold", fs.existsSync(FONT_BOLD) ? FONT_BOLD : FONT_REG);
  }
  return {
    font: hasFont ? "VN" : "Helvetica",
    fontBold: hasFont ? "VN-Bold" : "Helvetica-Bold",
    hasFont,
  };
}

export async function generateTicketPassPdf(tokenId) {
  ensureDir();
  const pass = await buildTicketPass(tokenId);
  const fileName = `pass-token-${pass.tokenId}.pdf`;
  const absolutePath = path.join(PASS_DIR, fileName);

  const qrPart = pass.qrDataUrl?.split(",")?.[1];
  if (!qrPart) {
    const err = new Error("Không tạo được mã QR cho vé");
    err.status = 500;
    throw err;
  }
  const qrPng = Buffer.from(qrPart, "base64");

  await new Promise((resolve, reject) => {
    const doc = new PDFDocument({
      size: "A5",
      margin: 36,
      info: {
        Title: `Ve vao cua #${pass.tokenId}`,
        Author: "TicketChain",
      },
    });
    const { font, fontBold } = registerVnFonts(doc);
    const stream = fs.createWriteStream(absolutePath);
    let settled = false;
    const fail = (e) => {
      if (settled) return;
      settled = true;
      try {
        doc.end();
      } catch {
        /* ignore */
      }
      reject(e instanceof Error ? e : new Error(String(e)));
    };
    const ok = () => {
      if (settled) return;
      settled = true;
      resolve();
    };

    doc.on("error", fail);
    stream.on("error", fail);
    stream.on("finish", ok);
    doc.pipe(stream);

    try {
      const contentW = doc.page.width - 80;

      doc.roundedRect(24, 24, doc.page.width - 48, doc.page.height - 48, 12).stroke("#0d9488");

      doc
        .font(fontBold)
        .fontSize(11)
        .fillColor("#0d9488")
        .text("TICKETCHAIN · VÉ VÀO CỬA", 40, 40, {
          align: "center",
          width: contentW,
        });
      doc.moveDown(0.4);
      doc
        .font(fontBold)
        .fontSize(15)
        .fillColor("#0f172a")
        .text(pass.event?.title || "Sự kiện", {
          align: "center",
          width: contentW,
        });
      doc.moveDown(0.3);
      doc
        .font(font)
        .fontSize(9)
        .fillColor("#64748b")
        .text("Xuất trình mã QR cho nhân viên kiểm soát", {
          align: "center",
          width: contentW,
        });

      doc.moveDown(0.7);
      const qrX = (doc.page.width - 160) / 2;
      doc.image(qrPng, qrX, doc.y, { width: 160, height: 160 });
      doc.y += 172;

      const lines = [
        ["Mã vào cửa", pass.entryCode],
        ["Token NFT", `#${pass.tokenId}`],
        ["Hạng vé", pass.tierName],
        [
          "Ghế",
          pass.seatLabel
            ? `${pass.seatLabel}${pass.zoneLabel ? ` · khu ${pass.zoneLabel}` : ""}`
            : "—",
        ],
        ["Địa điểm", pass.event?.location || "—"],
        ["Thời gian", pass.event?.startTime ? fmt(pass.event.startTime) : "—"],
        ["Chủ ví", pass.ownerWallet],
        ["Giá gốc", moneyEth(pass.originalPrice)],
        [
          "Trạng thái vào cửa",
          pass.checkedInAt ? `ĐÃ CHECK-IN · ${fmt(pass.checkedInAt)}` : "CHƯA CHECK-IN",
        ],
      ];

      for (const [k, v] of lines) {
        doc.font(font).fillColor("#64748b").fontSize(8).text(k, 48, doc.y, {
          width: contentW - 16,
          continued: false,
        });
        doc
          .font(fontBold)
          .fillColor("#0f172a")
          .fontSize(9)
          .text(String(v ?? "—"), 48, doc.y, {
            width: contentW - 16,
          });
        doc.moveDown(0.3);
      }

      doc.moveDown(0.4);
      doc
        .font(font)
        .fontSize(7.5)
        .fillColor("#94a3b8")
        .text(
          "Vé gắn NFT on-chain. QR có chữ ký HMAC — nhân viên quét tại /check-in để xác thực trước khi cho vào.",
          48,
          doc.y,
          { width: contentW - 16, align: "center" }
        );

      doc.end();
    } catch (e) {
      fail(e);
    }
  });

  return {
    pass,
    fileName,
    absolutePath,
    relativePath: `storage/passes/${fileName}`,
  };
}

export async function checkInTicket({ tokenId, staffWallet = "", note = "", force = false }) {
  const ctx = await loadTicketPassContext(tokenId);
  const existing = await Ticket.findOne({ tokenId: ctx.tokenId });

  if (existing?.checkedInAt && !force) {
    return {
      ok: false,
      alreadyCheckedIn: true,
      ticket: {
        ...ctx,
        checkedInAt: existing.checkedInAt,
        checkedInBy: existing.checkedInBy,
        checkInNote: existing.checkInNote,
      },
      error: `Vé #${ctx.tokenId} đã check-in lúc ${new Date(existing.checkedInAt).toLocaleString("vi-VN")}`,
    };
  }

  const checkedInAt = new Date();
  const checkedInBy = String(staffWallet || "staff").toLowerCase();
  const checkInNote = String(note || "").slice(0, 200);

  await Ticket.findOneAndUpdate(
    { tokenId: ctx.tokenId },
    {
      $set: {
        tokenId: ctx.tokenId,
        eventChainId: ctx.eventChainId,
        ownerWallet: ctx.ownerWallet,
        originalPrice: ctx.originalPrice,
        status: ctx.status || "owned",
        mintedAt: ctx.mintedAt ? new Date(ctx.mintedAt) : checkedInAt,
        seatId: ctx.seatId,
        seatLabel: ctx.seatLabel,
        zoneCode: ctx.zoneCode,
        zoneLabel: ctx.zoneLabel,
        checkedInAt,
        checkedInBy,
        checkInNote,
        ...(ctx.event?._id ? { event: ctx.event._id } : {}),
      },
    },
    { upsert: true, new: true }
  );

  return {
    ok: true,
    alreadyCheckedIn: false,
    ticket: {
      ...ctx,
      checkedInAt,
      checkedInBy,
      checkInNote,
      checkedIn: true,
    },
  };
}
