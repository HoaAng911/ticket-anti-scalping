import { useEffect, useState } from "react";
import {
  User,
  GraduationCap,
  BadgeCheck,
  Briefcase,
  Loader2,
  Plus,
  Trash2,
  Trophy,
  Pencil,
} from "lucide-react";
import AdminModal from "./AdminModal.jsx";

const TABS = [
  { id: "overview", label: "Tổng quan", icon: User },
  { id: "personal", label: "Cá nhân", icon: User },
  { id: "degrees", label: "Bằng cấp", icon: GraduationCap },
  { id: "certs", label: "Chứng chỉ", icon: BadgeCheck },
  { id: "career", label: "Nghề nghiệp", icon: Briefcase },
];

function emptyMemberForm(roleTitle = "ca_si") {
  return {
    fullName: "",
    stageName: "",
    roleTitle,
    idNumber: "",
    dateOfBirth: "",
    gender: "",
    nationality: "Việt Nam",
    hometown: "",
    address: "",
    phone: "",
    email: "",
    emergencyContact: "",
    emergencyPhone: "",
    taxCode: "",
    bankAccount: "",
    bankName: "",
    unionMembership: "",
    languages: "",
    portfolioUrl: "",
    bio: "",
    qualifications: "",
    specialty: "",
    experienceYears: "0",
    pastEvents: "",
    degrees: [],
    certificates: [],
    awards: [],
    notes: "",
  };
}

export function memberToForm(m) {
  if (!m) return emptyMemberForm();
  return {
    fullName: m.fullName || "",
    stageName: m.stageName || "",
    roleTitle: m.roleTitle || "khac",
    idNumber: m.idNumber || "",
    dateOfBirth: m.dateOfBirth || "",
    gender: m.gender || "",
    nationality: m.nationality || "Việt Nam",
    hometown: m.hometown || "",
    address: m.address || "",
    phone: m.phone || "",
    email: m.email || "",
    emergencyContact: m.emergencyContact || "",
    emergencyPhone: m.emergencyPhone || "",
    taxCode: m.taxCode || "",
    bankAccount: m.bankAccount || "",
    bankName: m.bankName || "",
    unionMembership: m.unionMembership || "",
    languages: m.languages || "",
    portfolioUrl: m.portfolioUrl || "",
    bio: m.bio || "",
    qualifications: m.qualifications || "",
    specialty: m.specialty || "",
    experienceYears: String(m.experienceYears ?? 0),
    pastEvents: m.pastEvents || "",
    degrees: (m.degrees || []).map((d) => ({
      title: d.title || "",
      school: d.school || "",
      major: d.major || "",
      year: d.year || "",
      level: d.level || "",
    })),
    certificates: (m.certificates || []).map((c) => ({
      name: c.name || "",
      issuer: c.issuer || "",
      number: c.number || "",
      issuedAt: c.issuedAt || "",
      expiresAt: c.expiresAt || "",
      notes: c.notes || "",
    })),
    awards: (m.awards || []).map((a) => ({
      title: a.title || "",
      year: a.year || "",
      organizer: a.organizer || "",
    })),
    notes: m.notes || "",
  };
}

export function memberFormToPayload(form) {
  return {
    fullName: form.fullName.trim(),
    stageName: form.stageName.trim(),
    roleTitle: form.roleTitle,
    idNumber: form.idNumber.trim(),
    dateOfBirth: form.dateOfBirth.trim(),
    gender: form.gender,
    nationality: form.nationality.trim(),
    hometown: form.hometown.trim(),
    address: form.address.trim(),
    phone: form.phone.trim(),
    email: form.email.trim(),
    emergencyContact: form.emergencyContact.trim(),
    emergencyPhone: form.emergencyPhone.trim(),
    taxCode: form.taxCode.trim(),
    bankAccount: form.bankAccount.trim(),
    bankName: form.bankName.trim(),
    unionMembership: form.unionMembership.trim(),
    languages: form.languages.trim(),
    portfolioUrl: form.portfolioUrl.trim(),
    bio: form.bio.trim(),
    qualifications: form.qualifications.trim(),
    specialty: form.specialty.trim(),
    experienceYears: Number(form.experienceYears) || 0,
    pastEvents: form.pastEvents.trim(),
    degrees: form.degrees,
    certificates: form.certificates,
    awards: form.awards,
    notes: form.notes.trim(),
  };
}

export { emptyMemberForm };

function RoleSelect({ catalog, value, onChange, disabled }) {
  const groups = catalog.memberRoleGroups || [];
  const roles = catalog.memberRoles || [];
  return (
    <select value={value} onChange={(e) => onChange(e.target.value)} disabled={disabled}>
      {groups.map((g) => (
        <optgroup key={g.key} label={g.label}>
          {roles
            .filter((r) => r.group === g.key)
            .map((r) => (
              <option key={r.key} value={r.key}>
                {r.label}
              </option>
            ))}
        </optgroup>
      ))}
    </select>
  );
}

function Field({ label, children, wide }) {
  return (
    <label style={wide ? { gridColumn: "1 / -1" } : undefined}>
      {label}
      {children}
    </label>
  );
}

function InfoRow({ label, value }) {
  if (!value && value !== 0) return null;
  return (
    <div className="lte-info-row">
      <span>{label}</span>
      <strong>{value}</strong>
    </div>
  );
}

/**
 * Popup hồ sơ đầy đủ 1 thành viên — tabs: tổng quan / cá nhân / bằng cấp / chứng chỉ / nghề nghiệp
 */
export default function AdminMemberProfileModal({
  open,
  mode = "view", // view | edit | create
  member,
  profile,
  catalog,
  busy = false,
  onClose,
  onSave,
  onEdit,
  onDelete,
}) {
  const [tab, setTab] = useState("overview");
  const [form, setForm] = useState(emptyMemberForm);
  const canEdit = mode === "edit" || mode === "create";
  const readOnly = !canEdit;

  // Chỉ hydrate khi mở modal / đổi mode / đổi thành viên — tránh reset form giữa lúc gõ
  const memberId = member?.id || "";
  useEffect(() => {
    if (!open) return;
    setTab(mode === "create" || mode === "edit" ? "personal" : "overview");
    setForm(mode === "create" ? emptyMemberForm("ca_si") : memberToForm(member));
    // eslint-disable-next-line react-hooks/exhaustive-deps -- cố ý không phụ thuộc toàn bộ object member
  }, [open, mode, memberId]);

  function set(field, value) {
    setForm((f) => ({ ...f, [field]: value }));
  }

  function patchList(key, index, patch) {
    setForm((f) => ({
      ...f,
      [key]: f[key].map((row, i) => (i === index ? { ...row, ...patch } : row)),
    }));
  }

  function addList(key, emptyRow) {
    setForm((f) => ({ ...f, [key]: [...f[key], emptyRow] }));
  }

  function removeList(key, index) {
    setForm((f) => ({ ...f, [key]: f[key].filter((_, i) => i !== index) }));
  }

  function submit(e) {
    e?.preventDefault?.();
    if (!form.fullName.trim()) return;
    onSave?.(memberFormToPayload(form));
  }

  const titleName =
    mode === "create"
      ? "Thêm thành viên"
      : member?.stageName || member?.fullName || form.stageName || form.fullName || "Hồ sơ thành viên";
  // Không đổi title theo từng phím gõ (tránh reflow header khi đang nhập) — chỉ dùng snapshot thành viên khi sửa
  const displayTitle =
    mode === "edit"
      ? member?.stageName || member?.fullName || "Sửa hồ sơ"
      : titleName;
  const genderLabel =
    (catalog.genders || []).find((g) => g.key === form.gender)?.label || form.gender || "—";
  const roleLabel =
    (catalog.memberRoles || []).find((r) => r.key === form.roleTitle)?.label || form.roleTitle;

  const modeLabel =
    mode === "create" ? "Thêm mới" : mode === "edit" ? "Đang sửa" : "Xem hồ sơ";

  return (
    <AdminModal
      open={open}
      onClose={busy ? () => {} : onClose}
      title={displayTitle}
      subtitle={
        profile
          ? `${profile.profileCode || ""} · ${profile.organizationName || ""}`
          : "Hồ sơ năng lực thành viên BTC"
      }
      icon={User}
      size="xl"
      closeOnBackdrop={!busy}
      footer={
        <>
          <button type="button" className="lte-btn lte-btn-default" disabled={busy} onClick={onClose}>
            {readOnly ? "Đóng" : "Hủy"}
          </button>
          {readOnly && onDelete && profile?.status !== "approved" ? (
            <button
              type="button"
              className="lte-btn lte-btn-danger"
              disabled={busy}
              onClick={onDelete}
            >
              <Trash2 size={14} /> Xóa
            </button>
          ) : null}
          {readOnly && profile?.status !== "approved" ? (
            <button type="button" className="lte-btn lte-btn-primary" onClick={onEdit}>
              <Pencil size={14} /> Sửa hồ sơ
            </button>
          ) : null}
          {readOnly && profile?.status === "approved" ? (
            <span className="lte-help" style={{ marginRight: "auto" }}>
              Đơn vị đã duyệt — từ chối hồ sơ đơn vị trước khi sửa/xóa thành viên.
            </span>
          ) : null}
          {canEdit ? (
            <button type="button" className="lte-btn lte-btn-primary" disabled={busy} onClick={submit}>
              {busy ? <Loader2 size={14} className="spin" /> : null}
              Lưu hồ sơ
            </button>
          ) : null}
        </>
      }
    >
      <div className="lte-btc-profile">
        <div className="lte-btc-hero">
          <div className="lte-avatar lte-avatar-lg">
            {(form.stageName || form.fullName || "?").slice(0, 1).toUpperCase()}
          </div>
          <div className="lte-btc-hero-main">
            <div className="lte-btc-hero-top">
              <h3>{form.stageName || form.fullName || "Thành viên mới"}</h3>
              <span className={`lte-pill tone-${mode === "view" ? "muted" : "accent"}`}>
                {modeLabel}
              </span>
            </div>
            {form.stageName && form.fullName ? (
              <p className="lte-btc-legal-name">{form.fullName}</p>
            ) : null}
            <div className="lte-btc-meta">
              <span className="lte-chip">{roleLabel || "Chưa chọn vai trò"}</span>
              {form.specialty ? <span className="lte-chip soft">{form.specialty}</span> : null}
              {Number(form.experienceYears) > 0 ? (
                <span className="lte-chip soft">{form.experienceYears} năm KN</span>
              ) : null}
            </div>
          </div>
        </div>

        <div className="lte-member-tabs" role="tablist">
          {TABS.map((t) => {
            const Icon = t.icon;
            const count =
              t.id === "degrees"
                ? form.degrees.length
                : t.id === "certs"
                  ? form.certificates.length + form.awards.length
                  : 0;
            return (
              <button
                key={t.id}
                type="button"
                role="tab"
                aria-selected={tab === t.id}
                className={tab === t.id ? "active" : undefined}
                onClick={() => setTab(t.id)}
              >
                <Icon size={14} /> {t.label}
                {count ? <span className="lte-tab-count">{count}</span> : null}
              </button>
            );
          })}
        </div>

        <form className="lte-form lte-member-profile" onSubmit={submit}>
          {tab === "overview" && (
            <div className="lte-profile-overview">
              {form.bio ? <p className="lte-profile-bio">{form.bio}</p> : null}

              <section className="lte-form-section">
                <h4 className="lte-form-section-title">Thông tin cá nhân</h4>
                <div className="lte-info-grid">
                  <InfoRow label="CCCD/CMND" value={form.idNumber} />
                  <InfoRow label="Ngày sinh" value={form.dateOfBirth} />
                  <InfoRow
                    label="Giới tính"
                    value={genderLabel !== "— Chưa chọn —" ? genderLabel : ""}
                  />
                  <InfoRow label="Quốc tịch" value={form.nationality} />
                  <InfoRow label="Quê quán" value={form.hometown} />
                  <InfoRow label="Địa chỉ" value={form.address} />
                  <InfoRow label="Điện thoại" value={form.phone} />
                  <InfoRow label="Email" value={form.email} />
                  <InfoRow label="Liên hệ khẩn" value={form.emergencyContact} />
                  <InfoRow label="SĐT khẩn" value={form.emergencyPhone} />
                  <InfoRow label="MST cá nhân" value={form.taxCode} />
                  <InfoRow
                    label="Tài khoản NH"
                    value={
                      form.bankAccount
                        ? `${form.bankAccount}${form.bankName ? ` · ${form.bankName}` : ""}`
                        : ""
                    }
                  />
                  <InfoRow label="Hội viên" value={form.unionMembership} />
                  <InfoRow label="Ngôn ngữ" value={form.languages} />
                  <InfoRow label="Portfolio" value={form.portfolioUrl} />
                </div>
              </section>

              <section className="lte-form-section">
                <h4 className="lte-form-section-title">
                  <GraduationCap size={16} /> Bằng cấp ({form.degrees.length})
                </h4>
                {form.degrees.length ? (
                  <ul className="lte-profile-list">
                    {form.degrees.map((d, i) => (
                      <li key={i}>
                        <strong>{d.title || "—"}</strong>
                        <span>
                          {[d.level, d.major, d.school, d.year].filter(Boolean).join(" · ")}
                        </span>
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p className="lte-muted">Chưa khai báo bằng cấp.</p>
                )}
              </section>

              <section className="lte-form-section">
                <h4 className="lte-form-section-title">
                  <BadgeCheck size={16} /> Chứng chỉ hành nghề ({form.certificates.length})
                </h4>
                {form.certificates.length ? (
                  <ul className="lte-profile-list">
                    {form.certificates.map((c, i) => (
                      <li key={i}>
                        <strong>{c.name || "—"}</strong>
                        <span>
                          {[
                            c.issuer,
                            c.number && `Số ${c.number}`,
                            c.issuedAt,
                            c.expiresAt && `HSD ${c.expiresAt}`,
                          ]
                            .filter(Boolean)
                            .join(" · ")}
                        </span>
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p className="lte-muted">Chưa khai báo chứng chỉ.</p>
                )}
              </section>

              <section className="lte-form-section">
                <h4 className="lte-form-section-title">
                  <Trophy size={16} /> Giải thưởng ({form.awards.length})
                </h4>
                {form.awards.length ? (
                  <ul className="lte-profile-list">
                    {form.awards.map((a, i) => (
                      <li key={i}>
                        <strong>{a.title || "—"}</strong>
                        <span>{[a.year, a.organizer].filter(Boolean).join(" · ")}</span>
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p className="lte-muted">Chưa khai báo giải thưởng.</p>
                )}
              </section>

              {(form.qualifications || form.pastEvents || form.notes) && (
                <section className="lte-form-section">
                  <h4 className="lte-form-section-title">Ghi chú năng lực</h4>
                  {form.qualifications ? <p className="lte-profile-note">{form.qualifications}</p> : null}
                  {form.pastEvents ? (
                    <p className="lte-help">
                      <strong>Sự kiện:</strong> {form.pastEvents}
                    </p>
                  ) : null}
                  {form.notes ? (
                    <p className="lte-help">
                      <strong>Ghi chú:</strong> {form.notes}
                    </p>
                  ) : null}
                </section>
              )}
            </div>
          )}

          {tab === "personal" && (
            <section className="lte-form-section">
              <h4 className="lte-form-section-title">Thông tin định danh & liên hệ</h4>
              <div className="lte-form-grid lte-form-grid-3">
            <Field label="Họ và tên khai sinh *">
              <input
                required
                disabled={readOnly}
                value={form.fullName}
                onChange={(e) => set("fullName", e.target.value)}
              />
            </Field>
            <Field label="Nghệ danh / tên sân khấu">
              <input
                disabled={readOnly}
                value={form.stageName}
                onChange={(e) => set("stageName", e.target.value)}
              />
            </Field>
            <Field label="Vai trò / nghề *">
              <RoleSelect
                catalog={catalog}
                value={form.roleTitle}
                disabled={readOnly}
                onChange={(v) => set("roleTitle", v)}
              />
            </Field>            <Field label="CCCD/CMND">
              <input
                disabled={readOnly}
                value={form.idNumber}
                onChange={(e) => set("idNumber", e.target.value)}
              />
            </Field>
            <Field label="Ngày sinh">
              <input
                type="date"
                disabled={readOnly}
                value={form.dateOfBirth}
                onChange={(e) => set("dateOfBirth", e.target.value)}
              />
            </Field>
            <Field label="Giới tính">
              <select
                disabled={readOnly}
                value={form.gender}
                onChange={(e) => set("gender", e.target.value)}
              >
                {(catalog.genders || []).map((g) => (
                  <option key={g.key || "empty"} value={g.key}>
                    {g.label}
                  </option>
                ))}
              </select>
            </Field>
            <Field label="Quốc tịch">
              <input
                disabled={readOnly}
                value={form.nationality}
                onChange={(e) => set("nationality", e.target.value)}
              />
            </Field>
            <Field label="Quê quán">
              <input
                disabled={readOnly}
                value={form.hometown}
                onChange={(e) => set("hometown", e.target.value)}
              />
            </Field>
            <Field label="Điện thoại">
              <input
                disabled={readOnly}
                value={form.phone}
                onChange={(e) => set("phone", e.target.value)}
              />
            </Field>
            <Field label="Email" wide>
              <input
                type="email"
                disabled={readOnly}
                value={form.email}
                onChange={(e) => set("email", e.target.value)}
              />
            </Field>
            <Field label="Địa chỉ thường trú" wide>
              <input
                disabled={readOnly}
                value={form.address}
                onChange={(e) => set("address", e.target.value)}
              />
            </Field>
            <Field label="Người liên hệ khẩn cấp">
              <input
                disabled={readOnly}
                value={form.emergencyContact}
                onChange={(e) => set("emergencyContact", e.target.value)}
              />
            </Field>
            <Field label="SĐT khẩn cấp">
              <input
                disabled={readOnly}
                value={form.emergencyPhone}
                onChange={(e) => set("emergencyPhone", e.target.value)}
              />
            </Field>
            <Field label="MST cá nhân">
              <input
                disabled={readOnly}
                value={form.taxCode}
                onChange={(e) => set("taxCode", e.target.value)}
              />
            </Field>
            <Field label="Số tài khoản NH">
              <input
                disabled={readOnly}
                value={form.bankAccount}
                onChange={(e) => set("bankAccount", e.target.value)}
              />
            </Field>
            <Field label="Ngân hàng">
              <input
                disabled={readOnly}
                value={form.bankName}
                onChange={(e) => set("bankName", e.target.value)}
              />
            </Field>
            <Field label="Tiểu sử / giới thiệu" wide>
              <textarea
                rows={3}
                disabled={readOnly}
                value={form.bio}
                onChange={(e) => set("bio", e.target.value)}
              />
            </Field>
              </div>
            </section>
          )}

          {tab === "degrees" && (
          <section className="lte-form-section">
            <div className="lte-list-toolbar">
              <p className="lte-help" style={{ margin: 0 }}>
                Bằng cấp / văn bằng đào tạo (cử nhân, thạc sĩ, trung cấp…)
              </p>
              {!readOnly ? (
                <button
                  type="button"
                  className="lte-btn lte-btn-default"
                  onClick={() =>
                    addList("degrees", {
                      title: "",
                      school: "",
                      major: "",
                      year: "",
                      level: "",
                    })
                  }
                >
                  <Plus size={14} /> Thêm bằng
                </button>
              ) : null}
            </div>
            {!form.degrees.length ? (
              <div className="lte-empty-card compact">
                <GraduationCap size={22} />
                <p>Chưa có bằng cấp.</p>
              </div>
            ) : (
              <div className="lte-tier-list">
                {form.degrees.map((d, index) => (
                  <div key={index} className="lte-tier-row">
                    <div className="lte-tier-head">
                      <span>
                        #{index + 1} {d.title || "Bằng cấp"}
                      </span>
                      {!readOnly ? (
                        <button
                          type="button"
                          className="lte-icon-btn danger"
                          onClick={() => removeList("degrees", index)}
                        >
                          <Trash2 size={14} />
                        </button>
                      ) : null}
                    </div>
                    <div className="lte-form-grid lte-form-grid-3">
                      <Field label="Tên bằng / văn bằng">
                        <input
                          disabled={readOnly}
                          value={d.title}
                          onChange={(e) => patchList("degrees", index, { title: e.target.value })}
                        />
                      </Field>
                      <Field label="Trình độ">
                        <input
                          disabled={readOnly}
                          placeholder="Cử nhân / Thạc sĩ…"
                          value={d.level}
                          onChange={(e) => patchList("degrees", index, { level: e.target.value })}
                        />
                      </Field>
                      <Field label="Năm tốt nghiệp">
                        <input
                          disabled={readOnly}
                          value={d.year}
                          onChange={(e) => patchList("degrees", index, { year: e.target.value })}
                        />
                      </Field>
                      <Field label="Trường / cơ sở đào tạo" wide>
                        <input
                          disabled={readOnly}
                          value={d.school}
                          onChange={(e) => patchList("degrees", index, { school: e.target.value })}
                        />
                      </Field>
                      <Field label="Chuyên ngành" wide>
                        <input
                          disabled={readOnly}
                          value={d.major}
                          onChange={(e) => patchList("degrees", index, { major: e.target.value })}
                        />
                      </Field>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </section>
          )}

        {tab === "certs" && (
          <div>
            <div className="lte-list-toolbar">
              <p className="lte-help" style={{ margin: 0 }}>
                Chứng chỉ hành nghề, giấy phép biểu diễn, chứng nhận kỹ thuật…
              </p>
              {!readOnly ? (
                <button
                  type="button"
                  className="lte-btn lte-btn-default"
                  onClick={() =>
                    addList("certificates", {
                      name: "",
                      issuer: "",
                      number: "",
                      issuedAt: "",
                      expiresAt: "",
                      notes: "",
                    })
                  }
                >
                  <Plus size={14} /> Thêm chứng chỉ
                </button>
              ) : null}
            </div>
            {!form.certificates.length ? (
              <p className="lte-empty">Chưa có chứng chỉ hành nghề.</p>
            ) : (
              <div className="lte-tier-list">
                {form.certificates.map((c, index) => (
                  <div key={index} className="lte-tier-row">
                    <div className="lte-tier-head">
                      <span>#{index + 1} {c.name || "Chứng chỉ"}</span>
                      {!readOnly ? (
                        <button
                          type="button"
                          className="lte-icon-btn danger"
                          onClick={() => removeList("certificates", index)}
                        >
                          <Trash2 size={14} />
                        </button>
                      ) : null}
                    </div>
                    <div className="lte-form-grid" style={{ gridTemplateColumns: "1.2fr 1fr 1fr" }}>
                      <Field label="Tên chứng chỉ *">
                        <input
                          disabled={readOnly}
                          value={c.name}
                          onChange={(e) =>
                            patchList("certificates", index, { name: e.target.value })
                          }
                        />
                      </Field>
                      <Field label="Cơ quan cấp">
                        <input
                          disabled={readOnly}
                          value={c.issuer}
                          onChange={(e) =>
                            patchList("certificates", index, { issuer: e.target.value })
                          }
                        />
                      </Field>
                      <Field label="Số chứng chỉ">
                        <input
                          disabled={readOnly}
                          value={c.number}
                          onChange={(e) =>
                            patchList("certificates", index, { number: e.target.value })
                          }
                        />
                      </Field>
                      <Field label="Ngày cấp">
                        <input
                          type="date"
                          disabled={readOnly}
                          value={c.issuedAt}
                          onChange={(e) =>
                            patchList("certificates", index, { issuedAt: e.target.value })
                          }
                        />
                      </Field>
                      <Field label="Hết hạn">
                        <input
                          type="date"
                          disabled={readOnly}
                          value={c.expiresAt}
                          onChange={(e) =>
                            patchList("certificates", index, { expiresAt: e.target.value })
                          }
                        />
                      </Field>
                      <Field label="Ghi chú" wide>
                        <input
                          disabled={readOnly}
                          value={c.notes}
                          onChange={(e) =>
                            patchList("certificates", index, { notes: e.target.value })
                          }
                        />
                      </Field>
                    </div>
                  </div>
                ))}
              </div>
            )}

            <div className="lte-list-toolbar" style={{ marginTop: "1.25rem" }}>
              <p className="lte-help" style={{ margin: 0 }}>
                <Trophy size={14} style={{ verticalAlign: -2 }} /> Giải thưởng / danh hiệu
              </p>
              {!readOnly ? (
                <button
                  type="button"
                  className="lte-btn lte-btn-default"
                  onClick={() => addList("awards", { title: "", year: "", organizer: "" })}
                >
                  <Plus size={14} /> Thêm giải
                </button>
              ) : null}
            </div>
            {form.awards.length ? (
              <div className="lte-tier-list">
                {form.awards.map((a, index) => (
                  <div key={index} className="lte-tier-row">
                    <div className="lte-tier-head">
                      <span>#{index + 1} {a.title || "Giải thưởng"}</span>
                      {!readOnly ? (
                        <button
                          type="button"
                          className="lte-icon-btn danger"
                          onClick={() => removeList("awards", index)}
                        >
                          <Trash2 size={14} />
                        </button>
                      ) : null}
                    </div>
                    <div className="lte-form-grid" style={{ gridTemplateColumns: "1.4fr 0.6fr 1fr" }}>
                      <Field label="Tên giải / danh hiệu">
                        <input
                          disabled={readOnly}
                          value={a.title}
                          onChange={(e) => patchList("awards", index, { title: e.target.value })}
                        />
                      </Field>
                      <Field label="Năm">
                        <input
                          disabled={readOnly}
                          value={a.year}
                          onChange={(e) => patchList("awards", index, { year: e.target.value })}
                        />
                      </Field>
                      <Field label="Đơn vị tổ chức">
                        <input
                          disabled={readOnly}
                          value={a.organizer}
                          onChange={(e) =>
                            patchList("awards", index, { organizer: e.target.value })
                          }
                        />
                      </Field>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="lte-muted">Chưa có giải thưởng.</p>
            )}
          </div>
        )}

        {tab === "career" && (
          <section className="lte-form-section">
            <h4 className="lte-form-section-title">
              <Briefcase size={16} /> Nghề nghiệp & kinh nghiệm
            </h4>
            <div className="lte-form-grid lte-form-grid-2">
            <Field label="Chuyên môn / thể loại">
              <input
                disabled={readOnly}
                value={form.specialty}
                onChange={(e) => set("specialty", e.target.value)}
              />
            </Field>
            <Field label="Số năm kinh nghiệm">
              <input
                type="number"
                min="0"
                disabled={readOnly}
                value={form.experienceYears}
                onChange={(e) => set("experienceYears", e.target.value)}
              />
            </Field>
            <Field label="Hội viên (Hội nhạc sĩ, NSND…)">
              <input
                disabled={readOnly}
                value={form.unionMembership}
                onChange={(e) => set("unionMembership", e.target.value)}
              />
            </Field>
            <Field label="Ngôn ngữ">
              <input
                disabled={readOnly}
                placeholder="Tiếng Việt, English…"
                value={form.languages}
                onChange={(e) => set("languages", e.target.value)}
              />
            </Field>
            <Field label="Portfolio / mạng xã hội" wide>
              <input
                disabled={readOnly}
                value={form.portfolioUrl}
                onChange={(e) => set("portfolioUrl", e.target.value)}
              />
            </Field>
            <Field label="Tóm tắt bằng cấp / chứng chỉ (text)" wide>
              <textarea
                rows={2}
                disabled={readOnly}
                value={form.qualifications}
                onChange={(e) => set("qualifications", e.target.value)}
              />
            </Field>
            <Field label="Sự kiện / show đã tham gia" wide>
              <textarea
                rows={3}
                disabled={readOnly}
                value={form.pastEvents}
                onChange={(e) => set("pastEvents", e.target.value)}
              />
            </Field>
            <Field label="Ghi chú nội bộ" wide>
              <textarea
                rows={2}
                disabled={readOnly}
                value={form.notes}
                onChange={(e) => set("notes", e.target.value)}
              />
            </Field>
            </div>
          </section>
          )}
        </form>
      </div>
    </AdminModal>
  );
}
