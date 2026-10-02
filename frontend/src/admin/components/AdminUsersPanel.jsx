import { useEffect, useState } from "react";
import {
  Users,
  UserPlus,
  Shield,
  Search,
  Lock,
  Unlock,
  Save,
  KeyRound,
  RefreshCw,
} from "lucide-react";
import { useAuth } from "../../context/AuthContext.jsx";
import {
  createAdminUser,
  deleteAdminUser,
  getAdminUsers,
  getRolesCatalog,
  updateAdminUser,
} from "../../services/api.js";
import AdminModal, { AdminConfirmModal } from "./AdminModal.jsx";

const emptyCreate = {
  email: "",
  password: "",
  displayName: "",
  role: "user",
};

export default function AdminUsersPanel({ onMessage }) {
  const { user: me, isSuperAdmin, canManageUsers } = useAuth();
  const [users, setUsers] = useState([]);
  const [catalog, setCatalog] = useState({ roles: [], permissions: [] });
  const [q, setQ] = useState("");
  const [roleFilter, setRoleFilter] = useState("");
  const [busy, setBusy] = useState(false);
  const [createOpen, setCreateOpen] = useState(false);
  const [createForm, setCreateForm] = useState(emptyCreate);
  const [editId, setEditId] = useState(null);
  const [editRole, setEditRole] = useState("user");
  const [editPerms, setEditPerms] = useState([]);
  const [editName, setEditName] = useState("");
  const [editPassword, setEditPassword] = useState("");
  const [useCustomPerms, setUseCustomPerms] = useState(false);
  const [toggleTarget, setToggleTarget] = useState(null);

  async function load() {
    const [u, c] = await Promise.all([
      getAdminUsers({
        q: q || undefined,
        role: roleFilter || undefined,
      }),
      getRolesCatalog(),
    ]);
    setUsers(u.users || []);
    setCatalog(c);
  }

  useEffect(() => {
    load().catch((e) => onMessage?.(e.response?.data?.error || e.message));
  }, []);

  function notify(text) {
    onMessage?.(text);
  }

  async function onSearch(e) {
    e?.preventDefault?.();
    setBusy(true);
    try {
      await load();
    } catch (err) {
      notify(err.response?.data?.error || err.message);
    } finally {
      setBusy(false);
    }
  }

  async function onCreate(e) {
    e.preventDefault();
    if (!canManageUsers) return;
    setBusy(true);
    try {
      await createAdminUser(createForm);
      setCreateForm(emptyCreate);
      setCreateOpen(false);
      notify(`Đã tạo tài khoản ${createForm.email}`);
      await load();
    } catch (err) {
      notify(err.response?.data?.error || err.message);
    } finally {
      setBusy(false);
    }
  }

  function startEdit(u) {
    setEditId(u.id);
    setEditRole(u.role);
    setEditName(u.displayName || "");
    setEditPassword("");
    const custom = u.customPermissions || [];
    setUseCustomPerms(custom.length > 0);
    setEditPerms(custom.length > 0 ? [...custom] : [...(u.permissions || [])]);
  }

  function closeEdit() {
    setEditId(null);
  }

  function togglePerm(key) {
    setEditPerms((prev) => (prev.includes(key) ? prev.filter((p) => p !== key) : [...prev, key]));
  }

  async function onSaveEdit(e) {
    e.preventDefault();
    if (!isSuperAdmin) return;
    setBusy(true);
    try {
      const payload = {
        role: editRole,
        displayName: editName,
      };
      if (editPassword) payload.password = editPassword;
      if (useCustomPerms) payload.permissions = editPerms;
      else payload.resetCustomPermissions = true;

      await updateAdminUser(editId, payload);
      notify("Đã cập nhật người dùng / phân quyền");
      setEditId(null);
      await load();
    } catch (err) {
      notify(err.response?.data?.error || err.message);
    } finally {
      setBusy(false);
    }
  }

  function requestToggleActive(u) {
    if (!canManageUsers || u.id === me?.id) return;
    setToggleTarget(u);
  }

  async function confirmToggleActive() {
    const u = toggleTarget;
    if (!u || !canManageUsers) return;
    setBusy(true);
    try {
      if (u.isActive) {
        await deleteAdminUser(u.id);
        notify(`Đã khóa ${u.email}`);
      } else {
        await updateAdminUser(u.id, { isActive: true });
        notify(`Đã mở khóa ${u.email}`);
      }
      setToggleTarget(null);
      await load();
    } catch (err) {
      notify(err.response?.data?.error || err.message);
    } finally {
      setBusy(false);
    }
  }

  const roleDefaults =
    catalog.roles.find((r) => r.key === editRole)?.defaultPermissions || [];
  const editingUser = users.find((u) => u.id === editId);

  return (
    <>
      <div className="lte-box">
        <div className="lte-box-header">
          <h3>
            <Shield size={18} style={{ verticalAlign: -3 }} /> Vai trò hệ thống
          </h3>
        </div>
        <div className="lte-box-body">
          {(catalog.roles || []).map((r) => (
            <div key={r.key} className="lte-event-row">
              <div>
                <strong>{r.label}</strong>
                <p className="lte-help" style={{ marginTop: 4 }}>
                  {r.description}
                </p>
                <ul className="lte-tags">
                  {(r.defaultPermissions || []).map((p) => (
                    <li key={p}>{p}</li>
                  ))}
                </ul>
              </div>
              <span className="lte-badge">{r.key}</span>
            </div>
          ))}
        </div>
      </div>

      <div className="lte-box">
        <div className="lte-box-header lte-box-header-tools">
          <h3>
            <Users size={18} /> Danh sách người dùng
          </h3>
          <form className="lte-filter-bar" onSubmit={onSearch}>
            <label className="lte-search-field">
              <Search size={15} aria-hidden />
              <input
                type="search"
                placeholder="Email, tên, ví…"
                value={q}
                onChange={(e) => setQ(e.target.value)}
                aria-label="Tìm người dùng"
              />
            </label>
            <select
              value={roleFilter}
              onChange={(e) => setRoleFilter(e.target.value)}
              aria-label="Lọc vai trò"
            >
              <option value="">Mọi vai trò</option>
              {(catalog.roles || []).map((r) => (
                <option key={r.key} value={r.key}>
                  {r.label}
                </option>
              ))}
            </select>
            <button type="submit" className="lte-btn lte-btn-primary" disabled={busy}>
              <Search size={14} /> Lọc
            </button>
            <button
              type="button"
              className="lte-btn lte-btn-default"
              disabled={busy}
              onClick={() => onSearch()}
              title="Làm mới"
            >
              <RefreshCw size={14} />
            </button>
            {canManageUsers ? (
              <button
                type="button"
                className="lte-btn lte-btn-success"
                onClick={() => {
                  setCreateForm(emptyCreate);
                  setCreateOpen(true);
                }}
              >
                <UserPlus size={14} /> Tạo người dùng
              </button>
            ) : null}
          </form>
        </div>
        <div className="lte-box-body lte-box-body-flush">
          <div className="lte-table-wrap">
            <table className="lte-table">
              <thead>
                <tr>
                  <th>Email</th>
                  <th>Tên</th>
                  <th>Vai trò</th>
                  <th>Trạng thái</th>
                  <th>Quyền (hiệu lực)</th>
                  <th>Thao tác</th>
                </tr>
              </thead>
              <tbody>
                {users.map((u) => (
                  <tr key={u.id}>
                    <td>
                      {u.email}
                      {u.id === me?.id && (
                        <span className="lte-badge" style={{ marginLeft: 6 }}>
                          bạn
                        </span>
                      )}
                    </td>
                    <td>{u.displayName || "—"}</td>
                    <td>
                      <span className={`lte-badge ${u.role === "admin" ? "warn" : ""}`}>{u.role}</span>
                    </td>
                    <td>
                      <span className={`lte-badge ${u.isActive ? "ok" : "warn"}`}>
                        {u.isActive ? "active" : "locked"}
                      </span>
                    </td>
                    <td>
                      <ul className="lte-tags">
                        {(u.permissions || []).slice(0, 4).map((p) => (
                          <li key={p}>{p}</li>
                        ))}
                        {(u.permissions || []).length > 4 && (
                          <li>+{(u.permissions || []).length - 4}</li>
                        )}
                      </ul>
                    </td>
                    <td>
                      <div className="lte-action-group">
                        {isSuperAdmin && (
                          <button
                            type="button"
                            className="lte-btn lte-btn-default"
                            onClick={() => startEdit(u)}
                          >
                            <KeyRound size={14} /> Quyền
                          </button>
                        )}
                        {canManageUsers && u.id !== me?.id && (
                          <button
                            type="button"
                            className="lte-btn lte-btn-default"
                            disabled={busy}
                            onClick={() => requestToggleActive(u)}
                          >
                            {u.isActive ? (
                              <>
                                <Lock size={14} /> Khóa
                              </>
                            ) : (
                              <>
                                <Unlock size={14} /> Mở
                              </>
                            )}
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
                {!users.length && (
                  <tr>
                    <td colSpan={6}>
                      <div className="lte-empty">Không có người dùng khớp bộ lọc.</div>
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      <AdminModal
        open={createOpen}
        onClose={busy ? undefined : () => setCreateOpen(false)}
        title="Tạo người dùng"
        subtitle="Tài khoản đăng nhập admin / portal"
        icon={UserPlus}
        closeOnBackdrop={!busy}
        footer={
          <>
            <button
              type="button"
              className="lte-btn lte-btn-default"
              disabled={busy}
              onClick={() => setCreateOpen(false)}
            >
              Đóng
            </button>
            <button
              type="submit"
              form="admin-create-user-form"
              className="lte-btn lte-btn-success"
              disabled={busy || !canManageUsers}
            >
              <UserPlus size={15} /> {busy ? "Đang tạo…" : "Tạo tài khoản"}
            </button>
          </>
        }
      >
        {!canManageUsers ? (
          <p className="lte-help">Bạn chỉ có quyền xem. Cần quyền admin để tạo tài khoản.</p>
        ) : (
          <form id="admin-create-user-form" className="lte-form" onSubmit={onCreate}>
            <label>
              Email
              <input
                required
                type="email"
                value={createForm.email}
                onChange={(e) => setCreateForm({ ...createForm, email: e.target.value })}
                disabled={busy}
              />
            </label>
            <label>
              Mật khẩu
              <input
                required
                type="password"
                minLength={6}
                value={createForm.password}
                onChange={(e) => setCreateForm({ ...createForm, password: e.target.value })}
                disabled={busy}
              />
            </label>
            <label>
              Tên hiển thị
              <input
                value={createForm.displayName}
                onChange={(e) => setCreateForm({ ...createForm, displayName: e.target.value })}
                disabled={busy}
              />
            </label>
            <label>
              Vai trò
              <select
                value={createForm.role}
                onChange={(e) => setCreateForm({ ...createForm, role: e.target.value })}
                disabled={busy}
              >
                {(catalog.roles || []).map((r) => (
                  <option key={r.key} value={r.key} disabled={r.key === "admin" && !isSuperAdmin}>
                    {r.label}
                  </option>
                ))}
              </select>
            </label>
          </form>
        )}
      </AdminModal>

      <AdminModal
        open={Boolean(editId) && isSuperAdmin}
        onClose={busy ? undefined : closeEdit}
        title="Phân quyền chi tiết"
        subtitle={editingUser?.email || "Cập nhật vai trò và quyền hiệu lực"}
        icon={Shield}
        size="lg"
        closeOnBackdrop={!busy}
        footer={
          <>
            <button type="button" className="lte-btn lte-btn-default" disabled={busy} onClick={closeEdit}>
              Đóng
            </button>
            <button
              type="submit"
              form="admin-edit-user-form"
              className="lte-btn lte-btn-primary"
              disabled={busy}
            >
              <Save size={15} /> {busy ? "Đang lưu…" : "Lưu phân quyền"}
            </button>
          </>
        }
      >
        <form
          id="admin-edit-user-form"
          className="lte-form"
          onSubmit={onSaveEdit}
          style={{ maxWidth: "none" }}
        >
          <div className="lte-form-grid">
            <label>
              Vai trò
              <select value={editRole} onChange={(e) => setEditRole(e.target.value)} disabled={busy}>
                {(catalog.roles || []).map((r) => (
                  <option key={r.key} value={r.key}>
                    {r.label}
                  </option>
                ))}
              </select>
            </label>
            <label>
              Tên hiển thị
              <input
                value={editName}
                onChange={(e) => setEditName(e.target.value)}
                disabled={busy}
              />
            </label>
            <label>
              Đặt lại mật khẩu (tuỳ chọn)
              <input
                type="password"
                minLength={6}
                value={editPassword}
                onChange={(e) => setEditPassword(e.target.value)}
                placeholder="Để trống nếu không đổi"
                disabled={busy}
              />
            </label>
          </div>

          <label style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
            <input
              type="checkbox"
              checked={useCustomPerms}
              disabled={busy}
              onChange={(e) => {
                setUseCustomPerms(e.target.checked);
                if (!e.target.checked) setEditPerms([...roleDefaults]);
              }}
            />
            <span style={{ fontWeight: 600 }}>
              Ghi đè quyền mặc định của vai trò (custom permissions)
            </span>
          </label>

          {!useCustomPerms && (
            <p className="lte-help">
              Đang dùng quyền mặc định của <strong>{editRole}</strong>. Bật ghi đè để chọn từng
              permission.
            </p>
          )}

          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fill, minmax(240px, 1fr))",
              gap: "0.5rem",
              opacity: useCustomPerms ? 1 : 0.55,
              pointerEvents: useCustomPerms ? "auto" : "none",
            }}
          >
            {(catalog.permissions || []).map((p) => (
              <label
                key={p.key}
                style={{
                  flexDirection: "row",
                  alignItems: "flex-start",
                  gap: 8,
                  border: "1px solid #eee",
                  padding: "0.5rem 0.65rem",
                  borderRadius: 3,
                  fontWeight: 400,
                }}
              >
                <input
                  type="checkbox"
                  checked={editPerms.includes(p.key)}
                  onChange={() => togglePerm(p.key)}
                  disabled={busy}
                />
                <span>
                  <strong style={{ fontSize: "0.85rem" }}>{p.key}</strong>
                  <br />
                  <span className="lte-help">{p.label}</span>
                </span>
              </label>
            ))}
          </div>
        </form>
      </AdminModal>

      <AdminConfirmModal
        open={Boolean(toggleTarget)}
        onClose={() => setToggleTarget(null)}
        onConfirm={confirmToggleActive}
        title={toggleTarget?.isActive ? "Khóa tài khoản?" : "Mở khóa tài khoản?"}
        message={
          toggleTarget
            ? toggleTarget.isActive
              ? `Khóa ${toggleTarget.email}? Người dùng sẽ không đăng nhập được.`
              : `Mở khóa ${toggleTarget.email}? Tài khoản sẽ hoạt động trở lại.`
            : undefined
        }
        confirmLabel={toggleTarget?.isActive ? "Khóa" : "Mở khóa"}
        tone={toggleTarget?.isActive ? "danger" : "default"}
        icon={toggleTarget?.isActive ? Lock : Unlock}
        busy={busy}
      />
    </>
  );
}
