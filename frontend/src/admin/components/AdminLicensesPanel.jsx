import { useCallback, useEffect, useRef, useState } from "react";
import {
  Stamp,
  RefreshCw,
  Search,
  Save,
  CheckCircle2,
  XCircle,
  Clock3,
  Ban,
  FileBadge2,
  Loader2,
  FileText,
  Upload,
  Paperclip,
  Trash2,
} from "lucide-react";
import {
  getAdminLicenses,
  updateAdminLicense,
  patchAdminLicenseStatus,
  uploadAdminLicenseDocument,
  deleteAdminLicenseDocument,
} from "../../services/api.js";
import {
  openAdminLicensePdf,
  openAdminLicenseDocument,
} from "../../utils/licensePdf.js";
import AdminModal, { AdminConfirmModal } from "./AdminModal.jsx";

const emptyEdit = {
  licenseNo: "",
  licenseType: "to_chuc_su_kien",
  issuingAuthority: "",
  issuedAt: "",
  expiresAt: "",
  status: "draft",
  documentUrl: "",
  notes: "",
  rejectionReason: "",
};

function toInputDate(v) {
  if (!v) return "";
  try {
    return new Date(v).toISOString().slice(0, 10);
  } catch {
    return "";
  }
}

function statusTone(s) {
  if (s === "approved") return "ok";
  if (s === "pending" || s === "draft") return "";
  if (s === "rejected" || s === "suspended" || s === "expired") return "warn";
  return "";
}

function statusLabel(catalog, key) {
  return catalog?.statuses?.find((s) => s.key === key)?.label || key || "—";
}

/** Modal hồ sơ GP — form state local để gõ không re-render cả bảng */
function LicenseProfileModal({
  open,
  row,
  catalog,
  busy,
  uploadBusy,
  onClose,
  onSave,
  onUpload,
  onRemoveUpload,
  onViewDocument,
  onViewPdf,
  onSubmitPending,
  onApprove,
}) {
  const fileRef = useRef(null);
  const [form, setForm] = useState(emptyEdit);
  const eventId = row?.eventId;
  const lic = row?.license || {};
  const workflow = lic.workflow || { steps: [] };
  const maxMb = catalog?.upload?.maxSizeMb || 12;

  useEffect(() => {
    if (!open || !row) return;
    const L = row.license || {};
    setForm({
      licenseNo: L.licenseNo || "",
      licenseType: L.licenseType || "to_chuc_su_kien",
      issuingAuthority: L.issuingAuthority || "",
      issuedAt: toInputDate(L.issuedAt),
      expiresAt: toInputDate(L.expiresAt),
      status: L.status === "none" ? "draft" : L.status || "draft",
      documentUrl: L.documentUrl || "",
      notes: L.notes || "",
      rejectionReason: L.rejectionReason || "",
    });
    if (fileRef.current) fileRef.current.value = "";
  }, [open, eventId]);

  function setField(field, value) {
    setForm((f) => ({ ...f, [field]: value }));
  }

  function submit(e) {
    e.preventDefault();
    onSave?.(form);
  }

  function pickFile(e) {
    const file = e.target.files?.[0];
    if (file) onUpload?.(file);
  }

  const steps = workflow.steps || [];
  const doneCount = steps.filter((s) => s.done).length;

  return (
    <AdminModal
      open={open}
      size="lg"
      icon={Stamp}
      title="Hồ sơ giấy phép"
      subtitle={row?.title || "Khai báo · Upload · Duyệt · Cấp phép"}
      onClose={busy || uploadBusy ? () => {} : onClose}
      closeOnBackdrop={!busy && !uploadBusy}
      footer={
        <>
          <button
            type="button"
            className="lte-btn lte-btn-default"
            disabled={busy || uploadBusy}
            onClick={onClose}
          >
            Đóng
          </button>
          <button
            type="button"
            className="lte-btn lte-btn-default"
            disabled={busy || uploadBusy || !lic.workflow?.canSubmitPending}
            onClick={onSubmitPending}
          >
            <Clock3 size={15} /> Gửi chờ duyệt
          </button>
          <button
            type="button"
            className="lte-btn lte-btn-primary"
            disabled={busy || uploadBusy || !lic.workflow?.canApprove}
            onClick={onApprove}
          >
            <CheckCircle2 size={15} /> Cấp phép
          </button>
        </>
      }
    >
      <div className="lte-license-modal">
        <div className="lte-workflow lte-workflow-steps" aria-label="Tiến độ hồ sơ">
          {steps.map((s, i) => (
            <div
              key={s.key}
              className={`lte-workflow-step ${s.done ? "is-done" : ""} ${
                !s.done && (i === 0 || steps[i - 1]?.done) ? "is-current" : ""
              }`}
            >
              <span className="lte-workflow-num">
                {s.done ? <CheckCircle2 size={14} /> : i + 1}
              </span>
              <span className="lte-workflow-label">{s.label}</span>
              {i < steps.length - 1 ? <span className="lte-workflow-line" aria-hidden /> : null}
            </div>
          ))}
          <p className="lte-workflow-meta">
            Hoàn thành {doneCount}/{steps.length || 0} bước
          </p>
        </div>

        <div className="lte-license-status-row">
          <span className="lte-muted">Trạng thái hiện tại</span>
          <span className={`lte-badge ${statusTone(lic.effectiveStatus || form.status)}`}>
            {statusLabel(catalog, lic.effectiveStatus || form.status)}
          </span>
        </div>

        <form className="lte-form lte-license-form" onSubmit={submit}>
          <div className="lte-form-grid">
            <label>
              Số giấy phép
              <input
                value={form.licenseNo}
                onChange={(e) => setField("licenseNo", e.target.value)}
                placeholder="VD: GP-SK-2026-001"
                required
                autoComplete="off"
              />
            </label>
            <label>
              Loại giấy phép
              <select
                value={form.licenseType}
                onChange={(e) => setField("licenseType", e.target.value)}
              >
                {(catalog.types || []).map((t) => (
                  <option key={t.key} value={t.key}>
                    {t.label}
                  </option>
                ))}
              </select>
            </label>
            <label className="lte-span-2">
              Cơ quan cấp
              <input
                value={form.issuingAuthority}
                onChange={(e) => setField("issuingAuthority", e.target.value)}
                placeholder="Sở VHTTDL / UBND…"
                required
                autoComplete="organization"
              />
            </label>
            <label>
              Ngày cấp
              <input
                type="date"
                value={form.issuedAt}
                onChange={(e) => setField("issuedAt", e.target.value)}
              />
            </label>
            <label>
              Ngày hết hạn
              <input
                type="date"
                value={form.expiresAt}
                onChange={(e) => setField("expiresAt", e.target.value)}
              />
            </label>
          </div>

          <div className={`lte-upload-zone ${lic.hasDocument ? "has-file" : ""}`}>
            <div className="lte-upload-zone-head">
              <span className="lte-upload-zone-icon">
                <Upload size={18} />
              </span>
              <div>
                <strong>File giấy phép gốc</strong>
                <p>PDF, JPG, PNG hoặc WEBP · tối đa {maxMb}MB</p>
              </div>
            </div>

            {lic.hasDocument ? (
              <div className="lte-upload-chip">
                <Paperclip size={15} />
                <span className="lte-upload-chip-name">
                  {lic.uploadedOriginalName || "Đã có hồ sơ đính kèm"}
                </span>
                <button
                  type="button"
                  className="lte-btn lte-btn-default lte-btn-sm"
                  disabled={busy || uploadBusy}
                  onClick={onViewDocument}
                >
                  Xem
                </button>
                {lic.effectiveStatus !== "approved" ? (
                  <button
                    type="button"
                    className="lte-icon-btn danger"
                    title="Xóa file"
                    disabled={uploadBusy}
                    onClick={onRemoveUpload}
                  >
                    <Trash2 size={14} />
                  </button>
                ) : null}
              </div>
            ) : (
              <p className="lte-upload-hint">
                Bắt buộc đính kèm trước khi gửi chờ duyệt hoặc cấp phép.
              </p>
            )}

            <label className="lte-upload-pick">
              <input
                ref={fileRef}
                type="file"
                accept={catalog?.upload?.accept || ".pdf,.jpg,.jpeg,.png,.webp"}
                disabled={uploadBusy || busy}
                onChange={pickFile}
              />
              <span className="lte-btn lte-btn-default lte-btn-sm">
                {uploadBusy ? (
                  <>
                    <Loader2 size={14} className="spin" /> Đang tải…
                  </>
                ) : (
                  <>
                    <Upload size={14} /> {lic.hasDocument ? "Thay file khác" : "Chọn file"}
                  </>
                )}
              </span>
            </label>
          </div>

          <label>
            Link bổ sung (tuỳ chọn)
            <input
              value={form.documentUrl}
              onChange={(e) => setField("documentUrl", e.target.value)}
              placeholder="https://… nếu hồ sơ lưu ngoài hệ thống"
            />
          </label>
          <label>
            Ghi chú
            <textarea
              rows={3}
              value={form.notes}
              onChange={(e) => setField("notes", e.target.value)}
              placeholder="Ghi chú nội bộ về hồ sơ…"
            />
          </label>

          <div className="lte-license-form-actions">
            <button type="submit" className="lte-btn lte-btn-primary" disabled={busy || uploadBusy}>
              <Save size={15} /> {busy ? "Đang lưu…" : "Lưu nháp"}
            </button>
            {form.licenseNo ? (
              <button
                type="button"
                className="lte-btn lte-btn-default"
                disabled={busy || uploadBusy}
                onClick={() => onViewPdf?.(form.licenseNo)}
              >
                <FileText size={15} /> PDF hệ thống
              </button>
            ) : null}
          </div>
        </form>
      </div>
    </AdminModal>
  );
}

export default function AdminLicensesPanel({ onMessage }) {
  const [items, setItems] = useState([]);
  const [stats, setStats] = useState({});
  const [catalog, setCatalog] = useState({ types: [], statuses: [], upload: null });
  const [q, setQ] = useState("");
  const [status, setStatus] = useState("");
  const [loading, setLoading] = useState(false);
  const [busyId, setBusyId] = useState(null);
  const [editId, setEditId] = useState(null);
  const [editRow, setEditRow] = useState(null);
  const [uploadBusy, setUploadBusy] = useState(false);
  const [dialog, setDialog] = useState(null);

  const qRef = useRef(q);
  const statusRef = useRef(status);
  const editIdRef = useRef(editId);
  qRef.current = q;
  statusRef.current = status;
  editIdRef.current = editId;

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const data = await getAdminLicenses({
        q: qRef.current.trim() || undefined,
        status: statusRef.current || undefined,
        limit: 200,
      });
      setItems(data.items || []);
      setStats(data.stats || {});
      setCatalog(data.catalog || { types: [], statuses: [] });
      const currentId = editIdRef.current;
      if (currentId) {
        const row = (data.items || []).find((r) => r.eventId === currentId);
        if (row) setEditRow(row);
      }
    } catch (err) {
      onMessage?.(err.response?.data?.error || err.message || "Không tải được giấy phép");
    } finally {
      setLoading(false);
    }
  }, [onMessage]);

  useEffect(() => {
    load();
  }, [load]);

  function startEdit(row) {
    setEditId(row.eventId);
    setEditRow(row);
  }

  function closeEdit() {
    setEditId(null);
    setEditRow(null);
  }

  async function onSave(form) {
    if (!editId) return;
    const editLic = editRow?.license || {};
    setBusyId(editId);
    try {
      const keepStatus = ["pending", "approved", "suspended", "expired", "rejected"].includes(
        editLic.effectiveStatus
      )
        ? editLic.effectiveStatus
        : "draft";
      const data = await updateAdminLicense(editId, {
        ...form,
        status: keepStatus,
        issuedAt: form.issuedAt || null,
        expiresAt: form.expiresAt || null,
      });
      setEditRow(data);
      onMessage?.(
        keepStatus === "draft"
          ? "Đã lưu hồ sơ (nháp). Tiếp theo: upload file, gửi chờ duyệt, rồi cấp phép."
          : "Đã cập nhật hồ sơ giấy phép."
      );
      await load();
    } catch (err) {
      onMessage?.(err.response?.data?.error || err.message);
    } finally {
      setBusyId(null);
    }
  }

  async function onUploadFile(file) {
    if (!editId || !file) return;
    const maxMb = catalog?.upload?.maxSizeMb || 12;
    if (file.size > maxMb * 1024 * 1024) {
      onMessage?.(`File quá lớn (tối đa ${maxMb}MB)`);
      return;
    }
    setUploadBusy(true);
    try {
      const data = await uploadAdminLicenseDocument(editId, file);
      setEditRow(data);
      onMessage?.(`Đã upload «${file.name}». Có thể gửi chờ duyệt.`);
      await load();
    } catch (err) {
      onMessage?.(err.response?.data?.error || err.message);
    } finally {
      setUploadBusy(false);
    }
  }

  async function onRemoveUpload() {
    if (!editId) return;
    setDialog({
      type: "confirm",
      title: "Xóa hồ sơ đính kèm?",
      message: "File giấy phép đã upload sẽ bị xóa khỏi hệ thống.",
      confirmLabel: "Xóa file",
      tone: "danger",
      icon: Trash2,
      onConfirm: async () => {
        setDialog(null);
        setUploadBusy(true);
        try {
          const data = await deleteAdminLicenseDocument(editId);
          setEditRow(data);
          onMessage?.("Đã xóa file đính kèm.");
          await load();
        } catch (err) {
          onMessage?.(err.response?.data?.error || err.message);
        } finally {
          setUploadBusy(false);
        }
      },
    });
  }

  async function runStatusChange(eventId, nextStatus, extra = {}) {
    setBusyId(eventId);
    try {
      const data = await patchAdminLicenseStatus(eventId, { status: nextStatus, ...extra });
      if (editId === eventId) setEditRow(data);
      onMessage?.(
        nextStatus === "approved"
          ? "Đã cấp phép sự kiện."
          : nextStatus === "pending"
            ? "Đã gửi hồ sơ chờ duyệt."
            : nextStatus === "rejected"
              ? "Đã từ chối hồ sơ."
              : "Đã cập nhật trạng thái."
      );
      await load();
    } catch (err) {
      onMessage?.(err.response?.data?.error || err.message);
    } finally {
      setBusyId(null);
    }
  }

  function onQuickStatus(eventId, nextStatus) {
    if (nextStatus === "rejected") {
      setDialog({
        type: "prompt",
        title: "Từ chối giấy phép?",
        message: "Nhập lý do từ chối (bắt buộc).",
        promptLabel: "Lý do từ chối",
        promptRequired: true,
        confirmLabel: "Từ chối",
        tone: "danger",
        icon: XCircle,
        onConfirm: async (reason) => {
          setDialog(null);
          await runStatusChange(eventId, "rejected", { rejectionReason: reason });
        },
      });
      return;
    }
    if (nextStatus === "approved") {
      setDialog({
        type: "confirm",
        title: "Cấp phép sự kiện?",
        message: "Xác nhận hồ sơ đủ điều kiện và cấp phép trên hệ thống.",
        confirmLabel: "Cấp phép",
        icon: CheckCircle2,
        onConfirm: async () => {
          setDialog(null);
          await runStatusChange(eventId, "approved");
        },
      });
      return;
    }
    if (nextStatus === "pending") {
      setDialog({
        type: "confirm",
        title: "Gửi chờ duyệt?",
        message: "Hồ sơ sẽ chuyển sang trạng thái chờ duyệt sau khi đã có file đính kèm.",
        confirmLabel: "Gửi duyệt",
        icon: Clock3,
        onConfirm: async () => {
          setDialog(null);
          await runStatusChange(eventId, "pending");
        },
      });
      return;
    }
    runStatusChange(eventId, nextStatus);
  }

  async function onViewPdf(eventId, licenseNo) {
    setBusyId(eventId);
    try {
      const opened = await openAdminLicensePdf(eventId);
      if (opened.popupBlocked) {
        onMessage?.(`Trình duyệt chặn popup. PDF: ${opened.url}`);
      } else {
        onMessage?.(`Đã mở PDF hệ thống${licenseNo ? ` ${licenseNo}` : ""}.`);
      }
    } catch (err) {
      onMessage?.(err.message || "Không mở được PDF");
    } finally {
      setBusyId(null);
    }
  }

  async function onViewDocument(eventId) {
    setBusyId(eventId);
    try {
      const opened = await openAdminLicenseDocument(eventId);
      if (opened.popupBlocked) onMessage?.(`Popup bị chặn: ${opened.url}`);
      else onMessage?.("Đã mở hồ sơ đính kèm (file upload).");
    } catch (err) {
      onMessage?.(err.message || "Không mở được hồ sơ");
    } finally {
      setBusyId(null);
    }
  }

  const statCards = [
    { key: "approved", label: "Đã cấp phép", icon: CheckCircle2, tone: "teal" },
    { key: "pending", label: "Chờ duyệt", icon: Clock3, tone: "amber" },
    { key: "none", label: "Chưa có hồ sơ", icon: FileBadge2, tone: "sky" },
    { key: "expired", label: "Hết hạn / từ chối", icon: Ban, tone: "rose" },
  ];

  function statValue(key) {
    if (key === "expired") {
      return (stats.expired || 0) + (stats.rejected || 0) + (stats.suspended || 0);
    }
    return stats[key] || 0;
  }

  return (
    <div className="lte-panel">
      <div className="lte-stats-grid" style={{ gridTemplateColumns: "repeat(4, minmax(0, 1fr))" }}>
        {statCards.map((c) => {
          const Icon = c.icon;
          return (
            <div key={c.key} className="lte-stat-card">
              <div className={`lte-stat-icon tone-${c.tone}`}>
                <Icon size={18} />
              </div>
              <div>
                <span>{c.label}</span>
                <strong>{statValue(c.key)}</strong>
              </div>
            </div>
          );
        })}
      </div>

      <div className="lte-box">
        <div className="lte-box-header lte-box-header-tools">
          <h3>
            <Stamp size={18} /> Giấy phép hoạt động sự kiện
          </h3>
          <form
            className="lte-filter-bar"
            onSubmit={(e) => {
              e.preventDefault();
              load();
            }}
          >
            <label className="lte-search-field">
              <Search size={15} aria-hidden />
              <input
                type="search"
                placeholder="Tên sự kiện, số GP, cơ quan…"
                value={q}
                onChange={(e) => setQ(e.target.value)}
              />
            </label>
            <select
              value={status}
              onChange={(e) => {
                setStatus(e.target.value);
                statusRef.current = e.target.value;
                queueMicrotask(() => load());
              }}
            >
              <option value="">Mọi trạng thái</option>
              {(catalog.statuses || []).map((s) => (
                <option key={s.key} value={s.key}>
                  {s.label}
                </option>
              ))}
            </select>
            <button type="submit" className="lte-btn lte-btn-primary" disabled={loading}>
              <Search size={14} /> Lọc
            </button>
            <button type="button" className="lte-btn lte-btn-default" onClick={load} disabled={loading}>
              <RefreshCw size={14} className={loading ? "spin" : undefined} />
            </button>
          </form>
        </div>

        <p className="lte-hint" style={{ padding: "0 1.1rem 0.75rem", margin: 0 }}>
          Quy trình: <strong>Khai báo</strong> · <strong>Upload file GP</strong> ·{" "}
          <strong>Gửi chờ duyệt</strong> · <strong>Cấp phép</strong>. Không cấp phép nếu thiếu hồ sơ
          đính kèm.
        </p>

        <div className="lte-box-body lte-box-body-flush">
          {loading && !items.length ? (
            <p className="lte-empty">
              <Loader2 size={16} className="spin" /> Đang tải…
            </p>
          ) : (
            <div className="lte-table-wrap">
              <table className="lte-table">
                <thead>
                  <tr>
                    <th>Sự kiện</th>
                    <th>Số GP</th>
                    <th>Hồ sơ</th>
                    <th>Cơ quan cấp</th>
                    <th>Hiệu lực</th>
                    <th>Trạng thái</th>
                    <th className="lte-col-actions">Thao tác</th>
                  </tr>
                </thead>
                <tbody>
                  {items.map((row) => {
                    const lic = row.license;
                    const editing = editId === row.eventId;
                    return (
                      <tr key={row.eventId} className={editing ? "is-active-row" : undefined}>
                        <td>
                          <div className="lte-cell-stack">
                            <strong>{row.title}</strong>
                            <span>{row.location}</span>
                            <span>
                              {row.startTime
                                ? new Date(row.startTime).toLocaleString("vi-VN")
                                : "—"}
                            </span>
                          </div>
                        </td>
                        <td>
                          <code className="lte-code">{lic.licenseNo || "—"}</code>
                        </td>
                        <td>
                          {lic.hasDocument ? (
                            <button
                              type="button"
                              className="lte-btn lte-btn-default lte-btn-sm"
                              disabled={busyId === row.eventId}
                              onClick={() => onViewDocument(row.eventId)}
                              title={lic.uploadedOriginalName || "Xem hồ sơ"}
                            >
                              <Paperclip size={13} /> Có file
                            </button>
                          ) : (
                            <span className="lte-muted">Chưa upload</span>
                          )}
                        </td>
                        <td>{lic.issuingAuthority || "—"}</td>
                        <td className="lte-nowrap">
                          {lic.issuedAt ? toInputDate(lic.issuedAt) : "—"}
                          {" · "}
                          {lic.expiresAt ? toInputDate(lic.expiresAt) : "—"}
                        </td>
                        <td>
                          <span className={`lte-badge ${statusTone(lic.effectiveStatus)}`}>
                            {statusLabel(catalog, lic.effectiveStatus)}
                          </span>
                        </td>
                        <td>
                          <div className="lte-action-group">
                            <button
                              type="button"
                              className="lte-btn lte-btn-default"
                              disabled={busyId === row.eventId}
                              onClick={() => (editing ? closeEdit() : startEdit(row))}
                            >
                              {editing ? "Đóng" : "Hồ sơ"}
                            </button>
                            {lic.licenseNo ? (
                              <button
                                type="button"
                                className="lte-icon-btn"
                                title="PDF hệ thống"
                                disabled={busyId === row.eventId}
                                onClick={() => onViewPdf(row.eventId, lic.licenseNo)}
                              >
                                <FileText size={14} />
                              </button>
                            ) : null}
                            {lic.workflow?.canSubmitPending ||
                            lic.effectiveStatus === "draft" ||
                            lic.effectiveStatus === "none" ? (
                              <button
                                type="button"
                                className="lte-icon-btn"
                                title="Gửi chờ duyệt"
                                disabled={busyId === row.eventId}
                                onClick={() => onQuickStatus(row.eventId, "pending")}
                              >
                                <Clock3 size={14} />
                              </button>
                            ) : null}
                            {lic.effectiveStatus === "pending" && (
                              <button
                                type="button"
                                className="lte-icon-btn primary"
                                title="Cấp phép"
                                disabled={busyId === row.eventId}
                                onClick={() => onQuickStatus(row.eventId, "approved")}
                              >
                                <CheckCircle2 size={14} />
                              </button>
                            )}
                            {lic.effectiveStatus !== "rejected" && (
                              <button
                                type="button"
                                className="lte-icon-btn danger"
                                title="Từ chối"
                                disabled={busyId === row.eventId}
                                onClick={() => onQuickStatus(row.eventId, "rejected")}
                              >
                                <XCircle size={14} />
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                  {!items.length && !loading && (
                    <tr>
                      <td colSpan={7}>
                        <div className="lte-empty">Không có sự kiện khớp bộ lọc.</div>
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      <LicenseProfileModal
        open={Boolean(editId && editRow)}
        row={editRow}
        catalog={catalog}
        busy={busyId === editId}
        uploadBusy={uploadBusy}
        onClose={closeEdit}
        onSave={onSave}
        onUpload={onUploadFile}
        onRemoveUpload={onRemoveUpload}
        onViewDocument={() => onViewDocument(editId)}
        onViewPdf={(licenseNo) => onViewPdf(editId, licenseNo)}
        onSubmitPending={() => onQuickStatus(editId, "pending")}
        onApprove={() => onQuickStatus(editId, "approved")}
      />

      <AdminConfirmModal
        open={Boolean(dialog)}
        onClose={() => setDialog(null)}
        onConfirm={dialog?.onConfirm}
        title={dialog?.title}
        message={dialog?.message}
        confirmLabel={dialog?.confirmLabel}
        tone={dialog?.tone}
        icon={dialog?.icon}
        promptLabel={dialog?.type === "prompt" ? dialog.promptLabel : undefined}
        promptDefault={dialog?.promptDefault || ""}
        promptRequired={dialog?.type === "prompt"}
        busy={busyId != null || uploadBusy}
      />
    </div>
  );
}
