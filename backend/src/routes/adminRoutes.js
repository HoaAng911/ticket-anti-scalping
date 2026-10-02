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
  syncEventsToChain,
} from "../controllers/adminController.js";
import {
  listUsers,
  createUser,
  updateUser,
  deleteUser,
  listRolesCatalog,
} from "../controllers/userAdminController.js";
import { adminListInvoices, adminVoidInvoice } from "../controllers/invoiceController.js";
import {
  getLicenseCatalog,
  listEventLicenses,
  getEventLicense,
  upsertEventLicense,
  patchEventLicenseStatus,
  downloadAdminLicensePdf,
  uploadLicenseDocument,
  deleteLicenseDocument,
  downloadAdminLicenseDocument,
} from "../controllers/licenseController.js";
import {
  getOrganizerProfileCatalog,
  listOrganizerProfiles,
  listAllOrganizerMembers,
  getOrganizerProfile,
  createOrganizerProfile,
  updateOrganizerProfile,
  patchOrganizerProfileStatus,
  deleteOrganizerProfile,
  createOrganizerMember,
  updateOrganizerMember,
  deleteOrganizerMember,
} from "../controllers/organizerProfileController.js";
import { authRequired, requireRole, requirePermission } from "../middlewares/authMiddleware.js";
import { licenseUpload } from "../middlewares/licenseUpload.js";

const router = Router();

router.use(authRequired, requireRole("organizer", "admin"));

router.get("/dashboard", requirePermission("dashboard:view"), getDashboard);
router.get("/tickets", requirePermission("dashboard:view"), listAllTickets);
router.get("/transactions", requirePermission("dashboard:view"), listAllTransactions);
router.get("/lab-wallets", requirePermission("wallets:fund"), listLabWallets);
router.get("/invoices", requirePermission("dashboard:view"), adminListInvoices);
router.patch("/invoices/:id/void", requirePermission("dashboard:view"), adminVoidInvoice);

router.get("/licenses/catalog", requirePermission("events:manage"), getLicenseCatalog);
router.get("/licenses", requirePermission("events:manage"), listEventLicenses);
router.get("/licenses/:eventId/pdf", requirePermission("events:manage"), downloadAdminLicensePdf);
router.get(
  "/licenses/:eventId/document",
  requirePermission("events:manage"),
  downloadAdminLicenseDocument
);
router.post(
  "/licenses/:eventId/upload",
  requirePermission("events:manage"),
  licenseUpload.single("file"),
  uploadLicenseDocument
);
router.delete(
  "/licenses/:eventId/document",
  requirePermission("events:manage"),
  deleteLicenseDocument
);
router.get("/licenses/:eventId", requirePermission("events:manage"), getEventLicense);
router.put("/licenses/:eventId", requirePermission("events:manage"), upsertEventLicense);
router.patch(
  "/licenses/:eventId/status",
  requirePermission("events:manage"),
  patchEventLicenseStatus
);

router.get(
  "/organizer-profiles/catalog",
  requirePermission("events:manage"),
  getOrganizerProfileCatalog
);
router.get(
  "/organizer-profiles/members",
  requirePermission("events:manage"),
  listAllOrganizerMembers
);
router.get("/organizer-profiles", requirePermission("events:manage"), listOrganizerProfiles);
router.get("/organizer-profiles/:id", requirePermission("events:manage"), getOrganizerProfile);
router.post("/organizer-profiles", requirePermission("events:manage"), createOrganizerProfile);
router.put("/organizer-profiles/:id", requirePermission("events:manage"), updateOrganizerProfile);
router.patch(
  "/organizer-profiles/:id/status",
  requirePermission("events:manage"),
  patchOrganizerProfileStatus
);
router.delete(
  "/organizer-profiles/:id",
  requirePermission("events:manage"),
  deleteOrganizerProfile
);
router.post(
  "/organizer-profiles/:id/members",
  requirePermission("events:manage"),
  createOrganizerMember
);
router.put(
  "/organizer-profiles/:id/members/:memberId",
  requirePermission("events:manage"),
  updateOrganizerMember
);
router.delete(
  "/organizer-profiles/:id/members/:memberId",
  requirePermission("events:manage"),
  deleteOrganizerMember
);

router.post("/fund", requirePermission("wallets:fund"), fundWallets);
router.post("/create-wallets", requirePermission("wallets:fund"), createAndFundWallets);
router.post("/create-ticket-type", requirePermission("events:manage"), createTicketType);
router.post(
  "/events/:id/ticket-types",
  requirePermission("events:manage"),
  addTicketTypesToEvent
);
router.post("/mint-tickets", requirePermission("tickets:mint"), mintTicketsToWallets);
router.post("/sync-events-to-chain", requirePermission("events:manage"), syncEventsToChain);

router.get("/roles", requirePermission("users:read", "roles:manage"), listRolesCatalog);
router.get("/users", requirePermission("users:read", "roles:manage"), listUsers);
router.post("/users", requirePermission("users:write"), createUser);
router.patch("/users/:id", requirePermission("roles:manage", "users:write"), updateUser);
router.delete("/users/:id", requirePermission("users:write"), deleteUser);

export default router;
