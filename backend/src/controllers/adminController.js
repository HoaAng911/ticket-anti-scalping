import Event from "../models/Event.js";
import Ticket from "../models/Ticket.js";
import Transaction from "../models/Transaction.js";
import User from "../models/User.js";
import LabWallet from "../models/LabWallet.js";
import { asyncHandler } from "../middlewares/errorHandler.js";
import { getRemainingTickets } from "../services/blockchainService.js";
import {
  adminMintTickets,
  configureEventOnChain,
  createRandomWallets,
  fundAddresses,
  getFunderBalance,
  syncMongoEventsToChain,
} from "../services/adminChainService.js";

function parseAddressList(input) {
  if (Array.isArray(input)) {
    return input.map((a) => String(a).trim()).filter(Boolean);
  }
  return String(input || "")
    .split(/[\s,;]+/)
    .map((a) => a.trim())
    .filter((a) => /^0x[a-fA-F0-9]{40}$/.test(a));
}

export const getDashboard = asyncHandler(async (req, res) => {
  const [eventCount, ticketCount, listedCount, txCount, userCount, recentTx, recentTickets, labCount] =
    await Promise.all([
      Event.countDocuments(),
      Ticket.countDocuments(),
      Ticket.countDocuments({ status: "listed_for_resale" }),
      Transaction.countDocuments(),
      User.countDocuments(),
      Transaction.find().sort({ createdAt: -1 }).limit(20),
      Ticket.find().sort({ updatedAt: -1 }).limit(20).populate("event", "title"),
      LabWallet.countDocuments(),
    ]);

  const events = await Event.find().sort({ startTime: 1 }).populate("organizer", "email");
  const remaining = {};
  for (const ev of events) {
    for (const t of ev.ticketTypes || []) {
      try {
        remaining[t.eventChainId] = await getRemainingTickets(t.eventChainId);
      } catch {
        remaining[t.eventChainId] = null;
      }
    }
  }

  let funder = null;
  try {
    funder = await getFunderBalance();
  } catch (err) {
    funder = { error: err.message };
  }

  res.json({
    success: true,
    data: {
      stats: {
        events: eventCount,
        tickets: ticketCount,
        listed: listedCount,
        transactions: txCount,
        users: userCount,
        labWallets: labCount,
      },
      funder,
      events,
      remaining,
      recentTx,
      recentTickets,
    },
  });
});

export const listAllTickets = asyncHandler(async (req, res) => {
  const tickets = await Ticket.find()
    .sort({ mintedAt: -1 })
    .populate("event", "title location startTime");
  res.json({ success: true, data: { tickets } });
});

export const listAllTransactions = asyncHandler(async (req, res) => {
  const items = await Transaction.find().sort({ createdAt: -1 }).limit(100);
  res.json({ success: true, data: { transactions: items } });
});

export const listLabWallets = asyncHandler(async (req, res) => {
  const wallets = await LabWallet.find().sort({ createdAt: -1 }).limit(200);
  res.json({ success: true, data: { wallets } });
});

/** Cấp ETH cho danh sách địa chỉ có sẵn */
export const fundWallets = asyncHandler(async (req, res) => {
  const addresses = parseAddressList(req.body.addresses || req.body.addressList);
  const amountEth = req.body.amountEth ?? req.body.amount ?? "10";
  if (!addresses.length) {
    return res.status(400).json({ success: false, error: "Cần ít nhất 1 địa chỉ ví hợp lệ" });
  }
  if (Number(amountEth) <= 0) {
    return res.status(400).json({ success: false, error: "amountEth phải > 0" });
  }

  const results = await fundAddresses(addresses, amountEth);
  for (const r of results) {
    await LabWallet.findOneAndUpdate(
      { address: r.address },
      { $inc: { fundedEth: Number(amountEth) } }
    );
  }

  const funder = await getFunderBalance();
  res.json({ success: true, data: { results, funder } });
});

/** Tạo N ví mới + (tuỳ chọn) nạp ETH ngay */
export const createAndFundWallets = asyncHandler(async (req, res) => {
  const count = Math.min(50, Math.max(1, Number(req.body.count) || 1));
  const amountEth = req.body.amountEth ?? "100";
  const label = req.body.label || `batch-${Date.now()}`;
  const fundNow = req.body.fund !== false;

  const generated = createRandomWallets(count);
  const docs = [];
  for (const w of generated) {
    const doc = await LabWallet.create({
      address: w.address,
      privateKey: w.privateKey,
      label,
      fundedEth: 0,
      createdBy: req.user._id,
    });
    docs.push(doc);
  }

  let fundResults = [];
  if (fundNow && Number(amountEth) > 0) {
    fundResults = await fundAddresses(
      docs.map((d) => d.address),
      amountEth
    );
    await LabWallet.updateMany(
      { _id: { $in: docs.map((d) => d._id) } },
      { $inc: { fundedEth: Number(amountEth) } }
    );
  }

  const funder = await getFunderBalance();
  res.status(201).json({
    success: true,
    data: {
      wallets: docs.map((d) => ({
        address: d.address,
        privateKey: d.privateKey,
        label: d.label,
        fundedEth: Number(amountEth) || 0,
      })),
      fundResults,
      funder,
      warning:
        "Private key chỉ dùng mạng lab private-net. Không dùng trên mainnet / Sepolia thật.",
    },
  });
});

async function maxUsedEventChainId() {
  const events = await Event.find().select("ticketTypes.eventChainId").lean();
  let max = 0;
  for (const ev of events) {
    for (const t of ev.ticketTypes || []) {
      const id = Number(t.eventChainId);
      if (Number.isFinite(id) && id > max) max = id;
    }
  }
  return max;
}

function normalizeTiers(body) {
  if (Array.isArray(body.ticketTypes) && body.ticketTypes.length) {
    return body.ticketTypes;
  }
  // Tương thích API cũ: 1 hạng
  if (body.name && body.price != null && body.totalSupply != null) {
    return [
      {
        name: body.name,
        price: body.price,
        totalSupply: body.totalSupply,
        eventChainId: body.eventChainId,
      },
    ];
  }
  return null;
}

function validateTier(t, index) {
  if (!t?.name || t.price == null || t.totalSupply == null) {
    return `Hạng vé #${index + 1}: thiếu name / price / totalSupply`;
  }
  if (!(Number(t.price) > 0)) return `Hạng vé #${index + 1}: giá phải > 0`;
  if (!(Number(t.totalSupply) > 0)) return `Hạng vé #${index + 1}: supply phải > 0`;
  return null;
}

/**
 * Tạo sự kiện với nhiều hạng vé (mỗi hạng = 1 eventChainId on-chain + 1 phần tử ticketTypes).
 * Body: { title, description, location, startTime, ticketTypes: [{name,price,totalSupply,eventChainId?}], startEventChainId? }
 */
export const createTicketType = asyncHandler(async (req, res) => {
  const {
    title,
    description,
    location,
    startTime,
    coverImage,
    saveMongo = true,
    startEventChainId,
  } = req.body;

  const rawTiers = normalizeTiers(req.body);
  if (!rawTiers?.length) {
    return res.status(400).json({
      success: false,
      error: "Cần ticketTypes[] (nhiều hạng) hoặc name/price/totalSupply (1 hạng)",
    });
  }

  for (let i = 0; i < rawTiers.length; i++) {
    const err = validateTier(rawTiers[i], i);
    if (err) return res.status(400).json({ success: false, error: err });
  }

  const names = rawTiers.map((t) => String(t.name).trim().toLowerCase());
  if (new Set(names).size !== names.length) {
    return res.status(400).json({ success: false, error: "Tên hạng vé trong sự kiện không được trùng" });
  }

  let nextId = Number(startEventChainId);
  if (!Number.isFinite(nextId) || nextId < 1) {
    nextId = (await maxUsedEventChainId()) + 1;
  }

  const assigned = [];
  const usedIds = new Set();
  for (const t of rawTiers) {
    let id = t.eventChainId != null && t.eventChainId !== "" ? Number(t.eventChainId) : nextId++;
    if (!Number.isFinite(id) || id < 1) {
      return res.status(400).json({ success: false, error: `eventChainId không hợp lệ cho hạng ${t.name}` });
    }
    while (usedIds.has(id)) id += 1;
    usedIds.add(id);
    if (id >= nextId) nextId = id + 1;
    assigned.push({
      name: String(t.name).trim(),
      price: Number(t.price),
      totalSupply: Number(t.totalSupply),
      eventChainId: id,
    });
  }

  // Tránh trùng eventChainId đã có trong Mongo
  const existing = await Event.find({
    "ticketTypes.eventChainId": { $in: assigned.map((t) => t.eventChainId) },
  }).select("title ticketTypes.eventChainId");
  if (existing.length) {
    const clash = assigned
      .filter((t) =>
        existing.some((ev) => ev.ticketTypes.some((x) => x.eventChainId === t.eventChainId))
      )
      .map((t) => t.eventChainId);
    return res.status(409).json({
      success: false,
      error: `eventChainId đã dùng: ${[...new Set(clash)].join(", ")}. Tăng startEventChainId.`,
    });
  }

  // Validate Mongo fields BEFORE any on-chain txs (tránh orphan configureEvent)
  if (saveMongo !== false) {
    if (!title || !description || !location || !startTime) {
      return res.status(400).json({
        success: false,
        error: "Khi lưu Mongo cần title, description, location, startTime",
      });
    }
  }

  const chainResults = [];
  for (const t of assigned) {
    const chain = await configureEventOnChain({
      eventChainId: t.eventChainId,
      totalSupply: t.totalSupply,
      priceEth: t.price,
      name: t.name,
    });
    chainResults.push({ ...chain, name: t.name });
  }

  let event = null;
  if (saveMongo !== false) {
    event = await Event.create({
      title,
      description,
      location,
      startTime,
      coverImage: coverImage || "",
      organizer: req.user._id,
      ticketTypes: assigned,
    });
  }

  res.status(201).json({
    success: true,
    data: {
      event,
      tiers: assigned,
      chainResults,
      nextEventChainId: nextId,
    },
  });
});

/**
 * Thêm hạng vé vào sự kiện đã có (on-chain configureEvent + push Mongo).
 */
export const addTicketTypesToEvent = asyncHandler(async (req, res) => {
  const event = await Event.findById(req.params.id);
  if (!event) {
    return res.status(404).json({ success: false, error: "Không tìm thấy sự kiện" });
  }
  if (
    event.organizer.toString() !== req.user._id.toString() &&
    req.user.role !== "admin"
  ) {
    return res.status(403).json({ success: false, error: "Không đủ quyền sửa sự kiện này" });
  }

  const rawTiers = normalizeTiers(req.body);
  if (!rawTiers?.length) {
    return res.status(400).json({ success: false, error: "Cần ticketTypes[]" });
  }
  for (let i = 0; i < rawTiers.length; i++) {
    const err = validateTier(rawTiers[i], i);
    if (err) return res.status(400).json({ success: false, error: err });
  }

  const existingNames = new Set(event.ticketTypes.map((t) => t.name.trim().toLowerCase()));
  let nextId = Number(req.body.startEventChainId);
  if (!Number.isFinite(nextId) || nextId < 1) {
    nextId = (await maxUsedEventChainId()) + 1;
  }

  const assigned = [];
  for (const t of rawTiers) {
    const name = String(t.name).trim();
    if (existingNames.has(name.toLowerCase())) {
      return res.status(409).json({ success: false, error: `Hạng vé "${name}" đã có trong sự kiện` });
    }
    existingNames.add(name.toLowerCase());

    let id = t.eventChainId != null && t.eventChainId !== "" ? Number(t.eventChainId) : nextId++;
    if (!Number.isFinite(id) || id < 1) {
      return res.status(400).json({ success: false, error: `eventChainId không hợp lệ cho hạng ${name}` });
    }
    if (event.ticketTypes.some((x) => x.eventChainId === id)) {
      return res.status(409).json({ success: false, error: `eventChainId ${id} đã có trong sự kiện` });
    }
    const clash = await Event.findOne({ "ticketTypes.eventChainId": id }).select("_id title");
    if (clash) {
      return res.status(409).json({
        success: false,
        error: `eventChainId ${id} đã dùng bởi sự kiện khác`,
      });
    }
    if (id >= nextId) nextId = id + 1;
    assigned.push({
      name,
      price: Number(t.price),
      totalSupply: Number(t.totalSupply),
      eventChainId: id,
    });
  }

  const chainResults = [];
  for (const t of assigned) {
    const chain = await configureEventOnChain({
      eventChainId: t.eventChainId,
      totalSupply: t.totalSupply,
      priceEth: t.price,
      name: t.name,
    });
    chainResults.push({ ...chain, name: t.name });
    event.ticketTypes.push(t);
  }
  await event.save();

  res.status(201).json({
    success: true,
    data: {
      event,
      added: assigned,
      chainResults,
      nextEventChainId: nextId,
    },
  });
});

/** Admin mint vé NFT cho nhiều ví */
export const mintTicketsToWallets = asyncHandler(async (req, res) => {
  const eventChainId = Number(req.body.eventChainId);
  const addresses = parseAddressList(req.body.addresses || req.body.addressList);
  if (!Number.isFinite(eventChainId)) {
    return res.status(400).json({ success: false, error: "eventChainId không hợp lệ" });
  }
  if (!addresses.length) {
    return res.status(400).json({ success: false, error: "Cần danh sách địa chỉ ví" });
  }

  const result = await adminMintTickets(addresses, eventChainId);
  res.json({ success: true, data: result });
});

/** Đồng bộ mọi hạng vé Mongo rồi configureEvent on-chain (sau redeploy / lệch dữ liệu) */
export const syncEventsToChain = asyncHandler(async (req, res) => {
  const result = await syncMongoEventsToChain();
  res.json({ success: true, data: result });
});
