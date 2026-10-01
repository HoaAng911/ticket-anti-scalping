import bcrypt from "bcryptjs";
import User from "../models/User.js";
import { asyncHandler } from "../middlewares/errorHandler.js";
import {
  PERMISSIONS,
  ROLE_PERMISSIONS,
  ROLES,
  resolvePermissions,
} from "../constants/permissions.js";
import { publicUser } from "./authController.js";

const VALID_ROLES = ROLES.map((r) => r.key);

export const listRolesCatalog = asyncHandler(async (_req, res) => {
  res.json({
    success: true,
    data: {
      roles: ROLES.map((r) => ({
        ...r,
        defaultPermissions: ROLE_PERMISSIONS[r.key] || [],
      })),
      permissions: PERMISSIONS,
    },
  });
});

export const listUsers = asyncHandler(async (req, res) => {
  const q = String(req.query.q || "").trim().toLowerCase();
  const role = String(req.query.role || "").trim();
  const active = req.query.active;

  const filter = {};
  if (q) {
    filter.$or = [
      { email: { $regex: q, $options: "i" } },
      { displayName: { $regex: q, $options: "i" } },
      { walletAddress: { $regex: q, $options: "i" } },
    ];
  }
  if (VALID_ROLES.includes(role)) filter.role = role;
  if (active === "true") filter.isActive = true;
  if (active === "false") filter.isActive = false;

  const users = await User.find(filter)
    .select("-passwordHash")
    .sort({ createdAt: -1 })
    .limit(200);

  res.json({
    success: true,
    data: {
      users: users.map(publicUser),
      total: users.length,
    },
  });
});

export const createUser = asyncHandler(async (req, res) => {
  const { email, password, role = "user", displayName = "", permissions = [], isActive = true } =
    req.body;

  if (!email || !password) {
    return res.status(400).json({ success: false, error: "Thiếu email hoặc mật khẩu" });
  }
  if (!VALID_ROLES.includes(role)) {
    return res.status(400).json({ success: false, error: "Vai trò không hợp lệ" });
  }
  if (role === "admin" && req.user.role !== "admin") {
    return res.status(403).json({ success: false, error: "Chỉ admin mới tạo được tài khoản admin" });
  }

  const exists = await User.findOne({ email: email.toLowerCase() });
  if (exists) {
    return res.status(409).json({ success: false, error: "Email đã được sử dụng" });
  }

  const passwordHash = await bcrypt.hash(password, 10);
  const user = await User.create({
    email: email.toLowerCase(),
    passwordHash,
    role,
    displayName: displayName || "",
    permissions: Array.isArray(permissions) ? permissions : [],
    isActive: isActive !== false,
  });

  res.status(201).json({ success: true, data: { user: publicUser(user) } });
});

export const updateUser = asyncHandler(async (req, res) => {
  const target = await User.findById(req.params.id);
  if (!target) {
    return res.status(404).json({ success: false, error: "Không tìm thấy người dùng" });
  }

  const isSelf = target._id.toString() === req.user._id.toString();
  const actorIsAdmin = req.user.role === "admin";

  if (!actorIsAdmin) {
    return res.status(403).json({ success: false, error: "Chỉ admin mới sửa người dùng / phân quyền" });
  }

  const { role, permissions, isActive, displayName, password, resetCustomPermissions } = req.body;

  if (role !== undefined) {
    if (!VALID_ROLES.includes(role)) {
      return res.status(400).json({ success: false, error: "Vai trò không hợp lệ" });
    }
    if (isSelf && role !== "admin") {
      return res.status(400).json({ success: false, error: "Không thể tự hạ quyền admin của chính mình" });
    }
    target.role = role;
  }

  if (resetCustomPermissions === true) {
    target.permissions = [];
  } else if (permissions !== undefined) {
    if (!Array.isArray(permissions)) {
      return res.status(400).json({ success: false, error: "permissions phải là mảng" });
    }
    target.permissions = permissions;
  }

  if (isActive !== undefined) {
    if (isSelf && isActive === false) {
      return res.status(400).json({ success: false, error: "Không thể tự khóa tài khoản của mình" });
    }
    target.isActive = Boolean(isActive);
  }

  if (displayName !== undefined) {
    target.displayName = String(displayName || "").trim();
  }

  if (password) {
    if (String(password).length < 6) {
      return res.status(400).json({ success: false, error: "Mật khẩu tối thiểu 6 ký tự" });
    }
    target.passwordHash = await bcrypt.hash(password, 10);
  }

  await target.save();
  res.json({
    success: true,
    data: {
      user: publicUser(target),
      effectivePermissions: resolvePermissions(target.role, target.permissions),
    },
  });
});

export const deleteUser = asyncHandler(async (req, res) => {
  if (req.user.role !== "admin") {
    return res.status(403).json({ success: false, error: "Chỉ admin mới xóa / khóa người dùng" });
  }

  const target = await User.findById(req.params.id);
  if (!target) {
    return res.status(404).json({ success: false, error: "Không tìm thấy người dùng" });
  }
  if (target._id.toString() === req.user._id.toString()) {
    return res.status(400).json({ success: false, error: "Không thể xóa chính mình" });
  }

  // Soft-delete: khóa tài khoản (an toàn hơn hard delete)
  target.isActive = false;
  await target.save();

  res.json({ success: true, data: { user: publicUser(target) } });
});
