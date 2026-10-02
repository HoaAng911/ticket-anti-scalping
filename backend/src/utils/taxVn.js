/** VAT 10% — giá niêm yết đã gồm thuế (gross-inclusive), lab / đồ án */

export const VAT_RATE_PERCENT = 10;

export const SELLER_PROFILE = {
  name: "Ban Tổ Chức TicketChain Lab",
  taxCode: "0312345678-LAB",
  address: "Lab blockchain Clique · chainId 12345",
  phone: "1900-0000 (lab)",
  email: "organizer@ticket.local",
  bankAccount: "Ví organizerTreasury trên sổ cái Ethereum lab",
};

export function roundEth(n, digits = 8) {
  const x = Number(n) || 0;
  const p = 10 ** digits;
  return Math.round((x + Number.EPSILON) * p) / p;
}

export function splitGrossInclusive(grossAmount, ratePercent = VAT_RATE_PERCENT) {
  const gross = roundEth(Number(grossAmount) || 0);
  if (gross <= 0) return { gross: 0, net: 0, vat: 0, ratePercent };
  const factor = 1 + ratePercent / 100;
  const net = roundEth(gross / factor);
  const vat = roundEth(gross - net);
  return { gross, net, vat, ratePercent };
}

export function calcLineTax({ unitPriceGross, qty = 1, ratePercent = VAT_RATE_PERCENT }) {
  const q = Math.max(1, Number(qty) || 1);
  const unit = Number(unitPriceGross) || 0;
  const lineGross = roundEth(unit * q);
  const { net, vat } = splitGrossInclusive(lineGross, ratePercent);
  const unitNet = roundEth(net / q);
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
