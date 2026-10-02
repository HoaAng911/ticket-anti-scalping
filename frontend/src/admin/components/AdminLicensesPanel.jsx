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

function typeLabel(catalog, key) {
  return catalog?.types?.find((t) => t.key === key)?.label || key || "—";
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
  const [form, setForm] = useState(emptyEdit);
  const [uploadBusy, setUploadBusy] = useState(false);
  const [dialog, setDialog] = useState(null);
  const fileRef = useRef(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const data = await getAdminLicenses({
        q: q.trim() || undefined,
        status: status || undefined,
        limit: 200,
      });
      setItems(data.items || []);
      setStats(data.stats || {});
      setCatalog(data.catalog || { types: [], statuses: [] });
      if (editId) {
        const row = (data.items || []).find((r) => r.eventId === editId);
        if (row) setEditRow(row);
      }
    } catch (err) {
      onMessage?.(err.response?.data?.error || err.message || "Không tải được giấy phép");
    } finally {
      setLoading(false);
    }
  }, [q, status, onMessage, editId]);

  useEffect(() => {
    load();
  }, [load]);

  function startEdit(row) {
    const lic = row.license || {};
    setEditId(row.eventId);
    setEditRow(row);
    setForm({
      licenseNo: lic.licenseNo || "",
      licenseType: lic.licenseType || "to_chuc_su_kien",
      issuingAuthority: lic.issuingAuthority || "",
      issuedAt: toInputDate(lic.issuedAt),
      expiresAt: toInputDate(lic.expiresAt),
      status: lic.status === "none" ? "draft" : lic.status || "draft",
      documentUrl: lic.documentUrl || "",
      notes: lic.notes || "",
      rejectionReason: lic.rejectionReason || "",
    });
  }

  async function onSave(e) {
    e.preventDefault();
    if (!editId) return;
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
          ? "Đã lưu hồ sơ (nháp). Tiếp theo: upload file → gửi chờ duyệt → cấp phép."
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
      if (fileRef.current) fileRef.current.value = "";
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

  async function runStatusChange(eventId, nextStatus, rejectionReason) {
    setBusyId(eventId);
    try {
      const data = await patchAdminLicenseStatus(eventId, { status: nextStatus, rejectionReason });
      if (editId === eventId) setEditRow(data);
      onMessage?.(
        nextStatus === "approved"
          ? "Đã cấp phép hoạt động."
          : nextStatus === "rejected"
            ? "Đã từ chối hồ sơ."
            : nextStatus === "pending"
              ? "Đã gửi chờ duyệt."
              : `Đã cập nhật trạng thái: ${nextStatus}`
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
        title: "Từ chối hồ sơ",
        message: "Nhập lý do từ chối để ban tổ chức chỉnh sửa lại.",
        promptLabel: "Lý do từ chối",
        promptDefault: "Hồ sơ chưa đủ điều kiện",
        confirmLabel: "Từ chối",
        tone: "danger",
        icon: XCircle,
        onConfirm: async (reason) => {
          setDialog(null);
          await runStatusChange(eventId, "rejected", reason);
        },
      });
      return;
    }
    if (nextStatus === "approved") {
      setDialog({
        type: "confirm",
        title: "Cấp phép hoạt động?",
        message: "Xác nhận hồ sơ hợp lệ và cấp phép cho sự kiện này.",
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

  const editLic = editRow?.license || {};
  const workflow = editLic.workflow || { steps: [] };

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
            <select value={status} onChange={(e) => setStatus(e.target.value)}>
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
          Quy trình: <strong>Khai báo</strong> → <strong>Upload file GP</strong> (PDF/ảnh) →{" "}
          <strong>Gửi chờ duyệt</strong> → <strong>Cấp phép</strong>. Không cấp phép nếu thiếu hồ sơ
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
                      <tr key={row.eventId}>
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
                              className="lte-btn lte-btn-default"
                              style={{ padding: "0.25rem 0.5rem", fontSize: "0.8rem" }}
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
                          {" → "}
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
                              onClick={() => (editing ? setEditId(null) : startEdit(row))}
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

      {editId && (
        <AdminModal
          open
          size="lg"
          icon={Stamp}
          title="Hồ sơ giấy phép"
          subtitle={editRow?.title || "Cập nhật theo quy trình khai báo → upload → duyệt"}
          onClose={() => {
            setEditId(null);
            setEditRow(null);
          }}
          footer={
            <>
              <button
                type="button"
                className="lte-btn lte-btn-default"
                onClick={() => {
                  setEditId(null);
                  setEditRow(null);
                }}
              >
                Đóng
              </button>
              <button
                type="button"
                className="lte-btn lte-btn-default"
                disabled={busyId === editId || !editLic.workflow?.canSubmitPending}
                onClick={() => onQuickStatus(editId, "pending")}
              >
                <Clock3 size={15} /> Gửi chờ duyệt
              </button>
              <button
                type="button"
                className="lte-btn lte-btn-primary"
                disabled={busyId === editId || !editLic.workflow?.canApprove}
                onClick={() => onQuickStatus(editId, "approved")}
              >
                <CheckCircle2 size={15} /> Cấp phép
              </button>
            </>
          }
        >
            <ol className="lte-workflow">
              {(workflow.steps || []).map((s) => (
                <li key={s.key} className={s.done ? "done" : ""}>
                  {s.done ? <CheckCircle2 size={14} /> : <span className="dot" />}
                  {s.label}
                </li>
              ))}
            </ol>

            <form className="lte-form" onSubmit={onSave} style={{ maxWidth: "none" }}>
              <div className="lte-form-grid">
                <label>
                  Số giấy phép
                  <input
                    value={form.licenseNo}
                    onChange={(e) => setForm({ ...form, licenseNo: e.target.value })}
                    placeholder="VD: GP-SK-2026-001"
                    required
                  />
                </label>
                <label>
                  Loại giấy phép
                  <select
                    value={form.licenseType}
                    onChange={(e) => setForm({ ...form, licenseType: e.target.value })}
                  >
                    {(catalog.types || []).map((t) => (
                      <option key={t.key} value={t.key}>
                        {t.label}
                      </option>
                    ))}
                  </select>
                </label>
                <label>
                  Cơ quan cấp
                  <input
                    value={form.issuingAuthority}
                    onChange={(e) => setForm({ ...form, issuingAuthority: e.target.value })}
                    placeholder="Sở VHTTDL / UBND…"
                    required
                  />
                </label>
                <label>
                  Trạng thái hiện tại
                  <input
                    value={statusLabel(catalog, editLic.effectiveStatus || form.status)}
                    disabled
                  />
                </label>
                <label>
                  Ngày cấp
                  <input
                    type="date"
                    value={form.issuedAt}
                    onChange={(e) => setForm({ ...form, issuedAt: e.target.value })}
                  />
                </label>
                <label>
                  Ngày hết hạn
                  <input
                    type="date"
                    value={form.expiresAt}
                    onChange={(e) => setForm({ ...form, expiresAt: e.target.value })}
                  />
                </label>
              </div>

              <div className="lte-upload-box">
                <div className="lte-upload-head">
                  <Upload size={16} />
                  <strong>Upload file giấy phép gốc</strong>
                  <span>PDF / JPG / PNG / WEBP · tối đa {catalog?.upload?.maxSizeMb || 12}MB</span>
                </div>
                {editLic.hasDocument ? (
                  <div className="lte-upload-file">
                    <Paperclip size={15} />
                    <span>{editLic.uploadedOriginalName || "Đã có hồ sơ đính kèm"}</span>
                    <button
                      type="button"
                      className="lte-btn lte-btn-default"
                      disabled={busyId === editId || uploadBusy}
                      onClick={() => onViewDocument(editId)}
                    >
                      Xem
                    </button>
                    {editLic.effectiveStatus !== "approved" && (
                      <button
                        type="button"
                        className="lte-btn lte-btn-default"
                        disabled={uploadBusy}
                        onClick={onRemoveUpload}
                      >
                        <Trash2 size={14} /> Xóa
                      </button>
                    )}
                  </div>
                ) : (
                  <p className="lte-muted" style={{ margin: "0.35rem 0 0.6rem" }}>
                    Chưa có file — bắt buộc upload trước khi gửi chờ duyệt / cấp phép.
                  </p>
                )}
                <input
                  ref={fileRef}
                  type="file"
                  accept={catalog?.upload?.accept || ".pdf,.jpg,.jpeg,.png,.webp"}
                  disabled={uploadBusy}
                  onChange={(e) => onUploadFile(e.target.files?.[0])}
                />
              </div>

              <label>
                Link bổ sung (tuỳ chọn)
                <input
                  value={form.documentUrl}
                  onChange={(e) => setForm({ ...form, documentUrl: e.target.value })}
                  placeholder="https://… nếu hồ sơ lưu ngoài hệ thống"
                />
              </label>
              <label>
                Ghi chú
                <textarea
                  rows={3}
                  value={form.notes}
                  onChange={(e) => setForm({ ...form, notes: e.target.value })}
                />
              </label>

              <div className="lte-action-group" style={{ gap: 8, flexWrap: "wrap" }}>
                <button type="submit" className="lte-btn lte-btn-primary" disabled={busyId === editId}>
                  <Save size={15} /> {busyId === editId ? "Đang lưu…" : "Lưu nháp"}
                </button>
                {form.licenseNo ? (
                  <button
                    type="button"
                    className="lte-btn lte-btn-default"
                    disabled={busyId === editId}
                    onClick={() => onViewPdf(editId, form.licenseNo)}
                  >
                    <FileText size={15} /> PDF hệ thống
                  </button>
                ) : null}
              </div>
            </form>
        </AdminModal>
      )}

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
