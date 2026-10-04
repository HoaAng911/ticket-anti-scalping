import { createPortal } from "react-dom";
import { useEffect, useState } from "react";
import {
  X,
  Loader2,
  QrCode,
  Download,
  ExternalLink,
  MapPin,
  CalendarDays,
  Armchair,
  CheckCircle2,
  AlertCircle,
} from "lucide-react";
import { getTicketPass, fetchTicketPassPdfBlob } from "../../services/api.js";

export async function openTicketPassPdf(tokenId) {
  const blob = await fetchTicketPassPdfBlob(tokenId);
  const pdfBlob =
    blob.type === "application/pdf" ? blob : new Blob([blob], { type: "application/pdf" });
  const url = URL.createObjectURL(pdfBlob);
  const w = window.open(url, "_blank", "noopener,noreferrer");
  if (!w) {
    // Popup bị chặn — vẫn giữ URL để caller có thể tải thủ công
    return { url, popupBlocked: true, revoke: () => URL.revokeObjectURL(url) };
  }
  // Thu hồi sau khi tab kịp load
  setTimeout(() => URL.revokeObjectURL(url), 180_000);
  return { url, popupBlocked: false };
}

export async function downloadTicketPassPdf(tokenId, fileName) {
  const blob = await fetchTicketPassPdfBlob(tokenId);
  const pdfBlob =
    blob.type === "application/pdf" ? blob : new Blob([blob], { type: "application/pdf" });
  const url = URL.createObjectURL(pdfBlob);
  const a = document.createElement("a");
  a.href = url;
  a.download = fileName || `ve-vao-cua-${tokenId}.pdf`;
  a.rel = "noopener";
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 60_000);
}

/**
 * Popup vé vào cửa (QR) — xuất trình cho nhân viên kiểm soát.
 */
export default function TicketPassModal({ open, tokenId, onClose }) {
  const [pass, setPass] = useState(null);
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState("");
  const [busyPdf, setBusyPdf] = useState(false);

  useEffect(() => {
    if (!open || tokenId == null) {
      setPass(null);
      setErr("");
      return undefined;
    }
    let cancelled = false;
    setLoading(true);
    setErr("");
    getTicketPass(tokenId)
      .then((p) => {
        if (!cancelled) setPass(p);
      })
      .catch((e) => {
        if (!cancelled) setErr(e.response?.data?.error || e.message);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    function onKey(e) {
      if (e.key === "Escape") onClose?.();
    }
    window.addEventListener("keydown", onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      cancelled = true;
      window.removeEventListener("keydown", onKey);
      document.body.style.overflow = prev;
    };
  }, [open, tokenId, onClose]);

  if (!open || typeof document === "undefined") return null;

  const portalTarget = document.querySelector(".user-shell") || document.body;

  async function onOpenPdf() {
    setBusyPdf(true);
    setErr("");
    try {
      const opened = await openTicketPassPdf(tokenId);
      if (opened.popupBlocked) {
        await downloadTicketPassPdf(tokenId);
        setErr("Trình duyệt chặn tab mới — đã tải PDF về máy.");
        opened.revoke?.();
      }
    } catch (e) {
      setErr(e.response?.data?.error || e.message);
    } finally {
      setBusyPdf(false);
    }
  }

  async function onDownloadPdf() {
    setBusyPdf(true);
    setErr("");
    try {
      await downloadTicketPassPdf(tokenId);
    } catch (e) {
      setErr(e.response?.data?.error || e.message);
    } finally {
      setBusyPdf(false);
    }
  }

  return createPortal(
    <div className="pass-modal-backdrop" role="presentation" onClick={onClose}>
      <div
        className="pass-modal"
        role="dialog"
        aria-modal="true"
        aria-labelledby="pass-modal-title"
        onClick={(e) => e.stopPropagation()}
      >
        <header className="pass-modal-head">
          <div>
            <p className="user-eyebrow">
              <QrCode size={14} /> Vé vào cửa · kiểm soát
            </p>
            <h2 id="pass-modal-title">{pass?.event?.title || `Token #${tokenId}`}</h2>
            <p className="pass-modal-sub">
              Xuất trình mã QR cho nhân viên tại cổng. Mỗi ghế = 1 vé NFT.
            </p>
          </div>
          <button type="button" className="pass-close" onClick={onClose} aria-label="Đóng">
            <X size={18} />
          </button>
        </header>

        <div className="pass-modal-body">
          {loading ? (
            <div className="pass-loading">
              <Loader2 size={22} className="spin" /> Đang tạo vé vào cửa…
            </div>
          ) : err && !pass ? (
            <div className="user-alert err">
              <AlertCircle size={16} /> {err}
            </div>
          ) : pass ? (
            <>
              {err ? (
                <div className="user-alert err" style={{ marginBottom: 12 }}>
                  <AlertCircle size={16} /> {err}
                </div>
              ) : null}
              <div className="pass-status-row">
                {pass.checkedIn ? (
                  <span className="pass-badge used">
                    <CheckCircle2 size={14} /> Đã check-in
                    {pass.checkedInAt
                      ? ` · ${new Date(pass.checkedInAt).toLocaleString("vi-VN")}`
                      : ""}
                  </span>
                ) : (
                  <span className="pass-badge ok">Chưa check-in · sẵn sàng vào cửa</span>
                )}
                <code className="pass-entry-code">{pass.entryCode}</code>
              </div>

              <div className="pass-qr-wrap">
                <img src={pass.qrDataUrl} alt={`QR vé #${pass.tokenId}`} className="pass-qr" />
              </div>

              <dl className="pass-facts">
                <div>
                  <dt>Token NFT</dt>
                  <dd>#{pass.tokenId}</dd>
                </div>
                <div>
                  <dt>Hạng vé</dt>
                  <dd>{pass.tierName}</dd>
                </div>
                <div>
                  <dt>Ghế</dt>
                  <dd>
                    {pass.seatLabel || pass.seatId || "—"}
                    {pass.zoneLabel || pass.zoneCode
                      ? ` · khu ${pass.zoneLabel || pass.zoneCode}`
                      : ""}
                  </dd>
                </div>
                <div>
                  <dt>Địa điểm</dt>
                  <dd>
                    <MapPin size={13} /> {pass.event?.location || "—"}
                  </dd>
                </div>
                <div>
                  <dt>Thời gian</dt>
                  <dd>
                    <CalendarDays size={13} />{" "}
                    {pass.event?.startTime
                      ? new Date(pass.event.startTime).toLocaleString("vi-VN")
                      : "—"}
                  </dd>
                </div>
                <div>
                  <dt>Chủ ví</dt>
                  <dd className="mono">{pass.ownerWallet}</dd>
                </div>
              </dl>
            </>
          ) : null}
        </div>

        <footer className="pass-modal-foot">
          <button type="button" className="user-btn ghost" onClick={onClose}>
            Đóng
          </button>
          <button
            type="button"
            className="user-btn secondary"
            disabled={busyPdf || !pass}
            onClick={onDownloadPdf}
          >
            <Download size={15} /> Tải PDF vé
          </button>
          <button
            type="button"
            className="user-btn"
            disabled={busyPdf || !pass}
            onClick={onOpenPdf}
          >
            {busyPdf ? <Loader2 size={15} className="spin" /> : <ExternalLink size={15} />}
            Mở PDF vé
          </button>
        </footer>
      </div>
    </div>,
    portalTarget
  );
}

/** Panel sau mua: hóa đơn + danh sách vé vào cửa */
export function PurchaseSuccessPanel({
  open,
  onClose,
  title,
  invoiceNo,
  passes = [], // [{ tokenId, seatLabel }]
  onOpenInvoice,
  onOpenPass,
}) {
  if (!open || typeof document === "undefined") return null;
  const portalTarget = document.querySelector(".user-shell") || document.body;

  return createPortal(
    <div className="pass-modal-backdrop" role="presentation" onClick={onClose}>
      <div
        className="pass-modal pass-success-modal"
        role="dialog"
        aria-modal="true"
        onClick={(e) => e.stopPropagation()}
      >
        <header className="pass-modal-head">
          <div>
            <p className="user-eyebrow">
              <CheckCircle2 size={14} /> Mua vé thành công
            </p>
            <h2>{title || "Đã nhận vé & hóa đơn"}</h2>
            <p className="pass-modal-sub">
              Giữ hóa đơn GTGT để đối soát · dùng vé QR để vào sự kiện.
            </p>
          </div>
          <button type="button" className="pass-close" onClick={onClose} aria-label="Đóng">
            <X size={18} />
          </button>
        </header>
        <div className="pass-modal-body">
          {invoiceNo ? (
            <div className="pass-success-card">
              <strong>Hóa đơn GTGT</strong>
              <p>{invoiceNo}</p>
              <button type="button" className="user-btn secondary" onClick={onOpenInvoice}>
                Xem hóa đơn
              </button>
            </div>
          ) : null}
          <div className="pass-success-card">
            <strong>
              <Armchair size={16} /> Vé vào cửa ({passes.length})
            </strong>
            <ul className="pass-success-list">
              {passes.map((p) => (
                <li key={p.tokenId}>
                  <span>
                    Token #{p.tokenId}
                    {p.seatLabel ? ` · ghế ${p.seatLabel}` : ""}
                  </span>
                  <button
                    type="button"
                    className="user-btn"
                    onClick={() => onOpenPass?.(p.tokenId)}
                  >
                    <QrCode size={14} /> Mở vé QR
                  </button>
                </li>
              ))}
            </ul>
          </div>
        </div>
        <footer className="pass-modal-foot">
          <button type="button" className="user-btn" onClick={onClose}>
            Xong
          </button>
        </footer>
      </div>
    </div>,
    portalTarget
  );
}
