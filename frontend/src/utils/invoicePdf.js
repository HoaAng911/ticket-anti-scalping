import { createInvoice, fetchInvoicePdfBlob } from "../services/api.js";

/**
 * Lưu hóa đơn lên server (sinh PDF) rồi mở PDF để xem / in ngay.
 * Trả về bản ghi hóa đơn đã lưu (có id, pdfUrl).
 */
export async function saveAndOpenInvoicePdf(invoice, checkoutResults = []) {
  const results =
    checkoutResults.length > 0
      ? checkoutResults
      : Object.entries(invoice.txByKey || {}).flatMap(([key, hashes]) => {
          const [eventId, eventChainId] = key.split("::");
          const item = (invoice.items || []).find(
            (x) => String(x.eventId) === String(eventId) && Number(x.eventChainId) === Number(eventChainId)
          );
          const tokenIds = item?.tokenIds || [];
          return (hashes || []).map((hash, i) => ({
            eventId,
            eventChainId: Number(eventChainId),
            hash,
            tokenId: tokenIds[i] ?? tokenIds[0] ?? null,
          }));
        });

  const saved = await createInvoice({
    invoiceNo: invoice.invoiceNo,
    formSymbol: invoice.formSymbol,
    serial: invoice.serial,
    status: invoice.status || "paid",
    issuedAt: invoice.issuedAt,
    buyer: invoice.buyer,
    seller: invoice.seller,
    items: (invoice.items || []).map((it) => ({
      ...it,
      tokenIds: it.tokenIds || [],
      txHashes:
        it.txHashes ||
        invoice.txByKey?.[
          it.seatId
            ? `${it.eventId}::${it.eventChainId}::${it.seatId}`
            : `${it.eventId}::${it.eventChainId}`
        ] ||
        [],
      seatId: it.seatId || "",
      seatLabel: it.seatLabel || "",
      zoneCode: it.zoneCode || "",
      zoneLabel: it.zoneLabel || "",
    })),
    amountNet: invoice.subtotalNet ?? invoice.tax?.amountNet,
    vatAmount: invoice.vatAmount ?? invoice.tax?.vatAmount,
    vatRatePercent: invoice.vatRatePercent ?? invoice.tax?.ratePercent,
    amountGross: invoice.total ?? invoice.tax?.amountGross,
    currency: invoice.currency || "ETH",
    networkName: invoice.networkName,
    chainId: invoice.chainId,
    checkoutResults: results,
  });

  const opened = await openInvoicePdfById(saved.id);
  return { saved, opened };
}

export async function openInvoicePdfById(invoiceId) {
  const blob = await fetchInvoicePdfBlob(invoiceId);
  const url = URL.createObjectURL(blob);
  const w = window.open(url, "_blank", "noopener,noreferrer");
  if (!w) {
    return { url, popupBlocked: true };
  }
  w.addEventListener?.("load", () => {
    try {
      w.focus();
    } catch {
      /* ignore */
    }
  });
  setTimeout(() => URL.revokeObjectURL(url), 120_000);
  return { url, popupBlocked: false };
}

export async function downloadInvoicePdfById(invoiceId, fileName = "invoice.pdf") {
  const blob = await fetchInvoicePdfBlob(invoiceId);
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = fileName;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 30_000);
}
