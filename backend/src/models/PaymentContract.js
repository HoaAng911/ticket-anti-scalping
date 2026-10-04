import mongoose from "mongoose";

const STAGE_STATUSES = ["pending", "payable", "paid", "skipped"];
const STAGE_TRIGGERS = ["manual", "sales_pct", "sold_out", "date"];
const CONTRACT_STATUSES = ["draft", "active", "completed", "cancelled"];

const paymentStageSchema = new mongoose.Schema(
  {
    code: { type: String, required: true, trim: true },
    name: { type: String, required: true, trim: true },
    /** Định mức % trên tổng giá trị hợp đồng (0–100) */
    percent: { type: Number, required: true, min: 0, max: 100 },
    sortOrder: { type: Number, default: 0 },
    description: { type: String, default: "", trim: true },
    /** Điều kiện mở đợt thanh toán */
    trigger: {
      type: String,
      enum: STAGE_TRIGGERS,
      default: "manual",
    },
    /** sales_pct: ngưỡng % vé đã bán; date: ISO date string */
    triggerValue: { type: String, default: "", trim: true },
    status: {
      type: String,
      enum: STAGE_STATUSES,
      default: "pending",
    },
    paidAmountEth: { type: String, default: "" },
    paidAmountWei: { type: String, default: "" },
    paidAt: { type: Date, default: null },
    paidBy: { type: mongoose.Schema.Types.ObjectId, ref: "User", default: null },
    txHash: { type: String, default: "" },
    payoutWallet: { type: String, default: "", lowercase: true, trim: true },
    note: { type: String, default: "", trim: true },
    error: { type: String, default: "" },
  },
  { _id: true }
);

/**
 * Hợp đồng thanh toán theo tiến độ cho Ban tổ chức của một sự kiện.
 * Mỗi đợt (stage) có % định mức; settle đợt = tổng HĐ × percent / 100.
 */
const paymentContractSchema = new mongoose.Schema(
  {
    contractNo: { type: String, required: true, unique: true, trim: true, index: true },
    title: { type: String, required: true, trim: true },
    event: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Event",
      required: true,
      index: true,
    },
    organizerProfile: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "OrganizerProfile",
      default: null,
      index: true,
    },
    /** Tổng giá trị HĐ (cơ sở tính % từng đợt), ETH */
    totalAmountEth: { type: String, required: true, default: "0" },
    /** Nếu true: tổng HĐ lấy theo doanh thu sơ cấp on-chain khi settle */
    useOnChainRevenue: { type: Boolean, default: false },
    payoutWallet: { type: String, default: "", lowercase: true, trim: true },
    bankAccount: { type: String, default: "", trim: true },
    bankName: { type: String, default: "", trim: true },
    currency: { type: String, default: "ETH", trim: true },
    status: {
      type: String,
      enum: CONTRACT_STATUSES,
      default: "draft",
      index: true,
    },
    signedAt: { type: Date, default: null },
    notes: { type: String, default: "", trim: true },
    stages: { type: [paymentStageSchema], default: [] },
    /** Mã mẫu HĐ (tieu_chuan, hai_dot, …) */
    templateKey: { type: String, default: "tieu_chuan", trim: true, index: true },
    pdfFileName: { type: String, default: "" },
    pdfRelativePath: { type: String, default: "" },
    pdfGeneratedAt: { type: Date, default: null },
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: "User", default: null },
  },
  { timestamps: true }
);

paymentContractSchema.index({ event: 1, status: 1 });

export const PAYMENT_STAGE_STATUSES = STAGE_STATUSES;
export const PAYMENT_STAGE_TRIGGERS = STAGE_TRIGGERS;
export const PAYMENT_CONTRACT_STATUSES = CONTRACT_STATUSES;

export default mongoose.model("PaymentContract", paymentContractSchema);
