import { useEffect, useRef, useState } from "react";
import { Link, useParams } from "react-router-dom";
import {
  MapPin,
  CalendarDays,
  Ticket,
  ShoppingCart,
  ShoppingBag,
  AlertCircle,
  CheckCircle2,
  Loader2,
  ArrowLeft,
  ShieldCheck,
  Clock3,
  Info,
  Stamp,
  Ban,
  FileText,
} from "lucide-react";
import { getEvent, getRemaining } from "../../services/api.js";
import { buyPrimaryTicket } from "../../services/contract.js";
import { useWallet } from "../../hooks/useWallet.js";
import { useCart } from "../../context/CartContext.jsx";
import { useAuth } from "../../context/AuthContext.jsx";
import { buildInvoice, makeInvoiceNo, openInvoicePrint } from "../../utils/invoice.js";
import { calcLineTax, formatVatRate, roundEth } from "../../utils/taxVn.js";
import { saveAndOpenInvoicePdf } from "../../utils/invoicePdf.js";
import { openPublicLicensePdf, openPublicLicenseDocument } from "../../utils/licensePdf.js";
import { explainContractError } from "../../utils/contractErrors.js";

function moneyEth(n) {
  const v = roundEth(Number(n) || 0);
  if (v === 0) return "0";
  return v.toFixed(6).replace(/\.?0+$/, "");
}

function tierMeta(map, eventChainId) {
  const v = map[eventChainId];
  if (v == null) return { remaining: "…", active: null };
  if (typeof v === "number" || typeof v === "string") {
    return { remaining: v, active: null };
  }
  return {
    remaining: v.remaining ?? "…",
    active: v.active,
  };
}

function licenseMeta(license) {
  const s = license?.effectiveStatus || license?.status || "none";
  const map = {
    approved: { label: "Đã có giấy phép hoạt động", tone: "ok", Icon: ShieldCheck },
    pending: { label: "Giấy phép đang chờ duyệt", tone: "warn", Icon: Clock3 },
    draft: { label: "Hồ sơ giấy phép nháp", tone: "muted", Icon: Stamp },
    rejected: { label: "Giấy phép bị từ chối", tone: "err", Icon: Ban },
    suspended: { label: "Giấy phép tạm đình chỉ", tone: "err", Icon: Ban },
    expired: { label: "Giấy phép đã hết hạn", tone: "err", Icon: Ban },
    none: { label: "Chưa khai báo giấy phép", tone: "muted", Icon: Stamp },
  };
  return map[s] || map.none;
}

function stockPct(remaining, total) {
  const left = Number(remaining);
  const max = Number(total);
  if (!Number.isFinite(left) || !Number.isFinite(max) || max <= 0) return null;
  return Math.max(0, Math.min(100, Math.round((left / max) * 100)));
}

export default function EventDetail() {
  const { id } = useParams();
  const { account, connect, ensureNetwork, networkName, targetChainId } = useWallet();
  const { addItem } = useCart();
  const { user } = useAuth();
  const [event, setEvent] = useState(null);
  const [remaining, setRemaining] = useState({});
  const [msg, setMsg] = useState(null);
  const [busyChainId, setBusyChainId] = useState(null);
  const [loading, setLoading] = useState(true);
  const [pdfBusy, setPdfBusy] = useState(false);
  const mintingRef = useRef(false);
  const tiersRef = useRef(null);

  useEffect(() => {
    setLoading(true);
    getEvent(id)
      .then(async (ev) => {
        setEvent(ev);
        const map = {};
        for (const t of ev.ticketTypes || []) {
          try {
            map[t.eventChainId] = await getRemaining(t.eventChainId);
          } catch {
            map[t.eventChainId] = { remaining: "?", active: false };
          }
        }
        setRemaining(map);
      })
      .catch((e) => setMsg(e.response?.data?.error || e.message))
      .finally(() => setLoading(false));
  }, [id]);

  async function onViewLicensePdf() {
    if (!event?._id) return;
    setPdfBusy(true);
    setMsg(null);
    try {
      const opened = await openPublicLicensePdf(event._id);
      if (opened.popupBlocked) {
        setMsg("Trình duyệt chặn popup — cho phép mở cửa sổ mới để xem PDF giấy phép.");
      }
    } catch (err) {
      setMsg(err.response?.data?.error || err.message || "Không mở được PDF giấy phép");
    } finally {
      setPdfBusy(false);
    }
  }

  async function onViewLicenseDocument() {
    if (!event?._id) return;
    setPdfBusy(true);
    setMsg(null);
    try {
      const opened = await openPublicLicenseDocument(event._id);
      if (opened.popupBlocked) {
        setMsg("Trình duyệt chặn popup — cho phép mở cửa sổ mới để xem hồ sơ đính kèm.");
      }
    } catch (err) {
      setMsg(err.message || "Không mở được hồ sơ giấy phép");
    } finally {
      setPdfBusy(false);
    }
  }

  function onAddToCart(t, e) {
    e?.preventDefault?.();
    e?.stopPropagation?.();
    const chainId = Number(t.eventChainId);
    try {
      const meta = tierMeta(remaining, chainId);
      if (meta.active === false) {
        throw new Error(`Loại vé «${t.name}» chưa mở bán on-chain.`);
      }
      addItem({
        eventId: event._id,
        eventTitle: event.title,
        eventLocation: event.location,
        eventStartTime: event.startTime,
        eventChainId: chainId,
        tierName: t.name,
        priceEth: t.price,
        maxQty: 2,
      });
      setMsg(`Đã thêm «${t.name}» vào giỏ hàng.`);
    } catch (err) {
      setMsg(err.message || String(err));
    }
  }

  async function onBuy(t, e) {
    e?.preventDefault?.();
    e?.stopPropagation?.();

    const chainId = Number(t.eventChainId);
    if (!Number.isFinite(chainId)) {
      setMsg("eventChainId không hợp lệ");
      return;
    }
    if (mintingRef.current) return;

    setMsg(null);
    mintingRef.current = true;
    setBusyChainId(chainId);

    try {
      const meta = tierMeta(remaining, chainId);
      if (meta.active === false) {
        throw new Error(
          `Loại vé «${t.name}» chưa active on-chain. Liên hệ ban tổ chức để đồng bộ sự kiện.`
        );
      }
      if (!account) await connect();
      await ensureNetwork();

      const { hash, tokenId } = await buyPrimaryTicket(chainId, t.price);

      const invoice = buildInvoice({
        invoiceNo: makeInvoiceNo(),
        issuedAt: new Date().toISOString(),
        buyer: {
          email: user?.email || "",
          wallet: account || "",
          name: user?.displayName || user?.email?.split("@")[0] || "Khách hàng",
        },
        items: [
          {
            eventId: String(event._id),
            eventTitle: event.title,
            eventLocation: event.location,
            eventStartTime: event.startTime,
            eventChainId: chainId,
            tierName: t.name,
            priceEth: Number(t.price),
            qty: 1,
            tokenIds: tokenId != null ? [tokenId] : [],
          },
        ],
        checkoutResults: [
          {
            eventId: String(event._id),
            eventChainId: chainId,
            tierName: t.name,
            hash,
            tokenId: tokenId ?? null,
            index: 1,
          },
        ],
        networkName,
        chainId: targetChainId,
        status: "paid",
      });

      try {
        const { saved } = await saveAndOpenInvoicePdf(invoice, [
          {
            eventId: String(event._id),
            eventChainId: chainId,
            tierName: t.name,
            hash,
            tokenId: tokenId ?? null,
            index: 1,
          },
        ]);
        setMsg(
          `Mint thành công «${t.name}»${tokenId != null ? ` #${tokenId}` : ""}. Hóa đơn PDF ${saved.invoiceNo} (GTGT ${moneyEth(invoice.vatAmount)} ETH). Tx: ${hash}`
        );
      } catch (pdfErr) {
        try {
          openInvoicePrint(invoice);
        } catch {
          /* ignore */
        }
        setMsg(
          `Mint thành công «${t.name}». Hóa đơn ${invoice.invoiceNo}. PDF: ${pdfErr.response?.data?.error || pdfErr.message}. Tx: ${hash}`
        );
      }

      try {
        const left = await getRemaining(chainId);
        setRemaining((r) => ({ ...r, [chainId]: left }));
      } catch {
        setRemaining((r) => {
          const prev = tierMeta(r, chainId);
          const n = typeof prev.remaining === "number" ? prev.remaining - 1 : prev.remaining;
          return { ...r, [chainId]: { remaining: n, active: true } };
        });
      }
    } catch (err) {
      setMsg(explainContractError(err));
    } finally {
      mintingRef.current = false;
      setBusyChainId(null);
    }
  }

  if (loading) {
    return (
      <div className="user-empty">
        <Loader2 size={32} className="spin" />
        <p>Đang tải chi tiết sự kiện…</p>
      </div>
    );
  }

  if (!event) {
    return (
      <div className="ed-wrap">
        <Link to="/" className="ed-back">
          <ArrowLeft size={16} /> Về danh sách sự kiện
        </Link>
        <div className="user-alert err">
          <AlertCircle size={16} /> {msg || "Không tìm thấy sự kiện"}
        </div>
      </div>
    );
  }

  const msgOk =
    msg &&
    (msg.startsWith("Mint") || msg.includes("giỏ hàng") || msg.includes("hóa đơn") || msg.includes("Tx"));

  const start = new Date(event.startTime);
  const minPrice = Math.min(...(event.ticketTypes || []).map((t) => Number(t.price) || Infinity));
  const openCount = (event.ticketTypes || []).filter((t) => {
    const m = tierMeta(remaining, Number(t.eventChainId));
    return m.active !== false;
  }).length;
  const lic = event.license || {};
  const licUi = licenseMeta(lic);
  const LicIcon = licUi.Icon;

  return (
    <div className="ed-wrap">
      <nav className="ed-breadcrumb" aria-label="Breadcrumb">
        <Link to="/">Sự kiện</Link>
        <span>/</span>
        <strong>{event.title}</strong>
      </nav>

      <section className="ed-hero">
        <div className="ed-hero-glow" aria-hidden />
        <div className="ed-hero-copy">
          <Link to="/" className="ed-back">
            <ArrowLeft size={16} /> Tất cả sự kiện
          </Link>
          <p className="user-eyebrow">
            <Ticket size={14} /> Chi tiết sự kiện
          </p>
          <h1>{event.title}</h1>
          <div className="ed-hero-facts">
            <span>
              <MapPin size={15} /> {event.location}
            </span>
            <span>
              <CalendarDays size={15} /> {start.toLocaleString("vi-VN")}
            </span>
            <span>
              <Clock3 size={15} /> {event.ticketTypes?.length || 0} hạng vé
            </span>
          </div>
          <div className={`ed-license-pill ${licUi.tone}`}>
            <LicIcon size={15} />
            <span>{licUi.label}</span>
            {lic.licenseNo ? <code>{lic.licenseNo}</code> : null}
          </div>
          <div className="ed-hero-cta">
            <button
              type="button"
              className="user-btn"
              onClick={() => tiersRef.current?.scrollIntoView({ behavior: "smooth", block: "start" })}
            >
              Chọn hạng vé <ShoppingBag size={16} />
            </button>
            {Number.isFinite(minPrice) && (
              <span className="user-price-tag">từ {moneyEth(minPrice)} ETH</span>
            )}
          </div>
        </div>
      </section>

      {msg && (
        <div className={`user-alert ${msgOk ? "ok" : "err"}`}>
          {msgOk ? <CheckCircle2 size={16} /> : <AlertCircle size={16} />}
          <span>
            {msg}
            {msg.includes("giỏ hàng") && (
              <>
                {" "}
                <Link to="/cart">Xem giỏ</Link>
              </>
            )}
            {(msg.includes("Mint thành công") || msg.includes("hóa đơn")) && (
              <>
                {" "}
                <Link to="/my-tickets">Vé của tôi</Link>
                {" · "}
                <Link to="/my-invoices">Hóa đơn</Link>
              </>
            )}
          </span>
        </div>
      )}

      <div className="ed-layout">
        <div className="ed-main">
          <section className="ed-panel">
            <h2>
              <Info size={18} /> Về sự kiện
            </h2>
            <p className="ed-desc">{event.description}</p>
          </section>

          <section className="ed-panel">
            <h2>
              <Stamp size={18} /> Giấy phép hoạt động
            </h2>
            {["approved", "expired", "suspended"].includes(lic.effectiveStatus) ? (
              <>
                <ul className="ed-bullets">
                  <li>
                    Số GP: <strong>{lic.licenseNo || "—"}</strong>
                  </li>
                  <li>Cơ quan cấp: {lic.issuingAuthority || "—"}</li>
                  <li>
                    Hiệu lực:{" "}
                    {lic.issuedAt ? new Date(lic.issuedAt).toLocaleDateString("vi-VN") : "—"}
                    {" → "}
                    {lic.expiresAt ? new Date(lic.expiresAt).toLocaleDateString("vi-VN") : "—"}
                  </li>
                  {lic.documentUrl && !lic.hasDocument ? (
                    <li>
                      Tài liệu:{" "}
                      <a href={lic.documentUrl} target="_blank" rel="noreferrer">
                        Xem đính kèm
                      </a>
                    </li>
                  ) : null}
                </ul>
                <div className="ed-license-actions">
                  {lic.hasDocument || lic.documentFileUrl ? (
                    <button
                      type="button"
                      className="user-btn ghost"
                      disabled={pdfBusy}
                      onClick={onViewLicenseDocument}
                    >
                      {pdfBusy ? <Loader2 size={16} className="spin" /> : <Stamp size={16} />}
                      Xem hồ sơ gốc
                    </button>
                  ) : null}
                  <button
                    type="button"
                    className="user-btn ghost"
                    disabled={pdfBusy}
                    onClick={onViewLicensePdf}
                  >
                    {pdfBusy ? <Loader2 size={16} className="spin" /> : <FileText size={16} />}
                    {pdfBusy ? "Đang mở…" : "PDF hệ thống"}
                  </button>
                </div>
              </>
            ) : (
              <p className="ed-desc">
                {licUi.label}. Ban tổ chức cập nhật hồ sơ tại Admin → Giấy phép SK.
              </p>
            )}
          </section>

          <section className="ed-panel">
            <h2>
              <ShieldCheck size={18} /> Thông tin mua vé
            </h2>
            <ul className="ed-bullets">
              <li>Giá niêm yết đã gồm thuế GTGT {formatVatRate()} (vé sự kiện / vui chơi giải trí).</li>
              <li>Sau khi mint thành công, hệ thống xuất hóa đơn GTGT PDF.</li>
              <li>Mỗi ví tối đa 2 vé / hạng · resale ≤ 110% giá gốc · royalty 5% về ban tổ chức.</li>
              <li>
                {openCount}/{event.ticketTypes?.length || 0} hạng đang mở bán on-chain.
              </li>
            </ul>
          </section>
        </div>

        <aside className="ed-aside" ref={tiersRef} id="tiers">
          <div className="ed-aside-head">
            <h2>
              <Ticket size={18} /> Chọn hạng vé
            </h2>
            <p>Thêm vào giỏ hoặc mua ngay bằng MetaMask.</p>
          </div>

          <div className="ed-tier-list">
            {(event.ticketTypes || []).map((t) => {
              const chainId = Number(t.eventChainId);
              const meta = tierMeta(remaining, chainId);
              const inactive = meta.active === false;
              const isBusy = busyChainId === chainId;
              const otherBusy = busyChainId != null && busyChainId !== chainId;
              const tax = calcLineTax({ unitPriceGross: t.price, qty: 1 });
              const pct = stockPct(meta.remaining, t.totalSupply);
              const soldOut =
                typeof meta.remaining === "number" && meta.remaining <= 0;

              return (
                <article
                  key={`tier-${chainId}-${t.name}`}
                  className={`ed-tier${isBusy ? " is-buying" : ""}${inactive || soldOut ? " is-disabled" : ""}`}
                >
                  <div className="ed-tier-top">
                    <div>
                      <h3>{t.name}</h3>
                      <p className="ed-tier-status">
                        {soldOut
                          ? "Hết vé"
                          : inactive
                            ? "Chưa mở bán"
                            : meta.active
                              ? "Đang mở bán"
                              : "Đang kiểm tra…"}
                      </p>
                    </div>
                    <div className="ed-tier-price">
                      <strong>{moneyEth(t.price)}</strong>
                      <span>ETH</span>
                    </div>
                  </div>

                  <div className="ed-tier-tax">
                    Chưa thuế {moneyEth(tax.amountNet)} · GTGT {moneyEth(tax.vatAmount)} ETH
                  </div>

                  <div className="ed-stock">
                    <div className="ed-stock-row">
                      <span>
                        Còn <strong>{meta.remaining}</strong> / {t.totalSupply}
                      </span>
                      {pct != null && <span>{pct}%</span>}
                    </div>
                    {pct != null && (
                      <div className="ed-stock-bar" aria-hidden>
                        <i style={{ width: `${pct}%` }} />
                      </div>
                    )}
                  </div>

                  <div className="user-btn-row">
                    <button
                      type="button"
                      className="user-btn secondary"
                      disabled={inactive || soldOut || isBusy || otherBusy}
                      onClick={(ev) => onAddToCart(t, ev)}
                    >
                      <ShoppingCart size={16} />
                      Thêm giỏ
                    </button>
                    <button
                      type="button"
                      className="user-btn"
                      disabled={inactive || soldOut || isBusy || otherBusy}
                      onClick={(ev) => onBuy(t, ev)}
                    >
                      <ShoppingBag size={16} />
                      {isBusy
                        ? "Đang mint…"
                        : soldOut
                          ? "Hết vé"
                          : inactive
                            ? "Chưa mở"
                            : otherBusy
                              ? "Đợi…"
                              : "Mua ngay"}
                    </button>
                  </div>
                </article>
              );
            })}
          </div>
        </aside>
      </div>
    </div>
  );
}
