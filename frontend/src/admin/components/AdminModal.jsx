import { useEffect, useId, useRef, useState } from "react";
import { X } from "lucide-react";

/**
 * Modal admin dùng chung — overlay + panel, ESC / click nền để đóng.
 */
export default function AdminModal({
  open,
  onClose,
  title,
  subtitle,
  icon: Icon,
  size = "md",
  children,
  footer,
  closeOnBackdrop = true,
}) {
  const titleId = useId();
  const panelRef = useRef(null);

  useEffect(() => {
    if (!open) return undefined;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const onKey = (e) => {
      if (e.key === "Escape") onClose?.();
    };
    window.addEventListener("keydown", onKey);
    requestAnimationFrame(() => panelRef.current?.focus?.());
    return () => {
      document.body.style.overflow = prev;
      window.removeEventListener("keydown", onKey);
    };
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div
      className="lte-modal-root"
      role="presentation"
      onMouseDown={(e) => {
        if (closeOnBackdrop && e.target === e.currentTarget) onClose?.();
      }}
    >
      <div
        ref={panelRef}
        className={`lte-modal-panel size-${size}`}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        tabIndex={-1}
      >
        <header className="lte-modal-head">
          <div className="lte-modal-title-wrap">
            {Icon ? (
              <span className="lte-modal-icon" aria-hidden>
                <Icon size={18} />
              </span>
            ) : null}
            <div>
              <h2 id={titleId}>{title}</h2>
              {subtitle ? <p>{subtitle}</p> : null}
            </div>
          </div>
          <button type="button" className="lte-modal-close" onClick={onClose} aria-label="Đóng">
            <X size={18} />
          </button>
        </header>
        <div className="lte-modal-body">{children}</div>
        {footer ? <footer className="lte-modal-foot">{footer}</footer> : null}
      </div>
    </div>
  );
}

/** Hộp xác nhận / nhập lý do — thay window.confirm & window.prompt */
export function AdminConfirmModal({
  open,
  onClose,
  onConfirm,
  title = "Xác nhận",
  message,
  confirmLabel = "Xác nhận",
  cancelLabel = "Hủy",
  tone = "default",
  promptLabel,
  promptDefault = "",
  promptRequired = false,
  icon: Icon,
  busy = false,
}) {
  const [value, setValue] = useState(promptDefault);

  useEffect(() => {
    if (open) setValue(promptDefault);
  }, [open, promptDefault]);

  function submit(e) {
    e?.preventDefault?.();
    if (promptLabel != null && promptRequired && !String(value || "").trim()) return;
    onConfirm?.(promptLabel != null ? value : true);
  }

  return (
    <AdminModal
      open={open}
      onClose={busy ? () => {} : onClose}
      title={title}
      icon={Icon}
      size="sm"
      closeOnBackdrop={!busy}
      footer={
        <>
          <button type="button" className="lte-btn lte-btn-default" disabled={busy} onClick={onClose}>
            {cancelLabel}
          </button>
          <button
            type="button"
            className={`lte-btn ${tone === "danger" ? "lte-btn-danger" : "lte-btn-primary"}`}
            disabled={
              busy || (promptLabel != null && promptRequired && !String(value || "").trim())
            }
            onClick={submit}
          >
            {busy ? "Đang xử lý…" : confirmLabel}
          </button>
        </>
      }
    >
      {message ? <p className="lte-modal-msg">{message}</p> : null}
      {promptLabel != null ? (
        <label className="lte-modal-field">
          {promptLabel}
          <textarea
            rows={3}
            value={value}
            onChange={(e) => setValue(e.target.value)}
            autoFocus
            disabled={busy}
          />
        </label>
      ) : null}
    </AdminModal>
  );
}

/** Toast góc màn hình — thông báo nhanh sau thao tác */
export function AdminToast({ message, tone = "ok", onDismiss }) {
  useEffect(() => {
    if (!message) return undefined;
    const t = setTimeout(() => onDismiss?.(), 4200);
    return () => clearTimeout(t);
  }, [message, onDismiss]);

  if (!message) return null;
  return (
    <div className={`lte-toast tone-${tone}`} role="status">
      <span>{message}</span>
      <button type="button" onClick={onDismiss} aria-label="Đóng">
        <X size={14} />
      </button>
    </div>
  );
}
