import { ethers } from "ethers";
import PaymentContract from "../models/PaymentContract.js";
import Event from "../models/Event.js";
import OrganizerProfile from "../models/OrganizerProfile.js";
import { getAdminSigner } from "./adminChainService.js";
import { getProvider } from "./blockchainService.js";
import {
  computeEventPayoutStatus,
  normalizeWallet,
  isEthAddress,
} from "./eventPayoutService.js";
import {
  getPaymentContractTemplate,
  stagesFromTemplate,
  listPaymentContractTemplates,
} from "../utils/paymentContractVn.js";
import {
  generatePaymentContractPdf,
  resolvePaymentContractPdfPath,
} from "./paymentContractPdfService.js";

function makeContractNo() {
  const d = new Date();
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const r = Math.random().toString(36).slice(2, 6).toUpperCase();
  return `HDTT-${y}${m}-${r}`;
}

function sanitizeStages(rawStages = []) {
  const list = Array.isArray(rawStages) ? rawStages : [];
  const stages = list.map((s, idx) => {
    const percent = Number(s.percent);
    const code =
      String(s.code || "").trim() ||
      `D${idx + 1}`;
    return {
      ...(s._id ? { _id: s._id } : {}),
      code,
      name: String(s.name || `Đợt ${idx + 1}`).trim(),
      percent: Number.isFinite(percent) ? percent : 0,
      sortOrder: Number.isFinite(Number(s.sortOrder)) ? Number(s.sortOrder) : idx,
      description: String(s.description || "").trim(),
      trigger: ["manual", "sales_pct", "sold_out", "date"].includes(s.trigger)
        ? s.trigger
        : "manual",
      triggerValue: String(s.triggerValue || "").trim(),
      status: ["pending", "payable", "paid", "skipped"].includes(s.status)
        ? s.status
        : "pending",
      paidAmountEth: s.paidAmountEth || "",
      paidAmountWei: s.paidAmountWei || "",
      paidAt: s.paidAt || null,
      paidBy: s.paidBy || null,
      txHash: s.txHash || "",
      payoutWallet: String(s.payoutWallet || "").trim().toLowerCase(),
      note: String(s.note || "").trim(),
      error: s.error || "",
    };
  });

  const sum = stages.reduce((n, s) => n + (Number(s.percent) || 0), 0);
  if (stages.length && Math.abs(sum - 100) > 0.05) {
    const err = new Error(`Tổng % các đợt phải = 100 (hiện ${sum.toFixed(2)}%)`);
    err.status = 400;
    throw err;
  }
  return stages.sort((a, b) => a.sortOrder - b.sortOrder);
}

function stageAmountEth(totalEthStr, percent) {
  const totalWei = ethers.parseEther(String(totalEthStr || "0"));
  // percent 0–100 (2 decimal places): amount = total × percent / 100
  const pctScaled = BigInt(Math.round(Number(percent) * 100)); // 30.5% → 3050
  const amountWei = (totalWei * pctScaled) / 10000n;
  return {
    amountWei,
    amountEth: ethers.formatEther(amountWei),
  };
}

async function resolveBaseAmountEth(contract, eventStatus) {
  if (contract.useOnChainRevenue) {
    return eventStatus?.onChainAmountEth || eventStatus?.amountEth || "0";
  }
  return contract.totalAmountEth || "0";
}

/**
 * Cập nhật status đợt theo tiến độ bán vé (sales_pct / sold_out / date).
 */
export function applyStageTriggers(contract, eventStatus) {
  if (!contract?.stages?.length) return { changed: false };
  let changed = false;
  const soldPct =
    eventStatus?.totalSupply > 0
      ? (100 * (eventStatus.totalSold || 0)) / eventStatus.totalSupply
      : 0;
  const soldOut = Boolean(eventStatus?.soldOut);
  const now = Date.now();

  for (const stage of contract.stages) {
    if (stage.status === "paid" || stage.status === "skipped") continue;
    let shouldPay = false;
    if (stage.trigger === "manual") {
      // giữ nguyên pending/payable
      continue;
    }
    if (stage.trigger === "sold_out") {
      shouldPay = soldOut;
    } else if (stage.trigger === "sales_pct") {
      const need = Number(stage.triggerValue);
      shouldPay = Number.isFinite(need) && soldPct + 1e-9 >= need;
    } else if (stage.trigger === "date") {
      const t = Date.parse(stage.triggerValue);
      shouldPay = Number.isFinite(t) && now >= t;
    }
    if (shouldPay && stage.status !== "payable") {
      stage.status = "payable";
      changed = true;
    }
  }
  return { changed };
}

function toContractDto(doc, eventStatus = null, extras = {}) {
  const o = doc.toObject ? doc.toObject() : doc;
  const baseEth = extras.baseAmountEth || o.totalAmountEth || "0";
  const stages = (o.stages || []).map((s) => {
    const amt = stageAmountEth(baseEth, s.percent);
    return {
      id: String(s._id),
      code: s.code,
      name: s.name,
      percent: s.percent,
      sortOrder: s.sortOrder,
      description: s.description || "",
      trigger: s.trigger,
      triggerValue: s.triggerValue || "",
      status: s.status,
      plannedAmountEth: amt.amountEth,
      paidAmountEth: s.paidAmountEth || "",
      paidAt: s.paidAt || null,
      txHash: s.txHash || "",
      payoutWallet: s.payoutWallet || "",
      note: s.note || "",
      error: s.error || "",
    };
  });

  const paidPct = stages
    .filter((s) => s.status === "paid")
    .reduce((n, s) => n + Number(s.percent || 0), 0);
  const paidEth = stages
    .filter((s) => s.status === "paid" && s.paidAmountEth)
    .reduce((n, s) => {
      try {
        return n + Number(ethers.formatEther(ethers.parseEther(String(s.paidAmountEth))));
      } catch {
        return n + (Number(s.paidAmountEth) || 0);
      }
    }, 0);

  const event = o.event;
  const profile = o.organizerProfile;

  return {
    id: String(o._id),
    contractNo: o.contractNo,
    title: o.title,
    templateKey: o.templateKey || "tieu_chuan",
    eventId: event?._id ? String(event._id) : String(o.event || ""),
    eventTitle: event?.title || extras.eventTitle || "",
    eventLocation: event?.location || "",
    eventStartTime: event?.startTime || null,
    organizerProfileId: profile?._id
      ? String(profile._id)
      : o.organizerProfile
        ? String(o.organizerProfile)
        : "",
    organizerName: profile?.organizationName || extras.organizerName || "",
    totalAmountEth: o.totalAmountEth,
    useOnChainRevenue: Boolean(o.useOnChainRevenue),
    baseAmountEth: baseEth,
    payoutWallet: o.payoutWallet || "",
    bankAccount: o.bankAccount || "",
    bankName: o.bankName || "",
    currency: o.currency || "ETH",
    status: o.status,
    signedAt: o.signedAt || null,
    notes: o.notes || "",
    stages,
    paidPercent: Math.round(paidPct * 100) / 100,
    paidAmountEth: String(paidEth),
    remainingPercent: Math.round((100 - paidPct) * 100) / 100,
    hasPdf: Boolean(o.pdfFileName || o.pdfRelativePath),
    pdfUrl: o._id ? `/api/admin/payment-contracts/${o._id}/pdf` : "",
    pdfGeneratedAt: o.pdfGeneratedAt || null,
    eventSales: eventStatus
      ? {
          soldOut: eventStatus.soldOut,
          totalSold: eventStatus.totalSold,
          totalSupply: eventStatus.totalSupply,
          totalRemaining: eventStatus.totalRemaining,
          onChainAmountEth: eventStatus.onChainAmountEth || eventStatus.amountEth,
        }
      : null,
    createdAt: o.createdAt || null,
    updatedAt: o.updatedAt || null,
  };
}

async function loadContract(id) {
  return PaymentContract.findById(id)
    .populate(
      "event",
      "title location startTime ticketTypes organizerProfile payoutSettlement"
    )
    .populate(
      "organizerProfile",
      "organizationName profileCode payoutWallet bankAccount bankName taxCode address email phone legalRepName"
    );
}

/**
 * Sinh / ghi đè PDF hợp đồng và cập nhật metadata trên document.
 */
export async function ensurePaymentContractPdf(contractId) {
  const doc = await loadContract(contractId);
  if (!doc) {
    const err = new Error("Không tìm thấy hợp đồng thanh toán");
    err.status = 404;
    throw err;
  }

  let eventStatus = null;
  try {
    if (doc.event) {
      const ev = await Event.findById(doc.event._id || doc.event).populate("organizerProfile");
      eventStatus = await computeEventPayoutStatus(ev);
    }
  } catch {
    eventStatus = null;
  }
  const baseAmountEth = await resolveBaseAmountEth(doc, eventStatus);
  const stages = (doc.stages || []).map((s) => {
    const amt = stageAmountEth(baseAmountEth, s.percent);
    return {
      code: s.code,
      name: s.name,
      percent: s.percent,
      trigger: s.trigger,
      triggerValue: s.triggerValue,
      description: s.description || "",
      status: s.status,
      plannedAmountEth: amt.amountEth,
      paidAmountEth: s.paidAmountEth || "",
      txHash: s.txHash || "",
    };
  });

  const eventObj = doc.event?.toObject ? doc.event.toObject() : doc.event || {};
  const orgObj = doc.organizerProfile?.toObject
    ? doc.organizerProfile.toObject()
    : doc.organizerProfile || {};

  const pdf = await generatePaymentContractPdf({
    contract: {
      _id: doc._id,
      contractNo: doc.contractNo,
      title: doc.title,
      templateKey: doc.templateKey || "tieu_chuan",
      totalAmountEth: doc.totalAmountEth,
      useOnChainRevenue: doc.useOnChainRevenue,
      payoutWallet: doc.payoutWallet,
      bankAccount: doc.bankAccount,
      bankName: doc.bankName,
      status: doc.status,
      signedAt: doc.signedAt,
      createdAt: doc.createdAt,
      notes: doc.notes,
      organizerName: orgObj.organizationName || "",
      eventTitle: eventObj.title || "",
    },
    event: eventObj,
    organizer: orgObj,
    stages,
    baseAmountEth,
  });

  doc.pdfFileName = pdf.fileName;
  doc.pdfRelativePath = pdf.relativePath;
  doc.pdfGeneratedAt = new Date();
  await doc.save();

  return {
    fileName: pdf.fileName,
    relativePath: pdf.relativePath,
    absolutePath: pdf.absolutePath,
    contractId: String(doc._id),
  };
}

export async function getPaymentContractPdfAbsolutePath(id, { regenerate = false } = {}) {
  const doc = await PaymentContract.findById(id);
  if (!doc) {
    const err = new Error("Không tìm thấy hợp đồng thanh toán");
    err.status = 404;
    throw err;
  }
  let abs = !regenerate ? resolvePaymentContractPdfPath(doc) : null;
  if (!abs) {
    const pdf = await ensurePaymentContractPdf(id);
    abs = pdf.absolutePath;
  }
  const fresh = await PaymentContract.findById(id).select("pdfFileName contractNo");
  return {
    absolutePath: abs,
    fileName: fresh?.pdfFileName || "hop-dong-thanh-toan.pdf",
    contractNo: fresh?.contractNo || "",
  };
}

async function enrichContract(doc) {
  if (!doc) return null;
  let eventStatus = null;
  if (doc.event) {
    try {
      const ev =
        typeof doc.event.toObject === "function"
          ? doc.event
          : await Event.findById(doc.event._id || doc.event).populate("organizerProfile");
      eventStatus = await computeEventPayoutStatus(ev);
      const { changed } = applyStageTriggers(doc, eventStatus);
      if (changed) {
        doc.markModified("stages");
        await doc.save();
      }
    } catch {
      eventStatus = null;
    }
  }
  const baseAmountEth = await resolveBaseAmountEth(doc, eventStatus);
  return toContractDto(doc, eventStatus, { baseAmountEth });
}

export async function listPaymentContracts({ eventId, status, q } = {}) {
  const filter = {};
  if (eventId) filter.event = eventId;
  if (status) filter.status = status;
  if (q) {
    filter.$or = [
      { contractNo: { $regex: q, $options: "i" } },
      { title: { $regex: q, $options: "i" } },
    ];
  }
  const docs = await PaymentContract.find(filter)
    .sort({ updatedAt: -1 })
    .limit(100)
    .populate("event", "title location startTime ticketTypes organizerProfile payoutSettlement")
    .populate("organizerProfile", "organizationName profileCode payoutWallet bankAccount bankName");

  const out = [];
  for (const d of docs) {
    out.push(await enrichContract(d));
  }
  return out;
}

export async function getPaymentContract(id) {
  const doc = await loadContract(id);
  if (!doc) {
    const err = new Error("Không tìm thấy hợp đồng thanh toán");
    err.status = 404;
    throw err;
  }
  return enrichContract(doc);
}

export async function createPaymentContract(body, { actorUserId } = {}) {
  const eventId = body.eventId || body.event;
  if (!eventId) {
    const err = new Error("Thiếu eventId");
    err.status = 400;
    throw err;
  }
  const event = await Event.findById(eventId);
  if (!event) {
    const err = new Error("Không tìm thấy sự kiện");
    err.status = 404;
    throw err;
  }

  let organizerProfileId = body.organizerProfileId || event.organizerProfile || null;
  if (organizerProfileId) {
    const p = await OrganizerProfile.findById(organizerProfileId).select("_id");
    if (!p) {
      const err = new Error("organizerProfileId không hợp lệ");
      err.status = 400;
      throw err;
    }
    organizerProfileId = p._id;
  }

  const templateKey = String(body.templateKey || "tieu_chuan").trim() || "tieu_chuan";
  const template = getPaymentContractTemplate(templateKey);

  const stages = sanitizeStages(
    body.stages?.length ? body.stages : stagesFromTemplate(templateKey)
  );

  const wallet = String(body.payoutWallet || "").trim().toLowerCase();
  if (wallet && !isEthAddress(wallet)) {
    const err = new Error("payoutWallet không hợp lệ");
    err.status = 400;
    throw err;
  }

  let totalAmountEth = String(body.totalAmountEth ?? "0").trim() || "0";
  try {
    ethers.parseEther(totalAmountEth);
  } catch {
    const err = new Error("totalAmountEth không hợp lệ");
    err.status = 400;
    throw err;
  }

  const useOnChainRevenue =
    body.useOnChainRevenue !== undefined
      ? body.useOnChainRevenue === true
      : Boolean(template.useOnChainRevenue);

  // Nạp ví / NH từ hồ sơ BTC nếu chưa nhập
  let payoutWallet = wallet ? normalizeWallet(wallet) : "";
  let bankAccount = String(body.bankAccount || "").trim();
  let bankName = String(body.bankName || "").trim();
  if (organizerProfileId && (!payoutWallet || !bankAccount)) {
    const org = await OrganizerProfile.findById(organizerProfileId)
      .select("payoutWallet bankAccount bankName")
      .lean();
    if (org) {
      if (!payoutWallet && org.payoutWallet) payoutWallet = normalizeWallet(org.payoutWallet);
      if (!bankAccount) bankAccount = org.bankAccount || "";
      if (!bankName) bankName = org.bankName || "";
    }
  }

  const doc = await PaymentContract.create({
    contractNo: String(body.contractNo || "").trim() || makeContractNo(),
    title: String(body.title || `HĐ thanh toán — ${event.title}`).trim(),
    event: event._id,
    organizerProfile: organizerProfileId,
    totalAmountEth,
    useOnChainRevenue,
    payoutWallet,
    bankAccount,
    bankName,
    currency: "ETH",
    status: body.status === "active" ? "active" : "draft",
    signedAt: body.status === "active" ? new Date() : null,
    notes: String(body.notes || "").trim(),
    stages,
    templateKey: template.key,
    createdBy: actorUserId || null,
  });

  try {
    await ensurePaymentContractPdf(doc._id);
  } catch (e) {
    console.warn("[payment-contract] PDF gen failed:", e.message || e);
  }

  return getPaymentContract(doc._id);
}

export async function updatePaymentContract(id, body = {}) {
  const doc = await PaymentContract.findById(id);
  if (!doc) {
    const err = new Error("Không tìm thấy hợp đồng thanh toán");
    err.status = 404;
    throw err;
  }
  if (doc.status === "completed" || doc.status === "cancelled") {
    const err = new Error("Hợp đồng đã kết thúc — không sửa được nội dung.");
    err.status = 400;
    throw err;
  }

  if (body.title !== undefined) doc.title = String(body.title || "").trim();
  if (body.notes !== undefined) doc.notes = String(body.notes || "").trim();
  if (body.bankAccount !== undefined) doc.bankAccount = String(body.bankAccount || "").trim();
  if (body.bankName !== undefined) doc.bankName = String(body.bankName || "").trim();
  if (body.useOnChainRevenue !== undefined) {
    doc.useOnChainRevenue = body.useOnChainRevenue === true;
  }
  if (body.totalAmountEth !== undefined) {
    try {
      ethers.parseEther(String(body.totalAmountEth || "0"));
      doc.totalAmountEth = String(body.totalAmountEth || "0");
    } catch {
      const err = new Error("totalAmountEth không hợp lệ");
      err.status = 400;
      throw err;
    }
  }
  if (body.payoutWallet !== undefined) {
    const w = String(body.payoutWallet || "").trim().toLowerCase();
    if (w && !isEthAddress(w)) {
      const err = new Error("payoutWallet không hợp lệ");
      err.status = 400;
      throw err;
    }
    doc.payoutWallet = w ? normalizeWallet(w) : "";
  }
  if (body.organizerProfileId !== undefined) {
    if (!body.organizerProfileId) doc.organizerProfile = null;
    else {
      const p = await OrganizerProfile.findById(body.organizerProfileId).select("_id");
      if (!p) {
        const err = new Error("organizerProfileId không hợp lệ");
        err.status = 400;
        throw err;
      }
      doc.organizerProfile = p._id;
    }
  }
  if (body.stages !== undefined) {
    // Giữ thông tin đã paid nếu cùng code/_id
    const prevByCode = new Map((doc.stages || []).map((s) => [s.code, s]));
    const next = sanitizeStages(body.stages);
    doc.stages = next.map((s) => {
      const prev = prevByCode.get(s.code);
      if (prev && prev.status === "paid") {
        return {
          ...s,
          status: "paid",
          paidAmountEth: prev.paidAmountEth,
          paidAmountWei: prev.paidAmountWei,
          paidAt: prev.paidAt,
          paidBy: prev.paidBy,
          txHash: prev.txHash,
          error: "",
        };
      }
      return s;
    });
  }
  if (body.status !== undefined) {
    const st = String(body.status);
    if (!["draft", "active", "completed", "cancelled"].includes(st)) {
      const err = new Error("status không hợp lệ");
      err.status = 400;
      throw err;
    }
    doc.status = st;
    if (st === "active" && !doc.signedAt) doc.signedAt = new Date();
  }
  if (body.templateKey !== undefined) {
    const t = getPaymentContractTemplate(body.templateKey);
    doc.templateKey = t.key;
    if (body.applyTemplateStages === true && body.stages === undefined) {
      const prevByCode = new Map((doc.stages || []).map((s) => [s.code, s]));
      const next = sanitizeStages(stagesFromTemplate(t.key));
      doc.stages = next.map((s) => {
        const prev = prevByCode.get(s.code);
        if (prev && prev.status === "paid") {
          return {
            ...s,
            status: "paid",
            paidAmountEth: prev.paidAmountEth,
            paidAmountWei: prev.paidAmountWei,
            paidAt: prev.paidAt,
            paidBy: prev.paidBy,
            txHash: prev.txHash,
            error: "",
          };
        }
        return s;
      });
      if (body.useOnChainRevenue === undefined) {
        doc.useOnChainRevenue = Boolean(t.useOnChainRevenue);
      }
    }
  }

  await doc.save();
  try {
    await ensurePaymentContractPdf(doc._id);
  } catch (e) {
    console.warn("[payment-contract] PDF regen failed:", e.message || e);
  }
  return getPaymentContract(doc._id);
}

export async function deletePaymentContract(id) {
  const doc = await PaymentContract.findById(id);
  if (!doc) {
    const err = new Error("Không tìm thấy hợp đồng thanh toán");
    err.status = 404;
    throw err;
  }
  const hasPaid = (doc.stages || []).some((s) => s.status === "paid");
  if (hasPaid && doc.status !== "cancelled") {
    doc.status = "cancelled";
    await doc.save();
    return { deleted: false, cancelled: true, id: String(doc._id) };
  }
  await PaymentContract.deleteOne({ _id: doc._id });
  return { deleted: true, cancelled: false, id: String(id) };
}

/**
 * Thanh toán một đợt theo % định mức trên tổng HĐ (hoặc doanh thu on-chain).
 */
export async function settlePaymentStage(contractId, stageId, { actorUserId, force = false, note = "" } = {}) {
  const doc = await loadContract(contractId);
  if (!doc) {
    const err = new Error("Không tìm thấy hợp đồng thanh toán");
    err.status = 404;
    throw err;
  }
  if (doc.status !== "active" && !force) {
    const err = new Error("Hợp đồng chưa active — kích hoạt trước khi thanh toán đợt.");
    err.status = 400;
    throw err;
  }

  const stage = (doc.stages || []).id(stageId) || (doc.stages || []).find((s) => String(s._id) === String(stageId));
  if (!stage) {
    const err = new Error("Không tìm thấy đợt thanh toán");
    err.status = 404;
    throw err;
  }
  if (stage.status === "paid") {
    const err = new Error(`Đợt «${stage.name}» đã thanh toán`);
    err.status = 409;
    throw err;
  }
  if (stage.status === "skipped") {
    const err = new Error(`Đợt «${stage.name}» đã bỏ qua`);
    err.status = 400;
    throw err;
  }

  let eventStatus = null;
  if (doc.event) {
    const ev = await Event.findById(doc.event._id || doc.event).populate("organizerProfile");
    eventStatus = await computeEventPayoutStatus(ev);
    applyStageTriggers(doc, eventStatus);
  }

  if (stage.status !== "payable" && stage.trigger !== "manual" && !force) {
    const err = new Error(
      `Đợt «${stage.name}» chưa đủ điều kiện tiến độ (status=${stage.status}). Dùng force nếu lab cần.`
    );
    err.status = 400;
    throw err;
  }

  const baseEth = await resolveBaseAmountEth(doc, eventStatus);
  const { amountWei, amountEth } = stageAmountEth(baseEth, stage.percent);
  if (amountWei <= 0n) {
    const err = new Error("Số ETH đợt thanh toán = 0 — kiểm tra tổng HĐ / %.");
    err.status = 400;
    throw err;
  }

  const wallet =
    normalizeWallet(stage.payoutWallet) ||
    normalizeWallet(doc.payoutWallet) ||
    normalizeWallet(doc.organizerProfile?.payoutWallet) ||
    normalizeWallet(eventStatus?.payoutWallet);
  if (!wallet) {
    const err = new Error("Chưa có ví nhận tiền (HĐ / đơn vị BTC / sự kiện).");
    err.status = 400;
    throw err;
  }

  const signer = await getAdminSigner();
  const from = (await signer.getAddress()).toLowerCase();
  const bal = await getProvider().getBalance(from);
  if (bal < amountWei) {
    const err = new Error(
      `Treasury không đủ ETH: cần ${amountEth}, còn ${ethers.formatEther(bal)}`
    );
    err.status = 400;
    throw err;
  }

  try {
    const tx = await signer.sendTransaction({
      to: ethers.getAddress(wallet),
      value: amountWei,
    });
    const receipt = await tx.wait();

    stage.status = "paid";
    stage.paidAmountEth = amountEth;
    stage.paidAmountWei = amountWei.toString();
    stage.paidAt = new Date();
    stage.paidBy = actorUserId || null;
    stage.txHash = receipt.hash;
    stage.payoutWallet = wallet;
    stage.error = "";
    if (note) stage.note = String(note).slice(0, 300);

    const allPaid = (doc.stages || []).every((s) => s.status === "paid" || s.status === "skipped");
    if (allPaid) doc.status = "completed";

    doc.markModified("stages");
    await doc.save();

    try {
      await ensurePaymentContractPdf(doc._id);
    } catch (e) {
      console.warn("[payment-contract] PDF after settle failed:", e.message || e);
    }

    const dto = await getPaymentContract(doc._id);
    return {
      ...dto,
      settledStageId: String(stage._id),
      settledAmountEth: amountEth,
      txHash: receipt.hash,
      from,
      message: `Đã thanh toán đợt «${stage.name}» (${stage.percent}%) = ${amountEth} ETH → ${wallet}`,
    };
  } catch (e) {
    stage.status = "payable";
    stage.error = e.message || String(e);
    doc.markModified("stages");
    await doc.save();
    const err = new Error(e.message || "Thanh toán đợt thất bại");
    err.status = 500;
    throw err;
  }
}

export async function setStageStatus(contractId, stageId, { status, note } = {}) {
  const doc = await PaymentContract.findById(contractId);
  if (!doc) {
    const err = new Error("Không tìm thấy hợp đồng");
    err.status = 404;
    throw err;
  }
  const stage = doc.stages.id(stageId);
  if (!stage) {
    const err = new Error("Không tìm thấy đợt");
    err.status = 404;
    throw err;
  }
  if (stage.status === "paid") {
    const err = new Error("Đợt đã thanh toán — không đổi status");
    err.status = 400;
    throw err;
  }
  if (!["pending", "payable", "skipped"].includes(status)) {
    const err = new Error("status đợt không hợp lệ");
    err.status = 400;
    throw err;
  }
  stage.status = status;
  if (note !== undefined) stage.note = String(note || "").slice(0, 300);
  doc.markModified("stages");
  await doc.save();
  try {
    await ensurePaymentContractPdf(doc._id);
  } catch {
    /* ignore */
  }
  return getPaymentContract(doc._id);
}

/**
 * Tạo HĐ mẫu cho mọi sự kiện chưa có hợp đồng thanh toán.
 */
export async function seedPaymentContractsForEvents({
  templateKey = "tieu_chuan",
  status = "active",
  actorUserId = null,
  onlyMissing = true,
} = {}) {
  const template = getPaymentContractTemplate(templateKey);
  const events = await Event.find()
    .select("title location startTime organizerProfile")
    .sort({ startTime: 1 });

  const existing = onlyMissing
    ? await PaymentContract.find().select("event").lean()
    : [];
  const have = new Set(existing.map((c) => String(c.event)));

  const created = [];
  const skipped = [];

  for (const ev of events) {
    if (onlyMissing && have.has(String(ev._id))) {
      skipped.push({ eventId: String(ev._id), title: ev.title, reason: "already_has_contract" });
      continue;
    }

    let org = null;
    if (ev.organizerProfile) {
      org = await OrganizerProfile.findById(ev.organizerProfile)
        .select("payoutWallet bankAccount bankName")
        .lean();
    }

    const doc = await PaymentContract.create({
      contractNo: makeContractNo(),
      title: `HĐ thanh toán — ${ev.title}`,
      event: ev._id,
      organizerProfile: ev.organizerProfile || null,
      totalAmountEth: "0",
      useOnChainRevenue: Boolean(template.useOnChainRevenue),
      payoutWallet: org?.payoutWallet ? normalizeWallet(org.payoutWallet) : "",
      bankAccount: org?.bankAccount || "",
      bankName: org?.bankName || "",
      currency: "ETH",
      status: status === "active" ? "active" : "draft",
      signedAt: status === "active" ? new Date() : null,
      notes: `Sinh tự động từ mẫu «${template.label}».`,
      stages: sanitizeStages(stagesFromTemplate(template.key)),
      templateKey: template.key,
      createdBy: actorUserId || null,
    });

    try {
      await ensurePaymentContractPdf(doc._id);
    } catch (e) {
      console.warn(`[payment-contract] seed PDF ${doc.contractNo}:`, e.message || e);
    }

    created.push({
      id: String(doc._id),
      contractNo: doc.contractNo,
      eventId: String(ev._id),
      eventTitle: ev.title,
      templateKey: template.key,
    });
  }

  return {
    templateKey: template.key,
    templateLabel: template.label,
    createdCount: created.length,
    skippedCount: skipped.length,
    created,
    skipped,
  };
}

export { makeContractNo, sanitizeStages, stageAmountEth, toContractDto, listPaymentContractTemplates };
