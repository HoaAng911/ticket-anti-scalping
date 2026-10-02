import Event from "../models/Event.js";
import Ticket from "../models/Ticket.js";
import { asyncHandler } from "../middlewares/errorHandler.js";
import {
  listActiveListingsOnChain,
  getUnlockTime,
  getMaxAllowedPrice,
  getHistoryFromLogs,
  getMoneyFlowFromLedger,
  toPublicFlow,
} from "../services/blockchainService.js";

/** Listing active — nguồn chính: Marketplace.getActiveTokenIds trên ledger */
export const getActiveListings = asyncHandler(async (req, res) => {
  const chainListings = await listActiveListingsOnChain();

  const chainIds = [...new Set(chainListings.map((x) => x.eventChainId))];
  const events = await Event.find({ "ticketTypes.eventChainId": { $in: chainIds } })
    .select("title location startTime ticketTypes")
    .lean();
  const byChain = new Map();
  for (const ev of events) {
    for (const t of ev.ticketTypes || []) {
      byChain.set(Number(t.eventChainId), ev);
    }
  }

  const listings = chainListings.map((item) => ({
    ...item,
    event: byChain.get(Number(item.eventChainId))
      ? {
          _id: byChain.get(Number(item.eventChainId))._id,
          title: byChain.get(Number(item.eventChainId)).title,
          location: byChain.get(Number(item.eventChainId)).location,
          startTime: byChain.get(Number(item.eventChainId)).startTime,
        }
      : null,
  }));

  // Write-behind: đồng bộ cache Mongo (không phải nguồn đọc)
  void Promise.all(
    chainListings.map((t) =>
      Ticket.findOneAndUpdate(
        { tokenId: t.tokenId },
        {
          status: "listed_for_resale",
          ownerWallet: t.ownerWallet,
          listingPrice: t.listingPrice,
          listingPriceWei: t.listingPriceWei,
          eventChainId: t.eventChainId,
        },
        { upsert: false }
      ).catch(() => {})
    )
  );

  res.json({
    success: true,
    data: {
      listings,
      source: "ledger",
      note: "Listings đọc từ Marketplace trên geth — Mongo chỉ gắn metadata sự kiện",
    },
  });
});

export const getHistory = asyncHandler(async (req, res) => {
  const tokenId = Number(req.params.tokenId);
  const history = await getHistoryFromLogs(tokenId);
  let unlockTime = null;
  let maxPrice = null;
  try {
    unlockTime = await getUnlockTime(tokenId);
    maxPrice = await getMaxAllowedPrice(tokenId);
  } catch {
    /* ignore */
  }
  res.json({
    success: true,
    data: {
      tokenId,
      history,
      unlockTime,
      maxAllowedPrice: maxPrice,
      source: "ledger",
    },
  });
});

/** Công khai: dòng tiền theo từng sự kiện — chỉ trường public, không lộ địa chỉ ví */
export const getMoneyFlow = asyncHandler(async (req, res) => {
  const fromBlock = req.query.fromBlock != null ? Number(req.query.fromBlock) : undefined;
  const toBlock = req.query.toBlock != null ? Number(req.query.toBlock) : undefined;
  const limit = req.query.limit != null ? Number(req.query.limit) : 120;
  const filterEventId = String(req.query.eventId || "").trim();
  const filterChainId =
    req.query.eventChainId != null && req.query.eventChainId !== ""
      ? Number(req.query.eventChainId)
      : null;

  const raw = await getMoneyFlowFromLedger({ fromBlock, toBlock, limit });

  const events = await Event.find()
    .select("title location startTime ticketTypes")
    .sort({ startTime: 1 })
    .lean();

  const byChain = new Map();
  for (const ev of events) {
    for (const t of ev.ticketTypes || []) {
      const cid = Number(t.eventChainId);
      if (!byChain.has(cid)) {
        byChain.set(cid, {
          eventId: String(ev._id),
          title: ev.title,
          location: ev.location,
          startTime: ev.startTime,
          eventChainIds: [],
          tierNames: {},
        });
      }
      const bucket = byChain.get(cid);
      if (!bucket.eventChainIds.includes(cid)) bucket.eventChainIds.push(cid);
      bucket.tierNames[cid] = t.name;
    }
  }

  /** Gộp theo event Mongo (một sự kiện có thể có nhiều eventChainId / hạng vé) */
  const byEventId = new Map();

  function ensureEventBucket(meta, chainId) {
    const key = meta?.eventId || `chain:${chainId ?? "unknown"}`;
    if (!byEventId.has(key)) {
      byEventId.set(key, {
        eventId: meta?.eventId || null,
        title: meta?.title || (chainId != null ? `Hạng on-chain #${chainId}` : "Chưa gắn sự kiện"),
        location: meta?.location || "",
        startTime: meta?.startTime || null,
        eventChainIds: meta?.eventChainIds ? [...meta.eventChainIds] : chainId != null ? [chainId] : [],
        publicTotals: {
          primaryRevenueEth: 0,
          primarySaleCount: 0,
          resaleCount: 0,
          resaleVolumeEth: 0,
          royaltyToOrganizerEth: 0,
          organizerReceivedEth: 0,
        },
        flows: [],
      });
    }
    const bucket = byEventId.get(key);
    if (chainId != null && !bucket.eventChainIds.includes(chainId)) {
      bucket.eventChainIds.push(chainId);
    }
    return bucket;
  }

  for (const flow of raw.flows || []) {
    const cid = flow.eventChainId;
    const meta = cid != null ? byChain.get(Number(cid)) : null;
    const bucket = ensureEventBucket(meta, cid);
    const pub = toPublicFlow(flow);
    if (meta?.tierNames?.[cid]) pub.tierName = meta.tierNames[cid];
    bucket.flows.push(pub);

    if (flow.kind === "primary_sale") {
      bucket.publicTotals.primarySaleCount += 1;
      bucket.publicTotals.primaryRevenueEth += Number(flow.amountEth) || 0;
      bucket.publicTotals.organizerReceivedEth += Number(flow.amountEth) || 0;
    } else if (flow.kind === "resale_split") {
      bucket.publicTotals.resaleCount += 1;
      bucket.publicTotals.resaleVolumeEth += Number(flow.amountEth) || 0;
      bucket.publicTotals.royaltyToOrganizerEth += Number(flow.royaltyEth) || 0;
      bucket.publicTotals.organizerReceivedEth += Number(flow.royaltyEth) || 0;
    }
  }

  // Bổ sung doanh thu sơ cấp on-chain theo eventChainId (kể cả khi không có log trong cửa sổ block)
  for (const [cid, rev] of Object.entries(raw.primaryRevenueByEvent || {})) {
    const chainId = Number(cid);
    const meta = byChain.get(chainId);
    const bucket = ensureEventBucket(meta, chainId);
    const onChain = Number(rev.eth) || 0;
    if (onChain > bucket.publicTotals.primaryRevenueEth) {
      // Ưu tiên counter on-chain nếu lớn hơn tổng log trong range
      const delta = onChain - bucket.publicTotals.primaryRevenueEth;
      bucket.publicTotals.primaryRevenueEth = onChain;
      bucket.publicTotals.organizerReceivedEth += delta;
    }
    bucket.publicTotals.onChainPrimaryRevenueEth = onChain;
  }

  // Sự kiện Mongo chưa có giao dịch vẫn liệt kê (công khai = 0)
  for (const ev of events) {
    const key = String(ev._id);
    if (byEventId.has(key)) continue;
    const chainIds = (ev.ticketTypes || []).map((t) => Number(t.eventChainId));
    byEventId.set(key, {
      eventId: key,
      title: ev.title,
      location: ev.location,
      startTime: ev.startTime,
      eventChainIds: chainIds,
      publicTotals: {
        primaryRevenueEth: 0,
        primarySaleCount: 0,
        resaleCount: 0,
        resaleVolumeEth: 0,
        royaltyToOrganizerEth: 0,
        organizerReceivedEth: 0,
        onChainPrimaryRevenueEth: chainIds.reduce(
          (s, cid) => s + (Number(raw.primaryRevenueByEvent?.[cid]?.eth) || 0),
          0
        ),
      },
      flows: [],
    });
  }

  let eventList = [...byEventId.values()].map((e) => ({
    ...e,
    publicTotals: {
      ...e.publicTotals,
      primaryRevenueEth: roundEth(e.publicTotals.primaryRevenueEth),
      resaleVolumeEth: roundEth(e.publicTotals.resaleVolumeEth),
      royaltyToOrganizerEth: roundEth(e.publicTotals.royaltyToOrganizerEth),
      organizerReceivedEth: roundEth(e.publicTotals.organizerReceivedEth),
      onChainPrimaryRevenueEth: roundEth(e.publicTotals.onChainPrimaryRevenueEth || 0),
    },
    flowCount: e.flows.length,
  }));

  if (filterEventId) {
    eventList = eventList.filter((e) => e.eventId === filterEventId);
  }
  if (filterChainId != null && Number.isFinite(filterChainId)) {
    eventList = eventList.filter((e) => e.eventChainIds.includes(filterChainId));
  }

  eventList.sort((a, b) => {
    const ta = a.startTime ? new Date(a.startTime).getTime() : 0;
    const tb = b.startTime ? new Date(b.startTime).getTime() : 0;
    return ta - tb;
  });

  const treasuryShort = raw.treasury
    ? `${raw.treasury.slice(0, 8)}…${raw.treasury.slice(-6)}`
    : "";

  res.json({
    success: true,
    data: {
      scope: "public_per_event",
      note:
        "Chỉ công bố số liệu công khai theo từng sự kiện: doanh thu sơ cấp về BTO, royalty resale 5%, số giao dịch và mã tx. Không hiển thị địa chỉ ví người mua/bán.",
      treasuryShort,
      range: raw.range,
      events: eventList,
      selectedEventId: filterEventId || null,
    },
  });
});

function roundEth(n) {
  const x = Number(n) || 0;
  return Math.round(x * 1e8) / 1e8;
}
