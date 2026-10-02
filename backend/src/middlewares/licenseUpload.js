import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import multer from "multer";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.join(__dirname, "..", "..");
export const LICENSE_UPLOAD_DIR = path.join(ROOT, "storage", "licenses", "uploads");

const ALLOWED_MIME = new Set([
  "application/pdf",
  "image/jpeg",
  "image/png",
  "image/webp",
]);

const ALLOWED_EXT = new Set([".pdf", ".jpg", ".jpeg", ".png", ".webp"]);

fs.mkdirSync(LICENSE_UPLOAD_DIR, { recursive: true });

function safeBaseName(name) {
  return String(name || "giay-phep")
    .replace(/[^\w.\-()+ ]+/g, "_")
    .replace(/\s+/g, "-")
    .slice(0, 80);
}

const storage = multer.diskStorage({
  destination: (_req, _file, cb) => {
    fs.mkdirSync(LICENSE_UPLOAD_DIR, { recursive: true });
    cb(null, LICENSE_UPLOAD_DIR);
  },
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname || "").toLowerCase() || ".pdf";
    const base = safeBaseName(path.basename(file.originalname || "giay-phep", ext));
    const eventId = String(req.params.eventId || "event").slice(-8);
    cb(null, `${eventId}-${Date.now()}-${base}${ext}`);
  },
});

function fileFilter(_req, file, cb) {
  const ext = path.extname(file.originalname || "").toLowerCase();
  if (!ALLOWED_MIME.has(file.mimetype) && !ALLOWED_EXT.has(ext)) {
    return cb(
      Object.assign(new Error("Chỉ nhận PDF hoặc ảnh (JPG/PNG/WEBP)"), { status: 400 })
    );
  }
  cb(null, true);
}

export const licenseUpload = multer({
  storage,
  fileFilter,
  limits: { fileSize: 12 * 1024 * 1024, files: 1 },
});

export function resolveUploadedLicensePath(license) {
  if (!license?.uploadedRelativePath && !license?.uploadedFileName) return null;
  const abs = license.uploadedRelativePath
    ? path.join(ROOT, license.uploadedRelativePath)
    : path.join(LICENSE_UPLOAD_DIR, license.uploadedFileName);
  return fs.existsSync(abs) ? abs : null;
}

export function removeUploadedLicenseFile(license) {
  const abs = resolveUploadedLicensePath(license);
  if (abs) {
    try {
      fs.unlinkSync(abs);
    } catch {
      /* ignore */
    }
  }
}

export function hasLicenseDocument(license) {
  if (!license) return false;
  return Boolean(
    license.uploadedFileName ||
      license.uploadedRelativePath ||
      (license.documentUrl && String(license.documentUrl).trim())
  );
}
