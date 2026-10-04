import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
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
  Building2,
  X,
  Eye,
  ListMusic,
  Mic2,
} from "lucide-react";
import { getEvent, getRemaining, holdEventSeats, confirmEventSeats, getEventSeating } from "../../services/api.js";
import { buyPrimaryTicket } from "../../services/contract.js";
import { useWallet } from "../../hooks/useWallet.js";
import { useCart } from "../../context/CartContext.jsx";
import { useAuth } from "../../context/AuthContext.jsx";
import { calcLineTax, formatVatRate, roundEth } from "../../utils/taxVn.js";
import { buildInvoice, makeInvoiceNo, openInvoicePrint } from "../../utils/invoice.js";
import { saveAndOpenInvoicePdf, openInvoicePdfById } from "../../utils/invoicePdf.js";
import {
  openPublicLicensePdf,
  openPublicLicenseDocument,
  loadPublicLicenseViewerAssets,
  revokeLicenseViewerAssets,
} from "../../utils/licensePdf.js";
import { explainContractError } from "../../utils/contractErrors.js";
import SeatPickerModal from "../components/SeatPickerModal.jsx";
import TicketPassModal, { PurchaseSuccessPanel } from "../components/TicketPassModal.jsx";

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
  const [licenseOpen, setLicenseOpen] = useState(false);
  const [licenseTab, setLicenseTab] = useState("doc"); // doc | pdf | info
  const [licenseAssets, setLicenseAssets] = useState(null);
  const [licenseLoading, setLicenseLoading] = useState(false);
  const [licenseError, setLicenseError] = useState("");
  const [seatOpen, setSeatOpen] = useState(false);
  const [seatMode, setSeatMode] = useState("cart"); // cart | buy
  const [seatTier, setSeatTier] = useState(null);
  const [seatMap, setSeatMap] = useState(null);
  const [seatLoading, setSeatLoading] = useState(false);
  const [seatSelected, setSeatSelected] = useState([]);
  const [seatBusy, setSeatBusy] = useState(false);
  const [purchaseSuccess, setPurchaseSuccess] = useState(null);
  const [passTokenId, setPassTokenId] = useState(null);
  const mintingRef = useRef(false);
  const tiersRef = useRef(null);
  const licenseEventIdRef = useRef(null);

  useEffect(() => {
    setLoading(true);
    setLicenseOpen(false);
    revokeLicenseViewerAssets(licenseAssets);
    setLicenseAssets(null);
    setLicenseError("");
    setMsg(null);
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
    // eslint-disable-next-line react-hooks/exhaustive-deps -- reset assets when route id changes
  }, [id]);

  useEffect(() => {
    return () => {
      revokeLicenseViewerAssets(licenseAssets);
    };
  }, [licenseAssets]);

  useEffect(() => {
    if (!licenseOpen) return undefined;
    function onKey(e) {
      if (e.key === "Escape") closeLicenseViewer();
    }
    window.addEventListener("keydown", onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      window.removeEventListener("keydown", onKey);
      document.body.style.overflow = prev;
    };
  }, [licenseOpen]);

  function closeLicenseViewer() {
    setLicenseOpen(false);
    setLicenseError("");
    licenseEventIdRef.current = null;
  }

  async function openLicenseViewer() {
    if (!event?._id) return;
    const licNow = event.license || {};
    const canView = ["approved", "expired", "suspended"].includes(
      licNow.effectiveStatus || licNow.status
    );
    if (!canView) {
      setMsg("Giấy phép của sự kiện này chưa công khai — cần trạng thái đã cấp phép.");
      return;
    }

    const eventId = String(event._id);
    licenseEventIdRef.current = eventId;
    setLicenseOpen(true);
    setLicenseError("");
    setMsg(null);

    const hasDoc = Boolean(licNow.hasDocument || licNow.documentFileUrl);
    const hasPdf = Boolean(licNow.licenseNo || licNow.pdfUrl || licNow.hasPdf);
    setLicenseTab(hasDoc ? "doc" : hasPdf ? "pdf" : "info");

    setLicenseLoading(true);
    try {
      const assets = await loadPublicLicenseViewerAssets(eventId, {
        wantPdf: hasPdf,
        wantDocument: hasDoc,
      });
      // Bỏ qua nếu user đã chuyển sang sự kiện khác / đóng popup
      if (licenseEventIdRef.current !== eventId) {
        revokeLicenseViewerAssets(assets);
        return;
      }
      revokeLicenseViewerAssets(licenseAssets);
      setLicenseAssets({ ...assets, eventId });
      if (hasDoc && assets.documentUrl) setLicenseTab("doc");
      else if (assets.pdfUrl) setLicenseTab("pdf");
      else setLicenseTab("info");
      if (!assets.pdfUrl && !assets.documentUrl) {
        setLicenseError(
          assets.errors?.[0] || "Chưa có tệp giấy phép gắn với sự kiện này."
        );
      }
    } catch (err) {
      if (licenseEventIdRef.current === eventId) {
        setLicenseError(err.message || "Không tải được giấy phép của sự kiện này");
      }
    } finally {
      if (licenseEventIdRef.current === eventId) setLicenseLoading(false);
    }
  }

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

  function seatingEnabled() {
    return Boolean(event?.seating?.enabled && (event.seating.zones || []).length);
  }

  async function openSeatPicker(tier, mode) {
    const chainId = Number(tier.eventChainId);
    const meta = tierMeta(remaining, chainId);
    if (meta.active === false) {
      setMsg(`Loại vé «${tier.name}» chưa mở bán on-chain.`);
      return;
    }
    setSeatMode(mode);
    setSeatTier(tier);
    setSeatSelected([]);
    setSeatOpen(true);
    setSeatLoading(true);
    setMsg(null);
    try {
      const data = await getEventSeating(event._id);
      setSeatMap(data.seating || event.seating);
    } catch (err) {
      setSeatMap(event.seating);
      setMsg(err.response?.data?.error || err.message);
    } finally {
      setSeatLoading(false);
    }
  }

  function closeSeatPicker() {
    setSeatOpen(false);
    setSeatTier(null);
    setSeatSelected([]);
    setSeatBusy(false);
  }

  function toggleSeat(seat) {
    const max = event?.seating?.maxSelect || 2;
    setSeatSelected((prev) => {
      if (prev.includes(seat.id)) return prev.filter((id) => id !== seat.id);
      if (prev.length >= max) {
        setMsg(`Mỗi lần chọn tối đa ${max} ghế.`);
        return prev;
      }
      return [...prev, seat.id];
    });
  }

  async function confirmSeatSelection() {
    if (!seatTier || !seatSelected.length) return;
    setSeatBusy(true);
    setMsg(null);
    try {
      if (!account) await connect();
      const hold = await holdEventSeats(event._id, {
        wallet: account,
        eventChainId: Number(seatTier.eventChainId),
        seatIds: seatSelected,
      });
      setSeatMap(hold.seating || seatMap);

      const zone =
        (hold.seating?.zones || seatMap?.zones || []).find(
          (z) => Number(z.eventChainId) === Number(seatTier.eventChainId)
        ) || (hold.seating?.zones || [])[0];

      const seatMeta = (id) => {
        const fromHold = (hold.held || []).find((h) => h.seatId === id);
        if (fromHold) return fromHold;
        for (const row of zone?.rows || []) {
          const s = (row.seats || []).find((x) => x.id === id);
          if (s) {
            return {
              seatId: s.id,
              seatLabel: s.label,
              zoneCode: zone.code,
              zoneLabel: zone.label,
              eventChainId: zone.eventChainId,
            };
          }
        }
        return { seatId: id, seatLabel: id, zoneCode: "", zoneLabel: "" };
      };

      if (seatMode === "cart") {
        // 1 ghế = 1 dòng vé trong giỏ (qty luôn 1)
        for (const sid of seatSelected) {
          const meta = seatMeta(sid);
          addItem({
            eventId: event._id,
            eventTitle: event.title,
            eventLocation: event.location,
            eventStartTime: event.startTime,
            eventChainId: Number(seatTier.eventChainId),
            tierName: seatTier.name,
            priceEth: seatTier.price,
            maxQty: 1,
            seatId: meta.seatId,
            seatLabel: meta.seatLabel,
            zoneCode: meta.zoneCode,
            zoneLabel: meta.zoneLabel,
            heldUntil: hold.heldUntil,
          });
        }
        setMsg(
          `Đã giữ ${seatSelected.length} ghế (= ${seatSelected.length} vé) vào giỏ. Thanh toán trong ${
            event?.seating?.holdMinutes || 8
          } phút.`
        );
        closeSeatPicker();
        return;
      }

      // Mua ngay: mỗi ghế mint đúng 1 vé NFT rồi gắn ghế + xuất hóa đơn từng ghế
      const chainId = Number(seatTier.eventChainId);
      setBusyChainId(chainId);
      mintingRef.current = true;
      try {
        await ensureNetwork();
        const assignments = [];
        const minted = [];
        const checkoutResults = [];
        for (const sid of seatSelected) {
          const meta = seatMeta(sid);
          const { hash, tokenId } = await buyPrimaryTicket(chainId, seatTier.price);
          if (tokenId != null) {
            assignments.push({ seatId: sid, tokenId });
          }
          minted.push({ ...meta, hash, tokenId });
          checkoutResults.push({
            eventId: String(event._id),
            eventChainId: chainId,
            tierName: seatTier.name,
            seatId: meta.seatId || sid,
            seatLabel: meta.seatLabel || sid,
            hash,
            tokenId: tokenId ?? null,
            index: minted.length,
          });
        }
        if (assignments.length) {
          await confirmEventSeats(event._id, { wallet: account, assignments });
        }

        const invoiceItems = minted.map((m) => ({
          eventId: String(event._id),
          eventTitle: event.title,
          eventLocation: event.location,
          eventStartTime: event.startTime,
          eventChainId: chainId,
          tierName: seatTier.name,
          priceEth: Number(seatTier.price),
          qty: 1,
          seatId: m.seatId,
          seatLabel: m.seatLabel,
          zoneCode: m.zoneCode || "",
          zoneLabel: m.zoneLabel || "",
          tokenIds: m.tokenId != null ? [m.tokenId] : [],
        }));

        const invoice = buildInvoice({
          invoiceNo: makeInvoiceNo(),
          issuedAt: new Date().toISOString(),
          buyer: {
            email: user?.email || "",
            wallet: account || "",
            name: user?.displayName || user?.email?.split("@")[0] || "Khách hàng",
            taxCode: user?.taxCode || "",
            address: user?.address || "",
          },
          items: invoiceItems,
          checkoutResults,
          networkName,
          chainId: targetChainId,
          status: "paid",
        });

        const labels = minted
          .map((m) => `${m.seatLabel}${m.tokenId != null ? `→#${m.tokenId}` : ""}`)
          .join(", ");

        try {
          const { saved } = await saveAndOpenInvoicePdf(invoice, checkoutResults);
          setMsg(
            `Đã mua ${minted.length} vé (= ${minted.length} ghế: ${labels}). Hóa đơn ${saved.invoiceNo} + vé vào cửa QR sẵn sàng.`
          );
          setPurchaseSuccess({
            title: event.title,
            invoiceNo: saved.invoiceNo,
            invoiceId: saved.id,
            passes: minted
              .filter((m) => m.tokenId != null)
              .map((m) => ({ tokenId: m.tokenId, seatLabel: m.seatLabel })),
          });
        } catch (pdfErr) {
          try {
            openInvoicePrint(invoice);
          } catch {
            /* ignore */
          }
          setMsg(
            `Đã mua ${minted.length} vé (${labels}). Hóa đơn ${invoice.invoiceNo}. PDF: ${
              pdfErr.response?.data?.error || pdfErr.message
            }`
          );
          setPurchaseSuccess({
            title: event.title,
            invoiceNo: invoice.invoiceNo,
            invoiceId: null,
            passes: minted
              .filter((m) => m.tokenId != null)
              .map((m) => ({ tokenId: m.tokenId, seatLabel: m.seatLabel })),
          });
        }

        closeSeatPicker();
        try {
          const left = await getRemaining(chainId);
          setRemaining((r) => ({ ...r, [chainId]: left }));
          const fresh = await getEventSeating(event._id);
          setEvent((ev) => (ev ? { ...ev, seating: fresh.seating } : ev));
        } catch {
          /* ignore */
        }
      } finally {
        mintingRef.current = false;
        setBusyChainId(null);
      }
    } catch (err) {
      setMsg(explainContractError(err) || err.response?.data?.error || err.message);
    } finally {
      setSeatBusy(false);
    }
  }

  function onAddToCart(t, e) {
    e?.preventDefault?.();
    e?.stopPropagation?.();
    // Bắt buộc chọn ghế trước khi thêm giỏ (1 ghế = 1 vé)
    if (!seatingEnabled()) {
      setMsg("Sự kiện chưa có sơ đồ ghế. Không thể thêm vé chưa chọn ghế.");
      return;
    }
    openSeatPicker(t, "cart");
  }

  function onBuy(t, e) {
    e?.preventDefault?.();
    e?.stopPropagation?.();
    // Bắt buộc popup chọn ghế trước khi thanh toán (1 ghế = 1 vé NFT)
    if (!seatingEnabled()) {
      setMsg("Sự kiện chưa có sơ đồ ghế. Không thể mua trước khi chọn ghế.");
      return;
    }
    openSeatPicker(t, "buy");
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
    (msg.startsWith("Mint") ||
      msg.startsWith("Đã mua") ||
      msg.includes("giỏ hàng") ||
      msg.includes("hóa đơn") ||
      msg.includes("Hóa đơn") ||
      msg.includes("ghế") ||
      msg.includes("Tx"));

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
            {event.organizerUnit?.organizationName ||
            event.organizerProfile?.organizationName ? (
              <span>
                <Building2 size={15} />{" "}
                {event.organizerUnit?.organizationName ||
                  event.organizerProfile?.organizationName}
                {event.organizerUnit?.profileCode || event.organizerProfile?.profileCode
                  ? ` · ${event.organizerUnit?.profileCode || event.organizerProfile?.profileCode}`
                  : ""}
              </span>
            ) : null}
          </div>
          {["approved", "expired", "suspended"].includes(lic.effectiveStatus) ? (
            <button
              type="button"
              className={`ed-license-pill clickable ${licUi.tone}`}
              onClick={openLicenseViewer}
              disabled={licenseLoading}
              title={`Xem giấy phép của sự kiện «${event.title}»`}
            >
              <LicIcon size={15} />
              <span>{licUi.label}</span>
              {lic.licenseNo ? <code>{lic.licenseNo}</code> : null}
              <Eye size={14} />
            </button>
          ) : (
            <div className={`ed-license-pill ${licUi.tone}`}>
              <LicIcon size={15} />
              <span>{licUi.label}</span>
              {lic.licenseNo ? <code>{lic.licenseNo}</code> : null}
            </div>
          )}
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

          {(event.program || event.programItems || []).length > 0 ? (
            <section className="ed-panel">
              <h2>
                <ListMusic size={18} /> Chương trình sự kiện
              </h2>
              <ol className="ed-program-list">
                {(event.program || event.programItems || []).map((item, idx) => (
                  <li key={item.id || `${item.title}-${idx}`} className="ed-program-row">
                    <div className="ed-program-idx" aria-hidden>
                      {idx + 1}
                    </div>
                    <div className="ed-program-copy">
                      <div className="ed-program-row-top">
                        <strong>{item.title}</strong>
                        {item.itemTypeLabel ? (
                          <span className="ed-program-type">{item.itemTypeLabel}</span>
                        ) : null}
                      </div>
                      <div className="ed-program-facts">
                        {item.startAt ? (
                          <span>
                            <Clock3 size={13} />{" "}
                            {new Date(item.startAt).toLocaleString("vi-VN", {
                              hour: "2-digit",
                              minute: "2-digit",
                              day: "2-digit",
                              month: "2-digit",
                            })}
                            {item.endAt
                              ? ` – ${new Date(item.endAt).toLocaleTimeString("vi-VN", {
                                  hour: "2-digit",
                                  minute: "2-digit",
                                })}`
                              : ""}
                          </span>
                        ) : null}
                        {item.performer ? (
                          <span>
                            <Mic2 size={13} /> {item.performer}
                            {item.performerRole ? ` · ${item.performerRole}` : ""}
                          </span>
                        ) : null}
                        {item.stage ? (
                          <span>
                            <MapPin size={13} /> {item.stage}
                          </span>
                        ) : null}
                      </div>
                      {item.description ? <p>{item.description}</p> : null}
                    </div>
                  </li>
                ))}
              </ol>
            </section>
          ) : null}

          <section className="ed-panel ed-license-card">
            <div className="ed-license-card-head">
              <h2>
                <Stamp size={18} /> Giấy phép của sự kiện này
              </h2>
              {lic.licenseNo ? <code className="ed-license-no">{lic.licenseNo}</code> : null}
            </div>
            {lic.licenseNo || ["approved", "expired", "suspended"].includes(lic.effectiveStatus) ? (
              <>
                <p className="ed-license-bound">
                  Hồ sơ GP gắn riêng với «{event.title}» — không dùng chung giữa các sự kiện.
                </p>
                <ul className="ed-bullets ed-license-summary">
                  <li>
                    Trạng thái: <strong>{licUi.label}</strong>
                  </li>
                  <li>Loại: {lic.licenseTypeLabel || lic.licenseType || "—"}</li>
                  <li>Cơ quan cấp: {lic.issuingAuthority || "—"}</li>
                  <li>
                    Hiệu lực:{" "}
                    {lic.issuedAt ? new Date(lic.issuedAt).toLocaleDateString("vi-VN") : "—"}
                    {" → "}
                    {lic.expiresAt ? new Date(lic.expiresAt).toLocaleDateString("vi-VN") : "—"}
                  </li>
                </ul>
                <div className="ed-license-actions">
                  {["approved", "expired", "suspended"].includes(lic.effectiveStatus) ? (
                    <button
                      type="button"
                      className="user-btn"
                      disabled={licenseLoading}
                      onClick={openLicenseViewer}
                    >
                      {licenseLoading ? (
                        <Loader2 size={16} className="spin" />
                      ) : (
                        <Eye size={16} />
                      )}
                      {licenseLoading ? "Đang mở…" : "Xem giấy phép"}
                    </button>
                  ) : (
                    <p className="ed-desc" style={{ margin: 0 }}>
                      Sau khi cấp phép, bạn có thể xem ảnh/PDF giấy phép của sự kiện này.
                    </p>
                  )}
                </div>
              </>
            ) : (
              <p className="ed-desc">
                {licUi.label}. Ban tổ chức cập nhật GP riêng cho sự kiện tại Admin → Giấy phép SK.
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
              {seatingEnabled() ? (
                <li>
                  Sự kiện có sơ đồ ghế: chọn khu theo hạng vé, giữ ghế tối đa{" "}
                  {event.seating?.holdMinutes || 8} phút trước khi thanh toán.
                </li>
              ) : null}
            </ul>
          </section>
        </div>

        <aside className="ed-aside" ref={tiersRef} id="tiers">
          <div className="ed-aside-head">
            <h2>
              <Ticket size={18} /> Chọn hạng vé
            </h2>
            <p>
              {seatingEnabled()
                ? "Bấm Mua ngay / Thêm giỏ → chọn ghế trước (1 ghế = 1 vé), rồi mới thanh toán."
                : "Sự kiện chưa có sơ đồ ghế — chưa mở bán chọn ghế."}
            </p>
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
              const zoneForTier = seatingEnabled()
                ? (event.seating?.zones || []).find(
                    (z) => Number(z.eventChainId) === chainId
                  ) ||
                  (event.seating?.zones || []).find(
                    (z) =>
                      String(z.label).toLowerCase() === String(t.name || "").toLowerCase()
                  )
                : null;

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
                      {zoneForTier ? (
                        <p className="ed-tier-zone">
                          Khu ghế: <strong>{zoneForTier.label}</strong>
                          {typeof zoneForTier.available === "number"
                            ? ` · trống ${zoneForTier.available}/${zoneForTier.total || "?"}`
                            : ""}
                        </p>
                      ) : null}
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
                      disabled={inactive || soldOut || isBusy || otherBusy || !seatingEnabled()}
                      onClick={(ev) => onAddToCart(t, ev)}
                      title={!seatingEnabled() ? "Chưa có sơ đồ ghế" : "Chọn ghế rồi thêm giỏ"}
                    >
                      <ShoppingCart size={16} />
                      Chọn ghế · giỏ
                    </button>
                    <button
                      type="button"
                      className="user-btn"
                      disabled={inactive || soldOut || isBusy || otherBusy || !seatingEnabled()}
                      onClick={(ev) => onBuy(t, ev)}
                      title={!seatingEnabled() ? "Chưa có sơ đồ ghế" : "Chọn ghế rồi thanh toán"}
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

      {licenseOpen
        ? createPortal(
            <div
              className="ed-license-modal-backdrop"
              role="presentation"
              onClick={closeLicenseViewer}
            >
              <div
                className="ed-license-modal"
                role="dialog"
                aria-modal="true"
                aria-labelledby="ed-license-title"
                onClick={(e) => e.stopPropagation()}
              >
                <header className="ed-license-modal-head">
                  <div>
                    <p className="user-eyebrow">
                      <Stamp size={14} /> Giấy phép của sự kiện
                    </p>
                    <h2 id="ed-license-title">{event.title}</h2>
                    <p className="ed-license-modal-sub">
                      {lic.licenseNo ? (
                        <>
                          Số GP <strong>{lic.licenseNo}</strong>
                        </>
                      ) : (
                        "Chưa có số GP"
                      )}
                      {lic.issuingAuthority ? <> · {lic.issuingAuthority}</> : null}
                    </p>
                  </div>
                  <button
                    type="button"
                    className="ed-license-close"
                    onClick={closeLicenseViewer}
                    aria-label="Đóng"
                  >
                    <X size={18} />
                  </button>
                </header>

                <div className="ed-license-tabs" role="tablist" aria-label="Loại giấy phép">
                  <button
                    type="button"
                    role="tab"
                    aria-selected={licenseTab === "info"}
                    className={licenseTab === "info" ? "active" : undefined}
                    onClick={() => setLicenseTab("info")}
                  >
                    <Info size={14} /> Thông tin
                  </button>
                  <button
                    type="button"
                    role="tab"
                    aria-selected={licenseTab === "doc"}
                    className={licenseTab === "doc" ? "active" : undefined}
                    onClick={() => setLicenseTab("doc")}
                    disabled={!licenseLoading && !licenseAssets?.documentUrl}
                  >
                    <Stamp size={14} /> Hồ sơ gốc
                  </button>
                  <button
                    type="button"
                    role="tab"
                    aria-selected={licenseTab === "pdf"}
                    className={licenseTab === "pdf" ? "active" : undefined}
                    onClick={() => setLicenseTab("pdf")}
                    disabled={!licenseLoading && !licenseAssets?.pdfUrl}
                  >
                    <FileText size={14} /> PDF hệ thống
                  </button>
                </div>

                <div className="ed-license-modal-body">
                  {licenseTab === "info" ? (
                    <section className="ed-license-meta">
                      <dl>
                        <div>
                          <dt>Sự kiện</dt>
                          <dd>{event.title}</dd>
                        </div>
                        <div>
                          <dt>Số giấy phép</dt>
                          <dd>
                            <strong>{lic.licenseNo || "—"}</strong>
                          </dd>
                        </div>
                        <div>
                          <dt>Loại</dt>
                          <dd>{lic.licenseTypeLabel || lic.licenseType || "—"}</dd>
                        </div>
                        <div>
                          <dt>Cơ quan cấp</dt>
                          <dd>{lic.issuingAuthority || "—"}</dd>
                        </div>
                        <div>
                          <dt>Ngày cấp</dt>
                          <dd>
                            {lic.issuedAt
                              ? new Date(lic.issuedAt).toLocaleDateString("vi-VN")
                              : "—"}
                          </dd>
                        </div>
                        <div>
                          <dt>Hiệu lực đến</dt>
                          <dd>
                            {lic.expiresAt
                              ? new Date(lic.expiresAt).toLocaleDateString("vi-VN")
                              : "—"}
                          </dd>
                        </div>
                        <div>
                          <dt>Trạng thái</dt>
                          <dd>
                            <span
                              className={`ed-license-pill ${licUi.tone}`}
                              style={{ marginTop: 0 }}
                            >
                              <LicIcon size={14} /> {licUi.label}
                            </span>
                          </dd>
                        </div>
                        {(event.organizerUnit?.organizationName ||
                          event.organizerProfile?.organizationName) && (
                          <div>
                            <dt>Đơn vị tổ chức</dt>
                            <dd>
                              {event.organizerUnit?.organizationName ||
                                event.organizerProfile?.organizationName}
                            </dd>
                          </div>
                        )}
                      </dl>
                    </section>
                  ) : null}

                  {licenseTab === "doc" ? (
                    <section className="ed-license-preview">
                      {licenseLoading ? (
                        <div className="ed-license-loading">
                          <Loader2 size={22} className="spin" />
                          <span>Đang tải hồ sơ gốc của sự kiện này…</span>
                        </div>
                      ) : licenseAssets?.eventId === String(event._id) &&
                        licenseAssets?.documentUrl ? (
                        <div className="ed-license-frame fill">
                          {(
                            licenseAssets.documentMimeType ||
                            lic.documentMimeType ||
                            ""
                          ).startsWith("image/") ? (
                            <img
                              src={licenseAssets.documentUrl}
                              alt={`Hồ sơ GP ${lic.licenseNo || ""} — ${event.title}`}
                              className="ed-license-image"
                            />
                          ) : (
                            <iframe
                              title={`Hồ sơ GP — ${event.title}`}
                              src={licenseAssets.documentUrl}
                              className="ed-license-iframe"
                            />
                          )}
                        </div>
                      ) : (
                        <p className="ed-desc">
                          {licenseError || "Sự kiện này chưa có hồ sơ gốc đính kèm."}
                        </p>
                      )}
                    </section>
                  ) : null}

                  {licenseTab === "pdf" ? (
                    <section className="ed-license-preview">
                      {licenseLoading ? (
                        <div className="ed-license-loading">
                          <Loader2 size={22} className="spin" />
                          <span>Đang tải PDF giấy phép của sự kiện này…</span>
                        </div>
                      ) : licenseAssets?.eventId === String(event._id) &&
                        licenseAssets?.pdfUrl ? (
                        <div className="ed-license-frame fill">
                          <iframe
                            title={`PDF GP — ${event.title}`}
                            src={licenseAssets.pdfUrl}
                            className="ed-license-iframe"
                          />
                        </div>
                      ) : (
                        <p className="ed-desc">
                          {licenseError || "Chưa tạo được PDF hệ thống cho sự kiện này."}
                        </p>
                      )}
                    </section>
                  ) : null}
                </div>

                <footer className="ed-license-modal-foot">
                  <button type="button" className="user-btn" onClick={closeLicenseViewer}>
                    Đóng
                  </button>
                  {licenseAssets?.eventId === String(event._id) &&
                  licenseAssets?.documentUrl ? (
                    <button
                      type="button"
                      className="user-btn ghost"
                      disabled={pdfBusy}
                      onClick={onViewLicenseDocument}
                    >
                      <Stamp size={15} /> Mở hồ sơ tab mới
                    </button>
                  ) : null}
                  {licenseAssets?.eventId === String(event._id) && licenseAssets?.pdfUrl ? (
                    <button
                      type="button"
                      className="user-btn ghost"
                      disabled={pdfBusy}
                      onClick={onViewLicensePdf}
                    >
                      <FileText size={15} /> Mở PDF tab mới
                    </button>
                  ) : null}
                </footer>
              </div>
            </div>,
            document.querySelector(".user-shell") || document.body
          )
        : null}

      <SeatPickerModal
        open={seatOpen}
        eventTitle={event.title}
        tier={seatTier}
        seating={seatMap || event.seating}
        loading={seatLoading}
        selectedIds={seatSelected}
        maxSelect={event?.seating?.maxSelect || 2}
        mode={seatMode}
        onToggleSeat={toggleSeat}
        onClose={closeSeatPicker}
        onConfirm={confirmSeatSelection}
        busy={seatBusy}
      />

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
    </div>
  );
}
