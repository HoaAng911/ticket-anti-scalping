import Event from "../models/Event.js";
import { asyncHandler } from "../middlewares/errorHandler.js";
import {
  getEventConfigOnChain,
  getRemainingTickets,
} from "../services/blockchainService.js";
import { licensePublicView } from "../utils/licenseVn.js";

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
  const [rawItems, total] = await Promise.all([
    Event.find().sort({ startTime: 1 }).skip(skip).limit(limit).populate("organizer", "email walletAddress"),
    Event.countDocuments(),
  ]);

  const items = [];
  for (const ev of rawItems) {
    const obj = ev.toObject();
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
  const event = await Event.findById(req.params.id).populate("organizer", "email walletAddress");
  if (!event) {
    return res.status(404).json({ success: false, error: "Không tìm thấy sự kiện" });
  }
  const obj = event.toObject();
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
  });
  res.status(201).json({ success: true, data: { event, chainResults } });
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
  await event.save();
  res.json({ success: true, data: { event } });
});
