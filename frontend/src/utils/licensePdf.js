import {
  fetchAdminLicensePdfBlob,
  fetchPublicLicensePdfBlob,
  fetchAdminLicenseDocumentBlob,
  fetchPublicLicenseDocumentBlob,
} from "../services/api.js";

async function blobErrorMessage(err, fallback = "Không mở được tệp") {
  const data = err?.response?.data;
  if (data instanceof Blob) {
    try {
      const parsed = JSON.parse(await data.text());
      return parsed.error || err.message || fallback;
    } catch {
      return err.message || fallback;
    }
  }
  return err?.response?.data?.error || err?.message || fallback;
}

async function openBlobInTab(blob) {
  if (!(blob instanceof Blob)) {
    throw new Error("Phản hồi không hợp lệ");
  }
  if (blob.type && blob.type.includes("json")) {
    try {
      const parsed = JSON.parse(await blob.text());
      throw new Error(parsed.error || "Không mở được tệp");
    } catch (e) {
      throw new Error(e.message || "Không mở được tệp");
    }
  }
  const url = URL.createObjectURL(blob);
  const w = window.open(url, "_blank", "noopener,noreferrer");
  if (!w) {
    return { url, popupBlocked: true };
  }
  setTimeout(() => URL.revokeObjectURL(url), 120_000);
  return { url, popupBlocked: false };
}

export async function openAdminLicensePdf(eventId) {
  try {
    return openBlobInTab(await fetchAdminLicensePdfBlob(eventId));
  } catch (err) {
    throw new Error(await blobErrorMessage(err, "Không mở được PDF hệ thống"));
  }
}

export async function openPublicLicensePdf(eventId) {
  try {
    return openBlobInTab(await fetchPublicLicensePdfBlob(eventId));
  } catch (err) {
    throw new Error(await blobErrorMessage(err, "Không mở được PDF giấy phép"));
  }
}

export async function openAdminLicenseDocument(eventId) {
  try {
    return openBlobInTab(await fetchAdminLicenseDocumentBlob(eventId));
  } catch (err) {
    throw new Error(await blobErrorMessage(err, "Không mở được hồ sơ đính kèm"));
  }
}

export async function openPublicLicenseDocument(eventId) {
  try {
    return openBlobInTab(await fetchPublicLicenseDocumentBlob(eventId));
  } catch (err) {
    throw new Error(await blobErrorMessage(err, "Không mở được hồ sơ đính kèm"));
  }
}

/**
 * Tải PDF hệ thống + hồ sơ gốc (ảnh/PDF) để xem inline trên trang người dùng.
 * Trả về object URL — caller phải revoke khi đóng.
 */
export async function loadPublicLicenseViewerAssets(eventId, { wantPdf = true, wantDocument = true } = {}) {
  const result = {
    eventId: String(eventId || ""),
    pdfUrl: null,
    documentUrl: null,
    documentMimeType: "",
    errors: [],
  };

  const tasks = [];
  if (wantPdf) {
    tasks.push(
      fetchPublicLicensePdfBlob(eventId)
        .then((blob) => {
          if (blob?.type?.includes("json")) {
            throw new Error("Không tải được PDF giấy phép");
          }
          result.pdfUrl = URL.createObjectURL(blob);
        })
        .catch(async (err) => {
          result.errors.push(await blobErrorMessage(err, "Không tải được PDF hệ thống"));
        })
    );
  }
  if (wantDocument) {
    tasks.push(
      fetchPublicLicenseDocumentBlob(eventId)
        .then((blob) => {
          if (blob?.type?.includes("json")) {
            throw new Error("Không tải được hồ sơ đính kèm");
          }
          result.documentUrl = URL.createObjectURL(blob);
          result.documentMimeType = blob.type || "";
        })
        .catch(async (err) => {
          result.errors.push(await blobErrorMessage(err, "Không tải được hồ sơ đính kèm"));
        })
    );
  }

  await Promise.all(tasks);
  return result;
}

export function revokeLicenseViewerAssets(assets) {
  if (!assets) return;
  if (assets.pdfUrl) URL.revokeObjectURL(assets.pdfUrl);
  if (assets.documentUrl) URL.revokeObjectURL(assets.documentUrl);
}
