import { useCallback, useEffect, useState } from "react";
import {
  ListMusic,
  Search,
  RefreshCw,
  Plus,
  Loader2,
  Pencil,
  Trash2,
  CalendarClock,
  Mic2,
  MapPin,
} from "lucide-react";
import {
  getProgramCatalog,
  getAdminEventPrograms,
  getAdminEventProgram,
  createAdminProgramItem,
  updateAdminProgramItem,
  deleteAdminProgramItem,
} from "../../services/api.js";
import AdminModal, { AdminConfirmModal } from "./AdminModal.jsx";

const emptyItemForm = () => ({
  title: "",
  description: "",
  itemType: "performance",
  startAt: "",
  endAt: "",
  memberId: "",
  stage: "",
  sortOrder: "0",
  notes: "",
});

function toLocalInput(v) {
  if (!v) return "";
  try {
    const d = new Date(v);
    if (!Number.isFinite(d.getTime())) return "";
    const pad = (n) => String(n).padStart(2, "0");
    return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
  } catch {
    return "";
  }
}

function formatWhen(v) {
  if (!v) return "—";
  try {
    return new Date(v).toLocaleString("vi-VN", {
      day: "2-digit",
      month: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
    });
  } catch {
    return "—";
  }
}

function ProgramItemModal({
  open,
  mode,
  initial,
  catalog,
  unitMembers = [],
  unit,
  busy,
  onClose,
  onSave,
}) {
  const [form, setForm] = useState(emptyItemForm);
  const itemKey = mode === "edit" ? initial?.id || "edit" : "create";

  useEffect(() => {
    if (!open) return;
    if (mode === "edit" && initial) {
      setForm({
        title: initial.title || "",
        description: initial.description || "",
        itemType: initial.itemType || "performance",
        startAt: toLocalInput(initial.startAt),
        endAt: toLocalInput(initial.endAt),
        memberId: initial.memberId || "",
        stage: initial.stage || "",
        sortOrder: String(initial.sortOrder ?? 0),
        notes: initial.notes || "",
      });
    } else {
      setForm(emptyItemForm());
    }
  }, [open, mode, itemKey]);

  function setField(field, value) {
    setForm((f) => ({ ...f, [field]: value }));
  }

  function submit(e) {
    e.preventDefault();
    onSave?.({
      title: form.title.trim(),
      description: form.description.trim(),
      itemType: form.itemType,
      startAt: form.startAt ? new Date(form.startAt).toISOString() : null,
      endAt: form.endAt ? new Date(form.endAt).toISOString() : null,
      memberId: form.memberId || null,
      stage: form.stage.trim(),
      sortOrder: Number(form.sortOrder) || 0,
      notes: form.notes.trim(),
    });
  }

  const membersByGroup = unitMembers.reduce((acc, m) => {
    const g = m.roleGroupLabel || m.roleGroup || "Khác";
    if (!acc[g]) acc[g] = [];
    acc[g].push(m);
    return acc;
  }, {});

  return (
    <AdminModal
      open={open}
      onClose={onClose}
      title={mode === "edit" ? "Sửa mục chương trình" : "Thêm mục chương trình"}
      subtitle={
        unit
          ? `Nhân sự lấy từ đơn vị ${unit.organizationName} (${unit.profileCode})`
          : "Cần gắn đơn vị BTC cho sự kiện trước"
      }
      icon={ListMusic}
      size="lg"
      footer={
        <>
          <button type="button" className="lte-btn lte-btn-default" onClick={onClose} disabled={busy}>
            Hủy
          </button>
          <button
            type="submit"
            form="lte-program-item-form"
            className="lte-btn lte-btn-primary"
            disabled={busy || !unitMembers.length}
          >
            {busy ? <Loader2 size={14} className="spin" /> : null}
            {mode === "edit" ? "Lưu" : "Thêm"}
          </button>
        </>
      }
    >
      {!unit ? (
        <p className="lte-help">
          Sự kiện chưa gắn đơn vị tổ chức. Vào tab «Sự kiện» chọn đơn vị BTC, rồi quay lại thêm chương
          trình.
        </p>
      ) : !unitMembers.length ? (
        <p className="lte-help">
          Đơn vị «{unit.organizationName}» chưa có thành viên. Thêm ca sĩ / nhân sự ở «Hồ sơ năng lực
          BTC» trước.
        </p>
      ) : null}

      <form id="lte-program-item-form" className="lte-form" onSubmit={submit}>
        <div className="lte-form-grid">
          <label className="lte-span-2">
            Tiêu đề *
            <input
              required
              value={form.title}
              onChange={(e) => setField("title", e.target.value)}
              placeholder="VD: Set 1 — Thanh Ca"
            />
          </label>
          <label className="lte-span-2">
            Ca sĩ / Nhân sự (từ đơn vị tổ chức) *
            <select
              required
              value={form.memberId}
              onChange={(e) => setField("memberId", e.target.value)}
              disabled={!unitMembers.length}
            >
              <option value="">— Chọn thành viên đơn vị —</option>
              {Object.entries(membersByGroup).map(([group, list]) => (
                <optgroup key={group} label={group}>
                  {list.map((m) => (
                    <option key={m.id} value={m.id}>
                      {m.displayName}
                      {m.roleLabel ? ` · ${m.roleLabel}` : ""}
                    </option>
                  ))}
                </optgroup>
              ))}
            </select>
          </label>
          <label>
            Loại
            <select value={form.itemType} onChange={(e) => setField("itemType", e.target.value)}>
              {(catalog.itemTypes || []).map((t) => (
                <option key={t.key} value={t.key}>
                  {t.label}
                </option>
              ))}
            </select>
          </label>
          <label>
            Thứ tự
            <input
              type="number"
              value={form.sortOrder}
              onChange={(e) => setField("sortOrder", e.target.value)}
            />
          </label>
          <label>
            Bắt đầu
            <input
              type="datetime-local"
              value={form.startAt}
              onChange={(e) => setField("startAt", e.target.value)}
            />
          </label>
          <label>
            Kết thúc
            <input
              type="datetime-local"
              value={form.endAt}
              onChange={(e) => setField("endAt", e.target.value)}
            />
          </label>
          <label className="lte-span-2">
            Sân khấu / Khu vực
            <input
              value={form.stage}
              onChange={(e) => setField("stage", e.target.value)}
              placeholder="Sân khấu chính…"
            />
          </label>
          <label className="lte-span-2">
            Mô tả
            <textarea
              rows={3}
              value={form.description}
              onChange={(e) => setField("description", e.target.value)}
              placeholder="Nội dung tiết mục…"
            />
          </label>
          <label className="lte-span-2">
            Ghi chú nội bộ
            <textarea
              rows={2}
              value={form.notes}
              onChange={(e) => setField("notes", e.target.value)}
              placeholder="Ghi chú BTC…"
            />
          </label>
        </div>
      </form>
    </AdminModal>
  );
}

export default function AdminEventProgramPanel({ onMessage }) {
  const [rows, setRows] = useState([]);
  const [stats, setStats] = useState({});
  const [catalog, setCatalog] = useState({ itemTypes: [] });
  const [q, setQ] = useState("");
  const [loading, setLoading] = useState(false);
  const [busy, setBusy] = useState(false);

  const [activeEventId, setActiveEventId] = useState(null);
  const [program, setProgram] = useState(null);
  const [programLoading, setProgramLoading] = useState(false);

  const [editor, setEditor] = useState(null);
  const [confirmDialog, setConfirmDialog] = useState(null);

  const loadList = useCallback(async () => {
    setLoading(true);
    try {
      const [list, cat] = await Promise.all([
        getAdminEventPrograms({ q: q || undefined }),
        getProgramCatalog(),
      ]);
      setRows(list.events || []);
      setStats(list.stats || {});
      setCatalog(cat || { itemTypes: [] });
    } catch (err) {
      onMessage?.(err.response?.data?.error || err.message);
    } finally {
      setLoading(false);
    }
  }, [q, onMessage]);

  useEffect(() => {
    loadList();
  }, []);

  async function openProgram(eventId) {
    setActiveEventId(eventId);
    setProgramLoading(true);
    try {
      const data = await getAdminEventProgram(eventId);
      setProgram(data.program || null);
    } catch (err) {
      onMessage?.(err.response?.data?.error || err.message);
      setProgram(null);
    } finally {
      setProgramLoading(false);
    }
  }

  function closeProgram() {
    setActiveEventId(null);
    setProgram(null);
    setEditor(null);
  }

  async function onSaveItem(payload) {
    if (!activeEventId) return;
    setBusy(true);
    try {
      const data =
        editor?.mode === "edit"
          ? await updateAdminProgramItem(activeEventId, editor.itemId, payload)
          : await createAdminProgramItem(activeEventId, payload);
      onMessage?.(data.message || "Đã lưu mục chương trình.");
      setEditor(null);
      setProgram(data.program || null);
      await loadList();
    } catch (err) {
      onMessage?.(err.response?.data?.error || err.message);
    } finally {
      setBusy(false);
    }
  }

  function askDeleteItem(item) {
    setConfirmDialog({
      title: "Xóa mục chương trình?",
      message: `Xóa «${item.title}» khỏi chương trình sự kiện.`,
      confirmLabel: "Xóa",
      tone: "danger",
      icon: Trash2,
      onConfirm: async () => {
        setConfirmDialog(null);
        setBusy(true);
        try {
          const data = await deleteAdminProgramItem(activeEventId, item.id);
          onMessage?.(data.message || "Đã xóa.");
          setProgram(data.program || null);
          await loadList();
        } catch (err) {
          onMessage?.(err.response?.data?.error || err.message);
        } finally {
          setBusy(false);
        }
      },
    });
  }

  return (
    <div className="lte-panel">
      <div className="lte-stats-grid" style={{ gridTemplateColumns: "repeat(3, minmax(0, 1fr))" }}>
        {[
          { key: "withProgram", label: "Đã có chương trình", tone: "teal" },
          { key: "emptyProgram", label: "Chưa có chương trình", tone: "amber" },
          { key: "totalItems", label: "Tổng mục", tone: "sky" },
        ].map((c) => (
          <div key={c.key} className="lte-stat-card">
            <div className={`lte-stat-icon tone-${c.tone}`}>
              <ListMusic size={18} />
            </div>
            <div>
              <span>{c.label}</span>
              <strong>{stats[c.key] || 0}</strong>
            </div>
          </div>
        ))}
      </div>

      <div className="lte-box">
        <div className="lte-box-header lte-box-header-tools">
          <h3>
            <ListMusic size={18} /> Chương trình theo sự kiện
          </h3>
          <form
            className="lte-filter-bar"
            onSubmit={(e) => {
              e.preventDefault();
              loadList();
            }}
          >
            <label className="lte-search-field">
              <Search size={15} aria-hidden />
              <input
                type="search"
                placeholder="Tên sự kiện, tiết mục, nghệ sĩ…"
                value={q}
                onChange={(e) => setQ(e.target.value)}
              />
            </label>
            <button type="submit" className="lte-btn lte-btn-primary" disabled={loading}>
              <Search size={14} /> Lọc
            </button>
            <button type="button" className="lte-btn lte-btn-default" onClick={loadList} disabled={loading}>
              <RefreshCw size={14} className={loading ? "spin" : undefined} />
            </button>
          </form>
        </div>
        <p className="lte-hint" style={{ padding: "0 1.1rem 0.75rem", margin: 0 }}>
          Ca sĩ / nhân sự lấy từ <strong>thành viên đơn vị tổ chức</strong> đã gắn với sự kiện. Cần gắn
          đơn vị BTC trước (tab Sự kiện).
        </p>
        <div className="lte-box-body lte-box-body-flush">
          {loading && !rows.length ? (
            <p className="lte-empty">
              <Loader2 size={16} className="spin" /> Đang tải…
            </p>
          ) : !rows.length ? (
            <p className="lte-empty">Chưa có sự kiện.</p>
          ) : (
            <div className="lte-table-wrap">
              <table className="lte-table">
                <thead>
                  <tr>
                    <th>Sự kiện</th>
                    <th>Đơn vị tổ chức</th>
                    <th>Thời gian</th>
                    <th>Chương trình</th>
                    <th className="lte-col-actions">Thao tác</th>
                  </tr>
                </thead>
                <tbody>
                  {rows.map((row) => (
                    <tr key={row.eventId}>
                      <td>
                        <div className="lte-cell-stack">
                          <strong>{row.title}</strong>
                          <span>{row.location || "—"}</span>
                        </div>
                      </td>
                      <td>
                        {row.unit ? (
                          <div className="lte-cell-stack">
                            <code className="lte-code">{row.unit.profileCode}</code>
                            <span>{row.unit.organizationName}</span>
                          </div>
                        ) : (
                          <span className="lte-muted">Chưa gắn ĐV</span>
                        )}
                      </td>
                      <td>{formatWhen(row.startTime)}</td>
                      <td>
                        {row.programCount > 0 ? (
                          <div className="lte-cell-stack">
                            <strong>{row.programCount} mục</strong>
                            <span>
                              {row.preview?.title || "—"}
                              {row.preview?.performer ? ` · ${row.preview.performer}` : ""}
                            </span>
                          </div>
                        ) : (
                          <span className="lte-muted">Chưa có</span>
                        )}
                      </td>
                      <td>
                        <button
                          type="button"
                          className="lte-btn lte-btn-member"
                          onClick={() => openProgram(row.eventId)}
                        >
                          <ListMusic size={14} /> Quản lý
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      <AdminModal
        open={Boolean(activeEventId)}
        onClose={closeProgram}
        title="Chương trình sự kiện"
        subtitle={
          program
            ? `${program.title}${
                program.unit
                  ? ` · ĐV: ${program.unit.organizationName}`
                  : " · Chưa gắn đơn vị BTC"
              }`
            : "Đang tải…"
        }
        icon={ListMusic}
        size="xl"
        footer={
          <>
            <button type="button" className="lte-btn lte-btn-default" onClick={closeProgram}>
              Đóng
            </button>
            <button
              type="button"
              className="lte-btn lte-btn-success"
              disabled={!program || busy || !(program.unitMembers || []).length}
              title={
                !(program?.unitMembers || []).length
                  ? "Cần đơn vị BTC có thành viên"
                  : "Thêm mục"
              }
              onClick={() => setEditor({ mode: "create" })}
            >
              <Plus size={14} /> Thêm mục
            </button>
          </>
        }
      >
        {programLoading || !program ? (
          <p className="lte-empty">
            <Loader2 size={16} className="spin" /> Đang tải chương trình…
          </p>
        ) : !program.unit ? (
          <div className="lte-empty-card">
            <ListMusic size={28} />
            <p>Sự kiện chưa gắn đơn vị tổ chức.</p>
            <span>Vào tab «Sự kiện» chọn đơn vị BTC, rồi quay lại quản lý chương trình.</span>
          </div>
        ) : (program.unitMembers || []).length === 0 ? (
          <div className="lte-empty-card">
            <ListMusic size={28} />
            <p>Đơn vị chưa có thành viên.</p>
            <span>
              Thêm ca sĩ / nhân sự ở «Hồ sơ năng lực BTC» cho {program.unit.organizationName}.
            </span>
          </div>
        ) : (program.programItems || []).length === 0 ? (
          <div className="lte-empty-card">
            <ListMusic size={28} />
            <p>Chưa có mục chương trình.</p>
            <span>
              Chọn ca sĩ / nhân sự từ {program.unitMembers.length} thành viên của{" "}
              {program.unit.organizationName}.
            </span>
            <button
              type="button"
              className="lte-btn lte-btn-primary"
              onClick={() => setEditor({ mode: "create" })}
            >
              <Plus size={14} /> Thêm mục đầu tiên
            </button>
          </div>
        ) : (
          <div className="lte-program-timeline">
            {(program.programItems || []).map((item, idx) => (
              <article key={item.id} className="lte-program-item">
                <div className="lte-program-rail" aria-hidden>
                  <span>{idx + 1}</span>
                </div>
                <div className="lte-program-body">
                  <div className="lte-program-top">
                    <div>
                      <span className="lte-badge">{item.itemTypeLabel || item.itemType}</span>
                      <h4>{item.title}</h4>
                    </div>
                    <div className="lte-action-group">
                      <button
                        type="button"
                        className="lte-icon-btn"
                        title="Sửa"
                        disabled={busy}
                        onClick={() =>
                          setEditor({ mode: "edit", itemId: item.id, item })
                        }
                      >
                        <Pencil size={14} />
                      </button>
                      <button
                        type="button"
                        className="lte-icon-btn danger"
                        title="Xóa"
                        disabled={busy}
                        onClick={() => askDeleteItem(item)}
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                  </div>
                  <div className="lte-program-meta">
                    <span>
                      <CalendarClock size={13} /> {formatWhen(item.startAt)}
                      {item.endAt ? ` → ${formatWhen(item.endAt)}` : ""}
                    </span>
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
              </article>
            ))}
          </div>
        )}
      </AdminModal>

      <ProgramItemModal
        open={Boolean(editor)}
        mode={editor?.mode || "create"}
        initial={editor?.item}
        catalog={catalog}
        unit={program?.unit}
        unitMembers={program?.unitMembers || []}
        busy={busy}
        onClose={() => setEditor(null)}
        onSave={onSaveItem}
      />

      <AdminConfirmModal
        open={Boolean(confirmDialog)}
        title={confirmDialog?.title}
        message={confirmDialog?.message}
        confirmLabel={confirmDialog?.confirmLabel}
        tone={confirmDialog?.tone}
        icon={confirmDialog?.icon}
        onClose={() => setConfirmDialog(null)}
        onConfirm={confirmDialog?.onConfirm}
      />
    </div>
  );
}
