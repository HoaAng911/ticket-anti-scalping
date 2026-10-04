import fs from "fs";
import Event from "../models/Event.js";
import OrganizerProfile from "../models/OrganizerProfile.js";
import { asyncHandler } from "../middlewares/errorHandler.js";
import {
  listPaymentContracts,
  getPaymentContract,
  createPaymentContract,
  updatePaymentContract,
  deletePaymentContract,
  settlePaymentStage,
  setStageStatus,
  ensurePaymentContractPdf,
  getPaymentContractPdfAbsolutePath,
  seedPaymentContractsForEvents,
  listPaymentContractTemplates,
} from "../services/paymentContractService.js";

export const getPaymentContractCatalog = asyncHandler(async (_req, res) => {
  res.json({
    success: true,
    data: {
      templates: listPaymentContractTemplates(),
    },
  });
});

export const listPaymentContractsAdmin = asyncHandler(async (req, res) => {
  const items = await listPaymentContracts({
    eventId: req.query.eventId || undefined,
    status: req.query.status || undefined,
    q: req.query.q || undefined,
  });

  const events = await Event.find()
    .select("title location startTime organizerProfile")
    .sort({ startTime: 1 })
    .lean();
  const profiles = await OrganizerProfile.find()
    .select("profileCode organizationName payoutWallet bankAccount bankName status")
    .sort({ organizationName: 1 })
    .lean();

  res.json({
    success: true,
    data: {
      contracts: items,
      total: items.length,
      templates: listPaymentContractTemplates(),
      events: events.map((e) => ({
        id: String(e._id),
        title: e.title,
        location: e.location || "",
        startTime: e.startTime || null,
        organizerProfileId: e.organizerProfile ? String(e.organizerProfile) : "",
      })),
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

export const getPaymentContractAdmin = asyncHandler(async (req, res) => {
  const data = await getPaymentContract(req.params.id);
  res.json({ success: true, data });
});

export const createPaymentContractAdmin = asyncHandler(async (req, res) => {
  const data = await createPaymentContract(req.body || {}, {
    actorUserId: req.user?._id || req.user?.id,
  });
  res.status(201).json({
    success: true,
    data: {
      ...data,
      message: data.hasPdf
        ? "Đã tạo hợp đồng và sinh file PDF."
        : "Đã tạo hợp đồng thanh toán theo tiến độ.",
    },
  });
});

export const updatePaymentContractAdmin = asyncHandler(async (req, res) => {
  const data = await updatePaymentContract(req.params.id, req.body || {});
  res.json({
    success: true,
    data: { ...data, message: "Đã cập nhật hợp đồng thanh toán." },
  });
});

export const deletePaymentContractAdmin = asyncHandler(async (req, res) => {
  const data = await deletePaymentContract(req.params.id);
  res.json({
    success: true,
    data: {
      ...data,
      message: data.deleted
        ? "Đã xóa hợp đồng."
        : "Hợp đồng có đợt đã trả — đã chuyển trạng thái cancelled.",
    },
  });
});

export const settlePaymentStageAdmin = asyncHandler(async (req, res) => {
  const data = await settlePaymentStage(req.params.id, req.params.stageId, {
    actorUserId: req.user?._id || req.user?.id,
    force: req.body?.force === true || req.query?.force === "true",
    note: req.body?.note || "",
  });
  res.json({ success: true, data });
});

export const patchPaymentStageAdmin = asyncHandler(async (req, res) => {
  const data = await setStageStatus(req.params.id, req.params.stageId, {
    status: req.body?.status,
    note: req.body?.note,
  });
  res.json({
    success: true,
    data: { ...data, message: "Đã cập nhật trạng thái đợt." },
  });
});

export const regeneratePaymentContractPdfAdmin = asyncHandler(async (req, res) => {
  const pdf = await ensurePaymentContractPdf(req.params.id);
  const data = await getPaymentContract(req.params.id);
  res.json({
    success: true,
    data: {
      ...data,
      pdf,
      message: `Đã sinh lại PDF «${pdf.fileName}».`,
    },
  });
});

export const downloadPaymentContractPdfAdmin = asyncHandler(async (req, res) => {
  const regenerate =
    req.query.regenerate === "1" || req.query.regenerate === "true";
  const { absolutePath, fileName, contractNo } = await getPaymentContractPdfAbsolutePath(
    req.params.id,
    { regenerate }
  );
  if (!fs.existsSync(absolutePath)) {
    return res.status(404).json({ success: false, error: "Không tìm thấy file PDF" });
  }
  res.setHeader("Content-Type", "application/pdf");
  res.setHeader(
    "Content-Disposition",
    `${req.query.download === "1" ? "attachment" : "inline"}; filename="${fileName}"; filename*=UTF-8''${encodeURIComponent(
      `${contractNo || "hop-dong"}.pdf`
    )}`
  );
  fs.createReadStream(absolutePath).pipe(res);
});

/** Tạo HĐ mẫu + PDF cho các sự kiện chưa có hợp đồng */
export const seedPaymentContractsAdmin = asyncHandler(async (req, res) => {
  const data = await seedPaymentContractsForEvents({
    templateKey: req.body?.templateKey || req.query?.templateKey || "tieu_chuan",
    status: req.body?.status || "active",
    onlyMissing: req.body?.onlyMissing !== false,
    actorUserId: req.user?._id || req.user?.id,
  });
  res.status(201).json({
    success: true,
    data: {
      ...data,
      message: `Đã tạo ${data.createdCount} hợp đồng mẫu (bỏ qua ${data.skippedCount} sự kiện đã có HĐ).`,
    },
  });
});
