import mongoose from "mongoose";
import OrganizerProfile from "../models/OrganizerProfile.js";

/**
 * Parse body.organizerProfileId / organizerProfile → ObjectId hoặc null.
 * Throws Error with .status = 400 if id provided but profile missing.
 */
export async function resolveOrganizerProfileRef(body = {}) {
  const raw =
    body.organizerProfileId !== undefined
      ? body.organizerProfileId
      : body.organizerProfile !== undefined
        ? body.organizerProfile
        : undefined;

  if (raw === undefined) return undefined;
  if (raw === null || raw === "") return null;

  const id = String(raw).trim();
  if (!mongoose.Types.ObjectId.isValid(id)) {
    const err = new Error("organizerProfileId không hợp lệ");
    err.status = 400;
    throw err;
  }

  const profile = await OrganizerProfile.findById(id)
    .select("_id profileCode organizationName status")
    .lean();
  if (!profile) {
    const err = new Error("Không tìm thấy đơn vị / hồ sơ năng lực BTC");
    err.status = 400;
    throw err;
  }
  return profile._id;
}

export function organizerProfilePublicView(doc) {
  if (!doc) return null;
  const o = doc.toObject ? doc.toObject() : doc;
  return {
    id: String(o._id || o.id),
    profileCode: o.profileCode || "",
    organizationName: o.organizationName || "",
    status: o.status || "",
  };
}

/** Gắn mảng sự kiện (tóm tắt) vào map profileId → events[] */
export async function mapEventsByProfileIds(profileIds, EventModel) {
  const ids = (profileIds || []).filter(Boolean);
  const map = new Map(ids.map((id) => [String(id), []]));
  if (!ids.length) return map;

  const events = await EventModel.find({ organizerProfile: { $in: ids } })
    .select("title location startTime organizerProfile")
    .sort({ startTime: 1 })
    .lean();

  for (const ev of events) {
    const key = String(ev.organizerProfile);
    const list = map.get(key);
    if (!list) continue;
    list.push({
      id: String(ev._id),
      title: ev.title || "",
      location: ev.location || "",
      startTime: ev.startTime || null,
    });
  }
  return map;
}
