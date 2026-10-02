import mongoose from "mongoose";

const ticketTypeSchema = new mongoose.Schema(
  {
    name: { type: String, required: true },
    price: { type: Number, required: true, min: 0 },
    totalSupply: { type: Number, required: true, min: 0 },
    eventChainId: { type: Number, required: true },
  },
  { _id: false }
);

/** Giấy phép hoạt động / tổ chức sự kiện (lab mô phỏng hồ sơ hành chính) */
const operatingLicenseSchema = new mongoose.Schema(
  {
    licenseNo: { type: String, default: "", trim: true },
    licenseType: {
      type: String,
      enum: ["to_chuc_su_kien", "hoi_nghi", "the_thao", "khac"],
      default: "to_chuc_su_kien",
    },
    issuingAuthority: { type: String, default: "", trim: true },
    issuedAt: { type: Date, default: null },
    expiresAt: { type: Date, default: null },
    status: {
      type: String,
      enum: ["none", "draft", "pending", "approved", "rejected", "suspended", "expired"],
      default: "none",
    },
    documentUrl: { type: String, default: "" },
    /** Hồ sơ scan / file GP gốc do BTC upload */
    uploadedFileName: { type: String, default: "" },
    uploadedOriginalName: { type: String, default: "" },
    uploadedMimeType: { type: String, default: "" },
    uploadedRelativePath: { type: String, default: "" },
    uploadedAt: { type: Date, default: null },
    notes: { type: String, default: "" },
    rejectionReason: { type: String, default: "" },
    pdfFileName: { type: String, default: "" },
    pdfRelativePath: { type: String, default: "" },
    reviewedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User", default: null },
    reviewedAt: { type: Date, default: null },
    updatedAt: { type: Date, default: null },
  },
  { _id: false }
);

const eventSchema = new mongoose.Schema(
  {
    title: { type: String, required: true },
    description: { type: String, required: true },
    location: { type: String, required: true },
    startTime: { type: Date, required: true },
    organizer: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    ticketTypes: { type: [ticketTypeSchema], required: true },
    coverImage: { type: String, default: "" },
    operatingLicense: { type: operatingLicenseSchema, default: () => ({}) },
  },
  { timestamps: true }
);

eventSchema.index({ organizer: 1 });
eventSchema.index({ startTime: 1 });
eventSchema.index({ "operatingLicense.status": 1 });
eventSchema.index({ "operatingLicense.licenseNo": 1 });

export default mongoose.model("Event", eventSchema);
