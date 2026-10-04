import bcrypt from "bcryptjs";
import User from "../models/User.js";
import { asyncHandler } from "../middlewares/errorHandler.js";
import {
  PERMISSIONS,
  ROLE_PERMISSIONS,
  ROLES,
  resolvePermissions,
  hasPermission,
} from "../constants/permissions.js";
import { publicUser } from "./authController.js";

const VALID_ROLES = ROLES.map((r) => r.key);

function canRevealPassword(actor) {
  return hasPermission(actor, "users:write") || hasPermission(actor, "roles:manage");
}

function adminUserDto(user, { revealPassword = false } = {}) {
  const base = publicUser(user);
  if (!revealPassword) return base;
  return {
    ...base,
    passwordPlain: user.passwordPlain || "",
    hasViewablePassword: Boolean(user.passwordPlain),
  };
}

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
  const revealPassword = canRevealPassword(req.user);

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

  let query = User.find(filter).sort({ createdAt: -1 }).limit(200);
  if (revealPassword) query = query.select("+passwordPlain -passwordHash");
  else query = query.select("-passwordHash -passwordPlain");

  const users = await query;

  res.json({
    success: true,
    data: {
      users: users.map((u) => adminUserDto(u, { revealPassword })),
      total: users.length,
    },
  });
});

export const getUser = asyncHandler(async (req, res) => {
  const revealPassword = canRevealPassword(req.user);

  let query = User.findById(req.params.id);
  if (revealPassword) query = query.select("+passwordPlain -passwordHash");
  else query = query.select("-passwordHash -passwordPlain");

  const user = await query;
  if (!user) {
    return res.status(404).json({ success: false, error: "Không tìm thấy người dùng" });
  }

  res.json({
    success: true,
    data: { user: adminUserDto(user, { revealPassword }) },
  });
});

export const createUser = asyncHandler(async (req, res) => {
  const {
    email,
    password,
    role = "user",
    displayName = "",
    permissions = [],
    isActive = true,
    walletAddress = "",
  } = req.body;

  if (!email || !password) {
    return res.status(400).json({ success: false, error: "Thiếu email hoặc mật khẩu" });
  }
  if (String(password).length < 6) {
    return res.status(400).json({ success: false, error: "Mật khẩu tối thiểu 6 ký tự" });
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
  const doc = {
    email: email.toLowerCase(),
    passwordHash,
    passwordPlain: String(password),
    role,
    displayName: displayName || "",
    permissions: Array.isArray(permissions) ? permissions : [],
    isActive: isActive !== false,
  };
  const wallet = String(walletAddress || "").trim().toLowerCase();
  if (wallet) doc.walletAddress = wallet;

  const user = await User.create(doc);
  const saved = await User.findById(user._id).select("+passwordPlain");

  res.status(201).json({
    success: true,
    data: { user: adminUserDto(saved, { revealPassword: true }) },
  });
});

export const updateUser = asyncHandler(async (req, res) => {
  const target = await User.findById(req.params.id).select("+passwordPlain");
  if (!target) {
    return res.status(404).json({ success: false, error: "Không tìm thấy người dùng" });
  }

  const isSelf = target._id.toString() === req.user._id.toString();
  const actorIsAdmin = req.user.role === "admin";
  const canWrite = hasPermission(req.user, "users:write") || actorIsAdmin;

  if (!canWrite) {
    return res.status(403).json({ success: false, error: "Không có quyền sửa người dùng" });
  }

  const {
    role,
    permissions,
    isActive,
    displayName,
    password,
    resetCustomPermissions,
    email,
    walletAddress,
  } = req.body;

  if (email !== undefined) {
    const nextEmail = String(email || "")
      .trim()
      .toLowerCase();
    if (!nextEmail || !nextEmail.includes("@")) {
      return res.status(400).json({ success: false, error: "Email không hợp lệ" });
    }
    if (nextEmail !== target.email) {
      const clash = await User.findOne({ email: nextEmail, _id: { $ne: target._id } });
      if (clash) {
        return res.status(409).json({ success: false, error: "Email đã được sử dụng" });
      }
      target.email = nextEmail;
    }
  }

  if (walletAddress !== undefined) {
    const wallet = String(walletAddress || "")
      .trim()
      .toLowerCase();
    if (!wallet) {
      target.walletAddress = undefined;
    } else {
      const clash = await User.findOne({
        walletAddress: wallet,
        _id: { $ne: target._id },
      });
      if (clash) {
        return res.status(409).json({ success: false, error: "Ví đã gắn với tài khoản khác" });
      }
      target.walletAddress = wallet;
    }
  }

  if (role !== undefined) {
    if (!actorIsAdmin) {
      return res.status(403).json({ success: false, error: "Chỉ admin mới đổi vai trò / phân quyền" });
    }
    if (!VALID_ROLES.includes(role)) {
      return res.status(400).json({ success: false, error: "Vai trò không hợp lệ" });
    }
    if (isSelf && role !== "admin") {
      return res.status(400).json({ success: false, error: "Không thể tự hạ quyền admin của chính mình" });
    }
    target.role = role;
  }

  if (resetCustomPermissions === true) {
    if (!actorIsAdmin) {
      return res.status(403).json({ success: false, error: "Chỉ admin mới sửa permission" });
    }
    target.permissions = [];
  } else if (permissions !== undefined) {
    if (!actorIsAdmin) {
      return res.status(403).json({ success: false, error: "Chỉ admin mới sửa permission" });
    }
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
    target.passwordPlain = String(password);
  }

  await target.save();
  const refreshed = await User.findById(target._id).select("+passwordPlain");
  res.json({
    success: true,
    data: {
      user: adminUserDto(refreshed, { revealPassword: true }),
      effectivePermissions: resolvePermissions(refreshed.role, refreshed.permissions),
    },
  });
});

export const deleteUser = asyncHandler(async (req, res) => {
  if (req.user.role !== "admin") {
    return res.status(403).json({ success: false, error: "Chỉ admin mới xóa / khóa người dùng" });
  }

  const target = await User.findById(req.params.id).select("+passwordPlain");
  if (!target) {
    return res.status(404).json({ success: false, error: "Không tìm thấy người dùng" });
  }
  if (target._id.toString() === req.user._id.toString()) {
    return res.status(400).json({ success: false, error: "Không thể xóa chính mình" });
  }

  const hard = String(req.query.hard || req.body?.hard || "") === "true";
  if (hard) {
    await User.deleteOne({ _id: target._id });
    return res.json({
      success: true,
      data: {
        deleted: true,
        hard: true,
        user: { id: target._id.toString(), email: target.email },
      },
    });
  }

  // Soft-delete: khóa tài khoản
  target.isActive = false;
  await target.save();

  res.json({
    success: true,
    data: { deleted: false, hard: false, user: adminUserDto(target, { revealPassword: true }) },
  });
});
