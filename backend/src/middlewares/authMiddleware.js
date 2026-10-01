import jwt from "jsonwebtoken";
import User from "../models/User.js";
import { hasPermission } from "../constants/permissions.js";

export async function authRequired(req, res, next) {
  try {
    const header = req.headers.authorization || "";
    const token = header.startsWith("Bearer ") ? header.slice(7) : null;
    if (!token) {
      return res.status(401).json({ success: false, error: "Thiếu token xác thực" });
    }
    const payload = jwt.verify(token, process.env.JWT_SECRET);
    const user = await User.findById(payload.sub).select("-passwordHash");
    if (!user) {
      return res.status(401).json({ success: false, error: "Người dùng không tồn tại" });
    }
    if (user.isActive === false) {
      return res.status(403).json({ success: false, error: "Tài khoản đã bị khóa" });
    }
    req.user = user;
    next();
  } catch {
    return res.status(401).json({ success: false, error: "Token không hợp lệ hoặc hết hạn" });
  }
}

export function requireRole(...roles) {
  return (req, res, next) => {
    if (!req.user || !roles.includes(req.user.role)) {
      return res.status(403).json({ success: false, error: "Không đủ quyền" });
    }
    next();
  };
}

export function requirePermission(...perms) {
  return (req, res, next) => {
    const ok = perms.some((p) => hasPermission(req.user, p));
    if (!ok) {
      return res.status(403).json({ success: false, error: "Không đủ quyền thực hiện thao tác này" });
    }
    next();
  };
}
