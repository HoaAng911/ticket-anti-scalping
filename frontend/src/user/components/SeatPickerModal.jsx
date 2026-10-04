import { useEffect, useMemo, useState } from "react";
import { createPortal } from "react-dom";
import {
  Armchair,
  Loader2,
  X,
  Check,
  ChevronRight,
  ChevronLeft,
  Wallet,
  ShoppingCart,
} from "lucide-react";

/**
 * Popup chọn ghế kiểu rạp (giữa màn hình):
 * 1) Chọn ghế trong khu của hạng vé
 * 2) Xác nhận & thanh toán (hoặc thêm giỏ)
 */
export default function SeatPickerModal({
  open,
  eventTitle,
  tier,
  seating,
  loading,
  selectedIds,
  maxSelect = 2,
  mode = "buy",
  onToggleSeat,
  onClose,
  onConfirm,
  busy,
}) {
  const [step, setStep] = useState("select"); // select | pay

  const zone = useMemo(() => {
    if (!seating?.zones?.length || !tier) return null;
    const chainId = Number(tier.eventChainId);
    const byChain = seating.zones.find((z) => Number(z.eventChainId) === chainId);
    if (byChain) return byChain;
    return (
      seating.zones.find(
        (z) => String(z.label).toLowerCase() === String(tier.name || "").toLowerCase()
      ) || null
    );
  }, [seating, tier]);

  const availableCount = useMemo(() => {
    if (!zone) return 0;
    return (zone.rows || []).reduce(
      (n, r) => n + (r.seats || []).filter((s) => s.status === "available").length,
      0
    );
  }, [zone]);

  const selectedSeats = useMemo(() => {
    const ids = selectedIds || [];
    const all = (zone?.rows || []).flatMap((r) => r.seats || []);
    return ids.map((id) => all.find((s) => s.id === id) || { id, label: id });
  }, [selectedIds, zone]);

  const totalEth = useMemo(() => {
    const unit = Number(tier?.price) || 0;
    return unit * (selectedIds?.length || 0);
  }, [tier, selectedIds]);

  useEffect(() => {
    if (!open) {
      setStep("select");
      return undefined;
    }
    setStep("select");
    function onKey(e) {
      if (e.key === "Escape") onClose?.();
    }
    window.addEventListener("keydown", onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      window.removeEventListener("keydown", onKey);
      document.body.style.overflow = prev;
    };
  }, [open, onClose]);

  if (!open || typeof document === "undefined") return null;

  const selected = selectedIds || [];
  const isBuy = mode === "buy";
  const portalTarget =
    document.querySelector(".user-shell") || document.body;

  return createPortal(
    <div className="seat-modal-backdrop" role="presentation" onClick={onClose}>
      <div
        className="seat-modal"
        role="dialog"
        aria-modal="true"
        aria-labelledby="seat-modal-title"
        onClick={(e) => e.stopPropagation()}
      >
        <header className="seat-modal-head">
          <div className="seat-modal-head-copy">
            <p className="user-eyebrow">
              <Armchair size={14} />{" "}
              {step === "select" ? "Bước 1 · Chọn ghế theo khu" : "Bước 2 · Thanh toán"}
            </p>
            <h2 id="seat-modal-title">{eventTitle}</h2>
            <p className="seat-modal-sub">
              Hạng <strong>{tier?.name || "—"}</strong>
              {" · "}
              khu dành riêng <strong>{zone?.label || "—"}</strong>
              {step === "select" ? (
                <>
                  {" · "}
                  đã chọn{" "}
                  <strong>
                    {selected.length}/{maxSelect}
                  </strong>
                  {" · "}
                  còn trống {availableCount}
                </>
              ) : (
                <>
                  {" · "}
                  {selected.length} ghế · {totalEth.toFixed(4).replace(/\.?0+$/, "")} ETH
                </>
              )}
            </p>
          </div>
          <button type="button" className="seat-close" onClick={onClose} aria-label="Đóng">
            <X size={18} />
          </button>
        </header>

        <div className="seat-steps" aria-hidden>
          <span className={step === "select" ? "is-active" : "is-done"}>1. Chọn ghế</span>
          <ChevronRight size={14} />
          <span className={step === "pay" ? "is-active" : ""}>
            2. {isBuy ? "Thanh toán" : "Thêm giỏ"}
          </span>
        </div>

        <div className="seat-modal-body">
          {loading ? (
            <div className="seat-loading">
              <Loader2 size={22} className="spin" /> Đang tải sơ đồ ghế…
            </div>
          ) : !zone ? (
            <p className="ed-desc">
              Hạng vé «{tier?.name}» chưa được gán khu ghế. Liên hệ ban tổ chức để tạo sơ đồ ghế
              theo hạng.
            </p>
          ) : step === "select" ? (
            <>
              <div className="seat-zone-banner">
                Vé <strong>{tier?.name}</strong> chỉ ngồi khu <strong>{zone.label}</strong>.{" "}
                <strong>1 ghế = 1 vé NFT</strong> — chọn bao nhiêu ghế sẽ mint bấy nhiêu vé.
              </div>
              <div className="seat-screen" aria-hidden>
                {seating?.screenLabel || "SÂN KHẤU / MÀN HÌNH"}
              </div>
              <div className="seat-legend">
                <span>
                  <i className="seat-dot available" /> Trống
                </span>
                <span>
                  <i className="seat-dot selected" /> Đang chọn
                </span>
                <span>
                  <i className="seat-dot held" /> Đang giữ
                </span>
                <span>
                  <i className="seat-dot sold" /> Đã bán
                </span>
                <span>
                  <i className="seat-dot blocked" /> Khóa bán
                </span>
              </div>
              <div className="seat-map">
                {(zone.rows || []).map((row) => (
                  <div key={row.row} className="seat-row">
                    <span className="seat-row-label">{row.row}</span>
                    <div className="seat-row-seats">
                      {(row.seats || []).map((seat) => {
                        const isSelected = selected.includes(seat.id);
                        const disabled =
                          seat.status === "sold" ||
                          seat.status === "held" ||
                          seat.status === "blocked";
                        return (
                          <button
                            key={seat.id}
                            type="button"
                            className={`seat-btn ${seat.status}${isSelected ? " is-selected" : ""}`}
                            disabled={disabled || busy}
                            title={`${seat.label} · ${
                              seat.status === "sold"
                                ? "Đã bán"
                                : seat.status === "held"
                                  ? "Đang giữ"
                                  : seat.status === "blocked"
                                    ? "Khóa bán"
                                    : "Trống"
                            }`}
                            onClick={() => onToggleSeat?.(seat)}
                          >
                            {seat.label}
                          </button>
                        );
                      })}
                    </div>
                    <span className="seat-row-label">{row.row}</span>
                  </div>
                ))}
              </div>
            </>
          ) : (
            <div className="seat-pay-panel">
              <h3>Xác nhận ghế trước khi thanh toán</h3>
              <p className="seat-modal-sub" style={{ marginTop: 0 }}>
                Hệ thống giữ ghế tạm thời; sau khi mint NFT ghế sẽ gắn vào vé của bạn.
              </p>
              <dl className="seat-pay-facts">
                <div>
                  <dt>Hạng vé</dt>
                  <dd>{tier?.name}</dd>
                </div>
                <div>
                  <dt>Khu vực</dt>
                  <dd>{zone.label}</dd>
                </div>
                <div>
                  <dt>Ghế đã chọn</dt>
                  <dd className="seat-selected-list" style={{ margin: 0 }}>
                    {selectedSeats.map((s) => (
                      <span key={s.id} className="seat-chip">
                        {s.label || s.id}
                      </span>
                    ))}
                  </dd>
                </div>
                <div>
                  <dt>Số vé</dt>
                  <dd>
                    <strong>{selected.length} vé</strong> (= {selected.length} ghế)
                  </dd>
                </div>
                <div>
                  <dt>Đơn giá</dt>
                  <dd>{Number(tier?.price || 0)} ETH / ghế (vé)</dd>
                </div>
                <div>
                  <dt>Tổng thanh toán</dt>
                  <dd>
                    <strong>{totalEth.toFixed(4).replace(/\.?0+$/, "")} ETH</strong>
                  </dd>
                </div>
              </dl>
            </div>
          )}
        </div>

        <footer className="seat-modal-foot">
          <div className="seat-selected-list">
            {selected.length
              ? selectedSeats.map((s) => (
                  <span key={s.id} className="seat-chip">
                    {s.label || s.id}
                  </span>
                ))
              : "Chưa chọn ghế"}
          </div>
          <div className="seat-foot-actions">
            {step === "pay" ? (
              <button
                type="button"
                className="user-btn ghost"
                onClick={() => setStep("select")}
                disabled={busy}
              >
                <ChevronLeft size={16} /> Đổi ghế
              </button>
            ) : (
              <button type="button" className="user-btn ghost" onClick={onClose} disabled={busy}>
                Hủy
              </button>
            )}

            {step === "select" ? (
              <button
                type="button"
                className="user-btn"
                disabled={busy || !selected.length || !zone}
                onClick={() => setStep("pay")}
              >
                {isBuy ? "Tiếp tục thanh toán" : "Xác nhận ghế"} <ChevronRight size={16} />
              </button>
            ) : (
              <button
                type="button"
                className="user-btn"
                disabled={busy || !selected.length}
                onClick={onConfirm}
              >
                {busy ? (
                  <Loader2 size={16} className="spin" />
                ) : isBuy ? (
                  <Wallet size={16} />
                ) : (
                  <ShoppingCart size={16} />
                )}
                {busy
                  ? isBuy
                    ? "Đang thanh toán…"
                    : "Đang giữ ghế…"
                  : isBuy
                    ? "Thanh toán MetaMask"
                    : "Giữ ghế & thêm giỏ"}
                {!busy ? <Check size={16} /> : null}
              </button>
            )}
          </div>
        </footer>
      </div>
    </div>,
    portalTarget
  );
}
