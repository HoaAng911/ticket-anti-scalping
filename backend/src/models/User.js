import mongoose from "mongoose";
import { PERMISSIONS } from "../constants/permissions.js";

const permissionKeys = PERMISSIONS.map((p) => p.key);

const userSchema = new mongoose.Schema(
  {
    email: { type: String, required: true, unique: true, lowercase: true, trim: true },
    passwordHash: { type: String, required: true },
    walletAddress: {
      type: String,
      unique: true,
      sparse: true,
      lowercase: true,
      // Không dùng default: null — nhiều null phá unique index
    },
    role: {
      type: String,
      enum: ["user", "organizer", "admin"],
      default: "user",
    },
    /** Nếu rỗng rồi dùng quyền mặc định theo role */
    permissions: {
      type: [String],
      default: [],
      validate: {
        validator(arr) {
          return arr.every((p) => permissionKeys.includes(p));
        },
        message: "Permission không hợp lệ",
      },
    },
    isActive: { type: Boolean, default: true },
    isVerified: { type: Boolean, default: false },
    displayName: { type: String, default: "", trim: true },
  },
  { timestamps: true }
);

export default mongoose.model("User", userSchema);
