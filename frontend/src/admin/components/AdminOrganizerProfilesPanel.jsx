import { useEffect, useMemo, useState } from "react";
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
} from "lucide-react";
import {
  createAdminOrganizerMember,
  createAdminOrganizerProfile,
  deleteAdminOrganizerMember,
  deleteAdminOrganizerProfile,
  getAdminOrganizerMembers,
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
  };
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
  const [orgForm, setOrgForm] = useState(emptyOrgForm);

  const [roster, setRoster] = useState(null);
  const [memberEditor, setMemberEditor] = useState(null);

  const [allMembers, setAllMembers] = useState([]);
  const [memberQ, setMemberQ] = useState("");
  const [memberRole, setMemberRole] = useState("");
  const [memberGroup, setMemberGroup] = useState("");
  const [membersLoading, setMembersLoading] = useState(false);

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

  async function loadMembers() {
    setMembersLoading(true);
    try {
      const data = await getAdminOrganizerMembers({
        q: memberQ || undefined,
        roleTitle: memberRole || undefined,
        roleGroup: memberGroup || undefined,
      });
      setAllMembers(data.members || []);
    } catch (err) {
      onMessage?.(err.response?.data?.error || err.message);
    } finally {
      setMembersLoading(false);
    }
  }

  useEffect(() => {
    loadProfiles();
    loadMembers();
  }, []);

  const canEditMembers = roster && roster.status !== "approved";

  const rolesGrouped = useMemo(() => {
    const groups = catalog.memberRoleGroups || [];
    return groups.map((g) => ({
      ...g,
      roles: (catalog.memberRoles || []).filter((r) => r.group === g.key),
    }));
  }, [catalog]);

  function openCreateOrg() {
    setOrgEditor({ mode: "create" });
    setOrgForm(emptyOrgForm());
  }

  function openEditOrg(row) {
    if (row.status === "approved") {
      onMessage?.("Hồ sơ đã duyệt — từ chối trước nếu cần sửa đơn vị.");
      return;
    }
    setOrgEditor({ mode: "edit", id: row.id, code: row.profileCode });
    setOrgForm(orgToForm(row));
  }

  async function onSaveOrg(e) {
    e?.preventDefault?.();
    const payload = orgFormToPayload(orgForm);
    if (!payload.organizationName) {
      onMessage?.("Thiếu tên đơn vị / ban tổ chức");
      return;
    }
    setBusyId(orgEditor?.id || "new-org");
    try {
      const data =
        orgEditor?.mode === "edit"
          ? await updateAdminOrganizerProfile(orgEditor.id, payload)
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
      await loadMembers();
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
          await loadProfiles();
          await loadMembers();
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
      await loadMembers();
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
          await loadMembers();
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
          Mỗi đơn vị có danh sách đầy đủ: BTC, <strong>ca sĩ, nghệ sĩ, nhạc công, vũ công</strong>,
          MC, kỹ thuật… — quản lý «Thành viên».
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
                          className="lte-btn lte-btn-default"
                          style={{ padding: "0.25rem 0.55rem", fontSize: "0.8rem" }}
                          onClick={() => setRoster(row)}
                        >
                          <Users size={13} /> {row.memberCount} người
                        </button>
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

      {/* ---- Danh sách phẳng mọi người ---- */}
      <div className="lte-box">
        <div className="lte-box-header lte-box-header-tools">
          <h3>
            <Mic2 size={18} /> Toàn bộ thành viên
          </h3>
          <form
            className="lte-filter-bar"
            onSubmit={(e) => {
              e.preventDefault();
              loadMembers();
            }}
          >
            <label className="lte-search-field">
              <Search size={15} aria-hidden />
              <input
                type="search"
                placeholder="Họ tên, nghệ danh, chuyên môn…"
                value={memberQ}
                onChange={(e) => setMemberQ(e.target.value)}
              />
            </label>
            <select
              value={memberGroup}
              onChange={(e) => {
                setMemberGroup(e.target.value);
                setMemberRole("");
              }}
            >
              <option value="">Mọi nhóm</option>
              {(catalog.memberRoleGroups || []).map((g) => (
                <option key={g.key} value={g.key}>
                  {g.label}
                </option>
              ))}
            </select>
            <select value={memberRole} onChange={(e) => setMemberRole(e.target.value)}>
              <option value="">Mọi vai trò</option>
              {rolesGrouped
                .filter((g) => !memberGroup || g.key === memberGroup)
                .map((g) => (
                  <optgroup key={g.key} label={g.label}>
                    {g.roles.map((r) => (
                      <option key={r.key} value={r.key}>
                        {r.label}
                      </option>
                    ))}
                  </optgroup>
                ))}
            </select>
            <button type="submit" className="lte-btn lte-btn-primary" disabled={membersLoading}>
              <Search size={14} /> Lọc
            </button>
            <button
              type="button"
              className="lte-btn lte-btn-default"
              onClick={loadMembers}
              disabled={membersLoading}
            >
              <RefreshCw size={14} className={membersLoading ? "spin" : undefined} />
            </button>
          </form>
        </div>
        <div className="lte-box-body lte-box-body-flush">
          {membersLoading && !allMembers.length ? (
            <p className="lte-empty">
              <Loader2 size={16} className="spin" /> Đang tải…
            </p>
          ) : !allMembers.length ? (
            <p className="lte-empty">Chưa có thành viên. Mở «CRUD» trên đơn vị để thêm từng người.</p>
          ) : (
            <div className="lte-table-wrap">
              <table className="lte-table">
                <thead>
                  <tr>
                    <th>Người</th>
                    <th>Vai trò</th>
                    <th>Đơn vị</th>
                    <th>Chuyên môn</th>
                    <th>KN</th>
                    <th className="lte-col-actions">CRUD</th>
                  </tr>
                </thead>
                <tbody>
                  {allMembers.map((m) => (
                    <tr key={`${m.profileId}-${m.id}`}>
                      <td>
                        <button
                          type="button"
                          className="lte-person-link"
                          onClick={() =>
                            openViewMember(
                              {
                                id: m.profileId,
                                status: m.profileStatus,
                                profileCode: m.profileCode,
                                organizationName: m.organizationName,
                              },
                              m
                            )
                          }
                        >
                          <div className="lte-cell-stack">{displayName(m)}</div>
                        </button>
                      </td>
                      <td>
                        <div className="lte-cell-stack">
                          <strong>{m.roleLabel || roleLabel(catalog, m.roleTitle)}</strong>
                          <span>{m.roleGroupLabel}</span>
                        </div>
                      </td>
                      <td>
                        <div className="lte-cell-stack">
                          <code className="lte-code">{m.profileCode}</code>
                          <span>{m.organizationName}</span>
                        </div>
                      </td>
                      <td>{m.specialty || "—"}</td>
                      <td>{m.experienceYears ?? 0}</td>
                      <td>
                        <div className="lte-action-group">
                          <button
                            type="button"
                            className="lte-icon-btn"
                            title="Sửa hồ sơ"
                            disabled={m.profileStatus === "approved" || busyId === m.id}
                            onClick={() =>
                              openEditMember(
                                {
                                  id: m.profileId,
                                  status: m.profileStatus,
                                  profileCode: m.profileCode,
                                  organizationName: m.organizationName,
                                },
                                m
                              )
                            }
                          >
                            <Pencil size={14} />
                          </button>
                          <button
                            type="button"
                            className="lte-icon-btn danger"
                            title="Xóa"
                            disabled={m.profileStatus === "approved" || busyId === m.id}
                            onClick={() =>
                              askDeleteMember(
                                {
                                  id: m.profileId,
                                  status: m.profileStatus,
                                },
                                m
                              )
                            }
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
      </div>

      {/* Modal đơn vị */}
      <AdminModal
        open={Boolean(orgEditor)}
        onClose={() => !savingOrg && setOrgEditor(null)}
        title={orgEditor?.mode === "edit" ? "Sửa đơn vị BTC" : "Thêm đơn vị BTC"}
        subtitle="Sau khi lưu, thêm từng ca sĩ / nghệ sĩ / nhạc công / vũ công…"
        icon={Award}
        size="lg"
        footer={
          <>
            <button
              type="button"
              className="lte-btn lte-btn-default"
              disabled={savingOrg}
              onClick={() => setOrgEditor(null)}
            >
              Hủy
            </button>
            <button
              type="button"
              className="lte-btn lte-btn-primary"
              disabled={savingOrg}
              onClick={onSaveOrg}
            >
              {savingOrg ? <Loader2 size={14} className="spin" /> : null}
              Lưu đơn vị
            </button>
          </>
        }
      >
        <form className="lte-form" onSubmit={onSaveOrg} style={{ maxWidth: "none" }}>
          <div className="lte-form-grid">
            <label>
              Tên đơn vị / Ban tổ chức *
              <input
                required
                value={orgForm.organizationName}
                onChange={(e) =>
                  setOrgForm((f) => ({ ...f, organizationName: e.target.value }))
                }
              />
            </label>
            <label>
              Mã số thuế
              <input
                value={orgForm.taxCode}
                onChange={(e) => setOrgForm((f) => ({ ...f, taxCode: e.target.value }))}
              />
            </label>
            <label>
              Điện thoại
              <input
                value={orgForm.phone}
                onChange={(e) => setOrgForm((f) => ({ ...f, phone: e.target.value }))}
              />
            </label>
            <label>
              Email
              <input
                type="email"
                value={orgForm.email}
                onChange={(e) => setOrgForm((f) => ({ ...f, email: e.target.value }))}
              />
            </label>
            <label style={{ gridColumn: "1 / -1" }}>
              Địa chỉ
              <input
                value={orgForm.address}
                onChange={(e) => setOrgForm((f) => ({ ...f, address: e.target.value }))}
              />
            </label>
            <label>
              Website
              <input
                value={orgForm.website}
                onChange={(e) => setOrgForm((f) => ({ ...f, website: e.target.value }))}
              />
            </label>
            <label>
              Lĩnh vực
              <input
                value={orgForm.businessField}
                onChange={(e) => setOrgForm((f) => ({ ...f, businessField: e.target.value }))}
              />
            </label>
            <label>
              Số năm hoạt động
              <input
                type="number"
                min="0"
                value={orgForm.yearsOperating}
                onChange={(e) => setOrgForm((f) => ({ ...f, yearsOperating: e.target.value }))}
              />
            </label>
            <label>
              Người đại diện pháp luật
              <input
                value={orgForm.legalRepName}
                onChange={(e) => setOrgForm((f) => ({ ...f, legalRepName: e.target.value }))}
              />
            </label>
            <label>
              Chức danh đại diện
              <input
                value={orgForm.legalRepTitle}
                onChange={(e) => setOrgForm((f) => ({ ...f, legalRepTitle: e.target.value }))}
              />
            </label>
            <label>
              CCCD đại diện
              <input
                value={orgForm.legalRepIdNumber}
                onChange={(e) =>
                  setOrgForm((f) => ({ ...f, legalRepIdNumber: e.target.value }))
                }
              />
            </label>
            <label style={{ gridColumn: "1 / -1" }}>
              Ghi chú
              <textarea
                rows={2}
                value={orgForm.notes}
                onChange={(e) => setOrgForm((f) => ({ ...f, notes: e.target.value }))}
              />
            </label>
          </div>
        </form>
      </AdminModal>

      {/* Modal roster theo đơn vị */}
      <AdminModal
        open={Boolean(roster)}
        onClose={() => setRoster(null)}
        title="Thành viên"
        subtitle={
          roster
            ? `${roster.profileCode} · ${roster.organizationName} · ${statusLabel(
                catalog,
                roster.status
              )}`
            : ""
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
          <>
            {!canEditMembers ? (
              <p className="lte-help" style={{ marginBottom: "0.85rem" }}>
                Hồ sơ đã duyệt — từ chối hồ sơ nếu cần thêm/sửa/xóa thành viên.
              </p>
            ) : null}
            <div className="lte-table-wrap">
              <table className="lte-table">
                <thead>
                  <tr>
                    <th>Người</th>
                    <th>Vai trò</th>
                    <th>Chuyên môn</th>
                    <th>KN</th>
                    <th>Liên hệ</th>
                    <th className="lte-col-actions">CRUD</th>
                  </tr>
                </thead>
                <tbody>
                  {(roster.members || []).length === 0 ? (
                    <tr>
                      <td colSpan={6}>
                        Chưa có ai. Thêm ca sĩ, nghệ sĩ, nhạc công, vũ công, BTC…
                      </td>
                    </tr>
                  ) : (
                    (roster.members || []).map((m) => (
                      <tr key={m.id}>
                        <td>
                          <button
                            type="button"
                            className="lte-person-link"
                            onClick={() => openViewMember(roster, m)}
                          >
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
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </>
        ) : null}
      </AdminModal>

      <AdminMemberProfileModal
        open={Boolean(memberEditor)}
        mode={memberEditor?.mode || "view"}
        member={memberEditor?.member}
        profile={memberEditor?.profile}
        catalog={catalog}
        busy={savingMember}
        onClose={() => !savingMember && setMemberEditor(null)}
        onSave={onSaveMember}
        onEdit={() => {
          if (!memberEditor?.member || !memberEditor?.profile) return;
          openEditMember(memberEditor.profile, memberEditor.member);
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
