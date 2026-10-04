import { ethers } from "ethers";
import Event from "../models/Event.js";
import OrganizerProfile from "../models/OrganizerProfile.js";
import User from "../models/User.js";
import {
  getEventConfigOnChain,
  getRemainingTickets,
  getTicketContract,
  getProvider,
} from "./blockchainService.js";
import { getAdminSigner } from "./adminChainService.js";

function isEthAddress(v) {
  try {
    return Boolean(v && ethers.isAddress(v));
  } catch {
    return false;
  }
}

function normalizeWallet(w) {
  if (!isEthAddress(w)) return "";
  return ethers.getAddress(w).toLowerCase();
}

/**
 * Tính trạng thái bán vé + doanh thu sơ cấp on-chain cho 1 sự kiện Mongo.
 */
export async function computeEventPayoutStatus(eventDoc) {
  const event = eventDoc.toObject ? eventDoc.toObject() : eventDoc;
  const tiers = [];
  let totalSupply = 0;
  let totalSold = 0;
  let totalRemaining = 0;
  let revenueWei = 0n;
  const ticket = getTicketContract();

  for (const t of event.ticketTypes || []) {
    const cid = Number(t.eventChainId);
    if (!Number.isFinite(cid)) continue;
    let remaining = null;
    let cfg = null;
    let revWei = 0n;
    try {
      remaining = await getRemainingTickets(cid);
    } catch {
      remaining = null;
    }
    try {
      cfg = await getEventConfigOnChain(cid);
    } catch {
      cfg = null;
    }
    try {
      revWei = await ticket.primaryRevenueByEvent(cid);
    } catch {
      revWei = 0n;
    }

    const supply = cfg?.totalSupply ?? (Number(t.totalSupply) || 0);
    const rem = remaining == null ? supply : remaining;
    const sold = Math.max(0, supply - rem);
    totalSupply += supply;
    totalSold += sold;
    totalRemaining += rem;
    revenueWei += BigInt(revWei.toString());

    tiers.push({
      name: t.name || cfg?.name || `Hạng #${cid}`,
      eventChainId: cid,
      priceEth: cfg?.priceEth ?? String(t.price ?? 0),
      totalSupply: supply,
      remaining: rem,
      sold,
      revenueEth: ethers.formatEther(revWei),
      revenueWei: revWei.toString(),
      active: cfg?.active ?? null,
    });
  }

  const soldOut = totalSupply > 0 && totalRemaining === 0;
  const onChainAmountEth = ethers.formatEther(revenueWei);
  const settlement = event.payoutSettlement || { status: "none" };

  let profile = null;
  const profileRef =
    event.organizerProfile ||
    settlement.organizerProfileId ||
    null;
  if (profileRef) {
    const pid = profileRef._id || profileRef.id || profileRef;
    profile = await OrganizerProfile.findById(pid)
      .select(
        "profileCode organizationName payoutWallet bankAccount bankName linkedUser email phone status"
      )
      .populate("linkedUser", "email displayName role walletAddress")
      .lean();
  }

  const payoutWallet =
    normalizeWallet(settlement.payoutWallet) ||
    normalizeWallet(profile?.payoutWallet) ||
    normalizeWallet(profile?.linkedUser?.walletAddress) ||
    "";

  const bankAccount = settlement.bankAccount || profile?.bankAccount || "";
  const bankName = settlement.bankName || profile?.bankName || "";

  let settleAmountWei = revenueWei;
  let settleAmountEth = onChainAmountEth;
  let usingOverrideAmount = false;
  if (settlement.overrideAmountEth != null && String(settlement.overrideAmountEth).trim() !== "") {
    try {
      settleAmountWei = ethers.parseEther(String(settlement.overrideAmountEth).trim());
      settleAmountEth = ethers.formatEther(settleAmountWei);
      usingOverrideAmount = true;
    } catch {
      /* keep on-chain */
    }
  }

  let status = settlement.status || "none";
  if (status !== "settled") {
    if (soldOut && payoutWallet && settleAmountWei > 0n) status = "ready";
    else if (soldOut) status = "ready";
    else status = settlement.status === "failed" ? "failed" : "none";
  }

  let treasury = null;
  try {
    const treasuryAddr = await ticket.organizerTreasury();
    const bal = await getProvider().getBalance(treasuryAddr);
    treasury = {
      address: treasuryAddr.toLowerCase(),
      balanceEth: ethers.formatEther(bal),
    };
  } catch {
    treasury = null;
  }

  return {
    eventId: String(event._id),
    title: event.title,
    location: event.location,
    startTime: event.startTime,
    organizerProfileId: profile ? String(profile._id) : event.organizerProfile
      ? String(event.organizerProfile._id || event.organizerProfile)
      : "",
    soldOut,
    totalSupply,
    totalSold,
    totalRemaining,
    amountEth: settleAmountEth,
    amountWei: settleAmountWei.toString(),
    onChainAmountEth,
    onChainAmountWei: revenueWei.toString(),
    usingOverrideAmount,
    canSettle:
      settleAmountWei > 0n &&
      Boolean(payoutWallet) &&
      settlement.status !== "settled" &&
      (soldOut || Boolean(settlement.overrideAmountEth)),
    payoutWallet,
    bankAccount,
    bankName,
    organizerProfile: profile
      ? {
          id: String(profile._id),
          profileCode: profile.profileCode,
          organizationName: profile.organizationName,
          email: profile.email || "",
          phone: profile.phone || "",
          status: profile.status,
          payoutWallet: profile.payoutWallet || "",
          bankAccount: profile.bankAccount || "",
          bankName: profile.bankName || "",
          linkedUser: profile.linkedUser
            ? {
                id: String(profile.linkedUser._id),
                email: profile.linkedUser.email,
                displayName: profile.linkedUser.displayName || "",
                role: profile.linkedUser.role || "",
                walletAddress: profile.linkedUser.walletAddress || "",
              }
            : null,
        }
      : null,
    tiers,
    treasury,
    settlement: {
      status: settlement.status || "none",
      amountEth: settlement.amountEth || "0",
      amountWei: settlement.amountWei || "0",
      payoutWallet: settlement.payoutWallet || "",
      bankAccount: settlement.bankAccount || "",
      bankName: settlement.bankName || "",
      overrideAmountEth: settlement.overrideAmountEth || "",
      organizerProfileId: settlement.organizerProfileId
        ? String(settlement.organizerProfileId)
        : "",
      txHash: settlement.txHash || "",
      settledAt: settlement.settledAt || null,
      error: settlement.error || "",
      note: settlement.note || "",
    },
    computedStatus: status,
  };
}

/**
 * Cập nhật cấu hình thanh toán sự kiện (CRUD chỉnh sửa).
 */
export async function updateEventPayoutConfig(eventId, body = {}) {
  const event = await Event.findById(eventId);
  if (!event) {
    const err = new Error("Không tìm thấy sự kiện");
    err.status = 404;
    throw err;
  }

  if (!event.payoutSettlement) {
    event.payoutSettlement = { status: "none", amountEth: "0", amountWei: "0" };
  }
  const ps = event.payoutSettlement;

  if (body.organizerProfileId !== undefined) {
    const raw = body.organizerProfileId;
    if (!raw) {
      event.organizerProfile = null;
      ps.organizerProfileId = null;
    } else {
      const profile = await OrganizerProfile.findById(raw).select("_id");
      if (!profile) {
        const err = new Error("Không tìm thấy đơn vị Ban tổ chức");
        err.status = 400;
        throw err;
      }
      event.organizerProfile = profile._id;
      ps.organizerProfileId = profile._id;
    }
  }

  if (body.payoutWallet !== undefined) {
    const w = String(body.payoutWallet || "").trim().toLowerCase();
    if (w && !isEthAddress(w)) {
      const err = new Error("payoutWallet không hợp lệ");
      err.status = 400;
      throw err;
    }
    ps.payoutWallet = w ? normalizeWallet(w) : "";
  }

  if (body.bankAccount !== undefined) ps.bankAccount = String(body.bankAccount || "").trim();
  if (body.bankName !== undefined) ps.bankName = String(body.bankName || "").trim();
  if (body.note !== undefined) ps.note = String(body.note || "").slice(0, 500);

  if (body.overrideAmountEth !== undefined) {
    const raw = String(body.overrideAmountEth || "").trim();
    if (raw === "") {
      ps.overrideAmountEth = "";
    } else {
      try {
        const wei = ethers.parseEther(raw);
        if (wei < 0n) throw new Error("negative");
        ps.overrideAmountEth = ethers.formatEther(wei);
      } catch {
        const err = new Error("overrideAmountEth không hợp lệ (vd: 0.05)");
        err.status = 400;
        throw err;
      }
    }
  }

  if (body.status !== undefined) {
    const next = String(body.status || "none");
    if (!["none", "ready", "settled", "failed"].includes(next)) {
      const err = new Error("status không hợp lệ");
      err.status = 400;
      throw err;
    }
    // Chỉ cho phép đánh dấu thủ công (lab) — không tự gửi ETH
    if (next === "settled" && ps.status !== "settled") {
      ps.status = "settled";
      ps.settledAt = body.settledAt ? new Date(body.settledAt) : new Date();
      if (body.txHash !== undefined) ps.txHash = String(body.txHash || "").trim();
      if (body.amountEth !== undefined) {
        ps.amountEth = String(body.amountEth);
        try {
          ps.amountWei = ethers.parseEther(String(body.amountEth)).toString();
        } catch {
          /* ignore */
        }
      }
      ps.error = "";
    } else if (next === "none" || next === "ready") {
      ps.status = next;
      if (next === "none") {
        ps.txHash = "";
        ps.settledAt = null;
        ps.error = "";
      }
    } else {
      ps.status = next;
    }
  }

  if (body.txHash !== undefined && body.status === undefined) {
    ps.txHash = String(body.txHash || "").trim();
  }

  event.markModified("payoutSettlement");
  await event.save();

  const refreshed = await Event.findById(eventId).populate("organizerProfile");
  return computeEventPayoutStatus(refreshed);
}

/** Xóa / reset cấu hình + lịch sử settle của sự kiện */
export async function deleteEventPayoutConfig(eventId, { hard = false } = {}) {
  const event = await Event.findById(eventId);
  if (!event) {
    const err = new Error("Không tìm thấy sự kiện");
    err.status = 404;
    throw err;
  }

  if (hard) {
    event.payoutSettlement = {
      status: "none",
      amountEth: "0",
      amountWei: "0",
      payoutWallet: "",
      bankAccount: "",
      bankName: "",
      overrideAmountEth: "",
      organizerProfileId: null,
      txHash: "",
      settledAt: null,
      settledBy: null,
      error: "",
      note: "",
    };
  } else {
    // Soft reset: giữ ví/NH/ghi chú đã cấu hình, xóa trạng thái settle
    const ps = event.payoutSettlement || {};
    event.payoutSettlement = {
      status: "none",
      amountEth: "0",
      amountWei: "0",
      payoutWallet: ps.payoutWallet || "",
      bankAccount: ps.bankAccount || "",
      bankName: ps.bankName || "",
      overrideAmountEth: ps.overrideAmountEth || "",
      organizerProfileId: ps.organizerProfileId || null,
      txHash: "",
      settledAt: null,
      settledBy: null,
      error: "",
      note: ps.note || "",
    };
  }

  event.markModified("payoutSettlement");
  await event.save();
  const refreshed = await Event.findById(eventId).populate("organizerProfile");
  return computeEventPayoutStatus(refreshed);
}

/**
 * Chuyển doanh thu sơ cấp từ treasury (admin signer) → ví Ban tổ chức.
 */
export async function settleEventPayout(
  eventId,
  { actorUserId = null, force = false, note = "", amountEth = null } = {}
) {
  const event = await Event.findById(eventId).populate("organizerProfile");
  if (!event) {
    const err = new Error("Không tìm thấy sự kiện");
    err.status = 404;
    throw err;
  }

  const status = await computeEventPayoutStatus(event);
  if (!event.organizerProfile && !status.payoutWallet) {
    const err = new Error(
      "Chưa gắn Ban tổ chức và chưa cấu hình ví nhận — hãy chỉnh trong Thanh toán BTC."
    );
    err.status = 400;
    throw err;
  }

  if (event.payoutSettlement?.status === "settled") {
    const err = new Error("Sự kiện đã được thanh toán trước đó — reset nếu cần settle lại.");
    err.status = 409;
    throw err;
  }
  if (!status.soldOut && !force && !status.usingOverrideAmount) {
    const err = new Error(
      `Chưa bán hết vé (còn ${status.totalRemaining}/${status.totalSupply}). Dùng force hoặc đặt số ETH override.`
    );
    err.status = 400;
    throw err;
  }
  if (!status.payoutWallet) {
    const err = new Error("Chưa cấu hình ví nhận tiền cho sự kiện / đơn vị BTC.");
    err.status = 400;
    throw err;
  }

  let amountWei = BigInt(status.amountWei || "0");
  if (amountEth != null && String(amountEth).trim() !== "") {
    try {
      amountWei = ethers.parseEther(String(amountEth).trim());
    } catch {
      const err = new Error("amountEth không hợp lệ");
      err.status = 400;
      throw err;
    }
  }
  if (amountWei <= 0n) {
    const err = new Error("Số ETH cần chuyển phải > 0");
    err.status = 400;
    throw err;
  }

  const amountEthStr = ethers.formatEther(amountWei);
  const signer = await getAdminSigner();
  const from = (await signer.getAddress()).toLowerCase();
  const to = ethers.getAddress(status.payoutWallet);
  const bal = await getProvider().getBalance(from);
  if (bal < amountWei) {
    const err = new Error(
      `Treasury/funder (${from}) không đủ ETH: cần ${amountEthStr}, còn ${ethers.formatEther(bal)}`
    );
    err.status = 400;
    throw err;
  }

  try {
    const tx = await signer.sendTransaction({ to, value: amountWei });
    const receipt = await tx.wait();

    const prev = event.payoutSettlement?.toObject?.() || event.payoutSettlement || {};
    event.payoutSettlement = {
      ...prev,
      status: "settled",
      amountEth: amountEthStr,
      amountWei: amountWei.toString(),
      payoutWallet: status.payoutWallet,
      bankAccount: status.bankAccount || prev.bankAccount || "",
      bankName: status.bankName || prev.bankName || "",
      overrideAmountEth: prev.overrideAmountEth || "",
      organizerProfileId:
        event.organizerProfile?._id || event.organizerProfile || prev.organizerProfileId || null,
      txHash: receipt.hash,
      settledAt: new Date(),
      settledBy: actorUserId || null,
      error: "",
      note: String(note || prev.note || "").slice(0, 300),
    };
    await event.save();

    const refreshed = await computeEventPayoutStatus(event);
    return {
      ...refreshed,
      message: `Đã chuyển ${amountEthStr} ETH về ví ${status.payoutWallet}`,
      from,
      txHash: receipt.hash,
    };
  } catch (e) {
    const prev = event.payoutSettlement?.toObject?.() || event.payoutSettlement || {};
    event.payoutSettlement = {
      ...prev,
      status: "failed",
      amountEth: amountEthStr,
      amountWei: amountWei.toString(),
      payoutWallet: status.payoutWallet,
      error: e.message || String(e),
      note: String(note || prev.note || "").slice(0, 300),
    };
    await event.save();
    const err = new Error(e.message || "Settle thất bại");
    err.status = 500;
    throw err;
  }
}

export async function resolveLinkedUserId({ linkedUserId, linkedUserEmail }) {
  if (linkedUserId !== undefined) {
    if (!linkedUserId) return null;
    const u = await User.findById(linkedUserId).select("_id");
    if (!u) {
      const err = new Error("linkedUserId không hợp lệ");
      err.status = 400;
      throw err;
    }
    return u._id;
  }
  if (linkedUserEmail !== undefined) {
    const email = String(linkedUserEmail || "")
      .trim()
      .toLowerCase();
    if (!email) return null;
    const u = await User.findOne({ email }).select("_id");
    if (!u) {
      const err = new Error(`Không tìm thấy tài khoản với email ${email}`);
      err.status = 400;
      throw err;
    }
    return u._id;
  }
  return undefined;
}

export { normalizeWallet, isEthAddress };
