import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import PDFDocument from "pdfkit";
import {
  CONTRACT_STATUS_LABELS,
  STAGE_STATUS_LABELS,
  formatTriggerDetail,
  getPaymentContractTemplate,
} from "../utils/paymentContractVn.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.join(__dirname, "..", "..");
const FONT_REG = path.join(ROOT, "assets", "fonts", "NotoSans-Regular.ttf");
const FONT_BOLD = path.join(ROOT, "assets", "fonts", "NotoSans-Bold.ttf");
export const PAYMENT_CONTRACT_DIR = path.join(ROOT, "storage", "payment-contracts");

function ensureDirs() {
  fs.mkdirSync(PAYMENT_CONTRACT_DIR, { recursive: true });
}

function fmtDateVi(d) {
  if (!d) return "…";
  try {
    const x = new Date(d);
    if (Number.isNaN(x.getTime())) return "…";
    const dd = String(x.getDate()).padStart(2, "0");
    const mm = String(x.getMonth() + 1).padStart(2, "0");
    return `ngày ${dd} tháng ${mm} năm ${x.getFullYear()}`;
  } catch {
    return "…";
  }
}

function fmtDateTime(d) {
  if (!d) return "—";
  try {
    return new Date(d).toLocaleString("vi-VN", { hour12: false });
  } catch {
    return "—";
  }
}

function moneyEth(v) {
  const s = String(v ?? "0");
  return `${s} ETH`;
}

/**
 * Sinh PDF hợp đồng thanh toán theo tiến độ (A4, tiếng Việt).
 * @param {object} payload — contract + event + organizer + stages planned amounts
 */
export async function generatePaymentContractPdf(payload) {
  ensureDirs();
  const contract = payload.contract || payload;
  const event = payload.event || {};
  const organizer = payload.organizer || {};
  const stages = payload.stages || contract.stages || [];
  const baseAmountEth = payload.baseAmountEth || contract.totalAmountEth || "0";
  const template = getPaymentContractTemplate(contract.templateKey || "tieu_chuan");

  const safeNo = String(contract.contractNo || `HDTT-${contract._id || "x"}`).replace(
    /[^\w.-]+/g,
    "_"
  );
  const fileName = `${safeNo}.pdf`;
  const absolutePath = path.join(PAYMENT_CONTRACT_DIR, fileName);
  const relativePath = path.join("storage", "payment-contracts", fileName);

  const hasFont = fs.existsSync(FONT_REG);
  const doc = new PDFDocument({
    size: "A4",
    margins: { top: 40, bottom: 36, left: 48, right: 48 },
    info: {
      Title: `Hop dong thanh toan ${contract.contractNo || ""}`,
      Author: "TicketChain Lab",
      Subject: "Hop dong thanh toan theo tien do (Ban to chuc)",
    },
  });

  const stream = fs.createWriteStream(absolutePath);
  doc.pipe(stream);

  if (hasFont) {
    doc.registerFont("VN", FONT_REG);
    doc.registerFont("VN-Bold", fs.existsSync(FONT_BOLD) ? FONT_BOLD : FONT_REG);
  }
  const F = hasFont ? "VN" : "Helvetica";
  const FB = hasFont ? "VN-Bold" : "Helvetica-Bold";

  const L = doc.page.margins.left;
  const W = doc.page.width - doc.page.margins.left - doc.page.margins.right;

  // Khung
  doc
    .lineWidth(1)
    .rect(28, 28, doc.page.width - 56, doc.page.height - 56)
    .stroke("#222");

  // Quốc hiệu
  doc.font(FB).fontSize(11).text("CỘNG HÒA XÃ HỘI CHỦ NGHĨA VIỆT NAM", L, 42, {
    width: W,
    align: "center",
  });
  doc.font(F).fontSize(10).text("Độc lập - Tự do - Hạnh phúc", L, doc.y, {
    width: W,
    align: "center",
  });
  const uy = doc.y + 2;
  doc
    .moveTo(L + W / 2 - 48, uy)
    .lineTo(L + W / 2 + 48, uy)
    .stroke("#333");

  doc.moveDown(0.9);
  doc.font(FB).fontSize(14).text("HỢP ĐỒNG THANH TOÁN THEO TIẾN ĐỘ", {
    align: "center",
  });
  doc.font(F).fontSize(10).text("(Thanh toán Ban tổ chức sự kiện — nền tảng TicketChain)", {
    align: "center",
  });
  doc.moveDown(0.4);
  doc.font(FB).fontSize(11).text(`Số: ${contract.contractNo || "—"}`, { align: "center" });
  doc
    .font(F)
    .fontSize(9)
    .text(
      `Mẫu: ${template.label}  ·  Trạng thái: ${CONTRACT_STATUS_LABELS[contract.status] || contract.status}`,
      { align: "center" }
    );
  doc
    .font(F)
    .fontSize(9)
    .text(`Ngày lập: ${fmtDateVi(contract.signedAt || contract.createdAt || new Date())}`, {
      align: "center",
    });

  doc.moveDown(0.8);
  doc.font(F).fontSize(9.5);
  doc.text(
    "Căn cứ nhu cầu tổ chức sự kiện và thỏa thuận giữa Nền tảng bán vé TicketChain (Bên A) và Ban tổ chức (Bên B), hai bên thống nhất ký Hợp đồng thanh toán theo tiến độ với các điều khoản sau:",
    { width: W, align: "justify" }
  );

  // Điều 1 — Các bên
  doc.moveDown(0.7);
  doc.font(FB).fontSize(10).text("Điều 1. Thông tin các bên", { underline: true });
  doc.moveDown(0.25);
  doc.font(FB).fontSize(9.5).text("1.1. Bên A — Nền tảng / Đơn vị thanh toán");
  doc.font(F).fontSize(9);
  doc.text("Tên: TicketChain Lab (nền tảng chống đầu cơ vé)");
  doc.text("Vai trò: Thu tiền bán vé sơ cấp on-chain và giải ngân về ví Ban tổ chức theo định mức HĐ.");
  doc.text(`Địa chỉ ví treasury / quỹ: do hệ thống quản trị cấu hình tại thời điểm thanh toán.`);

  doc.moveDown(0.35);
  doc.font(FB).fontSize(9.5).text("1.2. Bên B — Ban tổ chức sự kiện");
  doc.font(F).fontSize(9);
  const orgName =
    organizer.organizationName ||
    contract.organizerName ||
    "Ban tổ chức (chưa gắn hồ sơ)";
  doc.text(`Tên đơn vị: ${orgName}`);
  if (organizer.profileCode) doc.text(`Mã hồ sơ năng lực: ${organizer.profileCode}`);
  if (organizer.taxCode) doc.text(`MST: ${organizer.taxCode}`);
  if (organizer.address) doc.text(`Địa chỉ: ${organizer.address}`);
  if (organizer.email || organizer.phone) {
    doc.text(`Liên hệ: ${[organizer.email, organizer.phone].filter(Boolean).join(" · ") || "—"}`);
  }
  const wallet =
    contract.payoutWallet || organizer.payoutWallet || "— (cập nhật trước khi giải ngân)";
  doc.text(`Ví nhận thanh toán (ETH): ${wallet}`);
  if (contract.bankName || contract.bankAccount || organizer.bankName || organizer.bankAccount) {
    doc.text(
      `Tài khoản NH (tham chiếu): ${contract.bankName || organizer.bankName || "—"} / ${
        contract.bankAccount || organizer.bankAccount || "—"
      }`
    );
  }

  // Điều 2 — Sự kiện
  doc.moveDown(0.55);
  doc.font(FB).fontSize(10).text("Điều 2. Đối tượng hợp đồng — Sự kiện", { underline: true });
  doc.moveDown(0.2);
  doc.font(F).fontSize(9);
  doc.text(`Tên sự kiện: ${event.title || contract.eventTitle || "—"}`);
  doc.text(`Địa điểm: ${event.location || "—"}`);
  doc.text(`Thời gian diễn ra: ${fmtDateTime(event.startTime)}`);
  doc.text(`Tiêu đề HĐ: ${contract.title || "—"}`);

  // Điều 3 — Giá trị & phương thức
  doc.moveDown(0.55);
  doc.font(FB).fontSize(10).text("Điều 3. Giá trị và phương thức thanh toán", {
    underline: true,
  });
  doc.moveDown(0.2);
  doc.font(F).fontSize(9);
  if (contract.useOnChainRevenue) {
    doc.text(
      `Cơ sở tính %: Doanh thu bán vé sơ cấp on-chain của sự kiện (cập nhật tại thời điểm giải ngân). Giá trị tham chiếu hiện tại: ${moneyEth(baseAmountEth)}.`
    );
  } else {
    doc.text(
      `Tổng giá trị hợp đồng (cố định): ${moneyEth(contract.totalAmountEth)}. Mỗi đợt = Tổng giá trị × tỷ lệ % định mức.`
    );
  }
  doc.text(
    "Đồng tiền thanh toán: ETH (on-chain). Mỗi lần giải ngân, Bên A chuyển đúng số ETH định mức của đợt từ quỹ nền tảng về ví nhận của Bên B."
  );
  doc.text(
    "Bên B có trách nhiệm cung cấp đúng địa chỉ ví; sai địa chỉ do Bên B chịu rủi ro sau khi giao dịch đã xác nhận trên chuỗi."
  );

  // Điều 4 — Các đợt
  doc.moveDown(0.55);
  doc.font(FB).fontSize(10).text("Điều 4. Các giai đoạn thanh toán (định mức %)", {
    underline: true,
  });
  doc.moveDown(0.3);

  const col = {
    stt: L,
    code: L + 28,
    name: L + 58,
    pct: L + 248,
    amt: L + 288,
    cond: L + 360,
  };
  const rowH = 16;
  let y = doc.y;

  const drawHeader = () => {
    doc.font(FB).fontSize(8);
    doc.text("STT", col.stt, y, { width: 26 });
    doc.text("Mã", col.code, y, { width: 28 });
    doc.text("Tên đợt", col.name, y, { width: 185 });
    doc.text("%", col.pct, y, { width: 36 });
    doc.text("Định mức", col.amt, y, { width: 68 });
    doc.text("Điều kiện mở đợt", col.cond, y, { width: W - (col.cond - L) });
    y += 12;
    doc
      .moveTo(L, y)
      .lineTo(L + W, y)
      .stroke("#888");
    y += 4;
  };

  drawHeader();
  doc.font(F).fontSize(8);

  stages.forEach((s, idx) => {
    if (y > doc.page.height - 120) {
      doc.addPage();
      doc
        .lineWidth(1)
        .rect(28, 28, doc.page.width - 56, doc.page.height - 56)
        .stroke("#222");
      y = 48;
      drawHeader();
      doc.font(F).fontSize(8);
    }
    const planned =
      s.plannedAmountEth != null
        ? s.plannedAmountEth
        : s.amountEth != null
          ? s.amountEth
          : "";
    const statusBit = s.status ? ` [${STAGE_STATUS_LABELS[s.status] || s.status}]` : "";
    doc.text(String(idx + 1), col.stt, y, { width: 26 });
    doc.text(s.code || `D${idx + 1}`, col.code, y, { width: 28 });
    doc.text(`${s.name || ""}${statusBit}`, col.name, y, { width: 185 });
    doc.text(`${s.percent}%`, col.pct, y, { width: 36 });
    doc.text(planned ? `${planned} ETH` : "—", col.amt, y, { width: 68 });
    doc.text(formatTriggerDetail(s), col.cond, y, { width: W - (col.cond - L) });
    y += rowH;
    if (s.description) {
      doc.font(F).fontSize(7.5).fillColor("#444");
      doc.text(`   ${s.description}`, L, y, { width: W });
      y = doc.y + 2;
      doc.fillColor("#000").fontSize(8);
    }
  });

  doc.y = y + 4;

  // Điều 5
  doc.font(FB).fontSize(10).text("Điều 5. Nghĩa vụ và cam kết", { underline: true });
  doc.moveDown(0.2);
  doc.font(F).fontSize(9);
  doc.text(
    "5.1. Bên A chỉ giải ngân khi đợt đạt điều kiện tiến độ (hoặc được admin mở thủ công) và quỹ đủ số dư.",
    { width: W }
  );
  doc.text(
    "5.2. Bên B cam kết sử dụng khoản thanh toán đúng mục đích tổ chức sự kiện; không chuyển nhượng HĐ khi chưa có sự đồng ý của Bên A.",
    { width: W }
  );
  doc.text(
    "5.3. Mọi giao dịch on-chain (txHash) là bằng chứng thanh toán gắn với từng đợt trong hệ thống.",
    { width: W }
  );

  // Điều 6
  doc.moveDown(0.45);
  doc.font(FB).fontSize(10).text("Điều 6. Hiệu lực", { underline: true });
  doc.moveDown(0.2);
  doc.font(F).fontSize(9);
  doc.text(
    `Hợp đồng có hiệu lực kể từ ${fmtDateVi(contract.signedAt || contract.createdAt || new Date())} và chấm dứt khi tất cả các đợt đã thanh toán/bỏ qua hoặc khi bị huỷ theo quyết định quản trị nền tảng.`,
    { width: W }
  );
  if (contract.notes) {
    doc.moveDown(0.3);
    doc.font(FB).fontSize(9).text("Ghi chú:");
    doc.font(F).fontSize(9).text(contract.notes, { width: W });
  }

  // Chữ ký
  doc.moveDown(1.2);
  if (doc.y > doc.page.height - 130) doc.addPage();

  const sigY = Math.max(doc.y, doc.page.height - 150);
  const half = W / 2 - 10;
  doc.font(FB).fontSize(9).text("ĐẠI DIỆN BÊN A", L, sigY, { width: half, align: "center" });
  doc
    .font(FB)
    .fontSize(9)
    .text("ĐẠI DIỆN BÊN B", L + half + 20, sigY, { width: half, align: "center" });
  doc
    .font(F)
    .fontSize(8)
    .text("(Ký, ghi rõ họ tên)", L, sigY + 14, { width: half, align: "center" });
  doc
    .font(F)
    .fontSize(8)
    .text("(Ký, ghi rõ họ tên)", L + half + 20, sigY + 14, {
      width: half,
      align: "center",
    });
  doc
    .font(F)
    .fontSize(8)
    .fillColor("#666")
    .text("TicketChain Admin", L, sigY + 70, { width: half, align: "center" });
  doc
    .font(F)
    .fontSize(8)
    .text(orgName, L + half + 20, sigY + 70, { width: half, align: "center" });
  doc.fillColor("#000");

  doc
    .font(F)
    .fontSize(7.5)
    .fillColor("#666")
    .text(
      "Tài liệu lab — sinh tự động từ hệ thống TicketChain. Không thay thế văn bản công chứng.",
      L,
      doc.page.height - 48,
      { width: W, align: "center" }
    );
  doc.fillColor("#000");

  doc.end();

  await new Promise((resolve, reject) => {
    stream.on("finish", resolve);
    stream.on("error", reject);
  });

  return { fileName, relativePath, absolutePath };
}

export function resolvePaymentContractPdfPath(contract) {
  if (!contract?.pdfFileName && !contract?.pdfRelativePath) return null;
  if (contract.pdfRelativePath) {
    const abs = path.isAbsolute(contract.pdfRelativePath)
      ? contract.pdfRelativePath
      : path.join(ROOT, contract.pdfRelativePath);
    if (fs.existsSync(abs)) return abs;
  }
  if (contract.pdfFileName) {
    const abs = path.join(PAYMENT_CONTRACT_DIR, contract.pdfFileName);
    if (fs.existsSync(abs)) return abs;
  }
  return null;
}
