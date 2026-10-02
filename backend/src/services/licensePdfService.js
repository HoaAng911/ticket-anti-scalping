import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import PDFDocument from "pdfkit";
import { LICENSE_TYPES, effectiveLicenseStatus } from "../utils/licenseVn.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.join(__dirname, "..", "..");
const FONT_REG = path.join(ROOT, "assets", "fonts", "NotoSans-Regular.ttf");
const FONT_BOLD = path.join(ROOT, "assets", "fonts", "NotoSans-Bold.ttf");
export const LICENSE_DIR = path.join(ROOT, "storage", "licenses");

function ensureDirs() {
  fs.mkdirSync(LICENSE_DIR, { recursive: true });
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

function fmtDateShort(d) {
  if (!d) return "—";
  try {
    return new Date(d).toLocaleDateString("vi-VN");
  } catch {
    return "—";
  }
}

function typeLabel(key) {
  return (
    LICENSE_TYPES.find((t) => t.key === key)?.label ||
    "Tổ chức sự kiện văn hóa — nghệ thuật — thể thao"
  );
}

function titleLinesByType(key) {
  if (key === "the_thao") return ["GIẤY PHÉP", "TỔ CHỨC HOẠT ĐỘNG THỂ THAO"];
  if (key === "hoi_nghi") return ["GIẤY PHÉP", "TỔ CHỨC HỘI NGHỊ / HỘI THẢO"];
  return ["GIẤY PHÉP", "TỔ CHỨC BIỂU DIỄN NGHỆ THUẬT", "VÀ HOẠT ĐỘNG VĂN HÓA — THỂ THAO"];
}

function statusLabel(eff) {
  if (eff === "approved") return "Còn hiệu lực";
  if (eff === "expired") return "Hết hạn";
  if (eff === "suspended") return "Tạm đình chỉ";
  return "Lab / chưa hoàn tất";
}

/** PDF giấy phép VHTT — bố cục hành chính VN, 1 trang A4. */
export async function generateLicensePdf(event) {
  ensureDirs();
  const lic = event.operatingLicense || {};
  const safeNo = String(lic.licenseNo || `GP-${event._id}`).replace(/[^\w.-]+/g, "_");
  const fileName = `${safeNo}.pdf`;
  const absolutePath = path.join(LICENSE_DIR, fileName);
  const relativePath = path.join("storage", "licenses", fileName);

  const hasFont = fs.existsSync(FONT_REG);
  const doc = new PDFDocument({
    size: "A4",
    margins: { top: 42, bottom: 22, left: 54, right: 54 },
    info: {
      Title: `Giay phep hoat dong ${lic.licenseNo || ""}`,
      Author: lic.issuingAuthority || "Co quan cap phep",
      Subject: "Giay phep VHTT (lab TicketChain)",
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

  // Chặn tạo trang 2 do tràn chữ ký/footer
  let pageExtra = 0;
  doc.on("pageAdded", () => {
    pageExtra += 1;
  });

  doc
    .lineWidth(1.2)
    .rect(30, 30, doc.page.width - 60, doc.page.height - 60)
    .stroke("#1a1a1a");
  doc
    .lineWidth(0.45)
    .rect(35, 35, doc.page.width - 70, doc.page.height - 70)
    .stroke("#555");

  // —— Quốc hiệu ——
  doc.font(FB).fontSize(11).text("CỘNG HÒA XÃ HỘI CHỦ NGHĨA VIỆT NAM", L, 50, {
    width: W,
    align: "center",
  });
  doc.font(F).fontSize(10).text("Độc lập - Tự do - Hạnh phúc", L, doc.y, {
    width: W,
    align: "center",
  });
  const uy = doc.y + 2;
  doc
    .moveTo(L + W / 2 - 52, uy)
    .lineTo(L + W / 2 + 52, uy)
    .stroke("#333");
  doc.y = uy + 12;

  const authority = lic.issuingAuthority || "SỞ VĂN HÓA, THỂ THAO VÀ DU LỊCH";
  doc.font(FB).fontSize(10).text(authority.toUpperCase(), L, doc.y, {
    width: W,
    align: "center",
  });
  doc.moveDown(0.4);

  // —— Số / ngày (2 cột) rồi reset ——
  const yMeta = doc.y;
  const colW = (W - 16) / 2;
  doc.font(F).fontSize(9.5);
  doc.text(`Số: ${lic.licenseNo || "…/GP-VHTT"}`, L, yMeta, {
    width: colW,
    align: "left",
  });
  doc.text(fmtDateVi(lic.issuedAt || new Date()), L + colW + 16, yMeta, {
    width: colW,
    align: "right",
  });
  doc.x = L;
  doc.y = yMeta + 20;

  // —— Tiêu đề (dòng cố định, full width) ——
  doc.moveDown(0.2);
  for (const line of titleLinesByType(lic.licenseType)) {
    doc.font(FB).fontSize(12).text(line, L, doc.y, {
      width: W,
      align: "center",
      lineGap: 0,
    });
  }

  const eff = effectiveLicenseStatus(lic);
  doc.moveDown(0.15);
  doc.font(F).fontSize(8).fillColor("#555");
  doc.text(`(${statusLabel(eff)})`, L, doc.y, { width: W, align: "center" });
  doc.fillColor("#000");
  doc.moveDown(0.5);

  // —— Căn cứ ——
  doc.font(FB).fontSize(9.5).text("Căn cứ:", L, doc.y, { width: W });
  doc.font(F).fontSize(9);
  const grounds = [
    "- Luật Di sản văn hóa; Luật Thể dục, thể thao và các văn bản hướng dẫn tổ chức biểu diễn nghệ thuật, sự kiện văn hóa — thể thao;",
    "- Đơn đề nghị cấp giấy phép, hồ sơ năng lực và cam kết bảo đảm an ninh, an toàn PCCC của đơn vị tổ chức;",
    "- Thẩm quyền cơ quan quản lý nhà nước về văn hóa, thể thao và du lịch (mô phỏng lab TicketChain).",
  ];
  for (const g of grounds) {
    doc.text(g, L, doc.y, { width: W, align: "justify", lineGap: 1 });
  }

  doc.moveDown(0.4);
  doc.font(FB).fontSize(9.5).text(authority.toUpperCase(), L, doc.y, {
    width: W,
    align: "center",
  });
  doc.font(FB).fontSize(10.5).text("QUYẾT ĐỊNH:", L, doc.y, {
    width: W,
    align: "center",
  });
  doc.moveDown(0.3);

  const organizerEmail = event.organizer?.email || "đơn vị tổ chức";
  const typeName = typeLabel(lic.licenseType).toLowerCase();
  const articles = [
    `Điều 1. Cấp Giấy phép tổ chức hoạt động ${typeName} cho đơn vị tổ chức (${organizerEmail}) thực hiện chương trình «${event.title || "Sự kiện"}».`,
    "Điều 2. Tổ chức đúng nội dung đăng ký; không tự ý thay đổi quy mô, địa điểm, thời gian khi chưa được cơ quan cấp phép chấp thuận bằng văn bản.",
    `Điều 3. Địa điểm: ${event.location || "…"}. Thời gian dự kiến: ${fmtDateShort(event.startTime)}. Phạm vi gắn sự kiện Điều 1 trên TicketChain (lab).`,
    "Điều 4. Bảo đảm an ninh trật tự, an toàn PCCC, vệ sinh môi trường; tuân thủ bản quyền và quảng cáo; chịu trách nhiệm pháp lý trong thời gian giấy phép có hiệu lực.",
    `Điều 5. Hiệu lực từ ${fmtDateShort(lic.issuedAt)} đến hết ${fmtDateShort(lic.expiresAt)}. PDF lab TicketChain — mô phỏng chứng từ hành chính, không thay thế giấy phép cơ quan nhà nước.`,
  ];

  for (const para of articles) {
    doc.font(F).fontSize(9).text(para, L, doc.y, {
      width: W,
      align: "justify",
      lineGap: 1,
    });
    doc.moveDown(0.2);
    doc.x = L;
  }

  if (lic.notes) {
    doc.font(F).fontSize(8.5).text(`Ghi chú: ${String(lic.notes).slice(0, 140)}`, L, doc.y, {
      width: W,
      align: "justify",
    });
  }

  // —— Chữ ký cố định trang 1 (dưới vùng nội dung, trên footer) ——
  const signW = W * 0.42;
  const signX = L + W - signW;
  const signY = 635;
  doc.font(F).fontSize(8.5).text(fmtDateVi(lic.issuedAt || new Date()), signX, signY, {
    width: signW,
    align: "center",
    lineBreak: false,
  });
  doc.font(FB).fontSize(9).text("THỦ TRƯỞNG CƠ QUAN", signX, signY + 14, {
    width: signW,
    align: "center",
    lineBreak: false,
  });
  doc.font(F).fontSize(7.5).fillColor("#555");
  doc.text("(Ký, ghi rõ họ tên và đóng dấu)", signX, signY + 28, {
    width: signW,
    align: "center",
    lineBreak: false,
  });
  doc.fillColor("#000");
  doc.font(FB).fontSize(8).text(authority.slice(0, 48), signX, signY + 68, {
    width: signW,
    align: "center",
    lineBreak: false,
  });

  doc.font(F).fontSize(7).fillColor("#666");
  doc.text(
    "Lab TicketChain · mô phỏng giấy phép VHTT · không có giá trị pháp lý ngoài môi trường đồ án.",
    L,
    805,
    { width: W, align: "center", lineBreak: false }
  );
  doc.fillColor("#000");

  doc.end();

  await new Promise((resolve, reject) => {
    stream.on("finish", resolve);
    stream.on("error", reject);
  });

  if (pageExtra > 0) {
    // Không fail — chỉ cảnh báo qua metadata; nội dung chính nằm trang 1
    console.warn(`[license-pdf] ${fileName}: phát sinh ${pageExtra} trang phụ (ký/footer)`);
  }

  return { fileName, relativePath, absolutePath };
}

export function resolveLicensePdfPath(license) {
  if (!license?.pdfRelativePath && !license?.pdfFileName) return null;
  const abs = license.pdfRelativePath
    ? path.join(ROOT, license.pdfRelativePath)
    : path.join(LICENSE_DIR, license.pdfFileName);
  return fs.existsSync(abs) ? abs : null;
}
