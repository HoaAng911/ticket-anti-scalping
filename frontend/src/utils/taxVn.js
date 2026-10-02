/**
 * Thuế GTGT (VAT) theo khung pháp lý Việt Nam — áp dụng cho vé sự kiện / dịch vụ giải trí.
 *
 * Căn cứ tham chiếu (lab / đồ án):
 * - Luật thuế giá trị gia tăng (sửa đổi, bổ sung)
 * - Thông tư 219/2013/TT-BTC: thuế suất phổ thông 10% đối với hàng hóa, dịch vụ
 *   không thuộc nhóm 0%, 5% hoặc không chịu thuế
 * - Vé xem biểu diễn / sự kiện vui chơi giải trí: áp dụng thuế suất 10%
 * - Giá bán niêm yết trên chain được hiểu là giá đã bao gồm thuế GTGT
 *   (phổ biến trong giao dịch B2C tại Việt Nam)
 *
 * Lưu ý: chứng từ sinh ra trong lab mô phỏng cấu trúc hóa đơn GTGT;
 * không thay thế hóa đơn điện tử đã đăng ký với cơ quan thuế.
 */

/** Thuế suất GTGT chuẩn cho vé sự kiện / dịch vụ giải trí (%) */
export const VAT_RATE_PERCENT = 10;

/** Hệ số giá đã gồm thuế: gross = net * (1 + rate/100) */
export const VAT_GROSS_FACTOR = 1 + VAT_RATE_PERCENT / 100;

export const TAX_CODE = {
  vatRatePercent: VAT_RATE_PERCENT,
  taxName: "Thuế giá trị gia tăng (GTGT)",
  taxNameEn: "VAT",
  legalBasis:
    "Luật thuế GTGT; Thông tư 219/2013/TT-BTC — thuế suất 10% đối với dịch vụ vui chơi giải trí / vé sự kiện (không thuộc nhóm ưu đãi 0% hoặc 5%).",
  priceMode: "gross_inclusive",
  priceModeLabel: "Giá niêm yết đã bao gồm thuế GTGT",
  ttDbApplicable: false,
  ttDbNote: "Thuế tiêu thụ đặc biệt (TTĐB) không áp dụng đối với vé sự kiện thông thường.",
};

/** Thông tin người bán (ban tổ chức / đơn vị xuất hóa đơn lab) */
export const SELLER_PROFILE = {
  name: "Ban Tổ Chức TicketChain Lab",
  nameEn: "TicketChain Lab Organizer",
  taxCode: "0312345678-LAB",
  address: "Lab blockchain Clique · RPC localhost:8545 · chainId 12345",
  phone: "1900-0000 (lab)",
  email: "organizer@ticket.local",
  bankAccount: "Ví organizerTreasury trên sổ cái Ethereum lab",
  invoiceForm: "01GTKT0/001",
  invoiceSerial: "TC-LAB",
};

/**
 * Tách giá đã gồm thuế (gross) thành giá chưa thuế + tiền thuế.
 * Làm tròn 8 chữ số thập phân (ETH), điều chỉnh phần dư vào dòng thuế để tổng khớp gross.
 */
export function splitGrossInclusive(grossAmount, ratePercent = VAT_RATE_PERCENT) {
  const gross = roundEth(Number(grossAmount) || 0);
  if (gross <= 0) {
    return { gross: 0, net: 0, vat: 0, ratePercent };
  }
  const factor = 1 + ratePercent / 100;
  const net = roundEth(gross / factor);
  const vat = roundEth(gross - net);
  return { gross, net, vat, ratePercent };
}

export function roundEth(n, digits = 8) {
  const x = Number(n) || 0;
  const p = 10 ** digits;
  return Math.round((x + Number.EPSILON) * p) / p;
}

/**
 * Tính thuế cho một dòng hàng (đơn giá gross đã gồm thuế × số lượng).
 */
export function calcLineTax({ unitPriceGross, qty, ratePercent = VAT_RATE_PERCENT }) {
  const q = Math.max(0, Number(qty) || 0);
  const unit = Number(unitPriceGross) || 0;
  const lineGross = roundEth(unit * q);
  const { net, vat } = splitGrossInclusive(lineGross, ratePercent);
  const unitNet = q > 0 ? roundEth(net / q) : 0;
  return {
    qty: q,
    unitPriceGross: roundEth(unit),
    unitPriceNet: unitNet,
    amountNet: net,
    vatAmount: vat,
    amountGross: lineGross,
    ratePercent,
  };
}

/**
 * Tổng hợp thuế cho cả đơn hàng.
 * @param {Array<{ priceEth: number, qty: number }>} items
 */
export function calcOrderTax(items, ratePercent = VAT_RATE_PERCENT) {
  const lines = (items || []).map((item) =>
    calcLineTax({
      unitPriceGross: item.priceEth,
      qty: item.qty,
      ratePercent,
    })
  );
  const amountNet = roundEth(lines.reduce((s, l) => s + l.amountNet, 0));
  const vatAmount = roundEth(lines.reduce((s, l) => s + l.vatAmount, 0));
  const amountGross = roundEth(lines.reduce((s, l) => s + l.amountGross, 0));

  // Khớp lại tổng: đảm bảo net + vat == gross (điều chỉnh dòng thuế nếu lệch 1 ulp)
  const adjustedVat = roundEth(amountGross - amountNet);

  return {
    lines,
    amountNet,
    vatAmount: adjustedVat,
    amountGross,
    ratePercent,
    taxCode: TAX_CODE,
  };
}

export function formatVatRate(ratePercent = VAT_RATE_PERCENT) {
  return `${ratePercent}%`;
}
