import crypto from "crypto";
import OrganizerProfile from "../models/OrganizerProfile.js";
import User from "../models/User.js";
import { asyncHandler } from "../middlewares/errorHandler.js";
import {
  MEMBER_ROLE_TITLES,
  MEMBER_ROLE_GROUPS,
  MEMBER_GENDERS,
  PROFILE_STATUSES,
  memberRoleLabel,
  memberRoleGroup,
  emptyMember,
  emptyDegree,
  emptyCertificate,
  emptyAward,
} from "../utils/organizerProfileVn.js";

const STATUS_KEYS = PROFILE_STATUSES.map((s) => s.key);
const ROLE_KEYS = MEMBER_ROLE_TITLES.map((r) => r.key);
const GENDER_KEYS = MEMBER_GENDERS.map((g) => g.key);

function makeProfileCode() {
  const y = new Date().getFullYear();
  const suffix = crypto.randomBytes(3).toString("hex").toUpperCase();
  return `HSNL-${y}-${suffix}`;
}

function sanitizeDegrees(list) {
  if (!Array.isArray(list)) return [];
  return list
    .map((d) => ({
      title: String(d?.title || "").trim(),
      school: String(d?.school || "").trim(),
      major: String(d?.major || "").trim(),
      year: String(d?.year || "").trim(),
      level: String(d?.level || "").trim(),
    }))
    .filter((d) => d.title || d.school);
}

function sanitizeCertificates(list) {
  if (!Array.isArray(list)) return [];
  return list
    .map((c) => ({
      name: String(c?.name || "").trim(),
      issuer: String(c?.issuer || "").trim(),
      number: String(c?.number || "").trim(),
      issuedAt: String(c?.issuedAt || "").trim(),
      expiresAt: String(c?.expiresAt || "").trim(),
      notes: String(c?.notes || "").trim(),
    }))
    .filter((c) => c.name || c.number);
}

function sanitizeAwards(list) {
  if (!Array.isArray(list)) return [];
  return list
    .map((a) => ({
      title: String(a?.title || "").trim(),
      year: String(a?.year || "").trim(),
      organizer: String(a?.organizer || "").trim(),
    }))
    .filter((a) => a.title);
}

function sanitizeMember(raw = {}) {
  const roleTitle = ROLE_KEYS.includes(raw.roleTitle) ? raw.roleTitle : "khac";
  const gender = GENDER_KEYS.includes(raw.gender) ? raw.gender : "";
  const years = Number(raw.experienceYears);
  return {
    fullName: String(raw.fullName || "").trim(),
    stageName: String(raw.stageName || "").trim(),
    roleTitle,
    idNumber: String(raw.idNumber || "").trim(),
    dateOfBirth: String(raw.dateOfBirth || "").trim(),
    gender,
    nationality: String(raw.nationality || "").trim() || "Việt Nam",
    hometown: String(raw.hometown || "").trim(),
    address: String(raw.address || "").trim(),
    phone: String(raw.phone || "").trim(),
    email: String(raw.email || "").trim().toLowerCase(),
    emergencyContact: String(raw.emergencyContact || "").trim(),
    emergencyPhone: String(raw.emergencyPhone || "").trim(),
    taxCode: String(raw.taxCode || "").trim(),
    bankAccount: String(raw.bankAccount || "").trim(),
    bankName: String(raw.bankName || "").trim(),
    unionMembership: String(raw.unionMembership || "").trim(),
    languages: String(raw.languages || "").trim(),
    portfolioUrl: String(raw.portfolioUrl || "").trim(),
    bio: String(raw.bio || "").trim(),
    qualifications: String(raw.qualifications || "").trim(),
    specialty: String(raw.specialty || "").trim(),
    experienceYears: Number.isFinite(years) && years >= 0 ? years : 0,
    pastEvents: String(raw.pastEvents || "").trim(),
    degrees: sanitizeDegrees(raw.degrees),
    certificates: sanitizeCertificates(raw.certificates),
    awards: sanitizeAwards(raw.awards),
    notes: String(raw.notes || "").trim(),
  };
}

function sanitizeMembers(list) {
  if (!Array.isArray(list)) return [];
  return list
    .map(sanitizeMember)
    .filter((m) => m.fullName.length > 0);
}

function toMemberDto(m) {
  const group = memberRoleGroup(m.roleTitle);
  return {
    id: String(m._id || ""),
    fullName: m.fullName || "",
    stageName: m.stageName || "",
    roleTitle: m.roleTitle || "khac",
    roleLabel: memberRoleLabel(m.roleTitle),
    roleGroup: group?.key || "ho_tro",
    roleGroupLabel: group?.label || "",
    idNumber: m.idNumber || "",
    dateOfBirth: m.dateOfBirth || "",
    gender: m.gender || "",
    nationality: m.nationality || "",
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
    experienceYears: m.experienceYears || 0,
    pastEvents: m.pastEvents || "",
    degrees: (m.degrees || []).map((d) => ({
      id: String(d._id || ""),
      title: d.title || "",
      school: d.school || "",
      major: d.major || "",
      year: d.year || "",
      level: d.level || "",
    })),
    certificates: (m.certificates || []).map((c) => ({
      id: String(c._id || ""),
      name: c.name || "",
      issuer: c.issuer || "",
      number: c.number || "",
      issuedAt: c.issuedAt || "",
      expiresAt: c.expiresAt || "",
      notes: c.notes || "",
    })),
    awards: (m.awards || []).map((a) => ({
      id: String(a._id || ""),
      title: a.title || "",
      year: a.year || "",
      organizer: a.organizer || "",
    })),
    notes: m.notes || "",
  };
}

function assertEditable(doc) {
  if (doc.status === "approved") {
    const err = new Error(
      "Hồ sơ đã duyệt — hãy từ chối trước khi thêm/sửa/xóa thành viên."
    );
    err.status = 400;
    throw err;
  }
}

function toAdminDto(doc) {
  const o = doc.toObject ? doc.toObject() : doc;
  const linked = o.linkedUser;
  const reviewer = o.reviewedBy;
  return {
    id: String(o._id),
    profileCode: o.profileCode || "",
    organizationName: o.organizationName || "",
    taxCode: o.taxCode || "",
    address: o.address || "",
    phone: o.phone || "",
    email: o.email || "",
    website: o.website || "",
    businessField: o.businessField || "",
    yearsOperating: o.yearsOperating || 0,
    legalRepName: o.legalRepName || "",
    legalRepTitle: o.legalRepTitle || "",
    legalRepIdNumber: o.legalRepIdNumber || "",
    members: (o.members || []).map(toMemberDto),
    memberCount: (o.members || []).length,
    status: o.status || "draft",
    notes: o.notes || "",
    rejectionReason: o.rejectionReason || "",
    reviewedAt: o.reviewedAt || null,
    reviewedBy: reviewer
      ? {
          id: String(reviewer._id || reviewer),
          email: reviewer.email || "",
        }
      : null,
    linkedUser: linked
      ? {
          id: String(linked._id || linked),
          email: linked.email || "",
          displayName: linked.displayName || "",
          role: linked.role || "",
        }
      : null,
    createdAt: o.createdAt || null,
    updatedAt: o.updatedAt || null,
  };
}

async function populateProfile(id) {
  return OrganizerProfile.findById(id)
    .populate("linkedUser", "email displayName role")
    .populate("reviewedBy", "email");
}

export const getOrganizerProfileCatalog = asyncHandler(async (_req, res) => {
  res.json({
    success: true,
    data: {
      statuses: PROFILE_STATUSES,
      memberRoles: MEMBER_ROLE_TITLES,
      memberRoleGroups: MEMBER_ROLE_GROUPS,
      genders: MEMBER_GENDERS,
      emptyMember: emptyMember(),
      emptyDegree: emptyDegree(),
      emptyCertificate: emptyCertificate(),
      emptyAward: emptyAward(),
    },
  });
});

/** Danh sách phẳng mọi thành viên (CRUD theo người) */
export const listAllOrganizerMembers = asyncHandler(async (req, res) => {
  const q = String(req.query.q || "").trim().toLowerCase();
  const roleTitle = String(req.query.roleTitle || "").trim();
  const roleGroup = String(req.query.roleGroup || "").trim();
  const profileId = String(req.query.profileId || "").trim();

  const filter = {};
  if (profileId) filter._id = profileId;

  const profiles = await OrganizerProfile.find(filter)
    .select("profileCode organizationName status members")
    .sort({ updatedAt: -1 })
    .limit(200);

  const roleKeysInGroup = roleGroup
    ? MEMBER_ROLE_TITLES.filter((r) => r.group === roleGroup).map((r) => r.key)
    : null;

  const members = [];
  for (const p of profiles) {
    for (const m of p.members || []) {
      if (roleTitle && m.roleTitle !== roleTitle) continue;
      if (roleKeysInGroup && !roleKeysInGroup.includes(m.roleTitle)) continue;
      if (q) {
        const hay = [
          m.fullName,
          m.stageName,
          m.email,
          m.phone,
          m.specialty,
          m.qualifications,
          memberRoleLabel(m.roleTitle),
          p.organizationName,
          p.profileCode,
        ]
          .join(" ")
          .toLowerCase();
        if (!hay.includes(q)) continue;
      }
      members.push({
        ...toMemberDto(m),
        profileId: String(p._id),
        profileCode: p.profileCode,
        organizationName: p.organizationName,
        profileStatus: p.status,
      });
    }
  }

  const byRole = {};
  const byGroup = {};
  for (const m of members) {
    byRole[m.roleTitle] = (byRole[m.roleTitle] || 0) + 1;
    byGroup[m.roleGroup] = (byGroup[m.roleGroup] || 0) + 1;
  }

  res.json({
    success: true,
    data: {
      members,
      total: members.length,
      stats: { byRole, byGroup },
    },
  });
});

export const listOrganizerProfiles = asyncHandler(async (req, res) => {
  const q = String(req.query.q || "").trim();
  const status = String(req.query.status || "").trim();

  const filter = {};
  if (STATUS_KEYS.includes(status)) filter.status = status;
  if (q) {
    filter.$or = [
      { profileCode: { $regex: q, $options: "i" } },
      { organizationName: { $regex: q, $options: "i" } },
      { taxCode: { $regex: q, $options: "i" } },
      { email: { $regex: q, $options: "i" } },
      { legalRepName: { $regex: q, $options: "i" } },
      { "members.fullName": { $regex: q, $options: "i" } },
      { "members.email": { $regex: q, $options: "i" } },
    ];
  }

  const profiles = await OrganizerProfile.find(filter)
    .populate("linkedUser", "email displayName role")
    .populate("reviewedBy", "email")
    .sort({ updatedAt: -1 })
    .limit(200);

  const all = await OrganizerProfile.aggregate([
    { $group: { _id: "$status", count: { $sum: 1 } } },
  ]);
  const stats = Object.fromEntries(STATUS_KEYS.map((k) => [k, 0]));
  let totalMembers = 0;
  for (const row of all) {
    if (stats[row._id] !== undefined) stats[row._id] = row.count;
  }
  const memberAgg = await OrganizerProfile.aggregate([
    { $project: { n: { $size: { $ifNull: ["$members", []] } } } },
    { $group: { _id: null, total: { $sum: "$n" } } },
  ]);
  totalMembers = memberAgg[0]?.total || 0;

  res.json({
    success: true,
    data: {
      profiles: profiles.map(toAdminDto),
      total: profiles.length,
      stats: { ...stats, totalMembers },
    },
  });
});

export const getOrganizerProfile = asyncHandler(async (req, res) => {
  const doc = await populateProfile(req.params.id);
  if (!doc) {
    return res.status(404).json({ success: false, error: "Không tìm thấy hồ sơ năng lực" });
  }
  res.json({ success: true, data: { profile: toAdminDto(doc) } });
});

export const createOrganizerProfile = asyncHandler(async (req, res) => {
  const body = req.body || {};
  const organizationName = String(body.organizationName || "").trim();
  if (!organizationName) {
    return res.status(400).json({ success: false, error: "Thiếu tên đơn vị / ban tổ chức" });
  }

  const members = sanitizeMembers(body.members);
  // Cho phép tạo đơn vị trước, rồi CRUD từng người sau

  let linkedUser = null;
  if (body.linkedUserId) {
    const u = await User.findById(body.linkedUserId).select("_id email role");
    if (!u) {
      return res.status(400).json({ success: false, error: "linkedUserId không hợp lệ" });
    }
    linkedUser = u._id;
  }

  const years = Number(body.yearsOperating);
  const doc = await OrganizerProfile.create({
    profileCode: String(body.profileCode || "").trim() || makeProfileCode(),
    organizationName,
    taxCode: String(body.taxCode || "").trim(),
    address: String(body.address || "").trim(),
    phone: String(body.phone || "").trim(),
    email: String(body.email || "").trim().toLowerCase(),
    website: String(body.website || "").trim(),
    businessField: String(body.businessField || "").trim(),
    yearsOperating: Number.isFinite(years) && years >= 0 ? years : 0,
    legalRepName: String(body.legalRepName || "").trim(),
    legalRepTitle: String(body.legalRepTitle || "").trim(),
    legalRepIdNumber: String(body.legalRepIdNumber || "").trim(),
    members,
    status: "draft",
    notes: String(body.notes || "").trim(),
    linkedUser,
  });

  const populated = await populateProfile(doc._id);
  res.status(201).json({
    success: true,
    data: { profile: toAdminDto(populated), message: "Đã tạo hồ sơ năng lực (nháp)." },
  });
});

export const updateOrganizerProfile = asyncHandler(async (req, res) => {
  const doc = await OrganizerProfile.findById(req.params.id);
  if (!doc) {
    return res.status(404).json({ success: false, error: "Không tìm thấy hồ sơ năng lực" });
  }

  if (doc.status === "approved") {
    return res.status(400).json({
      success: false,
      error: "Hồ sơ đã duyệt — hãy chuyển về nháp/từ chối trước khi sửa nội dung.",
    });
  }

  const body = req.body || {};
  if (body.organizationName !== undefined) {
    const name = String(body.organizationName || "").trim();
    if (!name) {
      return res.status(400).json({ success: false, error: "Tên đơn vị không được để trống" });
    }
    doc.organizationName = name;
  }

  const strFields = [
    "taxCode",
    "address",
    "phone",
    "website",
    "businessField",
    "legalRepName",
    "legalRepTitle",
    "legalRepIdNumber",
    "notes",
  ];
  for (const f of strFields) {
    if (body[f] !== undefined) doc[f] = String(body[f] || "").trim();
  }
  if (body.email !== undefined) doc.email = String(body.email || "").trim().toLowerCase();
  if (body.yearsOperating !== undefined) {
    const years = Number(body.yearsOperating);
    doc.yearsOperating = Number.isFinite(years) && years >= 0 ? years : 0;
  }

  if (body.members !== undefined) {
    doc.members = sanitizeMembers(body.members);
  }

  if (body.linkedUserId !== undefined) {
    if (!body.linkedUserId) {
      doc.linkedUser = null;
    } else {
      const u = await User.findById(body.linkedUserId).select("_id");
      if (!u) {
        return res.status(400).json({ success: false, error: "linkedUserId không hợp lệ" });
      }
      doc.linkedUser = u._id;
    }
  }

  if (doc.status === "rejected" && body.members !== undefined) {
    doc.status = "draft";
    doc.rejectionReason = "";
  }

  await doc.save();
  const populated = await populateProfile(doc._id);
  res.json({
    success: true,
    data: { profile: toAdminDto(populated), message: "Đã cập nhật hồ sơ năng lực." },
  });
});

export const patchOrganizerProfileStatus = asyncHandler(async (req, res) => {
  const doc = await OrganizerProfile.findById(req.params.id);
  if (!doc) {
    return res.status(404).json({ success: false, error: "Không tìm thấy hồ sơ năng lực" });
  }

  const next = String(req.body?.status || "").trim();
  if (!STATUS_KEYS.includes(next)) {
    return res.status(400).json({ success: false, error: "Trạng thái không hợp lệ" });
  }

  const cur = doc.status || "draft";
  const reason = String(req.body?.rejectionReason || "").trim();

  if (next === "pending") {
    if (!["draft", "rejected"].includes(cur)) {
      return res.status(400).json({
        success: false,
        error: "Chỉ gửi chờ duyệt từ trạng thái nháp hoặc từ chối",
      });
    }
    if (!doc.members?.length) {
      return res.status(400).json({ success: false, error: "Hồ sơ chưa có thành viên" });
    }
    if (!doc.organizationName || !doc.legalRepName) {
      return res.status(400).json({
        success: false,
        error: "Cần tên đơn vị và người đại diện pháp luật trước khi gửi duyệt",
      });
    }
    doc.rejectionReason = "";
  }

  if (next === "approved") {
    if (cur !== "pending") {
      return res.status(400).json({
        success: false,
        error: "Chỉ duyệt khi hồ sơ đang chờ duyệt",
      });
    }
    doc.reviewedBy = req.user._id;
    doc.reviewedAt = new Date();
    doc.rejectionReason = "";
  }

  if (next === "rejected") {
    if (!["pending", "approved"].includes(cur)) {
      return res.status(400).json({
        success: false,
        error: "Chỉ từ chối khi hồ sơ đang chờ duyệt hoặc đã duyệt",
      });
    }
    if (!reason) {
      return res.status(400).json({ success: false, error: "Cần lý do từ chối" });
    }
    doc.rejectionReason = reason;
    doc.reviewedBy = req.user._id;
    doc.reviewedAt = new Date();
  }

  if (next === "draft") {
    if (!["rejected", "pending"].includes(cur)) {
      return res.status(400).json({
        success: false,
        error: "Chỉ đưa về nháp từ chờ duyệt hoặc từ chối",
      });
    }
    doc.rejectionReason = "";
  }

  doc.status = next;
  await doc.save();

  const populated = await populateProfile(doc._id);
  const messages = {
    draft: "Đã đưa hồ sơ về nháp.",
    pending: "Đã gửi hồ sơ chờ duyệt.",
    approved: "Đã duyệt hồ sơ năng lực Ban tổ chức.",
    rejected: "Đã từ chối hồ sơ.",
  };

  res.json({
    success: true,
    data: {
      profile: toAdminDto(populated),
      message: messages[next] || "Đã cập nhật trạng thái.",
    },
  });
});

export const deleteOrganizerProfile = asyncHandler(async (req, res) => {
  const doc = await OrganizerProfile.findById(req.params.id);
  if (!doc) {
    return res.status(404).json({ success: false, error: "Không tìm thấy hồ sơ năng lực" });
  }
  if (doc.status === "approved") {
    return res.status(400).json({
      success: false,
      error: "Không xóa hồ sơ đã duyệt — hãy từ chối trước.",
    });
  }
  await doc.deleteOne();
  res.json({
    success: true,
    data: { id: req.params.id, message: "Đã xóa hồ sơ năng lực." },
  });
});

export const createOrganizerMember = asyncHandler(async (req, res) => {
  const doc = await OrganizerProfile.findById(req.params.id);
  if (!doc) {
    return res.status(404).json({ success: false, error: "Không tìm thấy hồ sơ năng lực" });
  }
  assertEditable(doc);

  const member = sanitizeMember(req.body || {});
  if (!member.fullName) {
    return res.status(400).json({ success: false, error: "Thiếu họ và tên thành viên" });
  }

  doc.members.push(member);
  if (doc.status === "rejected") {
    doc.status = "draft";
    doc.rejectionReason = "";
  }
  await doc.save();

  const created = doc.members[doc.members.length - 1];
  const populated = await populateProfile(doc._id);
  res.status(201).json({
    success: true,
    data: {
      member: toMemberDto(created),
      profile: toAdminDto(populated),
      message: `Đã thêm ${member.fullName} (${memberRoleLabel(member.roleTitle)}).`,
    },
  });
});

export const updateOrganizerMember = asyncHandler(async (req, res) => {
  const doc = await OrganizerProfile.findById(req.params.id);
  if (!doc) {
    return res.status(404).json({ success: false, error: "Không tìm thấy hồ sơ năng lực" });
  }
  assertEditable(doc);

  const member = doc.members.id(req.params.memberId);
  if (!member) {
    return res.status(404).json({ success: false, error: "Không tìm thấy thành viên" });
  }

  const next = sanitizeMember({ ...member.toObject(), ...(req.body || {}) });
  if (!next.fullName) {
    return res.status(400).json({ success: false, error: "Họ và tên không được để trống" });
  }

  Object.assign(member, next);
  if (doc.status === "rejected") {
    doc.status = "draft";
    doc.rejectionReason = "";
  }
  await doc.save();

  const populated = await populateProfile(doc._id);
  res.json({
    success: true,
    data: {
      member: toMemberDto(member),
      profile: toAdminDto(populated),
      message: `Đã cập nhật ${next.fullName}.`,
    },
  });
});

export const deleteOrganizerMember = asyncHandler(async (req, res) => {
  const doc = await OrganizerProfile.findById(req.params.id);
  if (!doc) {
    return res.status(404).json({ success: false, error: "Không tìm thấy hồ sơ năng lực" });
  }
  assertEditable(doc);

  const member = doc.members.id(req.params.memberId);
  if (!member) {
    return res.status(404).json({ success: false, error: "Không tìm thấy thành viên" });
  }

  const name = member.fullName;
  member.deleteOne();
  await doc.save();

  const populated = await populateProfile(doc._id);
  res.json({
    success: true,
    data: {
      id: req.params.memberId,
      profile: toAdminDto(populated),
      message: `Đã xóa ${name} khỏi hồ sơ.`,
    },
  });
});
