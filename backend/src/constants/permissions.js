/** Danh mục quyền và map mặc định theo vai trò */

export const PERMISSIONS = [
  { key: "dashboard:view", label: "Xem dashboard admin", group: "Admin" },
  { key: "events:manage", label: "Tạo / sửa sự kiện & loại vé", group: "Sự kiện" },
  { key: "tickets:mint", label: "Mint vé NFT (admin)", group: "Vé" },
  { key: "tickets:buy", label: "Mua vé sơ cấp", group: "Vé" },
  { key: "tickets:resale", label: "Đăng bán / mua resale", group: "Vé" },
  { key: "wallets:fund", label: "Cấp ETH / tạo ví lab", group: "Lab" },
  { key: "chain:view", label: "Xem chuỗi TicketBlock", group: "Lab" },
  { key: "users:read", label: "Xem danh sách người dùng", group: "Người dùng" },
  { key: "users:write", label: "Tạo / khóa tài khoản", group: "Người dùng" },
  { key: "roles:manage", label: "Đổi vai trò & quyền chi tiết", group: "Người dùng" },
  { key: "profile:edit", label: "Sửa hồ sơ / liên kết ví", group: "Tài khoản" },
];

export const ROLES = [
  {
    key: "user",
    label: "Người dùng",
    description: "Mua vé, resale, quản lý ví cá nhân",
  },
  {
    key: "organizer",
    label: "Organizer",
    description: "Quản lý sự kiện, mint, faucet lab (không đổi quyền hệ thống)",
  },
  {
    key: "admin",
    label: "Admin",
    description: "Toàn quyền, gồm quản lý người dùng và phân quyền",
  },
];

export const ROLE_PERMISSIONS = {
  user: ["tickets:buy", "tickets:resale", "profile:edit"],
  organizer: [
    "tickets:buy",
    "tickets:resale",
    "profile:edit",
    "dashboard:view",
    "events:manage",
    "tickets:mint",
    "wallets:fund",
    "chain:view",
    "users:read",
  ],
  admin: PERMISSIONS.map((p) => p.key),
};

export function resolvePermissions(role, customPermissions) {
  const base = ROLE_PERMISSIONS[role] || ROLE_PERMISSIONS.user;
  if (!Array.isArray(customPermissions) || customPermissions.length === 0) {
    return [...base];
  }
  // Quyền tùy chỉnh thay thế hoàn toàn (admin gán tay)
  const allowed = new Set(PERMISSIONS.map((p) => p.key));
  return customPermissions.filter((p) => allowed.has(p));
}

export function hasPermission(user, permission) {
  if (!user || user.isActive === false) return false;
  const perms = resolvePermissions(user.role, user.permissions);
  return perms.includes(permission);
}
