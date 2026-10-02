export const LICENSE_TYPES = [
  { key: "to_chuc_su_kien", label: "Tổ chức sự kiện / biểu diễn" },
  { key: "hoi_nghi", label: "Hội nghị / hội thảo" },
  { key: "the_thao", label: "Giải thể thao / giải trí ngoài trời" },
  { key: "khac", label: "Khác" },
];

export const LICENSE_STATUSES = [
  { key: "none", label: "Chưa có hồ sơ" },
  { key: "draft", label: "Nháp" },
  { key: "pending", label: "Chờ duyệt" },
  { key: "approved", label: "Đã cấp phép" },
  { key: "rejected", label: "Từ chối" },
  { key: "suspended", label: "Tạm đình chỉ" },
  { key: "expired", label: "Hết hạn" },
];

export function effectiveLicenseStatus(license) {
  if (!license) return "none";
  const status = license.status || "none";
  if (status === "approved" && license.expiresAt) {
    const exp = new Date(license.expiresAt).getTime();
    if (Number.isFinite(exp) && exp < Date.now()) return "expired";
  }
  return status;
}

export function hasLicenseDocument(license) {
  if (!license) return false;
  return Boolean(
    license.uploadedFileName ||
      license.uploadedRelativePath ||
      (license.documentUrl && String(license.documentUrl).trim())
  );
}

export function licensePublicView(license) {
  if (!license) {
    return {
      status: "none",
      effectiveStatus: "none",
      licenseNo: "",
      licenseType: "",
      issuingAuthority: "",
      issuedAt: null,
      expiresAt: null,
      isValid: false,
      hasPdf: false,
      hasDocument: false,
      documentUrl: "",
    };
  }
  const effectiveStatus = effectiveLicenseStatus(license);
  const hasPdf = Boolean(license.pdfFileName || license.pdfRelativePath);
  const hasDocument = hasLicenseDocument(license);
  return {
    status: license.status || "none",
    effectiveStatus,
    licenseNo: license.licenseNo || "",
    licenseType: license.licenseType || "",
    issuingAuthority: license.issuingAuthority || "",
    issuedAt: license.issuedAt || null,
    expiresAt: license.expiresAt || null,
    documentUrl: license.documentUrl || "",
    isValid: effectiveStatus === "approved",
    hasPdf,
    hasDocument,
  };
}
