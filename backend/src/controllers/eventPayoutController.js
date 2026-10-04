import Event from "../models/Event.js";
import OrganizerProfile from "../models/OrganizerProfile.js";
import { asyncHandler } from "../middlewares/errorHandler.js";
import {
  computeEventPayoutStatus,
  settleEventPayout,
  updateEventPayoutConfig,
  deleteEventPayoutConfig,
} from "../services/eventPayoutService.js";

export const listEventPayoutStatuses = asyncHandler(async (req, res) => {
  const events = await Event.find()
    .sort({ startTime: 1 })
    .populate("organizerProfile")
    .select("title location startTime ticketTypes organizerProfile payoutSettlement");

  const profiles = await OrganizerProfile.find()
    .select("profileCode organizationName payoutWallet bankAccount bankName status")
    .sort({ organizationName: 1 })
    .lean();

  const items = [];
  for (const ev of events) {
    try {
      items.push(await computeEventPayoutStatus(ev));
    } catch (e) {
      items.push({
        eventId: String(ev._id),
        title: ev.title,
        error: e.message || String(e),
        soldOut: false,
        canSettle: false,
        computedStatus: "none",
      });
    }
  }

  res.json({
    success: true,
    data: {
      events: items,
      total: items.length,
      profiles: profiles.map((p) => ({
        id: String(p._id),
        profileCode: p.profileCode,
        organizationName: p.organizationName,
        payoutWallet: p.payoutWallet || "",
        bankAccount: p.bankAccount || "",
        bankName: p.bankName || "",
        status: p.status,
      })),
    },
  });
});

export const getEventPayoutStatus = asyncHandler(async (req, res) => {
  const event = await Event.findById(req.params.eventId).populate("organizerProfile");
  if (!event) {
    return res.status(404).json({ success: false, error: "Không tìm thấy sự kiện" });
  }
  const status = await computeEventPayoutStatus(event);
  res.json({ success: true, data: status });
});

/** Cập nhật / tạo cấu hình thanh toán sự kiện */
export const updateEventPayoutAdmin = asyncHandler(async (req, res) => {
  const data = await updateEventPayoutConfig(req.params.eventId, req.body || {});
  res.json({
    success: true,
    data: { ...data, message: "Đã cập nhật cấu hình thanh toán." },
  });
});

/** Reset / xóa cấu hình settle */
export const deleteEventPayoutAdmin = asyncHandler(async (req, res) => {
  const hard = String(req.query.hard || req.body?.hard || "") === "true";
  const data = await deleteEventPayoutConfig(req.params.eventId, { hard });
  res.json({
    success: true,
    data: {
      ...data,
      message: hard
        ? "Đã xóa toàn bộ cấu hình thanh toán sự kiện."
        : "Đã reset trạng thái settle (giữ ví/NH đã lưu).",
    },
  });
});

export const settleEventPayoutAdmin = asyncHandler(async (req, res) => {
  const force = req.body?.force === true;
  const note = String(req.body?.note || "").trim();
  const amountEth = req.body?.amountEth != null ? req.body.amountEth : null;
  const result = await settleEventPayout(req.params.eventId, {
    actorUserId: req.user?._id,
    force,
    note,
    amountEth,
  });
  res.json({ success: true, data: result });
});
