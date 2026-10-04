import mongoose from "mongoose";
import { PROGRAM_ITEM_TYPES } from "../utils/programVn.js";

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

const PROGRAM_TYPE_KEYS = PROGRAM_ITEM_TYPES.map((t) => t.key);

/** Mục chương trình của một sự kiện (timeline / lineup) */
const programItemSchema = new mongoose.Schema(
  {
    title: { type: String, required: true, trim: true },
    description: { type: String, default: "", trim: true },
    itemType: {
      type: String,
      enum: PROGRAM_TYPE_KEYS,
      default: "performance",
    },
    startAt: { type: Date, default: null },
    endAt: { type: Date, default: null },
    /** Thành viên đơn vị BTC (OrganizerProfile.members._id) */
    memberId: { type: mongoose.Schema.Types.ObjectId, default: null },
    /** Tên hiển thị (cache từ thành viên đơn vị) */
    performer: { type: String, default: "", trim: true },
    performerRole: { type: String, default: "", trim: true },
    stage: { type: String, default: "", trim: true },
    sortOrder: { type: Number, default: 0 },
    notes: { type: String, default: "", trim: true },
  },
  { _id: true }
);

const eventSchema = new mongoose.Schema(
  {
    title: { type: String, required: true },
    description: { type: String, required: true },
    location: { type: String, required: true },
    startTime: { type: Date, required: true },
    organizer: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    /** Đơn vị / hồ sơ năng lực BTC tổ chức sự kiện (khác User.organizer — tài khoản tạo) */
    organizerProfile: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "OrganizerProfile",
      default: null,
      index: true,
    },
    ticketTypes: { type: [ticketTypeSchema], required: true },
    coverImage: { type: String, default: "" },
    operatingLicense: { type: operatingLicenseSchema, default: () => ({}) },
    programItems: { type: [programItemSchema], default: [] },
    /** Sơ đồ ghế / khu vực (nghiệp vụ chọn ghế kiểu rạp) */
    seatingChart: {
      type: new mongoose.Schema(
        {
          enabled: { type: Boolean, default: false },
          screenLabel: { type: String, default: "SÂN KHẤU / MÀN HÌNH" },
          holdMinutes: { type: Number, default: 8, min: 1, max: 30 },
          maxSelect: { type: Number, default: 2, min: 1, max: 8 },
          zones: [
            {
              code: { type: String, required: true, trim: true },
              label: { type: String, required: true, trim: true },
              eventChainId: { type: Number, required: true },
              rows: [
                {
                  row: { type: String, required: true },
                  seats: [
                    {
                      id: { type: String, required: true },
                      label: { type: String, required: true },
                      status: {
                        type: String,
                        enum: ["available", "held", "sold", "blocked"],
                        default: "available",
                      },
                      heldBy: { type: String, default: "", lowercase: true },
                      heldUntil: { type: Date, default: null },
                      tokenId: { type: Number, default: null },
                    },
                  ],
                },
              ],
            },
          ],
        },
        { _id: false }
      ),
      default: () => ({ enabled: false, zones: [] }),
    },
    /**
     * Thanh toán doanh thu sơ cấp về ví Ban tổ chức khi bán hết vé.
     * On-chain mint đã gửi ETH vào organizerTreasury; settle chuyển từ treasury → payoutWallet.
     */
    payoutSettlement: {
      type: new mongoose.Schema(
        {
          status: {
            type: String,
            enum: ["none", "ready", "settled", "failed"],
            default: "none",
          },
          amountEth: { type: String, default: "0" },
          amountWei: { type: String, default: "0" },
          /** Override ví nhận (ưu tiên hơn OrganizerProfile.payoutWallet) */
          payoutWallet: { type: String, default: "", lowercase: true, trim: true },
          bankAccount: { type: String, default: "", trim: true },
          bankName: { type: String, default: "", trim: true },
          /** Nếu set: settle dùng số ETH này thay vì doanh thu on-chain */
          overrideAmountEth: { type: String, default: "" },
          organizerProfileId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "OrganizerProfile",
            default: null,
          },
          txHash: { type: String, default: "" },
          settledAt: { type: Date, default: null },
          settledBy: { type: mongoose.Schema.Types.ObjectId, ref: "User", default: null },
          error: { type: String, default: "" },
          note: { type: String, default: "" },
        },
        { _id: false }
      ),
      default: () => ({ status: "none", amountEth: "0", amountWei: "0" }),
    },
  },
  { timestamps: true }
);

eventSchema.index({ organizer: 1 });
eventSchema.index({ organizerProfile: 1, startTime: 1 });
eventSchema.index({ startTime: 1 });
eventSchema.index({ "operatingLicense.status": 1 });
eventSchema.index({ "operatingLicense.licenseNo": 1 });

export default mongoose.model("Event", eventSchema);
