import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import User from "../models/User.js";
import { asyncHandler } from "../middlewares/errorHandler.js";
import { resolvePermissions } from "../constants/permissions.js";

function signToken(user) {
  return jwt.sign(
    { sub: user._id.toString(), role: user.role },
    process.env.JWT_SECRET,
    { expiresIn: process.env.JWT_EXPIRES_IN || "7d" }
  );
}

export function publicUser(user) {
  return {
    id: user._id,
    email: user.email,
    displayName: user.displayName || "",
    role: user.role,
    permissions: resolvePermissions(user.role, user.permissions),
    customPermissions: user.permissions || [],
    walletAddress: user.walletAddress,
    isVerified: user.isVerified,
    isActive: user.isActive !== false,
    createdAt: user.createdAt,
  };
}

export const register = asyncHandler(async (req, res) => {
  const { email, password, displayName } = req.body;
  if (!email || !password) {
    return res.status(400).json({ success: false, error: "Thiếu email hoặc mật khẩu" });
  }
  const exists = await User.findOne({ email: email.toLowerCase() });
  if (exists) {
    return res.status(409).json({ success: false, error: "Email đã được sử dụng" });
  }
  const passwordHash = await bcrypt.hash(password, 10);
  const user = await User.create({
    email: email.toLowerCase(),
    passwordHash,
    role: "user",
    displayName: displayName || "",
  });
  const token = signToken(user);
  res.status(201).json({ success: true, data: { user: publicUser(user), token } });
});

export const login = asyncHandler(async (req, res) => {
  const { email, password } = req.body;
  const user = await User.findOne({ email: (email || "").toLowerCase() });
  if (!user) {
    return res.status(401).json({ success: false, error: "Sai email hoặc mật khẩu" });
  }
  if (user.isActive === false) {
    return res.status(403).json({ success: false, error: "Tài khoản đã bị khóa" });
  }
  const ok = await bcrypt.compare(password || "", user.passwordHash);
  if (!ok) {
    return res.status(401).json({ success: false, error: "Sai email hoặc mật khẩu" });
  }
  const token = signToken(user);
  res.json({ success: true, data: { user: publicUser(user), token } });
});

export const linkWallet = asyncHandler(async (req, res) => {
  const wallet = (req.body.walletAddress || "").toLowerCase();
  if (!/^0x[a-f0-9]{40}$/.test(wallet)) {
    return res.status(400).json({ success: false, error: "Địa chỉ ví không hợp lệ" });
  }
  const taken = await User.findOne({ walletAddress: wallet, _id: { $ne: req.user._id } });
  if (taken) {
    return res.status(409).json({ success: false, error: "Ví đã liên kết tài khoản khác" });
  }
  req.user.walletAddress = wallet;
  await req.user.save();
  res.json({ success: true, data: { user: publicUser(req.user) } });
});

export const me = asyncHandler(async (req, res) => {
  res.json({ success: true, data: { user: publicUser(req.user) } });
});
