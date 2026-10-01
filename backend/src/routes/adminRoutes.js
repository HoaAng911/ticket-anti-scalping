import { Router } from "express";
import {
  getDashboard,
  listAllTickets,
  listAllTransactions,
  listLabWallets,
  fundWallets,
  createAndFundWallets,
  createTicketType,
  addTicketTypesToEvent,
  mintTicketsToWallets,
} from "../controllers/adminController.js";
import {
  listUsers,
  createUser,
  updateUser,
  deleteUser,
  listRolesCatalog,
} from "../controllers/userAdminController.js";
import { authRequired, requireRole, requirePermission } from "../middlewares/authMiddleware.js";

const router = Router();

router.use(authRequired, requireRole("organizer", "admin"));

router.get("/dashboard", requirePermission("dashboard:view"), getDashboard);
router.get("/tickets", requirePermission("dashboard:view"), listAllTickets);
router.get("/transactions", requirePermission("dashboard:view"), listAllTransactions);
router.get("/lab-wallets", requirePermission("wallets:fund"), listLabWallets);

router.post("/fund", requirePermission("wallets:fund"), fundWallets);
router.post("/create-wallets", requirePermission("wallets:fund"), createAndFundWallets);
router.post("/create-ticket-type", requirePermission("events:manage"), createTicketType);
router.post(
  "/events/:id/ticket-types",
  requirePermission("events:manage"),
  addTicketTypesToEvent
);
router.post("/mint-tickets", requirePermission("tickets:mint"), mintTicketsToWallets);

router.get("/roles", requirePermission("users:read", "roles:manage"), listRolesCatalog);
router.get("/users", requirePermission("users:read", "roles:manage"), listUsers);
router.post("/users", requirePermission("users:write"), createUser);
router.patch("/users/:id", requirePermission("roles:manage", "users:write"), updateUser);
router.delete("/users/:id", requirePermission("users:write"), deleteUser);

export default router;
