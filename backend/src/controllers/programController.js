import mongoose from "mongoose";
import Event from "../models/Event.js";
import OrganizerProfile from "../models/OrganizerProfile.js";
import { asyncHandler } from "../middlewares/errorHandler.js";
import {
  PROGRAM_ITEM_TYPES,
  programItemTypeLabel,
  emptyProgramItem,
} from "../utils/programVn.js";
import {
  memberRoleLabel,
  memberRoleGroup,
} from "../utils/organizerProfileVn.js";

const TYPE_KEYS = PROGRAM_ITEM_TYPES.map((t) => t.key);

function parseDate(v) {
  if (v === null || v === undefined || v === "") return null;
  const d = new Date(v);
  return Number.isFinite(d.getTime()) ? d : null;
}

function memberDisplayName(m) {
  if (!m) return "";
  const stage = String(m.stageName || "").trim();
  const full = String(m.fullName || "").trim();
  if (stage && full && stage !== full) return `${stage} (${full})`;
  return stage || full || "";
}

function toUnitMemberOption(m) {
  return {
    id: String(m._id),
    fullName: m.fullName || "",
    stageName: m.stageName || "",
    displayName: memberDisplayName(m),
    roleTitle: m.roleTitle || "",
    roleLabel: memberRoleLabel(m.roleTitle),
    roleGroup: memberRoleGroup(m.roleTitle)?.key || "",
    roleGroupLabel: memberRoleGroup(m.roleTitle)?.label || "",
    specialty: m.specialty || "",
  };
}

async function loadUnitForEvent(event) {
  if (!event?.organizerProfile) {
    return { unit: null, members: [] };
  }
  const profile = await OrganizerProfile.findById(event.organizerProfile)
    .select("profileCode organizationName status members")
    .lean();
  if (!profile) return { unit: null, members: [] };
  return {
    unit: {
      id: String(profile._id),
      profileCode: profile.profileCode || "",
      organizationName: profile.organizationName || "",
      status: profile.status || "",
    },
    members: (profile.members || []).map(toUnitMemberOption),
  };
}

function resolveMemberFields(body, unitMembers) {
  const rawId = body.memberId != null && body.memberId !== "" ? String(body.memberId) : "";
  if (!rawId) {
    return {
      memberId: null,
      performer: String(body.performer || "").trim(),
      performerRole: String(body.performerRole || "").trim(),
    };
  }
  if (!mongoose.Types.ObjectId.isValid(rawId)) {
    const err = new Error("memberId không hợp lệ");
    err.status = 400;
    throw err;
  }
  const member = (unitMembers || []).find((m) => m.id === rawId);
  if (!member) {
    const err = new Error(
      "Thành viên không thuộc đơn vị tổ chức của sự kiện. Hãy gắn đơn vị BTC cho sự kiện trước."
    );
    err.status = 400;
    throw err;
  }
  return {
    memberId: new mongoose.Types.ObjectId(rawId),
    performer: member.displayName,
    performerRole: member.roleLabel || "",
  };
}

function sanitizeProgramItem(body = {}, unitMembers = [], { requireTitle = true } = {}) {
  const title = String(body.title || "").trim();
  if (requireTitle && !title) {
    const err = new Error("Thiếu tiêu đề mục chương trình");
    err.status = 400;
    throw err;
  }
  const itemType = TYPE_KEYS.includes(body.itemType) ? body.itemType : "performance";
  const sortOrder = Number(body.sortOrder);
  const person = resolveMemberFields(body, unitMembers);
  return {
    title,
    description: String(body.description || "").trim(),
    itemType,
    startAt: parseDate(body.startAt),
    endAt: parseDate(body.endAt),
    memberId: person.memberId,
    performer: person.performer,
    performerRole: person.performerRole,
    stage: String(body.stage || "").trim(),
    sortOrder: Number.isFinite(sortOrder) ? sortOrder : 0,
    notes: String(body.notes || "").trim(),
  };
}

function sortProgramItems(items = []) {
  return [...items].sort((a, b) => {
    const oa = Number(a.sortOrder) || 0;
    const ob = Number(b.sortOrder) || 0;
    if (oa !== ob) return oa - ob;
    const ta = a.startAt ? new Date(a.startAt).getTime() : 0;
    const tb = b.startAt ? new Date(b.startAt).getTime() : 0;
    if (ta !== tb) return ta - tb;
    return String(a.title || "").localeCompare(String(b.title || ""), "vi");
  });
}

function toProgramItemDto(item) {
  const o = item.toObject ? item.toObject() : item;
  return {
    id: String(o._id),
    title: o.title || "",
    description: o.description || "",
    itemType: o.itemType || "performance",
    itemTypeLabel: programItemTypeLabel(o.itemType),
    startAt: o.startAt || null,
    endAt: o.endAt || null,
    memberId: o.memberId ? String(o.memberId) : null,
    performer: o.performer || "",
    performerRole: o.performerRole || "",
    stage: o.stage || "",
    sortOrder: o.sortOrder ?? 0,
    notes: o.notes || "",
  };
}

function toEventProgramDto(event, unitPack = { unit: null, members: [] }) {
  const items = sortProgramItems(event.programItems || []).map(toProgramItemDto);
  return {
    eventId: String(event._id),
    title: event.title || "",
    location: event.location || "",
    startTime: event.startTime || null,
    organizerProfileId: event.organizerProfile ? String(event.organizerProfile) : null,
    unit: unitPack.unit,
    unitMembers: unitPack.members,
    programCount: items.length,
    programItems: items,
  };
}

export const getProgramCatalog = asyncHandler(async (_req, res) => {
  res.json({
    success: true,
    data: {
      itemTypes: PROGRAM_ITEM_TYPES,
      emptyItem: emptyProgramItem(),
    },
  });
});

/** Danh sách sự kiện kèm tóm tắt chương trình */
export const listEventPrograms = asyncHandler(async (req, res) => {
  const q = String(req.query.q || "").trim();
  const filter = {};
  if (q) {
    filter.$or = [
      { title: { $regex: q, $options: "i" } },
      { location: { $regex: q, $options: "i" } },
      { "programItems.title": { $regex: q, $options: "i" } },
      { "programItems.performer": { $regex: q, $options: "i" } },
    ];
  }

  const events = await Event.find(filter)
    .select("title location startTime programItems organizerProfile")
    .populate("organizerProfile", "profileCode organizationName")
    .sort({ startTime: 1 })
    .limit(200);

  const rows = events.map((ev) => {
    const items = sortProgramItems(ev.programItems || []);
    const first = items[0];
    const unit = ev.organizerProfile;
    return {
      eventId: String(ev._id),
      title: ev.title || "",
      location: ev.location || "",
      startTime: ev.startTime || null,
      organizerProfileId: unit?._id ? String(unit._id) : ev.organizerProfile ? String(ev.organizerProfile) : null,
      unit: unit?._id
        ? {
            id: String(unit._id),
            profileCode: unit.profileCode || "",
            organizationName: unit.organizationName || "",
          }
        : null,
      programCount: items.length,
      preview: first
        ? {
            title: first.title || "",
            performer: first.performer || "",
            startAt: first.startAt || null,
          }
        : null,
    };
  });

  res.json({
    success: true,
    data: {
      events: rows,
      total: rows.length,
      stats: {
        withProgram: rows.filter((r) => r.programCount > 0).length,
        emptyProgram: rows.filter((r) => r.programCount === 0).length,
        totalItems: rows.reduce((s, r) => s + r.programCount, 0),
      },
    },
  });
});

export const getEventProgram = asyncHandler(async (req, res) => {
  const event = await Event.findById(req.params.eventId).select(
    "title location startTime programItems organizerProfile"
  );
  if (!event) {
    return res.status(404).json({ success: false, error: "Không tìm thấy sự kiện" });
  }
  const unitPack = await loadUnitForEvent(event);
  res.json({
    success: true,
    data: { program: toEventProgramDto(event, unitPack) },
  });
});

/** Thay toàn bộ chương trình */
export const replaceEventProgram = asyncHandler(async (req, res) => {
  const event = await Event.findById(req.params.eventId);
  if (!event) {
    return res.status(404).json({ success: false, error: "Không tìm thấy sự kiện" });
  }
  const raw = Array.isArray(req.body?.items)
    ? req.body.items
    : Array.isArray(req.body?.programItems)
      ? req.body.programItems
      : null;
  if (!raw) {
    return res.status(400).json({ success: false, error: "Cần mảng items / programItems" });
  }

  const unitPack = await loadUnitForEvent(event);
  try {
    event.programItems = raw.map((it, idx) => ({
      ...sanitizeProgramItem(it, unitPack.members),
      sortOrder:
        it.sortOrder !== undefined && it.sortOrder !== ""
          ? Number(it.sortOrder) || 0
          : idx,
    }));
  } catch (err) {
    return res.status(err.status || 400).json({ success: false, error: err.message });
  }

  await event.save();
  res.json({
    success: true,
    data: {
      program: toEventProgramDto(event, unitPack),
      message: `Đã lưu ${event.programItems.length} mục chương trình.`,
    },
  });
});

export const createProgramItem = asyncHandler(async (req, res) => {
  const event = await Event.findById(req.params.eventId);
  if (!event) {
    return res.status(404).json({ success: false, error: "Không tìm thấy sự kiện" });
  }

  const unitPack = await loadUnitForEvent(event);
  let item;
  try {
    item = sanitizeProgramItem(req.body || {}, unitPack.members);
  } catch (err) {
    return res.status(err.status || 400).json({ success: false, error: err.message });
  }

  if (!item.memberId && unitPack.unit) {
    return res.status(400).json({
      success: false,
      error: "Chọn ca sĩ / nhân sự từ danh sách thành viên đơn vị tổ chức.",
    });
  }
  if (!unitPack.unit) {
    return res.status(400).json({
      success: false,
      error: "Sự kiện chưa gắn đơn vị BTC — hãy chọn đơn vị tổ chức trước khi thêm chương trình.",
    });
  }

  if (item.sortOrder === 0 && (event.programItems || []).length) {
    const max = Math.max(...event.programItems.map((p) => Number(p.sortOrder) || 0), 0);
    item.sortOrder = max + 1;
  }

  event.programItems.push(item);
  await event.save();
  const created = event.programItems[event.programItems.length - 1];

  res.status(201).json({
    success: true,
    data: {
      item: toProgramItemDto(created),
      program: toEventProgramDto(event, unitPack),
      message: "Đã thêm mục chương trình.",
    },
  });
});

export const updateProgramItem = asyncHandler(async (req, res) => {
  const event = await Event.findById(req.params.eventId);
  if (!event) {
    return res.status(404).json({ success: false, error: "Không tìm thấy sự kiện" });
  }
  const item = event.programItems.id(req.params.itemId);
  if (!item) {
    return res.status(404).json({ success: false, error: "Không tìm thấy mục chương trình" });
  }

  const unitPack = await loadUnitForEvent(event);
  let next;
  try {
    next = sanitizeProgramItem(
      { ...item.toObject(), ...(req.body || {}) },
      unitPack.members
    );
  } catch (err) {
    return res.status(err.status || 400).json({ success: false, error: err.message });
  }

  if (!next.memberId && unitPack.unit) {
    return res.status(400).json({
      success: false,
      error: "Chọn ca sĩ / nhân sự từ danh sách thành viên đơn vị tổ chức.",
    });
  }

  Object.assign(item, next);
  await event.save();

  res.json({
    success: true,
    data: {
      item: toProgramItemDto(item),
      program: toEventProgramDto(event, unitPack),
      message: "Đã cập nhật mục chương trình.",
    },
  });
});

export const deleteProgramItem = asyncHandler(async (req, res) => {
  const event = await Event.findById(req.params.eventId);
  if (!event) {
    return res.status(404).json({ success: false, error: "Không tìm thấy sự kiện" });
  }
  const item = event.programItems.id(req.params.itemId);
  if (!item) {
    return res.status(404).json({ success: false, error: "Không tìm thấy mục chương trình" });
  }
  item.deleteOne();
  await event.save();
  const unitPack = await loadUnitForEvent(event);

  res.json({
    success: true,
    data: {
      id: req.params.itemId,
      program: toEventProgramDto(event, unitPack),
      message: "Đã xóa mục chương trình.",
    },
  });
});
