import { useCallback, useEffect, useState } from "react";
import {
  Award,
  Search,
  RefreshCw,
  Plus,
  Loader2,
  CheckCircle2,
  Clock3,
  Ban,
  Users,
  Trash2,
  UserPlus,
  Send,
  ShieldCheck,
  FileEdit,
  Pencil,
  Mic2,
  CalendarDays,
} from "lucide-react";
import {
  createAdminOrganizerMember,
  createAdminOrganizerProfile,
  deleteAdminOrganizerMember,
  deleteAdminOrganizerProfile,
  getAdminOrganizerProfiles,
  getOrganizerProfileCatalog,
  patchAdminOrganizerProfileStatus,
  updateAdminOrganizerMember,
  updateAdminOrganizerProfile,
} from "../../services/api.js";
import AdminModal, { AdminConfirmModal } from "./AdminModal.jsx";
import AdminMemberProfileModal from "./AdminMemberProfileModal.jsx";

const emptyOrgForm = () => ({
  organizationName: "",
  taxCode: "",
  address: "",
  phone: "",
  email: "",
  website: "",
  businessField: "",
  yearsOperating: "0",
  legalRepName: "",
  legalRepTitle: "",
  legalRepIdNumber: "",
  notes: "",
  payoutWallet: "",
  bankAccount: "",
  bankName: "",
  linkedUserEmail: "",
});

function statusTone(status) {
  if (status === "approved") return "ok";
  if (status === "pending") return "warn";
  return "";
}

function statusLabel(catalog, key) {
  return (catalog.statuses || []).find((s) => s.key === key)?.label || key || "—";
}

function roleLabel(catalog, key) {
  return (catalog.memberRoles || []).find((r) => r.key === key)?.label || key || "—";
}

function orgToForm(p) {
  return {
    organizationName: p.organizationName || "",
    taxCode: p.taxCode || "",
    address: p.address || "",
    phone: p.phone || "",
    email: p.email || "",
    website: p.website || "",
    businessField: p.businessField || "",
    yearsOperating: String(p.yearsOperating ?? 0),
    legalRepName: p.legalRepName || "",
    legalRepTitle: p.legalRepTitle || "",
    legalRepIdNumber: p.legalRepIdNumber || "",
    notes: p.notes || "",
    payoutWallet: p.payoutWallet || "",
    bankAccount: p.bankAccount || "",
    bankName: p.bankName || "",
    linkedUserEmail: p.linkedUser?.email || "",
  };
}

function orgFormToPayload(form) {
  return {
    organizationName: form.organizationName.trim(),
    taxCode: form.taxCode.trim(),
    address: form.address.trim(),
    phone: form.phone.trim(),
    email: form.email.trim(),
    website: form.website.trim(),
    businessField: form.businessField.trim(),
    yearsOperating: Number(form.yearsOperating) || 0,
    legalRepName: form.legalRepName.trim(),
    legalRepTitle: form.legalRepTitle.trim(),
    legalRepIdNumber: form.legalRepIdNumber.trim(),
    notes: form.notes.trim(),
    payoutWallet: form.payoutWallet.trim(),
    bankAccount: form.bankAccount.trim(),
    bankName: form.bankName.trim(),
    linkedUserEmail: form.linkedUserEmail.trim(),
  };
}

/** Modal đơn vị BTC — form local để gõ không re-render bảng */
function OrgUnitModal({ open, mode, initial, busy, onClose, onSave }) {
  const [form, setForm] = useState(emptyOrgForm);
  const editorKey = mode === "edit" ? initial?.id || "edit" : "create";

  useEffect(() => {
    if (!open) return;
    setForm(mode === "edit" && initial ? orgToForm(initial) : emptyOrgForm());
  }, [open, mode, editorKey]);

  function setField(field, value) {
    setForm((f) => ({ ...f, [field]: value }));
  }

  function submit(e) {
    e?.preventDefault?.();
    onSave?.(orgFormToPayload(form));
  }

  return (
    <AdminModal
      open={open}
      onClose={busy ? () => {} : onClose}
      closeOnBackdrop={!busy}
      title={mode === "edit" ? "Sửa đơn vị BTC" : "Thêm đơn vị BTC"}
      subtitle={
        mode === "edit" && initial?.profileCode
          ? `${initial.profileCode} · Khai báo pháp lý & liên hệ`
          : "Khai báo đơn vị, rồi thêm ca sĩ / nghệ sĩ / nhạc công…"
      }
      icon={Award}
      size="lg"
      footer={
        <>
          <button type="button" className="lte-btn lte-btn-default" disabled={busy} onClick={onClose}>
            Hủy
          </button>
          <button type="button" className="lte-btn lte-btn-primary" disabled={busy} onClick={submit}>
            {busy ? <Loader2 size={14} className="spin" /> : null}
            Lưu đơn vị
          </button>
        </>
      }
    >
      <form className="lte-form lte-org-form" onSubmit={submit}>
        <section className="lte-form-section">
          <h4 className="lte-form-section-title">Thông tin đơn vị</h4>
          <div className="lte-form-grid">
            <label className="lte-span-2">
              Tên đơn vị / Ban tổ chức *
              <input
                required
                autoComplete="organization"
                value={form.organizationName}
                onChange={(e) => setField("organizationName", e.target.value)}
              />
            </label>
            <label>
              Mã số thuế
              <input value={form.taxCode} onChange={(e) => setField("taxCode", e.target.value)} />
            </label>
            <label>
              Lĩnh vực
              <input
                value={form.businessField}
                onChange={(e) => setField("businessField", e.target.value)}
                placeholder="Biểu diễn / sự kiện…"
              />
            </label>
            <label>
              Điện thoại
              <input value={form.phone} onChange={(e) => setField("phone", e.target.value)} />
            </label>
            <label>
              Email
              <input
                type="email"
                value={form.email}
                onChange={(e) => setField("email", e.target.value)}
              />
            </label>
            <label className="lte-span-2">
              Địa chỉ
              <input value={form.address} onChange={(e) => setField("address", e.target.value)} />
            </label>
            <label>
              Website
              <input value={form.website} onChange={(e) => setField("website", e.target.value)} />
            </label>
            <label>
              Số năm hoạt động
              <input
                type="number"
                min="0"
                value={form.yearsOperating}
                onChange={(e) => setField("yearsOperating", e.target.value)}
              />
            </label>
          </div>
        </section>

        <section className="lte-form-section">
          <h4 className="lte-form-section-title">Người đại diện pháp luật</h4>
          <div className="lte-form-grid">
            <label>
              Họ và tên
              <input
                value={form.legalRepName}
                onChange={(e) => setField("legalRepName", e.target.value)}
              />
            </label>
            <label>
              Chức danh
              <input
                value={form.legalRepTitle}
                onChange={(e) => setField("legalRepTitle", e.target.value)}
              />
            </label>
            <label>
              CCCD / CMND
              <input
                value={form.legalRepIdNumber}
                onChange={(e) => setField("legalRepIdNumber", e.target.value)}
              />
            </label>
            <label className="lte-span-2">
              Ghi chú
              <textarea
                rows={2}
                value={form.notes}
                onChange={(e) => setField("notes", e.target.value)}
                placeholder="Ghi chú nội bộ…"
              />
            </label>
          </div>
        </section>

        <section className="lte-form-section">
          <h4 className="lte-form-section-title">Ví & tài khoản nhận tiền bán vé</h4>
          <p className="lte-help" style={{ marginTop: 0 }}>
            Khi sự kiện gắn đơn vị này bán hết vé, admin settle chuyển ETH doanh thu sơ cấp về ví
            này. Có thể sửa ngay cả khi hồ sơ đã duyệt.
          </p>
          <div className="lte-form-grid">
            <label className="lte-span-2">
              Ví nhận tiền (payoutWallet)
              <input
                value={form.payoutWallet}
                onChange={(e) => setField("payoutWallet", e.target.value)}
                placeholder="0x…"
                autoComplete="off"
              />
            </label>
            <label>
              Số tài khoản ngân hàng
              <input
                value={form.bankAccount}
                onChange={(e) => setField("bankAccount", e.target.value)}
                placeholder="Đối soát off-chain"
              />
            </label>
            <label>
              Ngân hàng
              <input
                value={form.bankName}
                onChange={(e) => setField("bankName", e.target.value)}
                placeholder="Vietcombank…"
              />
            </label>
            <label className="lte-span-2">
              Tài khoản đăng nhập liên kết (email user)
              <input
                type="email"
                value={form.linkedUserEmail}
                onChange={(e) => setField("linkedUserEmail", e.target.value)}
                placeholder="organizer@ticket.local"
              />
            </label>
          </div>
        </section>
      </form>
    </AdminModal>
  );
}

export default function AdminOrganizerProfilesPanel({ onMessage }) {
  const [items, setItems] = useState([]);
  const [stats, setStats] = useState({});
  const [catalog, setCatalog] = useState({
    statuses: [],
    memberRoles: [],
    memberRoleGroups: [],
  });
  const [q, setQ] = useState("");
  const [status, setStatus] = useState("");
  const [loading, setLoading] = useState(false);
  const [busyId, setBusyId] = useState(null);

  const [orgEditor, setOrgEditor] = useState(null);

  const [roster, setRoster] = useState(null);
  const [memberEditor, setMemberEditor] = useState(null);

  const [confirmDialog, setConfirmDialog] = useState(null);

  async function loadProfiles() {
    setLoading(true);
    try {
      const [list, cat] = await Promise.all([
        getAdminOrganizerProfiles({
          q: q || undefined,
          status: status || undefined,
        }),
        getOrganizerProfileCatalog(),
      ]);
      setItems(list.profiles || []);
      setStats(list.stats || {});
      setCatalog(cat);
      if (roster) {
        const fresh = (list.profiles || []).find((p) => p.id === roster.id);
        if (fresh) setRoster(fresh);
      }
    } catch (err) {
      onMessage?.(err.response?.data?.error || err.message);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadProfiles();
  }, []);

  const canEditMembers = roster && roster.status !== "approved";

  function openCreateOrg() {
    setOrgEditor({ mode: "create" });
  }

  function openEditOrg(row) {
    setOrgEditor({ mode: "edit", id: row.id, code: row.profileCode, row });
  }

  async function onSaveOrg(payload) {
    if (!payload?.organizationName && orgEditor?.row?.status !== "approved") {
      onMessage?.("Thiếu tên đơn vị / ban tổ chức");
      return;
    }
    setBusyId(orgEditor?.id || "new-org");
    try {
      let body = payload;
      // Hồ sơ đã duyệt: chỉ gửi ví / NH / tài khoản liên kết
      if (orgEditor?.mode === "edit" && orgEditor?.row?.status === "approved") {
        body = {
          payoutWallet: payload.payoutWallet,
          bankAccount: payload.bankAccount,
          bankName: payload.bankName,
          linkedUserEmail: payload.linkedUserEmail,
        };
      }
      const data =
        orgEditor?.mode === "edit"
          ? await updateAdminOrganizerProfile(orgEditor.id, body)
          : await createAdminOrganizerProfile(payload);
      onMessage?.(data.message || "Đã lưu đơn vị.");
      setOrgEditor(null);
      await loadProfiles();
      if (orgEditor?.mode === "create" && data.profile) {
        setRoster(data.profile);
      }
    } catch (err) {
      onMessage?.(err.response?.data?.error || err.message);
    } finally {
      setBusyId(null);
    }
  }

  function openCreateMember(profile = roster) {
    if (!profile) return;
    if (profile.status === "approved") {
      onMessage?.("Hồ sơ đã duyệt — từ chối trước khi thêm thành viên.");
      return;
    }
    setMemberEditor({ mode: "create", profileId: profile.id, profile, member: null });
  }

  function openViewMember(profile, member) {
    setMemberEditor({
      mode: "view",
      profileId: profile.id,
      memberId: member.id,
      profile,
      member,
    });
  }

  function openEditMember(profile, member) {
    if (profile.status === "approved") {
      onMessage?.("Hồ sơ đã duyệt — từ chối trước khi sửa thành viên.");
      return;
    }
    setMemberEditor({
      mode: "edit",
      profileId: profile.id,
      memberId: member.id,
      profile,
      member,
    });
  }

  async function onSaveMember(payload) {
    if (!payload?.fullName) {
      onMessage?.("Thiếu họ và tên");
      return;
    }
    setBusyId("member");
    try {
      const data =
        memberEditor.mode === "edit"
          ? await updateAdminOrganizerMember(
              memberEditor.profileId,
              memberEditor.memberId,
              payload
            )
          : await createAdminOrganizerMember(memberEditor.profileId, payload);
      onMessage?.(data.message || "Đã lưu hồ sơ thành viên.");
      const nextMember = data.member || null;
      if (data.profile) setRoster(data.profile);
      if (nextMember && memberEditor.mode !== "create") {
        setMemberEditor((ed) =>
          ed
            ? {
                ...ed,
                mode: "view",
                member: nextMember,
                memberId: nextMember.id,
                profile: data.profile || ed.profile,
              }
            : null
        );
      } else {
        setMemberEditor(null);
      }
      await loadProfiles();
    } catch (err) {
      onMessage?.(err.response?.data?.error || err.message);
    } finally {
      setBusyId(null);
    }
  }

  function askDeleteMember(profile, member) {
    setConfirmDialog({
      title: "Xóa thành viên?",
      message: `Xóa ${member.fullName}${member.stageName ? ` (${member.stageName})` : ""} — ${
        member.roleLabel || roleLabel(catalog, member.roleTitle)
      }.`,
      confirmLabel: "Xóa",
      tone: "danger",
      icon: Trash2,
      onConfirm: async () => {
        setConfirmDialog(null);
        setBusyId(member.id);
        try {
          const data = await deleteAdminOrganizerMember(profile.id, member.id);
          onMessage?.(data.message || "Đã xóa.");
          if (data.profile) setRoster(data.profile);
          setMemberEditor((ed) =>
            ed && ed.memberId === member.id && ed.profileId === profile.id ? null : ed
          );
          await loadProfiles();
        } catch (err) {
          onMessage?.(err.response?.data?.error || err.message);
        } finally {
          setBusyId(null);
        }
      },
    });
  }

  function askStatus(row, next) {
    if (next === "rejected") {
      setConfirmDialog({
        title: "Từ chối hồ sơ năng lực",
        message: `Nhập lý do từ chối cho ${row.organizationName}.`,
        confirmLabel: "Từ chối",
        tone: "danger",
        promptLabel: "Lý do từ chối",
        promptRequired: true,
        icon: Ban,
        onConfirm: async (reason) => {
          setConfirmDialog(null);
          await applyStatus(row.id, next, reason);
        },
      });
      return;
    }
    const titles = {
      pending: "Gửi chờ duyệt?",
      approved: "Duyệt hồ sơ năng lực?",
      draft: "Đưa về nháp?",
    };
    setConfirmDialog({
      title: titles[next] || "Xác nhận",
      message: `${row.profileCode} · ${row.organizationName} · ${row.memberCount} người.`,
      confirmLabel: "Xác nhận",
      tone: next === "approved" ? "primary" : "default",
      icon: next === "approved" ? ShieldCheck : next === "pending" ? Send : FileEdit,
      onConfirm: async () => {
        setConfirmDialog(null);
        await applyStatus(row.id, next);
      },
    });
  }

  async function applyStatus(id, next, rejectionReason = "") {
    setBusyId(id);
    try {
      const data = await patchAdminOrganizerProfileStatus(id, {
        status: next,
        rejectionReason: rejectionReason || undefined,
      });
      onMessage?.(data.message || "Đã cập nhật trạng thái.");
      if (data.profile && roster?.id === id) setRoster(data.profile);
      await loadProfiles();
    } catch (err) {
      onMessage?.(err.response?.data?.error || err.message);
    } finally {
      setBusyId(null);
    }
  }

  function askDeleteOrg(row) {
    setConfirmDialog({
      title: "Xóa hồ sơ năng lực?",
      message: `Xóa ${row.profileCode} — ${row.organizationName} và toàn bộ thành viên.`,
      confirmLabel: "Xóa",
      tone: "danger",
      icon: Trash2,
      onConfirm: async () => {
        setConfirmDialog(null);
        setBusyId(row.id);
        try {
          const data = await deleteAdminOrganizerProfile(row.id);
          onMessage?.(data.message || "Đã xóa.");
          if (roster?.id === row.id) setRoster(null);
          await loadProfiles();
        } catch (err) {
          onMessage?.(err.response?.data?.error || err.message);
        } finally {
          setBusyId(null);
        }
      },
    });
  }

  const savingOrg = busyId === (orgEditor?.id || "new-org");
  const savingMember = busyId === "member";

  const closeOrgEditor = useCallback(() => {
    setOrgEditor(null);
  }, []);

  const closeMemberEditor = useCallback(() => {
    setMemberEditor(null);
  }, []);

  const displayName = (m) =>
    m.stageName ? (
      <>
        <strong>{m.stageName}</strong>
        <span>{m.fullName}</span>
      </>
    ) : (
      <strong>{m.fullName}</strong>
    );

  return (
    <div className="lte-panel">
      <div className="lte-stats-grid" style={{ gridTemplateColumns: "repeat(4, minmax(0, 1fr))" }}>
        {[
          { key: "approved", label: "Đã duyệt", icon: CheckCircle2, tone: "teal" },
          { key: "pending", label: "Chờ duyệt", icon: Clock3, tone: "amber" },
          { key: "draft", label: "Nháp", icon: FileEdit, tone: "sky" },
          { key: "totalMembers", label: "Tổng thành viên", icon: Users, tone: "rose" },
        ].map((c) => {
          const Icon = c.icon;
          return (
            <div key={c.key} className="lte-stat-card">
              <div className={`lte-stat-icon tone-${c.tone}`}>
                <Icon size={18} />
              </div>
              <div>
                <span>{c.label}</span>
                <strong>{stats[c.key] || 0}</strong>
              </div>
            </div>
          );
        })}
      </div>

      {/* ---- Đơn vị BTC ---- */}
      <div className="lte-box">
        <div className="lte-box-header lte-box-header-tools">
          <h3>
            <Award size={18} /> Đơn vị / Ban tổ chức
          </h3>
          <form
            className="lte-filter-bar"
            onSubmit={(e) => {
              e.preventDefault();
              loadProfiles();
            }}
          >
            <label className="lte-search-field">
              <Search size={15} aria-hidden />
              <input
                type="search"
                placeholder="Mã HS, đơn vị…"
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
            <button
              type="button"
              className="lte-btn lte-btn-default"
              onClick={loadProfiles}
              disabled={loading}
            >
              <RefreshCw size={14} className={loading ? "spin" : undefined} />
            </button>
            <button type="button" className="lte-btn lte-btn-success" onClick={openCreateOrg}>
              <Plus size={14} /> Thêm đơn vị
            </button>
          </form>
        </div>
        <p className="lte-hint" style={{ padding: "0 1.1rem 0.75rem", margin: 0 }}>
          Bấm nút <strong>icon thành viên</strong> (số người) để mở danh sách thành viên. Cột{" "}
          <strong>Sự kiện</strong> cho biết đơn vị đang tổ chức những sự kiện nào trên hệ thống.
        </p>
        <div className="lte-box-body lte-box-body-flush">
          {loading && !items.length ? (
            <p className="lte-empty">
              <Loader2 size={16} className="spin" /> Đang tải…
            </p>
          ) : !items.length ? (
            <p className="lte-empty">Chưa có đơn vị. Bấm «Thêm đơn vị» rồi thêm từng thành viên.</p>
          ) : (
            <div className="lte-table-wrap">
              <table className="lte-table">
                <thead>
                  <tr>
                    <th>Mã / Đơn vị</th>
                    <th>Người đại diện</th>
                    <th>Thành viên</th>
                    <th>Sự kiện</th>
                    <th>Trạng thái</th>
                    <th className="lte-col-actions">Thao tác</th>
                  </tr>
                </thead>
                <tbody>
                  {items.map((row) => (
                    <tr key={row.id}>
                      <td>
                        <div className="lte-cell-stack">
                          <code className="lte-code">{row.profileCode}</code>
                          <strong>{row.organizationName}</strong>
                          <span>{row.businessField || "—"}</span>
                        </div>
                      </td>
                      <td>
                        <div className="lte-cell-stack">
                          <strong>{row.legalRepName || "—"}</strong>
                          <span>{row.legalRepTitle || ""}</span>
                        </div>
                      </td>
                      <td>
                        <button
                          type="button"
                          className="lte-btn lte-btn-member"
                          title="Mở danh sách thành viên"
                          onClick={() => setRoster(row)}
                        >
                          <Users size={15} />
                          <span>{row.memberCount ?? 0} người</span>
                        </button>
                      </td>
                      <td>
                        {(row.events || []).length ? (
                          <div className="lte-unit-events">
                            {(row.events || []).slice(0, 3).map((ev) => (
                              <a
                                key={ev.id}
                                className="lte-unit-event-chip"
                                href={`/events/${ev.id}`}
                                target="_blank"
                                rel="noreferrer"
                                title={ev.location || ""}
                              >
                                <CalendarDays size={12} />
                                <span>{ev.title}</span>
                              </a>
                            ))}
                            {(row.events || []).length > 3 ? (
                              <span className="lte-help" style={{ margin: 0 }}>
                                +{(row.events || []).length - 3} sự kiện khác
                              </span>
                            ) : null}
                          </div>
                        ) : (
                          <span className="lte-muted">Chưa gắn sự kiện</span>
                        )}
                      </td>
                      <td>
                        <span className={`lte-badge ${statusTone(row.status)}`}>
                          {statusLabel(catalog, row.status)}
                        </span>
                      </td>
                      <td>
                        <div className="lte-action-group">
                          <button
                            type="button"
                            className="lte-btn lte-btn-default"
                            disabled={busyId === row.id || row.status === "approved"}
                            onClick={() => openEditOrg(row)}
                          >
                            Sửa ĐV
                          </button>
                          {(row.status === "draft" || row.status === "rejected") && (
                            <button
                              type="button"
                              className="lte-icon-btn"
                              title="Gửi chờ duyệt"
                              disabled={busyId === row.id}
                              onClick={() => askStatus(row, "pending")}
                            >
                              <Send size={14} />
                            </button>
                          )}
                          {row.status === "pending" && (
                            <button
                              type="button"
                              className="lte-icon-btn primary"
                              title="Duyệt"
                              disabled={busyId === row.id}
                              onClick={() => askStatus(row, "approved")}
                            >
                              <ShieldCheck size={14} />
                            </button>
                          )}
                          {(row.status === "pending" || row.status === "approved") && (
                            <button
                              type="button"
                              className="lte-icon-btn danger"
                              title="Từ chối"
                              disabled={busyId === row.id}
                              onClick={() => askStatus(row, "rejected")}
                            >
                              <Ban size={14} />
                            </button>
                          )}
                          {row.status !== "approved" && (
                            <button
                              type="button"
                              className="lte-icon-btn danger"
                              title="Xóa đơn vị"
                              disabled={busyId === row.id}
                              onClick={() => askDeleteOrg(row)}
                            >
                              <Trash2 size={14} />
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      <OrgUnitModal
        open={Boolean(orgEditor)}
        mode={orgEditor?.mode || "create"}
        initial={orgEditor?.row}
        busy={savingOrg}
        onClose={closeOrgEditor}
        onSave={onSaveOrg}
      />

      {/* Modal roster theo đơn vị */}
      <AdminModal
        open={Boolean(roster)}
        onClose={() => setRoster(null)}
        title="Thành viên đơn vị"
        subtitle={
          roster ? `${roster.profileCode} · ${roster.organizationName}` : ""
        }
        icon={Users}
        size="xl"
        footer={
          <>
            <button type="button" className="lte-btn lte-btn-default" onClick={() => setRoster(null)}>
              Đóng
            </button>
            <button
              type="button"
              className="lte-btn lte-btn-success"
              disabled={!canEditMembers}
              onClick={() => openCreateMember(roster)}
            >
              <UserPlus size={14} /> Thêm người
            </button>
          </>
        }
      >
        {roster ? (
          <div className="lte-roster-modal">
            <div className="lte-roster-banner">
              <div>
                <span className={`lte-badge ${statusTone(roster.status)}`}>
                  {statusLabel(catalog, roster.status)}
                </span>
                <strong className="lte-roster-count">
                  {(roster.members || []).length} thành viên
                </strong>
              </div>
              {!canEditMembers ? (
                <p className="lte-help" style={{ margin: 0 }}>
                  Hồ sơ đã duyệt — từ chối trước nếu cần thêm/sửa/xóa thành viên.
                </p>
              ) : (
                <p className="lte-help" style={{ margin: 0 }}>
                  Bấm tên để xem hồ sơ đầy đủ · sửa bằng nút bút chì.
                </p>
              )}
            </div>

            {(roster.events || []).length ? (
              <div className="lte-roster-events">
                <strong>
                  <CalendarDays size={14} /> Sự kiện do đơn vị tổ chức (
                  {(roster.events || []).length})
                </strong>
                <ul>
                  {(roster.events || []).map((ev) => (
                    <li key={ev.id}>
                      <a href={`/events/${ev.id}`} target="_blank" rel="noreferrer">
                        {ev.title}
                      </a>
                      <span>
                        {ev.location || "—"}
                        {ev.startTime
                          ? ` · ${new Date(ev.startTime).toLocaleString("vi-VN")}`
                          : ""}
                      </span>
                    </li>
                  ))}
                </ul>
              </div>
            ) : (
              <p className="lte-help" style={{ margin: "0 0 0.75rem" }}>
                Đơn vị chưa được gắn với sự kiện nào — chọn đơn vị khi tạo sự kiện (tab «Tạo sự
                kiện»).
              </p>
            )}

            {(roster.members || []).length === 0 ? (
              <div className="lte-empty-card">
                <Mic2 size={28} />
                <p>Chưa có thành viên.</p>
                <span>Thêm ca sĩ, nghệ sĩ, nhạc công, vũ công, BTC…</span>
                {canEditMembers ? (
                  <button
                    type="button"
                    className="lte-btn lte-btn-primary"
                    onClick={() => openCreateMember(roster)}
                  >
                    <UserPlus size={14} /> Thêm người đầu tiên
                  </button>
                ) : null}
              </div>
            ) : (
              <div className="lte-table-wrap">
                <table className="lte-table">
                  <thead>
                    <tr>
                      <th>Người</th>
                      <th>Vai trò</th>
                      <th>Chuyên môn</th>
                      <th>KN</th>
                      <th>Liên hệ</th>
                      <th className="lte-col-actions">Thao tác</th>
                    </tr>
                  </thead>
                  <tbody>
                    {(roster.members || []).map((m) => (
                      <tr key={m.id}>
                        <td>
                          <button
                            type="button"
                            className="lte-person-link"
                            onClick={() => openViewMember(roster, m)}
                          >
                            <span className="lte-avatar lte-avatar-sm">
                              {(m.stageName || m.fullName || "?").slice(0, 1).toUpperCase()}
                            </span>
                            <div className="lte-cell-stack">
                              {displayName(m)}
                              <span>{m.qualifications || ""}</span>
                            </div>
                          </button>
                        </td>
                        <td>
                          <div className="lte-cell-stack">
                            <strong>{m.roleLabel || roleLabel(catalog, m.roleTitle)}</strong>
                            <span>{m.roleGroupLabel}</span>
                          </div>
                        </td>
                        <td>{m.specialty || "—"}</td>
                        <td>{m.experienceYears ?? 0}</td>
                        <td>
                          <div className="lte-cell-stack">
                            <span>{m.phone || "—"}</span>
                            <span>{m.email || ""}</span>
                          </div>
                        </td>
                        <td>
                          <div className="lte-action-group">
                            <button
                              type="button"
                              className="lte-icon-btn"
                              title="Sửa hồ sơ"
                              disabled={!canEditMembers || busyId === m.id}
                              onClick={() => openEditMember(roster, m)}
                            >
                              <Pencil size={14} />
                            </button>
                            <button
                              type="button"
                              className="lte-icon-btn danger"
                              title="Xóa"
                              disabled={!canEditMembers || busyId === m.id}
                              onClick={() => askDeleteMember(roster, m)}
                            >
                              <Trash2 size={14} />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        ) : null}
      </AdminModal>

      <AdminMemberProfileModal
        open={Boolean(memberEditor)}
        mode={memberEditor?.mode || "view"}
        member={memberEditor?.member}
        profile={memberEditor?.profile}
        catalog={catalog}
        busy={savingMember}
        onClose={() => {
          if (!savingMember) closeMemberEditor();
        }}
        onSave={onSaveMember}
        onEdit={() => {
          if (!memberEditor?.member || !memberEditor?.profile) return;
          openEditMember(memberEditor.profile, memberEditor.member);
        }}
        onDelete={() => {
          if (!memberEditor?.member || !memberEditor?.profile) return;
          askDeleteMember(memberEditor.profile, memberEditor.member);
        }}
      />

      <AdminConfirmModal
        open={Boolean(confirmDialog)}
        onClose={() => setConfirmDialog(null)}
        onConfirm={confirmDialog?.onConfirm}
        title={confirmDialog?.title}
        message={confirmDialog?.message}
        confirmLabel={confirmDialog?.confirmLabel}
        tone={confirmDialog?.tone}
        icon={confirmDialog?.icon}
        promptLabel={confirmDialog?.promptLabel}
        promptRequired={confirmDialog?.promptRequired}
        busy={Boolean(busyId)}
      />
    </div>
  );
}
