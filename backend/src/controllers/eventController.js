import Event from "../models/Event.js";
import { asyncHandler } from "../middlewares/errorHandler.js";

export const listEvents = asyncHandler(async (req, res) => {
  const page = Math.max(1, parseInt(req.query.page || "1", 10));
  const limit = Math.min(50, Math.max(1, parseInt(req.query.limit || "12", 10)));
  const skip = (page - 1) * limit;
  const [items, total] = await Promise.all([
    Event.find().sort({ startTime: 1 }).skip(skip).limit(limit).populate("organizer", "email walletAddress"),
    Event.countDocuments(),
  ]);
  res.json({
    success: true,
    data: { items, page, limit, total, pages: Math.ceil(total / limit) },
  });
});

export const getEvent = asyncHandler(async (req, res) => {
  const event = await Event.findById(req.params.id).populate("organizer", "email walletAddress");
  if (!event) {
    return res.status(404).json({ success: false, error: "Không tìm thấy sự kiện" });
  }
  res.json({ success: true, data: { event } });
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
  const event = await Event.create({
    title,
    description,
    location,
    startTime,
    ticketTypes,
    coverImage: coverImage || "",
    organizer: req.user._id,
  });
  res.status(201).json({ success: true, data: { event } });
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
