import { useMemo, useRef, useState } from "react";
import { Link } from "react-router-dom";
import {
  ShoppingCart,
  Trash2,
  Minus,
  Plus,
  FileText,
  Download,
  Printer,
  Wallet,
  AlertCircle,
  CheckCircle2,
  Loader2,
  Ticket,
} from "lucide-react";
import { useCart } from "../../context/CartContext.jsx";
import { useWallet } from "../../hooks/useWallet.js";
import { useAuth } from "../../context/AuthContext.jsx";
import { buyPrimaryTicket } from "../../services/contract.js";
import {
  buildInvoice,
  downloadInvoiceHtml,
  makeInvoiceNo,
  openInvoicePrint,
} from "../../utils/invoice.js";
import { calcOrderTax, formatVatRate, roundEth, TAX_CODE } from "../../utils/taxVn.js";
import {
  downloadInvoicePdfById,
  openInvoicePdfById,
  saveAndOpenInvoicePdf,
} from "../../utils/invoicePdf.js";
import { explainContractError } from "../../utils/contractErrors.js";
import { confirmEventSeats } from "../../services/api.js";
import TicketPassModal, { PurchaseSuccessPanel } from "../components/TicketPassModal.jsx";

function moneyEth(n) {
  const v = roundEth(Number(n) || 0);
  if (v === 0) return "0 ETH";
  return `${v.toFixed(6).replace(/\.?0+$/, "")} ETH`;
}

export default function Cart() {
  const { items, count, setQty, removeItem, clearCart } = useCart();
  const { account, connect, ensureNetwork, networkName, targetChainId } = useWallet();
  const { user } = useAuth();
  const [msg, setMsg] = useState(null);
  const [busy, setBusy] = useState(false);
  const [lastInvoice, setLastInvoice] = useState(null);
  const [checkoutResults, setCheckoutResults] = useState([]);
  const [purchaseSuccess, setPurchaseSuccess] = useState(null);
  const [passTokenId, setPassTokenId] = useState(null);
  const runningRef = useRef(false);

  const taxSummary = useMemo(() => calcOrderTax(items), [items]);

  function buyerPayload() {
    return {
      email: user?.email || "",
      wallet: account || "",
      name: user?.displayName || user?.email?.split("@")[0] || "Khách hàng",
      taxCode: user?.taxCode || "",
      address: user?.address || "",
    };
  }

  async function persistAndOpenPdf(invoice, checkoutResultsList = []) {
    try {
      const { saved, opened } = await saveAndOpenInvoicePdf(invoice, checkoutResultsList);
      const merged = { ...invoice, id: saved.id, pdfUrl: saved.pdfUrl, hasPdf: true };
      setLastInvoice(merged);
      if (opened?.popupBlocked) {
        setMsg(
          `Đã lưu hóa đơn PDF ${saved.invoiceNo}. Trình duyệt chặn popup — bấm «Xem PDF» để mở.`
        );
      }
      return merged;
    } catch (err) {
      openInvoicePrint(invoice);
      setLastInvoice(invoice);
      throw err;
    }
  }

  function exportDraftInvoice(mode = "print") {
    if (!items.length) {
      setMsg("Giỏ hàng trống — không có gì để xuất hóa đơn");
      return;
    }
    const invoice = buildInvoice({
      invoiceNo: makeInvoiceNo(),
      issuedAt: new Date().toISOString(),
      buyer: {
        ...buyerPayload(),
        wallet: account || "(chưa nối ví)",
      },
      items,
      checkoutResults,
      networkName,
      chainId: targetChainId,
      status: checkoutResults.length ? "paid" : "draft",
    });
    setLastInvoice(invoice);
    if (mode === "download") downloadInvoiceHtml(invoice);
    else openInvoicePrint(invoice);
    setMsg(`Đã xuất hóa đơn nháp HTML ${invoice.invoiceNo} (GTGT ${formatVatRate()})`);
  }

  async function checkoutAndInvoice() {
    if (runningRef.current) return;
    if (!items.length) {
      setMsg("Giỏ hàng trống");
      return;
    }
    setMsg(null);
    setBusy(true);
    runningRef.current = true;
    const results = [];
    const snapshotItems = items.map((x) => ({ ...x }));

    try {
      if (!account) await connect();
      await ensureNetwork();

      // Mint theo từng dòng; ghế = qty 1 + confirm ghế sau mint
      const seatConfirmByEvent = new Map();

      for (const item of snapshotItems) {
        for (let i = 0; i < item.qty; i++) {
          const { hash, tokenId } = await buyPrimaryTicket(item.eventChainId, item.priceEth);
          results.push({
            eventId: item.eventId,
            eventChainId: item.eventChainId,
            tierName: item.tierName,
            seatId: item.seatId || "",
            seatLabel: item.seatLabel || "",
            hash,
            tokenId: tokenId ?? null,
            index: i + 1,
          });
          if (item.seatId && tokenId != null) {
            const eid = String(item.eventId);
            if (!seatConfirmByEvent.has(eid)) seatConfirmByEvent.set(eid, []);
            seatConfirmByEvent.get(eid).push({ seatId: item.seatId, tokenId });
          }
        }
      }

      for (const [eventId, assignments] of seatConfirmByEvent) {
        if (!assignments.length) continue;
        try {
          await confirmEventSeats(eventId, { wallet: account, assignments });
        } catch (seatErr) {
          console.warn("confirm seats failed", eventId, seatErr);
        }
      }

      const invoiceItems = snapshotItems.map((item) => {
        if (!item.seatId) return { ...item };
        const hit = results.find(
          (r) =>
            String(r.eventId) === String(item.eventId) &&
            Number(r.eventChainId) === Number(item.eventChainId) &&
            String(r.seatId) === String(item.seatId)
        );
        return {
          ...item,
          qty: 1,
          tokenIds: hit?.tokenId != null ? [hit.tokenId] : [],
        };
      });

      const invoice = buildInvoice({
        invoiceNo: makeInvoiceNo(),
        issuedAt: new Date().toISOString(),
        buyer: buyerPayload(),
        items: invoiceItems,
        checkoutResults: results,
        networkName,
        chainId: targetChainId,
        status: "paid",
      });

      setCheckoutResults(results);
      clearCart();

      try {
        const saved = await persistAndOpenPdf(invoice, results);
        setMsg(
          `Thanh toán xong ${results.length} vé. Hóa đơn ${saved.invoiceNo} + vé vào cửa QR sẵn sàng.`
        );
        setPurchaseSuccess({
          title: "Thanh toán thành công",
          invoiceNo: saved.invoiceNo,
          invoiceId: saved.id,
          passes: results
            .filter((r) => r.tokenId != null)
            .map((r) => ({ tokenId: r.tokenId, seatLabel: r.seatLabel || "" })),
        });
      } catch (pdfErr) {
        setMsg(
          `Thanh toán xong ${results.length} vé. Hóa đơn ${invoice.invoiceNo} (HTML). Lưu PDF lỗi: ${pdfErr.response?.data?.error || pdfErr.message}`
        );
        setPurchaseSuccess({
          title: "Thanh toán thành công",
          invoiceNo: invoice.invoiceNo,
          invoiceId: null,
          passes: results
            .filter((r) => r.tokenId != null)
            .map((r) => ({ tokenId: r.tokenId, seatLabel: r.seatLabel || "" })),
        });
      }
    } catch (err) {
      setCheckoutResults(results);
      if (results.length) {
        const partialItems = buildPartialItems(snapshotItems, results.length);
        const invoice = buildInvoice({
          invoiceNo: makeInvoiceNo(),
          issuedAt: new Date().toISOString(),
          buyer: buyerPayload(),
          items: partialItems,
          checkoutResults: results,
          networkName,
          chainId: targetChainId,
          status: "paid",
        });
        try {
          await persistAndOpenPdf(invoice, results);
        } catch {
          try {
            openInvoicePrint(invoice);
          } catch {
            /* ignore */
          }
        }
      }
      setMsg(
        (results.length ? `Đã mint ${results.length} vé rồi gặp lỗi: ` : "") +
          explainContractError(err)
      );
    } finally {
      runningRef.current = false;
      setBusy(false);
    }
  }

  const msgOk =
    msg &&
    (msg.includes("hóa đơn") ||
      msg.includes("Hóa đơn") ||
      msg.includes("Thanh toán xong") ||
      msg.includes("Đã xuất"));

  return (
    <>
      <div className="user-hero">
        <div>
          <h1>Giỏ hàng</h1>
          <p>
            Thanh toán mint NFT và xuất hóa đơn GTGT đầy đủ. Giá vé đã gồm thuế GTGT{" "}
            {formatVatRate()} theo quy định Việt Nam.
          </p>
        </div>
      </div>

      {msg && (
        <div className={`user-alert ${msgOk ? "ok" : "err"}`} style={{ margin: "0 1.25rem 1rem" }}>
          {msgOk ? <CheckCircle2 size={16} /> : <AlertCircle size={16} />}
          {msg}
        </div>
      )}

      <section className="user-section">
        {!items.length && !lastInvoice ? (
          <div className="user-empty">
            <ShoppingCart size={40} />
            <p>Giỏ hàng trống.</p>
            <Link className="user-btn" to="/" style={{ marginTop: 12 }}>
              <Ticket size={16} /> Xem sự kiện
            </Link>
          </div>
        ) : null}

        {items.length > 0 && (
          <div className="cart-layout">
            <div className="cart-list">
              {items.map((item, idx) => {
                const line = taxSummary.lines[idx];
                const rowKey = item.seatId
                  ? `${item.eventId}-${item.eventChainId}-${item.seatId}`
                  : `${item.eventId}-${item.eventChainId}`;
                const isSeat = Boolean(item.seatId);
                return (
                  <article key={rowKey} className="cart-row">
                    <div className="cart-row-main">
                      <div className="user-chip">
                        <Ticket size={12} /> {item.tierName}
                        {isSeat ? ` · ghế ${item.seatLabel || item.seatId}` : ""}
                      </div>
                      <h3>{item.eventTitle}</h3>
                      <p className="user-meta" style={{ margin: 0 }}>
                        {item.eventLocation}
                        {item.eventStartTime
                          ? ` · ${new Date(item.eventStartTime).toLocaleString("vi-VN")}`
                          : ""}
                      </p>
                      {isSeat ? (
                        <p className="user-meta" style={{ margin: 0 }}>
                          Khu {item.zoneLabel || item.zoneCode || "—"} · ghế{" "}
                          <strong>{item.seatLabel || item.seatId}</strong>
                          {item.heldUntil
                            ? ` · giữ đến ${new Date(item.heldUntil).toLocaleTimeString("vi-VN")}`
                            : ""}
                        </p>
                      ) : null}
                      <p className="user-meta" style={{ margin: 0 }}>
                        eventChainId = {item.eventChainId} · Đơn giá (đã gồm GTGT){" "}
                        {moneyEth(item.priceEth)}
                      </p>
                      {line ? (
                        <p className="user-meta" style={{ margin: 0 }}>
                          Chưa thuế {moneyEth(line.amountNet)} · GTGT {formatVatRate()}{" "}
                          {moneyEth(line.vatAmount)} · Cộng {moneyEth(line.amountGross)}
                        </p>
                      ) : null}
                    </div>
                    <div className="cart-row-actions">
                      {isSeat ? (
                        <div className="cart-qty">
                          <span>1 ghế</span>
                        </div>
                      ) : (
                        <div className="cart-qty">
                          <button
                            type="button"
                            className="user-btn secondary"
                            aria-label="Giảm"
                            disabled={busy}
                            onClick={() =>
                              setQty(item.eventId, item.eventChainId, item.qty - 1)
                            }
                          >
                            <Minus size={14} />
                          </button>
                          <span>{item.qty}</span>
                          <button
                            type="button"
                            className="user-btn secondary"
                            aria-label="Tăng"
                            disabled={busy || item.qty >= (item.maxQty || 2)}
                            onClick={() =>
                              setQty(item.eventId, item.eventChainId, item.qty + 1)
                            }
                          >
                            <Plus size={14} />
                          </button>
                        </div>
                      )}
                      <strong>{moneyEth(item.priceEth * item.qty)}</strong>
                      <button
                        type="button"
                        className="user-btn danger"
                        disabled={busy}
                        onClick={() =>
                          removeItem(item.eventId, item.eventChainId, item.seatId)
                        }
                      >
                        <Trash2 size={15} /> Xóa
                      </button>
                    </div>
                  </article>
                );
              })}
            </div>

            <aside className="cart-summary">
              <h2>Tóm tắt đơn (có thuế GTGT)</h2>
              <p>
                <span>Số vé</span>
                <strong>{count}</strong>
              </p>
              <p>
                <span>Tiền hàng chưa thuế</span>
                <strong>{moneyEth(taxSummary.amountNet)}</strong>
              </p>
              <p>
                <span>Thuế GTGT ({formatVatRate()})</span>
                <strong>{moneyEth(taxSummary.vatAmount)}</strong>
              </p>
              <p>
                <span>TTĐB</span>
                <strong>Không chịu</strong>
              </p>
              <p>
                <span>Tổng thanh toán (đã gồm GTGT)</span>
                <strong className="cart-total">{moneyEth(taxSummary.amountGross)}</strong>
              </p>
              <p className="user-meta" style={{ margin: "0.5rem 0 0" }}>
                {TAX_CODE.priceModeLabel}. Số ETH gửi on-chain = tổng đã gồm thuế; tiền về ví ban tổ chức.
              </p>

              <div className="cart-summary-actions">
                <button
                  type="button"
                  className="user-btn"
                  disabled={busy || !items.length}
                  onClick={checkoutAndInvoice}
                >
                  {busy ? <Loader2 size={16} className="spin" /> : <Wallet size={16} />}
                  {busy ? "Đang thanh toán…" : "Thanh toán & xuất hóa đơn GTGT"}
                </button>
                <button
                  type="button"
                  className="user-btn secondary"
                  disabled={busy || !items.length}
                  onClick={() => exportDraftInvoice("print")}
                >
                  <Printer size={16} /> Xem / in hóa đơn nháp
                </button>
                <button
                  type="button"
                  className="user-btn secondary"
                  disabled={busy || !items.length}
                  onClick={() => exportDraftInvoice("download")}
                >
                  <Download size={16} /> Tải hóa đơn HTML
                </button>
                <button
                  type="button"
                  className="user-btn danger"
                  disabled={busy || !items.length}
                  onClick={() => {
                    clearCart();
                    setMsg("Đã xóa giỏ hàng");
                  }}
                >
                  <Trash2 size={16} /> Xóa giỏ
                </button>
              </div>
            </aside>
          </div>
        )}

        {lastInvoice && (
          <div className="cart-invoice-bar">
            <FileText size={18} />
            <div>
              <strong>
                Hóa đơn gần nhất: {lastInvoice.invoiceNo}
                {lastInvoice.status === "paid" ? " (đã thanh toán)" : " (nháp)"}
                {lastInvoice.hasPdf || lastInvoice.id ? " · có PDF" : ""}
              </strong>
              <p className="user-meta" style={{ margin: 0 }}>
                {fmtBuyer(lastInvoice)} · Chưa thuế {moneyEth(lastInvoice.subtotalNet)} · GTGT{" "}
                {moneyEth(lastInvoice.vatAmount)} · Tổng {moneyEth(lastInvoice.total)}
              </p>
            </div>
            {(lastInvoice.id || lastInvoice.hasPdf) && (
              <>
                <button
                  type="button"
                  className="user-btn"
                  onClick={() => openInvoicePdfById(lastInvoice.id)}
                >
                  <Printer size={15} /> Xem / in PDF
                </button>
                <button
                  type="button"
                  className="user-btn secondary"
                  onClick={() =>
                    downloadInvoicePdfById(lastInvoice.id, `${lastInvoice.invoiceNo}.pdf`)
                  }
                >
                  <Download size={15} /> Tải PDF
                </button>
              </>
            )}
            <Link className="user-btn secondary" to="/my-invoices">
              Tất cả hóa đơn
            </Link>
            <button
              type="button"
              className="user-btn secondary"
              onClick={() => openInvoicePrint(lastInvoice)}
            >
              <FileText size={15} /> Bản HTML
            </button>
          </div>
        )}
      </section>

      <PurchaseSuccessPanel
        open={Boolean(purchaseSuccess)}
        onClose={() => setPurchaseSuccess(null)}
        title={purchaseSuccess?.title}
        invoiceNo={purchaseSuccess?.invoiceNo}
        passes={purchaseSuccess?.passes || []}
        onOpenInvoice={async () => {
          if (purchaseSuccess?.invoiceId) {
            try {
              await openInvoicePdfById(purchaseSuccess.invoiceId);
            } catch {
              /* ignore */
            }
          }
        }}
        onOpenPass={(tid) => setPassTokenId(tid)}
      />

      <TicketPassModal
        open={passTokenId != null}
        tokenId={passTokenId}
        onClose={() => setPassTokenId(null)}
      />
    </>
  );
}

function fmtBuyer(inv) {
  const email = inv.buyer?.email || "—";
  const wallet = inv.buyer?.wallet ? `${inv.buyer.wallet.slice(0, 8)}…` : "—";
  return `${email} · ${wallet}`;
}

/** Dựng lại danh sách item tương ứng số vé đã mint khi checkout lỗi giữa chừng */
function buildPartialItems(snapshotItems, mintedCount) {
  let left = mintedCount;
  const out = [];
  for (const item of snapshotItems) {
    if (left <= 0) break;
    const take = Math.min(item.qty, left);
    out.push({ ...item, qty: take });
    left -= take;
  }
  return out;
}
