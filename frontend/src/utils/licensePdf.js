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
