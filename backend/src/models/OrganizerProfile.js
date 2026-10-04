import mongoose from "mongoose";
import { MEMBER_ROLE_TITLES, PROFILE_STATUSES } from "../utils/organizerProfileVn.js";

const roleKeys = MEMBER_ROLE_TITLES.map((r) => r.key);
const statusKeys = PROFILE_STATUSES.map((s) => s.key);

const degreeSchema = new mongoose.Schema(
  {
    title: { type: String, default: "", trim: true },
    school: { type: String, default: "", trim: true },
    major: { type: String, default: "", trim: true },
    year: { type: String, default: "", trim: true },
    level: { type: String, default: "", trim: true }, // cử nhân, thạc sĩ…
  },
  { _id: true }
);

const certificateSchema = new mongoose.Schema(
  {
    name: { type: String, default: "", trim: true },
    issuer: { type: String, default: "", trim: true },
    number: { type: String, default: "", trim: true },
    issuedAt: { type: String, default: "", trim: true },
    expiresAt: { type: String, default: "", trim: true },
    notes: { type: String, default: "", trim: true },
  },
  { _id: true }
);

const awardSchema = new mongoose.Schema(
  {
    title: { type: String, default: "", trim: true },
    year: { type: String, default: "", trim: true },
    organizer: { type: String, default: "", trim: true },
  },
  { _id: true }
);

const memberSchema = new mongoose.Schema(
  {
    fullName: { type: String, required: true, trim: true },
    /** Nghệ danh / tên sân khấu (ca sĩ, DJ, vũ công…) */
    stageName: { type: String, default: "", trim: true },
    roleTitle: {
      type: String,
      enum: roleKeys,
      default: "khac",
    },
    idNumber: { type: String, default: "", trim: true },
    dateOfBirth: { type: String, default: "", trim: true },
    gender: {
      type: String,
      enum: ["", "nam", "nu", "khac"],
      default: "",
    },
    nationality: { type: String, default: "Việt Nam", trim: true },
    hometown: { type: String, default: "", trim: true },
    address: { type: String, default: "", trim: true },
    phone: { type: String, default: "", trim: true },
    email: { type: String, default: "", trim: true, lowercase: true },
    emergencyContact: { type: String, default: "", trim: true },
    emergencyPhone: { type: String, default: "", trim: true },
    taxCode: { type: String, default: "", trim: true },
    bankAccount: { type: String, default: "", trim: true },
    bankName: { type: String, default: "", trim: true },
    unionMembership: { type: String, default: "", trim: true },
    languages: { type: String, default: "", trim: true },
    portfolioUrl: { type: String, default: "", trim: true },
    bio: { type: String, default: "", trim: true },
    qualifications: { type: String, default: "", trim: true },
    specialty: { type: String, default: "", trim: true },
    experienceYears: { type: Number, default: 0, min: 0 },
    pastEvents: { type: String, default: "", trim: true },
    degrees: { type: [degreeSchema], default: [] },
    certificates: { type: [certificateSchema], default: [] },
    awards: { type: [awardSchema], default: [] },
    notes: { type: String, default: "", trim: true },
  },
  { _id: true }
);

/**
 * Hồ sơ năng lực Ban tổ chức — danh sách thành viên + thông tin đơn vị.
 * Độc lập với User (auth); có thể gắn linkedUser khi BTC cũng có tài khoản organizer.
 */
const organizerProfileSchema = new mongoose.Schema(
  {
    profileCode: { type: String, required: true, unique: true, trim: true, index: true },
    organizationName: { type: String, required: true, trim: true },
    taxCode: { type: String, default: "", trim: true },
    address: { type: String, default: "", trim: true },
    phone: { type: String, default: "", trim: true },
    email: { type: String, default: "", trim: true, lowercase: true },
    website: { type: String, default: "", trim: true },
    businessField: { type: String, default: "", trim: true },
    yearsOperating: { type: Number, default: 0, min: 0 },
    legalRepName: { type: String, default: "", trim: true },
    legalRepTitle: { type: String, default: "", trim: true },
    legalRepIdNumber: { type: String, default: "", trim: true },
    members: { type: [memberSchema], default: [] },
    status: {
      type: String,
      enum: statusKeys,
      default: "draft",
      index: true,
    },
    notes: { type: String, default: "", trim: true },
    rejectionReason: { type: String, default: "", trim: true },
    reviewedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User", default: null },
    reviewedAt: { type: Date, default: null },
    linkedUser: { type: mongoose.Schema.Types.ObjectId, ref: "User", default: null },
    /** Ví nhận tiền bán vé khi sự kiện sold-out (settle từ treasury lab) */
    payoutWallet: { type: String, default: "", trim: true, lowercase: true },
    /** Tài khoản ngân hàng đơn vị (đối soát off-chain) */
    bankAccount: { type: String, default: "", trim: true },
    bankName: { type: String, default: "", trim: true },
  },
  { timestamps: true }
);

organizerProfileSchema.index({ organizationName: 1 });
organizerProfileSchema.index({ "members.fullName": 1 });
organizerProfileSchema.index({ "members.stageName": 1 });
organizerProfileSchema.index({ "members.roleTitle": 1 });

export default mongoose.model("OrganizerProfile", organizerProfileSchema);
