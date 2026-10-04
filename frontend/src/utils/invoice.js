/**
 * Hóa đơn bán vé NFT đầy đủ + tách thuế GTGT theo pháp luật Việt Nam (lab).
 */

import {
  SELLER_PROFILE,
  TAX_CODE,
  calcOrderTax,
  formatVatRate,
  roundEth,
} from "./taxVn.js";

function moneyEth(n) {
  const v = roundEth(Number(n) || 0);
  if (v === 0) return "0 ETH";
  const s = v.toFixed(8).replace(/\.?0+$/, "");
  return `${s} ETH`;
}

function fmtDate(d) {
  try {
    return new Date(d).toLocaleString("vi-VN", {
      hour12: false,
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
    });
  } catch {
    return String(d || "");
  }
}

function escapeHtml(s) {
  return String(s ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

/** Khóa dòng hàng: mỗi ghế = 1 dòng riêng */
export function invoiceLineKey(item) {
  const eventId = item?.eventId ?? "";
  const chainId = item?.eventChainId ?? "";
  if (item?.seatId) return `${eventId}::${chainId}::${item.seatId}`;
  return `${eventId}::${chainId}`;
}

function seatDescHtml(item) {
  if (!item?.seatId && !item?.seatLabel) return "";
  const zone = item.zoneLabel || item.zoneCode || "";
  const seat = item.seatLabel || item.seatId;
  return `<br/><span class="muted"><strong>Ghế ${escapeHtml(seat)}</strong>${
    zone ? ` · khu ${escapeHtml(zone)}` : ""
  } · 1 ghế = 1 vé</span>`;
}

export function buildInvoice({
  invoiceNo,
  issuedAt,
  buyer,
  items,
  checkoutResults = [],
  networkName = "Ticket Private Clique",
  chainId = 12345,
  seller = SELLER_PROFILE,
  status = "draft",
}) {
  const tax = calcOrderTax(items);
  const txByKey = {};
  const tokenIdsByKey = {};

  // Ghế: gắn token/tx đúng từng ghế. Không ghế: gộp theo hạng như trước.
  for (const r of checkoutResults) {
    const key = invoiceLineKey(r);
    if (!txByKey[key]) txByKey[key] = [];
    if (!tokenIdsByKey[key]) tokenIdsByKey[key] = [];
    if (r.hash) txByKey[key].push(r.hash);
    const tid = Number(r.tokenId);
    if (Number.isFinite(tid) && tid > 0 && !tokenIdsByKey[key].includes(tid)) {
      tokenIdsByKey[key].push(tid);
    }
  }

  // Fallback: kết quả không có seatId nhưng item có — map theo thứ tự cùng hạng
  const unusedByTier = {};
  for (const r of checkoutResults) {
    if (r.seatId) continue;
    const tierKey = `${r.eventId}::${r.eventChainId}`;
    if (!unusedByTier[tierKey]) unusedByTier[tierKey] = [];
    unusedByTier[tierKey].push(r);
  }

  const enrichedItems = (items || []).map((item, idx) => {
    const lineTax = tax.lines[idx] || calcOrderTax([item]).lines[0];
    const key = invoiceLineKey(item);
    let fromResults = tokenIdsByKey[key] || [];
    let txs = txByKey[key] || [];

    if ((!fromResults.length || !txs.length) && item.seatId) {
      const tierKey = `${item.eventId}::${item.eventChainId}`;
      const pool = unusedByTier[tierKey] || [];
      const hit = pool.shift();
      if (hit) {
        const tid = Number(hit.tokenId);
        if (Number.isFinite(tid) && tid > 0) fromResults = [...fromResults, tid];
        if (hit.hash) txs = [...txs, hit.hash];
      }
    }

    const own = Array.isArray(item.tokenIds)
      ? item.tokenIds.map(Number).filter((n) => Number.isFinite(n) && n > 0)
      : item.tokenId != null
        ? [Number(item.tokenId)]
        : [];
    const tokenIds = [...new Set([...own, ...fromResults])];

    return {
      ...item,
      qty: item.seatId ? 1 : item.qty,
      ...lineTax,
      tokenIds,
      txHashes: txs.length ? txs : item.txHashes || [],
      seatId: item.seatId || "",
      seatLabel: item.seatLabel || item.seatId || "",
      zoneCode: item.zoneCode || "",
      zoneLabel: item.zoneLabel || "",
    };
  });

  return {
    invoiceNo,
    issuedAt,
    buyer: {
      name: buyer?.name || "Khách hàng",
      email: buyer?.email || "",
      wallet: buyer?.wallet || "",
      taxCode: buyer?.taxCode || "",
      address: buyer?.address || "",
      phone: buyer?.phone || "",
    },
    seller,
    items: enrichedItems,
    tax,
    subtotalNet: tax.amountNet,
    vatAmount: tax.vatAmount,
    vatRatePercent: tax.ratePercent,
    subtotal: tax.amountGross,
    total: tax.amountGross,
    txByKey,
    networkName,
    chainId,
    currency: "ETH",
    status,
    taxCode: TAX_CODE,
    formSymbol: seller.invoiceForm || "01GTKT0/001",
    serial: seller.invoiceSerial || "TC-LAB",
  };
}

export function invoiceToHtml(invoice) {
  const isPaid = invoice.status === "paid";
  const rows = invoice.items
    .map((item, idx) => {
      const txs =
        item.txHashes?.length
          ? item.txHashes
          : invoice.txByKey?.[invoiceLineKey(item)] ||
            invoice.txByKey?.[`${item.eventId}::${item.eventChainId}`] ||
            [];
      return `
      <tr>
        <td>${idx + 1}</td>
        <td>
          <strong>${escapeHtml(item.eventTitle)}</strong><br/>
          <span class="muted">Hạng: ${escapeHtml(item.tierName)} · Mã on-chain eventChainId ${item.eventChainId}</span>
          ${seatDescHtml(item)}
          ${
            item.tokenIds?.length
              ? `<br/><span class="muted">Token NFT: #${item.tokenIds.join(", #")}</span>`
              : ""
          }
          <br/><span class="muted">Địa điểm: ${escapeHtml(item.eventLocation || "—")}</span>
          ${item.eventStartTime ? `<br/><span class="muted">Thời gian: ${fmtDate(item.eventStartTime)}</span>` : ""}
          <br/><span class="muted">Nhóm dịch vụ: Vé sự kiện / vui chơi giải trí — chịu GTGT ${formatVatRate(item.ratePercent)}</span>
          ${
            txs.length
              ? `<br/><span class="mono">Tx hash: ${txs.map((h) => escapeHtml(h)).join(", ")}</span>`
              : ""
          }
        </td>
        <td class="num">${item.qty}</td>
        <td class="num">${moneyEth(item.unitPriceNet)}</td>
        <td class="num">${moneyEth(item.amountNet)}</td>
        <td class="num">${formatVatRate(item.ratePercent)}</td>
        <td class="num">${moneyEth(item.vatAmount)}</td>
        <td class="num">${moneyEth(item.amountGross)}</td>
      </tr>`;
    })
    .join("");

  const statusBadge = isPaid
    ? `<span class="badge ok">Đã thanh toán on-chain</span>`
    : `<span class="badge draft">Bản nháp / chưa thanh toán</span>`;

  return `<!DOCTYPE html>
<html lang="vi">
<head>
  <meta charset="utf-8" />
  <title>Hóa đơn GTGT ${escapeHtml(invoice.invoiceNo)}</title>
  <style>
    :root { color-scheme: light; }
    body { font-family: "Times New Roman", "Segoe UI", serif; color: #111; margin: 0; padding: 24px; background: #eceff3; }
    .sheet { max-width: 980px; margin: 0 auto; background: #fff; padding: 28px 32px 36px; border: 1px solid #c5ccd6; }
    .head { text-align: center; margin-bottom: 8px; }
    .head .nation { font-weight: 700; text-transform: uppercase; font-size: 14px; letter-spacing: .04em; }
    .head .motto { font-style: italic; font-size: 13px; margin-top: 2px; }
    .head h1 { font-size: 22px; margin: 14px 0 4px; text-transform: uppercase; }
    .head .sub { font-size: 13px; color: #333; }
    .badge { display: inline-block; padding: 3px 10px; border-radius: 4px; font-size: 12px; font-family: "Segoe UI", sans-serif; margin-top: 8px; }
    .badge.ok { background: #e7f6ec; color: #1b6b3a; border: 1px solid #b7e0c4; }
    .badge.draft { background: #fff6e5; color: #8a5a00; border: 1px solid #f0d9a0; }
    .grid2 { display: grid; grid-template-columns: 1fr 1fr; gap: 14px; margin: 18px 0; }
    .box { border: 1px solid #c5ccd6; padding: 12px 14px; }
    .box h3 { margin: 0 0 8px; font-size: 13px; text-transform: uppercase; }
    .box p { margin: 3px 0; font-size: 13px; }
    table.items { width: 100%; border-collapse: collapse; margin-top: 10px; font-size: 12.5px; }
    table.items th, table.items td { border: 1px solid #9aa3ad; padding: 8px 6px; vertical-align: top; }
    table.items th { background: #f3f5f8; text-align: center; font-size: 11px; text-transform: uppercase; }
    .num { text-align: right; white-space: nowrap; }
    .muted { color: #555; font-size: 11.5px; }
    .mono { font-family: ui-monospace, SFMono-Regular, Menlo, monospace; font-size: 10.5px; word-break: break-all; }
    .totals { margin-top: 14px; width: 100%; max-width: 420px; margin-left: auto; border-collapse: collapse; font-size: 13px; }
    .totals td { padding: 6px 8px; border: 1px solid #9aa3ad; }
    .totals .label { background: #f3f5f8; width: 60%; }
    .totals .grand { font-weight: 700; font-size: 15px; }
    .legal { margin-top: 18px; font-size: 11.5px; color: #333; border-top: 1px dashed #9aa3ad; padding-top: 12px; line-height: 1.45; }
    .sign { display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 12px; margin-top: 28px; text-align: center; font-size: 12px; }
    .sign .slot { min-height: 90px; }
    .sign strong { display: block; margin-bottom: 4px; }
    .actions { margin: 12px auto; max-width: 980px; display: flex; gap: 8px; font-family: "Segoe UI", sans-serif; }
    .actions button { font: inherit; padding: 10px 16px; border-radius: 6px; border: 1px solid #333; cursor: pointer; background: #1a2332; color: #fff; }
    @media print {
      body { background: #fff; padding: 0; }
      .actions { display: none; }
      .sheet { border: 0; }
    }
  </style>
</head>
<body>
  <div class="actions">
    <button onclick="window.print()">In / Lưu PDF</button>
  </div>
  <div class="sheet">
    <div class="head">
      <div class="nation">Cộng hòa Xã hội Chủ nghĩa Việt Nam</div>
      <div class="motto">Độc lập — Tự do — Hạnh phúc</div>
      <h1>Hóa đơn giá trị gia tăng</h1>
      <div class="sub">Mẫu số: ${escapeHtml(invoice.formSymbol)} · Ký hiệu: ${escapeHtml(invoice.serial)}</div>
      <div class="sub">Số: <strong>${escapeHtml(invoice.invoiceNo)}</strong> · Ngày lập: ${fmtDate(invoice.issuedAt)}</div>
      ${statusBadge}
    </div>

    <div class="grid2">
      <div class="box">
        <h3>Người bán (Ban tổ chức)</h3>
        <p><strong>Tên đơn vị:</strong> ${escapeHtml(invoice.seller.name)}</p>
        <p><strong>Mã số thuế:</strong> ${escapeHtml(invoice.seller.taxCode)}</p>
        <p><strong>Địa chỉ:</strong> ${escapeHtml(invoice.seller.address)}</p>
        <p><strong>Điện thoại:</strong> ${escapeHtml(invoice.seller.phone || "—")}</p>
        <p><strong>Email:</strong> ${escapeHtml(invoice.seller.email || "—")}</p>
        <p><strong>Tài khoản nhận tiền:</strong> ${escapeHtml(invoice.seller.bankAccount)}</p>
      </div>
      <div class="box">
        <h3>Người mua</h3>
        <p><strong>Họ và tên / đơn vị:</strong> ${escapeHtml(invoice.buyer.name || "—")}</p>
        <p><strong>Mã số thuế (nếu có):</strong> ${escapeHtml(invoice.buyer.taxCode || "Không cung cấp")}</p>
        <p><strong>Email:</strong> ${escapeHtml(invoice.buyer.email || "—")}</p>
        <p><strong>Địa chỉ / ghi chú:</strong> ${escapeHtml(invoice.buyer.address || "—")}</p>
        <p><strong>Ví thanh toán:</strong> <span class="mono">${escapeHtml(invoice.buyer.wallet || "—")}</span></p>
        <p><strong>Hình thức thanh toán:</strong> Chuyển ETH on-chain (mint NFT sơ cấp)</p>
      </div>
    </div>

    <p class="muted">
      Đơn vị tiền tệ: <strong>${escapeHtml(invoice.currency)}</strong> ·
      Mạng: ${escapeHtml(invoice.networkName)} (chainId ${invoice.chainId}) ·
      ${escapeHtml(TAX_CODE.priceModeLabel)}
    </p>

    <table class="items">
      <thead>
        <tr>
          <th rowspan="2" style="width:36px">STT</th>
          <th rowspan="2">Tên hàng hóa, dịch vụ</th>
          <th rowspan="2" style="width:48px">SL</th>
          <th colspan="2">Giá chưa có thuế GTGT</th>
          <th rowspan="2" style="width:56px">Thuế suất</th>
          <th rowspan="2" style="width:90px">Tiền thuế GTGT</th>
          <th rowspan="2" style="width:100px">Thành tiền có thuế GTGT</th>
        </tr>
        <tr>
          <th style="width:90px">Đơn giá</th>
          <th style="width:90px">Thành tiền</th>
        </tr>
      </thead>
      <tbody>
        ${rows || `<tr><td colspan="8" style="text-align:center">Không có dòng hàng</td></tr>`}
      </tbody>
    </table>

    <table class="totals">
      <tr>
        <td class="label">Cộng tiền hàng (chưa thuế GTGT)</td>
        <td class="num">${moneyEth(invoice.subtotalNet)}</td>
      </tr>
      <tr>
        <td class="label">Thuế GTGT (${formatVatRate(invoice.vatRatePercent)})</td>
        <td class="num">${moneyEth(invoice.vatAmount)}</td>
      </tr>
      <tr>
        <td class="label">Thuế tiêu thụ đặc biệt (TTĐB)</td>
        <td class="num">Không chịu thuế</td>
      </tr>
      <tr class="grand">
        <td class="label">Tổng cộng thanh toán (đã gồm GTGT)</td>
        <td class="num">${moneyEth(invoice.total)}</td>
      </tr>
    </table>

    <div class="legal">
      <p><strong>Căn cứ tính thuế:</strong> ${escapeHtml(TAX_CODE.legalBasis)}</p>
      <p><strong>Ghi chú TTĐB:</strong> ${escapeHtml(TAX_CODE.ttDbNote)}</p>
      <p>
        Số tiền thanh toán on-chain bằng tổng cộng đã gồm thuế GTGT và được chuyển về ví ban tổ chức
        (<code>organizerTreasury</code>) theo sự kiện <code>PaymentToOrganizer</code> trên sổ cái.
      </p>
      <p>
        <strong>Phạm vi lab:</strong> Chứng từ này mô phỏng hóa đơn GTGT phục vụ đồ án / kiểm thử.
        Không thay thế hóa đơn điện tử đã đăng ký với cơ quan thuế theo Nghị định 123/2020/NĐ-CP
        và các văn bản hướng dẫn liên quan.
      </p>
      <p>TicketChain · lập lúc ${fmtDate(invoice.issuedAt)} · số chứng từ ${escapeHtml(invoice.invoiceNo)}</p>
    </div>

    <div class="sign">
      <div class="slot">
        <strong>Người mua hàng</strong>
        (Ký, ghi rõ họ tên)
      </div>
      <div class="slot">
        <strong>Người lập phiếu</strong>
        (Ký, ghi rõ họ tên)
      </div>
      <div class="slot">
        <strong>Người bán hàng</strong>
        (Ký, đóng dấu nếu có)
      </div>
    </div>
  </div>
</body>
</html>`;
}

export function openInvoicePrint(invoice) {
  const html = invoiceToHtml(invoice);
  const w = window.open("", "_blank", "noopener,noreferrer,width=1000,height=1100");
  if (!w) throw new Error("Trình duyệt chặn cửa sổ hóa đơn — hãy cho phép popup");
  w.document.open();
  w.document.write(html);
  w.document.close();
}

export function downloadInvoiceHtml(invoice) {
  const html = invoiceToHtml(invoice);
  const blob = new Blob([html], { type: "text/html;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `${invoice.invoiceNo}.html`;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

export function makeInvoiceNo() {
  const d = new Date();
  const pad = (n) => String(n).padStart(2, "0");
  const stamp = `${String(d.getFullYear()).slice(2)}${pad(d.getMonth() + 1)}${pad(d.getDate())}`;
  const time = `${pad(d.getHours())}${pad(d.getMinutes())}${pad(d.getSeconds())}`;
  const rand = Math.random().toString(36).slice(2, 6).toUpperCase();
  return `${SELLER_PROFILE.invoiceSerial}-${stamp}-${time}-${rand}`;
}
