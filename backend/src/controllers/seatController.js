import Event from "../models/Event.js";
import Ticket from "../models/Ticket.js";
import { asyncHandler } from "../middlewares/errorHandler.js";
import {
  buildDefaultSeatingChart,
  expireHoldsInChart,
  findSeat,
  seatingPublicView,
  seatingAdminView,
  seatingStats,
  effectiveSeatStatus,
} from "../utils/seatingVn.js";

function normalizeWallet(w) {
  return String(w || "").trim().toLowerCase();
}

function assertCanManageEvent(req, event) {
  const isAdmin = req.user?.role === "admin";
  const isOwner =
    event.organizer &&
    String(event.organizer) === String(req.user?._id || req.user?.id || "");
  if (!isAdmin && !isOwner) {
    const err = new Error("Chỉ admin hoặc BTC của sự kiện mới quản lý ghế");
    err.status = 403;
    throw err;
  }
}

async function loadEventSeating(eventId) {
  const event = await Event.findById(eventId);
  if (!event) {
    const err = new Error("Không tìm thấy sự kiện");
    err.status = 404;
    throw err;
  }
  if (!event.seatingChart) event.seatingChart = { enabled: false, zones: [] };
  const { changed } = expireHoldsInChart(event.seatingChart);
  if (changed) await event.save();
  return event;
}

export const getEventSeating = asyncHandler(async (req, res) => {
  const event = await loadEventSeating(req.params.id);
  res.json({
    success: true,
    data: {
      eventId: String(event._id),
      title: event.title,
      seating: seatingPublicView(event.seatingChart),
      stats: seatingStats(event.seatingChart),
    },
  });
});

/** Admin / organizer: xem sơ đồ + thống kê ghế đã bán / trống */
export const getAdminEventSeating = asyncHandler(async (req, res) => {
  const event = await loadEventSeating(req.params.eventId || req.params.id);
  assertCanManageEvent(req, event);
  res.json({
    success: true,
    data: {
      eventId: String(event._id),
      title: event.title,
      location: event.location,
      startTime: event.startTime,
      seating: seatingAdminView(event.seatingChart),
    },
  });
});

/**
 * Admin / organizer: quản lý ghế trống / hold.
 * Body: { action: "block"|"unblock"|"releaseHold"|"reopenSold", seatIds: string[] }
 */
export const manageEventSeats = asyncHandler(async (req, res) => {
  const action = String(req.body?.action || "").trim();
  const seatIds = Array.isArray(req.body?.seatIds) ? req.body.seatIds.map(String) : [];
  const allowed = ["block", "unblock", "releaseHold", "reopenSold"];
  if (!allowed.includes(action)) {
    return res.status(400).json({
      success: false,
      error: `action phải là một trong: ${allowed.join(", ")}`,
    });
  }
  if (!seatIds.length) {
    return res.status(400).json({ success: false, error: "Chọn ít nhất 1 ghế" });
  }

  const event = await loadEventSeating(req.params.eventId || req.params.id);
  assertCanManageEvent(req, event);
  if (!event.seatingChart?.enabled) {
    return res.status(400).json({ success: false, error: "Sự kiện chưa bật sơ đồ ghế" });
  }

  const changed = [];
  const skipped = [];

  for (const sid of seatIds) {
    const found = findSeat(event.seatingChart, sid);
    if (!found) {
      skipped.push({ seatId: sid, reason: "not_found" });
      continue;
    }
    const { seat, zone } = found;
    const status = effectiveSeatStatus(seat);

    if (action === "block") {
      if (status !== "available") {
        skipped.push({ seatId: sid, reason: `cannot_block_${status}` });
        continue;
      }
      seat.status = "blocked";
      seat.heldBy = "";
      seat.heldUntil = null;
      changed.push({
        seatId: seat.id,
        seatLabel: seat.label,
        zoneCode: zone.code,
        status: "blocked",
      });
    } else if (action === "unblock") {
      if (status !== "blocked") {
        skipped.push({ seatId: sid, reason: `cannot_unblock_${status}` });
        continue;
      }
      seat.status = "available";
      changed.push({
        seatId: seat.id,
        seatLabel: seat.label,
        zoneCode: zone.code,
        status: "available",
      });
    } else if (action === "releaseHold") {
      if (status !== "held" && seat.status !== "held") {
        skipped.push({ seatId: sid, reason: `cannot_release_${status}` });
        continue;
      }
      seat.status = "available";
      seat.heldBy = "";
      seat.heldUntil = null;
      changed.push({
        seatId: seat.id,
        seatLabel: seat.label,
        zoneCode: zone.code,
        status: "available",
      });
    } else if (action === "reopenSold") {
      if (status !== "sold") {
        skipped.push({ seatId: sid, reason: `cannot_reopen_${status}` });
        continue;
      }
      const prevToken = seat.tokenId;
      seat.status = "available";
      seat.tokenId = null;
      seat.heldBy = "";
      seat.heldUntil = null;
      if (prevToken != null) {
        await Ticket.findOneAndUpdate(
          { tokenId: prevToken },
          { $set: { seatId: "", seatLabel: "", zoneCode: "", zoneLabel: "" } }
        );
      }
      changed.push({
        seatId: seat.id,
        seatLabel: seat.label,
        zoneCode: zone.code,
        status: "available",
        previousTokenId: prevToken,
      });
    }
  }

  if (changed.length) {
    event.markModified("seatingChart");
    await event.save();
  }

  const actionLabel = {
    block: "đã khóa (không bán)",
    unblock: "đã mở bán lại",
    releaseHold: "đã giải phóng hold",
    reopenSold: "đã mở lại ghế đã bán",
  }[action];

  res.json({
    success: true,
    data: {
      action,
      changed,
      skipped,
      seating: seatingAdminView(event.seatingChart),
      message: `${changed.length} ghế ${actionLabel}.`,
    },
  });
});

/** Admin: bật / tạo sơ đồ ghế mặc định theo hạng vé */
export const generateEventSeating = asyncHandler(async (req, res) => {
  const event = await Event.findById(req.params.eventId || req.params.id);
  if (!event) return res.status(404).json({ success: false, error: "Không tìm thấy sự kiện" });
  assertCanManageEvent(req, event);

  const force = req.body?.force === true;
  if (event.seatingChart?.enabled && (event.seatingChart.zones || []).length && !force) {
    return res.status(409).json({
      success: false,
      error: "Sự kiện đã có sơ đồ ghế. Gửi force=true để tạo lại (ghế sold sẽ mất map).",
    });
  }

  event.seatingChart = buildDefaultSeatingChart(event.ticketTypes || [], {
    rowsPerZone: Number(req.body?.rowsPerZone) || 4,
    seatsPerRow: Number(req.body?.seatsPerRow) || 8,
  });
  await event.save();

  res.json({
    success: true,
    data: {
      eventId: String(event._id),
      seating: seatingAdminView(event.seatingChart),
      message: "Đã tạo sơ đồ ghế theo hạng vé.",
    },
  });
});

/** Giữ ghế tạm (hold) trước khi mint */
export const holdEventSeats = asyncHandler(async (req, res) => {
  const wallet = normalizeWallet(req.body?.wallet || req.user?.walletAddress);
  if (!/^0x[a-f0-9]{40}$/.test(wallet)) {
    return res.status(400).json({ success: false, error: "Cần địa chỉ ví hợp lệ để giữ ghế" });
  }
  const seatIds = Array.isArray(req.body?.seatIds) ? req.body.seatIds.map(String) : [];
  if (!seatIds.length) {
    return res.status(400).json({ success: false, error: "Chọn ít nhất 1 ghế" });
  }

  const event = await loadEventSeating(req.params.id);
  if (!event.seatingChart?.enabled) {
    return res.status(400).json({ success: false, error: "Sự kiện chưa bật chọn ghế" });
  }

  const maxSelect = event.seatingChart.maxSelect || 2;
  if (seatIds.length > maxSelect) {
    return res.status(400).json({
      success: false,
      error: `Mỗi lần chọn tối đa ${maxSelect} ghế`,
    });
  }

  const eventChainId = req.body?.eventChainId != null ? Number(req.body.eventChainId) : null;
  const holdMinutes = event.seatingChart.holdMinutes || 8;
  const heldUntil = new Date(Date.now() + holdMinutes * 60 * 1000);
  const held = [];

  for (const sid of seatIds) {
    const found = findSeat(event.seatingChart, sid);
    if (!found) {
      return res.status(404).json({ success: false, error: `Không tìm thấy ghế ${sid}` });
    }
    const { seat, zone } = found;
    if (eventChainId != null && Number(zone.eventChainId) !== eventChainId) {
      return res.status(400).json({
        success: false,
        error: `Ghế ${seat.label} không thuộc hạng vé đã chọn`,
      });
    }
    const status = effectiveSeatStatus(seat);
    if (status === "sold") {
      return res.status(409).json({ success: false, error: `Ghế ${seat.label} đã bán` });
    }
    if (status === "blocked") {
      return res.status(409).json({ success: false, error: `Ghế ${seat.label} đã bị khóa bán` });
    }
    if (status === "held" && seat.heldBy && seat.heldBy !== wallet) {
      return res.status(409).json({ success: false, error: `Ghế ${seat.label} đang được giữ` });
    }
    seat.status = "held";
    seat.heldBy = wallet;
    seat.heldUntil = heldUntil;
    held.push({
      seatId: seat.id,
      seatLabel: seat.label,
      zoneCode: zone.code,
      zoneLabel: zone.label,
      eventChainId: zone.eventChainId,
      heldUntil,
    });
  }

  event.markModified("seatingChart");
  await event.save();

  res.json({
    success: true,
    data: {
      held,
      heldUntil,
      seating: seatingPublicView(event.seatingChart),
      message: `Đã giữ ${held.length} ghế trong ${holdMinutes} phút.`,
    },
  });
});

export const releaseEventSeats = asyncHandler(async (req, res) => {
  const wallet = normalizeWallet(req.body?.wallet || req.user?.walletAddress);
  const seatIds = Array.isArray(req.body?.seatIds) ? req.body.seatIds.map(String) : [];
  const event = await loadEventSeating(req.params.id);
  if (!event.seatingChart?.enabled) {
    return res.json({ success: true, data: { released: 0 } });
  }

  let released = 0;
  const targets = seatIds.length
    ? seatIds
    : (event.seatingChart.zones || []).flatMap((z) =>
        (z.rows || []).flatMap((r) =>
          (r.seats || []).filter((s) => s.heldBy === wallet && s.status === "held").map((s) => s.id)
        )
      );

  for (const sid of targets) {
    const found = findSeat(event.seatingChart, sid);
    if (!found) continue;
    const { seat } = found;
    if (seat.status === "held" && (!wallet || seat.heldBy === wallet || !seat.heldBy)) {
      seat.status = "available";
      seat.heldBy = "";
      seat.heldUntil = null;
      released += 1;
    }
  }

  if (released) {
    event.markModified("seatingChart");
    await event.save();
  }

  res.json({
    success: true,
    data: {
      released,
      seating: seatingPublicView(event.seatingChart),
    },
  });
});

/**
 * Xác nhận ghế sau khi mint on-chain.
 * Body: { wallet, assignments: [{ seatId, tokenId }] }
 */
export const confirmEventSeats = asyncHandler(async (req, res) => {
  const wallet = normalizeWallet(req.body?.wallet);
  const assignments = Array.isArray(req.body?.assignments) ? req.body.assignments : [];
  if (!/^0x[a-f0-9]{40}$/.test(wallet)) {
    return res.status(400).json({ success: false, error: "Cần địa chỉ ví" });
  }
  if (!assignments.length) {
    return res.status(400).json({ success: false, error: "Thiếu danh sách ghế / token" });
  }

  const event = await loadEventSeating(req.params.id);
  if (!event.seatingChart?.enabled) {
    return res.status(400).json({ success: false, error: "Sự kiện chưa bật chọn ghế" });
  }

  const confirmed = [];
  for (const a of assignments) {
    const seatId = String(a.seatId || "");
    const tokenId = Number(a.tokenId);
    if (!seatId || !Number.isFinite(tokenId)) {
      return res.status(400).json({ success: false, error: "assignment cần seatId + tokenId" });
    }
    const found = findSeat(event.seatingChart, seatId);
    if (!found) {
      return res.status(404).json({ success: false, error: `Không tìm thấy ghế ${seatId}` });
    }
    const { seat, zone } = found;
    if (seat.status === "sold" && seat.tokenId === tokenId) {
      confirmed.push({ seatId, tokenId, seatLabel: seat.label, zoneCode: zone.code });
      continue;
    }
    if (seat.status === "sold") {
      return res.status(409).json({ success: false, error: `Ghế ${seat.label} đã gắn vé khác` });
    }
    if (effectiveSeatStatus(seat) === "blocked") {
      return res.status(409).json({ success: false, error: `Ghế ${seat.label} đã bị khóa bán` });
    }
    if (
      seat.status === "held" &&
      seat.heldBy &&
      seat.heldBy !== wallet &&
      seat.heldUntil &&
      new Date(seat.heldUntil).getTime() > Date.now()
    ) {
      return res.status(409).json({ success: false, error: `Ghế ${seat.label} đang giữ bởi ví khác` });
    }

    seat.status = "sold";
    seat.tokenId = tokenId;
    seat.heldBy = "";
    seat.heldUntil = null;

    await Ticket.findOneAndUpdate(
      { tokenId },
      {
        $set: {
          seatId: seat.id,
          seatLabel: seat.label,
          zoneCode: zone.code,
          zoneLabel: zone.label,
          event: event._id,
          eventChainId: zone.eventChainId,
          ownerWallet: wallet,
        },
      },
      { upsert: false }
    );

    confirmed.push({
      seatId: seat.id,
      seatLabel: seat.label,
      zoneCode: zone.code,
      zoneLabel: zone.label,
      tokenId,
    });
  }

  event.markModified("seatingChart");
  await event.save();

  res.json({
    success: true,
    data: {
      confirmed,
      seating: seatingPublicView(event.seatingChart),
      message: `Đã gắn ${confirmed.length} ghế vào vé.`,
    },
  });
});
