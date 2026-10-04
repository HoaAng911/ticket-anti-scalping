import Event from "../models/Event.js";
import { asyncHandler } from "../middlewares/errorHandler.js";
import {
  getEventConfigOnChain,
  getRemainingTickets,
} from "../services/blockchainService.js";
import { licensePublicView } from "../utils/licenseVn.js";
import {
  organizerProfilePublicView,
  resolveOrganizerProfileRef,
} from "../utils/eventOrganizerProfile.js";
import { programItemTypeLabel } from "../utils/programVn.js";
import { buildDefaultSeatingChart, seatingPublicView } from "../utils/seatingVn.js";

const ORGANIZER_PROFILE_POPULATE = {
  path: "organizerProfile",
  select: "profileCode organizationName status",
};

function decorateEventPublic(obj) {
  obj.organizerUnit = organizerProfilePublicView(obj.organizerProfile);
  attachProgramPublic(obj);
  obj.seating = seatingPublicView(obj.seatingChart);
  // không lộ heldBy / tokenId chi tiết trong seatingChart thô
  delete obj.seatingChart;
  return obj;
}

function attachProgramPublic(obj) {
  const items = [...(obj.programItems || [])]
    .map((it) => {
      const o = it.toObject ? it.toObject() : it;
      return {
        id: String(o._id || o.id || ""),
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
      };
    })
    .sort((a, b) => {
      if ((a.sortOrder || 0) !== (b.sortOrder || 0)) return (a.sortOrder || 0) - (b.sortOrder || 0);
      const ta = a.startAt ? new Date(a.startAt).getTime() : 0;
      const tb = b.startAt ? new Date(b.startAt).getTime() : 0;
      return ta - tb;
    });
  obj.program = items;
  obj.programItems = items;
  return obj;
}

async function mergeTiersWithChain(ticketTypes = []) {
  const merged = [];
  for (const t of ticketTypes) {
    const eventChainId = Number(t.eventChainId);
    let chain = null;
    let remaining = null;
    try {
      chain = await getEventConfigOnChain(eventChainId);
      remaining = await getRemainingTickets(eventChainId);
    } catch {
      /* offline */
    }
    merged.push({
      name: t.name,
      // Giá / supply / active lấy từ ledger nếu có
      price: chain?.active ? Number(chain.priceEth) : t.price,
      totalSupply: chain?.active ? chain.totalSupply : t.totalSupply,
      eventChainId,
      chain: chain
        ? {
            active: chain.active,
            name: chain.name,
            priceEth: chain.priceEth,
            totalSupply: chain.totalSupply,
            remaining,
          }
        : null,
      remaining,
      source: chain?.active ? "ledger" : "mongo-metadata-only",
    });
  }
  return merged;
}

export const listEvents = asyncHandler(async (req, res) => {
  const page = Math.max(1, parseInt(req.query.page || "1", 10));
  const limit = Math.min(50, Math.max(1, parseInt(req.query.limit || "12", 10)));
  const skip = (page - 1) * limit;
  const profileId = String(req.query.organizerProfileId || req.query.unitId || "").trim();
  const filter = {};
  if (profileId) filter.organizerProfile = profileId;

  const [rawItems, total] = await Promise.all([
    Event.find(filter)
      .sort({ startTime: 1 })
      .skip(skip)
      .limit(limit)
      .populate("organizer", "email walletAddress")
      .populate(ORGANIZER_PROFILE_POPULATE),
    Event.countDocuments(filter),
  ]);

  const items = [];
  for (const ev of rawItems) {
    const obj = decorateEventPublic(ev.toObject());
    obj.ticketTypes = await mergeTiersWithChain(obj.ticketTypes || []);
    const licPub = licensePublicView(obj.operatingLicense);
    obj.license = {
      ...licPub,
      pdfUrl: ["approved", "expired", "suspended"].includes(licPub.effectiveStatus)
        ? `/api/events/${obj._id}/license.pdf`
        : null,
      documentFileUrl:
        licPub.hasDocument &&
        ["approved", "expired", "suspended"].includes(licPub.effectiveStatus)
          ? `/api/events/${obj._id}/license.document`
          : null,
    };
    obj.dataPolicy =
      "Metadata (title/location) trên Mongo; giá·supply·remaining từ eventConfigs trên ledger";
    items.push(obj);
  }

  res.json({
    success: true,
    data: { items, page, limit, total, pages: Math.ceil(total / limit), source: "hybrid" },
  });
});

export const getEvent = asyncHandler(async (req, res) => {
  const event = await Event.findById(req.params.id)
    .populate("organizer", "email walletAddress")
    .populate(ORGANIZER_PROFILE_POPULATE);
  if (!event) {
    return res.status(404).json({ success: false, error: "Không tìm thấy sự kiện" });
  }
  const obj = decorateEventPublic(event.toObject());
  obj.ticketTypes = await mergeTiersWithChain(obj.ticketTypes || []);
  const licPub = licensePublicView(obj.operatingLicense);
  obj.license = {
    ...licPub,
    pdfUrl: ["approved", "expired", "suspended"].includes(licPub.effectiveStatus)
      ? `/api/events/${obj._id}/license.pdf`
      : null,
    documentFileUrl:
      licPub.hasDocument &&
      ["approved", "expired", "suspended"].includes(licPub.effectiveStatus)
        ? `/api/events/${obj._id}/license.document`
        : null,
  };
  obj.dataPolicy =
    "Metadata (title/location) trên Mongo; giá·supply·remaining từ eventConfigs trên ledger";
  res.json({ success: true, data: { event: obj, source: "hybrid" } });
});

export const createEvent = asyncHandler(async (req, res) => {
  const { title, description, location, startTime, ticketTypes, coverImage } = req.body;
  if (!title || !description || !location || !startTime || !Array.isArray(ticketTypes) || !ticketTypes.length) {
    return res.status(400).json({ success: false, error: "Thiếu thông tin sự kiện" });
  }
  for (const t of ticketTypes) {
    if (t.eventChainId == null || t.price == null || t.totalSupply == null || !t.name) {
      return res.status(400).json({ success: false, error: "ticketTypes không hợp lệ" });
    }
  }

  let organizerProfileId;
  try {
    organizerProfileId = await resolveOrganizerProfileRef(req.body);
  } catch (err) {
    return res.status(err.status || 400).json({ success: false, error: err.message });
  }

  const { configureEventOnChain } = await import("../services/adminChainService.js");
  const chainResults = [];
  for (const t of ticketTypes) {
    const chain = await configureEventOnChain({
      eventChainId: Number(t.eventChainId),
      totalSupply: Number(t.totalSupply),
      priceEth: t.price,
      name: t.name,
    });
    chainResults.push(chain);
  }

  const event = await Event.create({
    title,
    description,
    location,
    startTime,
    ticketTypes,
    coverImage: coverImage || "",
    organizer: req.user._id,
    seatingChart: buildDefaultSeatingChart(ticketTypes, { rowsPerZone: 5, seatsPerRow: 10 }),
    ...(organizerProfileId !== undefined ? { organizerProfile: organizerProfileId } : {}),
  });
  await event.populate([
    { path: "organizer", select: "email walletAddress" },
    ORGANIZER_PROFILE_POPULATE,
  ]);
  res.status(201).json({
    success: true,
    data: { event: decorateEventPublic(event.toObject()), chainResults },
  });
});

export const updateEvent = asyncHandler(async (req, res) => {
  const event = await Event.findById(req.params.id);
  if (!event) {
    return res.status(404).json({ success: false, error: "Không tìm thấy sự kiện" });
  }
  if (event.organizer.toString() !== req.user._id.toString() && req.user.role !== "admin") {
    return res.status(403).json({ success: false, error: "Không đủ quyền" });
  }
  const fields = ["title", "description", "location", "startTime", "ticketTypes", "coverImage"];
  for (const f of fields) {
    if (req.body[f] !== undefined) event[f] = req.body[f];
  }
  if (req.body.organizerProfileId !== undefined || req.body.organizerProfile !== undefined) {
    try {
      event.organizerProfile = await resolveOrganizerProfileRef(req.body);
    } catch (err) {
      return res.status(err.status || 400).json({ success: false, error: err.message });
    }
  }
  await event.save();
  await event.populate([
    { path: "organizer", select: "email walletAddress" },
    ORGANIZER_PROFILE_POPULATE,
  ]);
  res.json({ success: true, data: { event: decorateEventPublic(event.toObject()) } });
});
