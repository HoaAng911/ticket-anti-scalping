import fs from "fs";
import path from "path";
import Event from "../models/Event.js";
import { asyncHandler } from "../middlewares/errorHandler.js";
import {
  LICENSE_TYPES,
  LICENSE_STATUSES,
  effectiveLicenseStatus,
  licensePublicView,
  hasLicenseDocument,
} from "../utils/licenseVn.js";
import { generateLicensePdf, resolveLicensePdfPath } from "../services/licensePdfService.js";
import {
  resolveUploadedLicensePath,
  removeUploadedLicenseFile,
} from "../middlewares/licenseUpload.js";

export { LICENSE_TYPES, LICENSE_STATUSES, effectiveLicenseStatus, licensePublicView };

function toLicenseAdmin(ev) {
  const lic = ev.operatingLicense || {};
  const effectiveStatus = effectiveLicenseStatus(lic);
  const hasPdf = Boolean(lic.pdfFileName || lic.pdfRelativePath);
  const hasDocument = hasLicenseDocument(lic);
  return {
    eventId: String(ev._id),
    title: ev.title,
    location: ev.location,
    startTime: ev.startTime,
    description: ev.description,
    organizer: ev.organizer
      ? {
          id: String(ev.organizer._id || ev.organizer),
          email: ev.organizer.email,
        }
      : null,
    license: {
      licenseNo: lic.licenseNo || "",
      licenseType: lic.licenseType || "to_chuc_su_kien",
      issuingAuthority: lic.issuingAuthority || "",
      issuedAt: lic.issuedAt || null,
      expiresAt: lic.expiresAt || null,
      status: lic.status || "none",
      effectiveStatus,
      documentUrl: lic.documentUrl || "",
      notes: lic.notes || "",
      rejectionReason: lic.rejectionReason || "",
      reviewedAt: lic.reviewedAt || null,
      reviewedBy: lic.reviewedBy || null,
      updatedAt: lic.updatedAt || null,
      hasPdf,
      hasDocument,
      uploadedOriginalName: lic.uploadedOriginalName || "",
      uploadedMimeType: lic.uploadedMimeType || "",
      uploadedAt: lic.uploadedAt || null,
      documentApiUrl: hasDocument ? `/api/admin/licenses/${ev._id}/document` : null,
      publicDocumentUrl: hasDocument ? `/api/events/${ev._id}/license.document` : null,
      pdfUrl: `/api/admin/licenses/${ev._id}/pdf`,
      publicPdfUrl: `/api/events/${ev._id}/license.pdf`,
      workflow: buildWorkflow(lic),
    },
  };
}

function buildWorkflow(lic) {
  const hasMeta = Boolean(lic?.licenseNo && lic?.issuingAuthority);
  const hasDoc = hasLicenseDocument(lic);
  const status = effectiveLicenseStatus(lic);
  return {
    steps: [
      { key: "draft", label: "1. Khai báo hồ sơ", done: hasMeta || ["draft", "pending", "approved", "rejected", "suspended", "expired"].includes(status) },
      { key: "upload", label: "2. Upload file GP", done: hasDoc },
      { key: "pending", label: "3. Gửi chờ duyệt", done: ["pending", "approved", "rejected", "suspended", "expired"].includes(status) },
      { key: "approved", label: "4. Cấp phép", done: ["approved", "expired", "suspended"].includes(status) },
    ],
    canSubmitPending: hasMeta && hasDoc && ["draft", "none", "rejected"].includes(status),
    canApprove: hasMeta && hasDoc && status === "pending",
  };
}

async function ensureLicensePdf(event) {
  const lic = event.operatingLicense || {};
  if (!lic.licenseNo) {
    throw Object.assign(new Error("Chưa có số giấy phép — không thể sinh PDF"), { status: 400 });
  }
  const populated =
    event.organizer && typeof event.organizer === "object"
      ? event
      : await Event.findById(event._id).populate("organizer", "email")
      .populate("organizerProfile", "profileCode organizationName status");

  const pdf = await generateLicensePdf(populated);
  const next = {
    ...(populated.operatingLicense?.toObject?.() || populated.operatingLicense || {}),
    pdfFileName: pdf.fileName,
    pdfRelativePath: pdf.relativePath,
    updatedAt: new Date(),
  };
  populated.operatingLicense = next;
  await populated.save();
  return { event: populated, pdf };
}

function assertCanTransition(lic, nextStatus) {
  const cur = effectiveLicenseStatus(lic);
  const hasMeta = Boolean(lic?.licenseNo);
  const hasDoc = hasLicenseDocument(lic);

  if (nextStatus === "pending") {
    if (!hasMeta) {
      throw Object.assign(new Error("Cần số giấy phép trước khi gửi chờ duyệt"), { status: 400 });
    }
    if (!lic.issuingAuthority) {
      throw Object.assign(new Error("Cần cơ quan cấp trước khi gửi chờ duyệt"), { status: 400 });
    }
    if (!hasDoc) {
      throw Object.assign(
        new Error("Cần upload file giấy phép (PDF/ảnh) trước khi gửi chờ duyệt"),
        { status: 400 }
      );
    }
  }

  if (nextStatus === "approved") {
    if (!hasMeta) {
      throw Object.assign(new Error("Cần số giấy phép trước khi cấp phép"), { status: 400 });
    }
    if (!hasDoc) {
      throw Object.assign(
        new Error("Cần có hồ sơ đính kèm (file upload) trước khi cấp phép"),
        { status: 400 }
      );
    }
    if (cur !== "pending" && cur !== "approved" && cur !== "suspended" && cur !== "expired") {
      throw Object.assign(
        new Error("Chỉ cấp phép khi hồ sơ đang ở trạng thái chờ duyệt (pending)"),
        { status: 400 }
      );
    }
  }
}

export const getLicenseCatalog = asyncHandler(async (_req, res) => {
  res.json({
    success: true,
    data: {
      types: LICENSE_TYPES,
      statuses: LICENSE_STATUSES,
      upload: {
        accept: ".pdf,.jpg,.jpeg,.png,.webp",
        maxSizeMb: 12,
        hint: "Upload bản scan / PDF giấy phép gốc do cơ quan cấp. Quy trình: Nháp → Upload → Chờ duyệt → Cấp phép.",
      },
    },
  });
});

export const listEventLicenses = asyncHandler(async (req, res) => {
  const { q, status, limit = 100 } = req.query;
  const filter = {};
  if (q) {
    filter.$or = [
      { title: new RegExp(String(q), "i") },
      { location: new RegExp(String(q), "i") },
      { "operatingLicense.licenseNo": new RegExp(String(q), "i") },
      { "operatingLicense.issuingAuthority": new RegExp(String(q), "i") },
    ];
  }

  const events = await Event.find(filter)
    .populate("organizer", "email")
      .populate("organizerProfile", "profileCode organizationName status")
    .sort({ startTime: 1 })
    .limit(Math.min(300, Number(limit) || 100));

  let rows = events.map(toLicenseAdmin);
  if (status) {
    rows = rows.filter((r) => r.license.effectiveStatus === status);
  }

  const stats = LICENSE_STATUSES.reduce((acc, s) => {
    acc[s.key] = 0;
    return acc;
  }, {});
  for (const r of events.map(toLicenseAdmin)) {
    stats[r.license.effectiveStatus] = (stats[r.license.effectiveStatus] || 0) + 1;
  }

  res.json({
    success: true,
    data: {
      items: rows,
      stats,
      catalog: {
        types: LICENSE_TYPES,
        statuses: LICENSE_STATUSES,
        upload: {
          accept: ".pdf,.jpg,.jpeg,.png,.webp",
          maxSizeMb: 12,
          hint: "Upload bản scan / PDF giấy phép gốc. Quy trình: Nháp → Upload → Chờ duyệt → Cấp phép.",
        },
      },
    },
  });
});

export const getEventLicense = asyncHandler(async (req, res) => {
  const event = await Event.findById(req.params.eventId).populate("organizer", "email")
      .populate("organizerProfile", "profileCode organizationName status");
  if (!event) return res.status(404).json({ success: false, error: "Không tìm thấy sự kiện" });
  res.json({ success: true, data: toLicenseAdmin(event) });
});

export const upsertEventLicense = asyncHandler(async (req, res) => {
  const event = await Event.findById(req.params.eventId);
  if (!event) return res.status(404).json({ success: false, error: "Không tìm thấy sự kiện" });

  const body = req.body || {};
  const allowedStatus = new Set(LICENSE_STATUSES.map((s) => s.key));
  const allowedType = new Set(LICENSE_TYPES.map((t) => t.key));

  const next = {
    ...(event.operatingLicense?.toObject?.() || event.operatingLicense || {}),
  };

  if (body.licenseNo != null) next.licenseNo = String(body.licenseNo).trim();
  if (body.licenseType != null) {
    next.licenseType = allowedType.has(body.licenseType) ? body.licenseType : "khac";
  }
  if (body.issuingAuthority != null) next.issuingAuthority = String(body.issuingAuthority).trim();
  if (body.documentUrl != null) next.documentUrl = String(body.documentUrl).trim();
  if (body.notes != null) next.notes = String(body.notes).trim();
  if (body.rejectionReason != null) next.rejectionReason = String(body.rejectionReason).trim();
  if (body.issuedAt !== undefined) next.issuedAt = body.issuedAt ? new Date(body.issuedAt) : null;
  if (body.expiresAt !== undefined) next.expiresAt = body.expiresAt ? new Date(body.expiresAt) : null;

  if (body.status != null) {
    if (!allowedStatus.has(body.status)) {
      return res.status(400).json({ success: false, error: "Trạng thái giấy phép không hợp lệ" });
    }
    try {
      assertCanTransition(next, body.status);
    } catch (err) {
      return res.status(err.status || 400).json({ success: false, error: err.message });
    }
    next.status = body.status;
    if (["approved", "rejected", "suspended"].includes(body.status)) {
      next.reviewedAt = new Date();
      next.reviewedBy = req.user?._id;
    }
  } else if (!next.status || next.status === "none") {
    next.status = "draft";
  }

  if (next.status === "approved" && next.expiresAt && new Date(next.expiresAt) < new Date()) {
    next.status = "expired";
  }

  next.updatedAt = new Date();
  next.pdfFileName = "";
  next.pdfRelativePath = "";
  event.operatingLicense = next;
  await event.save();

  let populated = await Event.findById(event._id).populate("organizer", "email")
      .populate("organizerProfile", "profileCode organizationName status");
  if (next.licenseNo && ["approved", "pending", "draft"].includes(next.status)) {
    try {
      const { event: withPdf } = await ensureLicensePdf(populated);
      populated = withPdf;
    } catch {
      /* PDF optional on save if incomplete */
    }
  }

  res.json({ success: true, data: toLicenseAdmin(populated) });
});

export const patchEventLicenseStatus = asyncHandler(async (req, res) => {
  const event = await Event.findById(req.params.eventId);
  if (!event) return res.status(404).json({ success: false, error: "Không tìm thấy sự kiện" });

  const { status, rejectionReason } = req.body || {};
  const allowed = new Set(["draft", "pending", "approved", "rejected", "suspended", "expired", "none"]);
  if (!allowed.has(status)) {
    return res.status(400).json({ success: false, error: "Trạng thái không hợp lệ" });
  }

  const current = event.operatingLicense?.toObject?.() || event.operatingLicense || {};
  try {
    assertCanTransition(current, status);
  } catch (err) {
    return res.status(err.status || 400).json({ success: false, error: err.message });
  }

  const next = {
    ...current,
    status,
    updatedAt: new Date(),
    pdfFileName: "",
    pdfRelativePath: "",
  };

  if (status === "rejected") {
    next.rejectionReason = rejectionReason || next.rejectionReason || "Từ chối bởi admin";
  }
  if (["approved", "rejected", "suspended"].includes(status)) {
    next.reviewedAt = new Date();
    next.reviewedBy = req.user?._id;
  }
  if (status === "approved" && !next.licenseNo) {
    next.licenseNo = `GP-SK-${new Date().getFullYear()}-${String(event._id).slice(-4).toUpperCase()}`;
  }
  if (status === "approved" && !next.issuingAuthority) {
    next.issuingAuthority = "Sở Văn hóa, Thể thao và Du lịch (lab)";
  }
  if (status === "approved" && !next.issuedAt) next.issuedAt = new Date();
  if (status === "approved" && !next.expiresAt) {
    const exp = new Date();
    exp.setFullYear(exp.getFullYear() + 1);
    next.expiresAt = exp;
  }

  event.operatingLicense = next;
  await event.save();

  let populated = await Event.findById(event._id).populate("organizer", "email")
      .populate("organizerProfile", "profileCode organizationName status");
  if (status === "approved" || status === "pending") {
    try {
      const { event: withPdf } = await ensureLicensePdf(populated);
      populated = withPdf;
    } catch (err) {
      return res.status(400).json({
        success: false,
        error: err.message || "Không sinh được PDF giấy phép",
      });
    }
  }

  res.json({ success: true, data: toLicenseAdmin(populated) });
});

/** Upload file GP gốc (PDF/ảnh) — bước bắt buộc trước khi gửi duyệt */
export const uploadLicenseDocument = asyncHandler(async (req, res) => {
  const event = await Event.findById(req.params.eventId);
  if (!event) return res.status(404).json({ success: false, error: "Không tìm thấy sự kiện" });
  if (!req.file) {
    return res.status(400).json({ success: false, error: "Chưa chọn file giấy phép để upload" });
  }

  const prev = event.operatingLicense?.toObject?.() || event.operatingLicense || {};
  removeUploadedLicenseFile(prev);

  const relativePath = path.join("storage", "licenses", "uploads", req.file.filename);
  const next = {
    ...prev,
    uploadedFileName: req.file.filename,
    uploadedOriginalName: req.file.originalname || req.file.filename,
    uploadedMimeType: req.file.mimetype || "application/octet-stream",
    uploadedRelativePath: relativePath,
    uploadedAt: new Date(),
    updatedAt: new Date(),
    // giữ documentUrl ngoài nếu có; ưu tiên file nội bộ
    documentUrl: prev.documentUrl || "",
  };
  if (!next.status || next.status === "none") next.status = "draft";

  event.operatingLicense = next;
  await event.save();

  const populated = await Event.findById(event._id).populate("organizer", "email")
      .populate("organizerProfile", "profileCode organizationName status");
  res.json({
    success: true,
    data: toLicenseAdmin(populated),
    message: "Đã upload hồ sơ giấy phép. Có thể gửi chờ duyệt.",
  });
});

/** Xóa file upload (quay lại bước đính kèm) */
export const deleteLicenseDocument = asyncHandler(async (req, res) => {
  const event = await Event.findById(req.params.eventId);
  if (!event) return res.status(404).json({ success: false, error: "Không tìm thấy sự kiện" });

  const prev = event.operatingLicense?.toObject?.() || event.operatingLicense || {};
  const status = effectiveLicenseStatus(prev);
  if (status === "approved") {
    return res.status(400).json({
      success: false,
      error: "Không xóa hồ sơ khi đã cấp phép — hãy tạm đình chỉ trước.",
    });
  }

  removeUploadedLicenseFile(prev);
  event.operatingLicense = {
    ...prev,
    uploadedFileName: "",
    uploadedOriginalName: "",
    uploadedMimeType: "",
    uploadedRelativePath: "",
    uploadedAt: null,
    updatedAt: new Date(),
  };
  await event.save();

  const populated = await Event.findById(event._id).populate("organizer", "email")
      .populate("organizerProfile", "profileCode organizationName status");
  res.json({ success: true, data: toLicenseAdmin(populated) });
});

function sendLicenseDocument(res, event, { download = false } = {}) {
  const lic = event.operatingLicense || {};
  const abs = resolveUploadedLicensePath(lic);
  if (abs) {
    const name = lic.uploadedOriginalName || lic.uploadedFileName || "giay-phep";
    res.setHeader("Content-Type", lic.uploadedMimeType || "application/octet-stream");
    res.setHeader(
      "Content-Disposition",
      `${download ? "attachment" : "inline"}; filename="${encodeURIComponent(name)}"`
    );
    return fs.createReadStream(abs).pipe(res);
  }
  if (lic.documentUrl && /^https?:\/\//i.test(lic.documentUrl)) {
    return res.redirect(lic.documentUrl);
  }
  return res.status(404).json({ success: false, error: "Chưa có hồ sơ đính kèm" });
}

export const downloadAdminLicenseDocument = asyncHandler(async (req, res) => {
  const event = await Event.findById(req.params.eventId);
  if (!event) return res.status(404).json({ success: false, error: "Không tìm thấy sự kiện" });
  if (!hasLicenseDocument(event.operatingLicense)) {
    return res.status(404).json({ success: false, error: "Chưa upload hồ sơ giấy phép" });
  }
  return sendLicenseDocument(res, event, { download: req.query.download === "1" });
});

export const downloadPublicLicenseDocument = asyncHandler(async (req, res) => {
  const event = await Event.findById(req.params.id);
  if (!event) return res.status(404).json({ success: false, error: "Không tìm thấy sự kiện" });

  const status = effectiveLicenseStatus(event.operatingLicense);
  if (!["approved", "expired", "suspended"].includes(status)) {
    return res.status(404).json({
      success: false,
      error: "Hồ sơ giấy phép chỉ công khai sau khi được cấp phép.",
    });
  }
  if (!hasLicenseDocument(event.operatingLicense)) {
    return res.status(404).json({ success: false, error: "Chưa có hồ sơ đính kèm" });
  }
  return sendLicenseDocument(res, event, { download: req.query.download === "1" });
});

/** Admin: xem / tải PDF hệ thống (bản lab) */
export const downloadAdminLicensePdf = asyncHandler(async (req, res) => {
  let event = await Event.findById(req.params.eventId).populate("organizer", "email")
      .populate("organizerProfile", "profileCode organizationName status");
  if (!event) return res.status(404).json({ success: false, error: "Không tìm thấy sự kiện" });
  if (!event.operatingLicense?.licenseNo) {
    return res.status(400).json({ success: false, error: "Chưa có số giấy phép để xuất PDF" });
  }

  let pdfPath = resolveLicensePdfPath(event.operatingLicense);
  if (!pdfPath) {
    const { event: withPdf, pdf } = await ensureLicensePdf(event);
    event = withPdf;
    pdfPath = pdf.absolutePath;
  }

  res.setHeader("Content-Type", "application/pdf");
  res.setHeader(
    "Content-Disposition",
    `${req.query.download === "1" ? "attachment" : "inline"}; filename="${event.operatingLicense.pdfFileName || "giay-phep.pdf"}"`
  );
  fs.createReadStream(pdfPath).pipe(res);
});

/** Public: xem PDF hệ thống nếu đã cấp phép */
export const downloadPublicLicensePdf = asyncHandler(async (req, res) => {
  let event = await Event.findById(req.params.id).populate("organizer", "email")
      .populate("organizerProfile", "profileCode organizationName status");
  if (!event) return res.status(404).json({ success: false, error: "Không tìm thấy sự kiện" });

  const status = effectiveLicenseStatus(event.operatingLicense);
  if (status !== "approved" && status !== "expired" && status !== "suspended") {
    return res.status(404).json({
      success: false,
      error: "Chưa có giấy phép công khai để xem (cần trạng thái đã cấp phép).",
    });
  }
  if (!event.operatingLicense?.licenseNo) {
    return res.status(404).json({ success: false, error: "Chưa có số giấy phép" });
  }

  let pdfPath = resolveLicensePdfPath(event.operatingLicense);
  if (!pdfPath) {
    const { pdf } = await ensureLicensePdf(event);
    pdfPath = pdf.absolutePath;
  }

  res.setHeader("Content-Type", "application/pdf");
  res.setHeader(
    "Content-Disposition",
    `${req.query.download === "1" ? "attachment" : "inline"}; filename="${event.operatingLicense.pdfFileName || "giay-phep.pdf"}"`
  );
  fs.createReadStream(pdfPath).pipe(res);
});
