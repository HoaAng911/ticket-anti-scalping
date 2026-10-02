import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import PDFDocument from "pdfkit";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.join(__dirname, "..", "..");
const FONT_REG = path.join(ROOT, "assets", "fonts", "NotoSans-Regular.ttf");
const FONT_BOLD = path.join(ROOT, "assets", "fonts", "NotoSans-Bold.ttf");
export const INVOICE_DIR = path.join(ROOT, "storage", "invoices");

function ensureDirs() {
  fs.mkdirSync(INVOICE_DIR, { recursive: true });
}

function moneyEth(n) {
  const v = Number(n) || 0;
  if (v === 0) return "0 ETH";
  return `${v.toFixed(8).replace(/\.?0+$/, "")} ETH`;
}

function fmtDate(d) {
  try {
    return new Date(d).toLocaleString("vi-VN", { hour12: false });
  } catch {
    return String(d || "");
  }
}

/**
 * Sinh file PDF hóa đơn GTGT (tiếng Việt) và ghi ra disk.
 * @returns {Promise<{ fileName: string, relativePath: string, absolutePath: string }>}
 */
export async function generateInvoicePdf(invoice) {
  ensureDirs();
  const safeNo = String(invoice.invoiceNo || "INV").replace(/[^\w.-]+/g, "_");
  const fileName = `${safeNo}.pdf`;
  const absolutePath = path.join(INVOICE_DIR, fileName);
  const relativePath = path.join("storage", "invoices", fileName);

  const hasFont = fs.existsSync(FONT_REG);
  const doc = new PDFDocument({
    size: "A4",
    margins: { top: 40, bottom: 40, left: 40, right: 40 },
    info: {
      Title: `Hoa don GTGT ${invoice.invoiceNo}`,
      Author: invoice.seller?.name || "TicketChain",
    },
  });

  const stream = fs.createWriteStream(absolutePath);
  doc.pipe(stream);

  if (hasFont) {
    doc.registerFont("VN", FONT_REG);
    doc.registerFont("VN-Bold", fs.existsSync(FONT_BOLD) ? FONT_BOLD : FONT_REG);
    doc.font("VN");
  }

  const font = hasFont ? "VN" : "Helvetica";
  const fontBold = hasFont ? "VN-Bold" : "Helvetica-Bold";

  const pageWidth = doc.page.width - doc.page.margins.left - doc.page.margins.right;

  doc.font(fontBold).fontSize(11).text("CỘNG HÒA XÃ HỘI CHỦ NGHĨA VIỆT NAM", { align: "center" });
  doc.font(font).fontSize(10).text("Độc lập — Tự do — Hạnh phúc", { align: "center" });
  doc.moveDown(0.8);
  doc.font(fontBold).fontSize(16).text("HÓA ĐƠN GIÁ TRỊ GIA TĂNG", { align: "center" });
  doc.font(font).fontSize(10);
  doc.text(`Mẫu số: ${invoice.formSymbol || "01GTKT0/001"}  ·  Ký hiệu: ${invoice.serial || "TC-LAB"}`, {
    align: "center",
  });
  doc.text(`Số: ${invoice.invoiceNo}  ·  Ngày lập: ${fmtDate(invoice.issuedAt)}`, { align: "center" });
  doc.text(
    `Trạng thái: ${invoice.status === "paid" ? "Đã thanh toán on-chain" : invoice.status === "void" ? "Đã hủy" : "Nháp"}`,
    { align: "center" }
  );
  doc.moveDown(1);

  const seller = invoice.seller || {};
  const buyer = invoice.buyer || {};

  const colW = pageWidth / 2 - 6;
  const leftX = doc.page.margins.left;
  const rightX = leftX + colW + 12;
  const boxTop = doc.y;

  doc.font(fontBold).fontSize(10).text("Người bán (Ban tổ chức)", leftX, boxTop, { width: colW });
  doc.font(font).fontSize(9);
  let yL = doc.y;
  const sellerLines = [
    `Tên: ${seller.name || "—"}`,
    `MST: ${seller.taxCode || "—"}`,
    `Địa chỉ: ${seller.address || "—"}`,
    `Điện thoại: ${seller.phone || "—"}`,
    `Email: ${seller.email || "—"}`,
    `TK nhận: ${seller.bankAccount || "—"}`,
  ];
  for (const line of sellerLines) {
    doc.text(line, leftX, yL, { width: colW });
    yL = doc.y;
  }

  doc.font(fontBold).fontSize(10).text("Người mua", rightX, boxTop, { width: colW });
  doc.font(font).fontSize(9);
  let yR = boxTop + 14;
  const buyerLines = [
    `Họ tên / ĐV: ${buyer.name || "—"}`,
    `MST: ${buyer.taxCode || "Không cung cấp"}`,
    `Email: ${buyer.email || "—"}`,
    `Địa chỉ: ${buyer.address || "—"}`,
    `Ví: ${buyer.wallet || "—"}`,
    `Thanh toán: Chuyển ETH on-chain (mint NFT)`,
  ];
  for (const line of buyerLines) {
    doc.text(line, rightX, yR, { width: colW });
    yR = doc.y;
  }

  doc.y = Math.max(yL, yR) + 12;
  doc.font(font).fontSize(9);
  doc.text(
    `Đơn vị tiền: ${invoice.currency || "ETH"} · Mạng: ${invoice.networkName || ""} (chainId ${invoice.chainId || ""}) · Giá niêm yết đã gồm GTGT ${invoice.vatRatePercent ?? 10}%`
  );
  doc.moveDown(0.6);

  // Table header
  const headers = ["STT", "Hàng hóa / dịch vụ", "SL", "ĐG chưa thuế", "TT chưa thuế", "TS", "Thuế GTGT", "TT có thuế"];
  const widths = [28, 170, 28, 70, 70, 36, 70, 70];
  const startX = leftX;
  let x = startX;
  const rowY = doc.y;
  doc.font(fontBold).fontSize(8);
  headers.forEach((h, i) => {
    doc.rect(x, rowY, widths[i], 28).stroke();
    doc.text(h, x + 2, rowY + 6, { width: widths[i] - 4, align: "center" });
    x += widths[i];
  });
  doc.y = rowY + 28;

  doc.font(font).fontSize(8);
  const items = invoice.items || [];
  items.forEach((item, idx) => {
    const desc = [
      item.eventTitle || "Vé sự kiện",
      `Hạng: ${item.tierName || ""} · eventChainId ${item.eventChainId ?? ""}`,
      item.tokenIds?.length ? `Token NFT: #${item.tokenIds.join(", #")}` : "",
      item.eventLocation ? `Địa điểm: ${item.eventLocation}` : "",
      `Dịch vụ vui chơi giải trí — GTGT ${item.ratePercent ?? 10}%`,
      ...(item.txHashes || []).map((h) => `Tx: ${h}`),
    ]
      .filter(Boolean)
      .join("\n");

    const cells = [
      String(idx + 1),
      desc,
      String(item.qty ?? 1),
      moneyEth(item.unitPriceNet),
      moneyEth(item.amountNet),
      `${item.ratePercent ?? 10}%`,
      moneyEth(item.vatAmount),
      moneyEth(item.amountGross),
    ];

    const height = Math.max(42, doc.heightOfString(desc, { width: widths[1] - 4 }) + 10);
    if (doc.y + height > doc.page.height - 80) {
      doc.addPage();
      if (hasFont) doc.font(font);
    }
    const y = doc.y;
    x = startX;
    cells.forEach((c, i) => {
      doc.rect(x, y, widths[i], height).stroke();
      doc.text(c, x + 2, y + 4, {
        width: widths[i] - 4,
        align: i === 1 ? "left" : "right",
      });
      x += widths[i];
    });
    doc.y = y + height;
  });

  doc.moveDown(0.8);
  const summaryX = leftX + pageWidth - 260;
  const rows = [
    ["Cộng tiền hàng (chưa GTGT)", moneyEth(invoice.amountNet)],
    [`Thuế GTGT (${invoice.vatRatePercent ?? 10}%)`, moneyEth(invoice.vatAmount)],
    ["Thuế TTĐB", "Không chịu thuế"],
    ["Tổng thanh toán (đã gồm GTGT)", moneyEth(invoice.amountGross)],
  ];
  doc.font(font).fontSize(9);
  for (const [label, val] of rows) {
    const y = doc.y;
    doc.rect(summaryX, y, 160, 18).stroke();
    doc.rect(summaryX + 160, y, 100, 18).stroke();
    doc.text(label, summaryX + 4, y + 4, { width: 152 });
    doc.text(val, summaryX + 164, y + 4, { width: 92, align: "right" });
    doc.y = y + 18;
  }

  doc.moveDown(1);
  doc.font(font).fontSize(8);
  doc.text(
    "Căn cứ: Luật thuế GTGT; Thông tư 219/2013/TT-BTC — thuế suất 10% đối với dịch vụ vui chơi giải trí / vé sự kiện. Giá bán đã bao gồm thuế GTGT.",
    { width: pageWidth }
  );
  doc.text(
    "Chứng từ lab mô phỏng hóa đơn GTGT — không thay thế hóa đơn điện tử đăng ký với cơ quan thuế (NĐ 123/2020/NĐ-CP).",
    { width: pageWidth }
  );

  doc.moveDown(1.5);
  const signY = doc.y;
  const sw = pageWidth / 3;
  ["Người mua hàng", "Người lập phiếu", "Người bán hàng"].forEach((title, i) => {
    const sx = leftX + i * sw;
    doc.font(fontBold).fontSize(9).text(title, sx, signY, { width: sw - 8, align: "center" });
    doc.font(font).fontSize(8).text("(Ký, ghi rõ họ tên)", sx, signY + 14, {
      width: sw - 8,
      align: "center",
    });
  });

  doc.end();

  await new Promise((resolve, reject) => {
    stream.on("finish", resolve);
    stream.on("error", reject);
  });

  return { fileName, relativePath, absolutePath };
}

export function resolveInvoicePdfPath(invoice) {
  if (!invoice?.pdfFileName && !invoice?.pdfRelativePath) return null;
  if (invoice.pdfRelativePath) {
    const abs = path.isAbsolute(invoice.pdfRelativePath)
      ? invoice.pdfRelativePath
      : path.join(ROOT, invoice.pdfRelativePath);
    if (fs.existsSync(abs)) return abs;
  }
  if (invoice.pdfFileName) {
    const abs = path.join(INVOICE_DIR, invoice.pdfFileName);
    if (fs.existsSync(abs)) return abs;
  }
  return null;
}
