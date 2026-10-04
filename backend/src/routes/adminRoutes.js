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
  getUser,
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
import {
  getProgramCatalog,
  listEventPrograms,
  getEventProgram,
  replaceEventProgram,
  createProgramItem,
  updateProgramItem,
  deleteProgramItem,
} from "../controllers/programController.js";
import {
  generateEventSeating,
  getAdminEventSeating,
  manageEventSeats,
} from "../controllers/seatController.js";
import {
  listEventPayoutStatuses,
  getEventPayoutStatus,
  settleEventPayoutAdmin,
  updateEventPayoutAdmin,
  deleteEventPayoutAdmin,
} from "../controllers/eventPayoutController.js";
import {
  listPaymentContractsAdmin,
  getPaymentContractAdmin,
  createPaymentContractAdmin,
  updatePaymentContractAdmin,
  deletePaymentContractAdmin,
  settlePaymentStageAdmin,
  patchPaymentStageAdmin,
  getPaymentContractCatalog,
  downloadPaymentContractPdfAdmin,
  regeneratePaymentContractPdfAdmin,
  seedPaymentContractsAdmin,
} from "../controllers/paymentContractController.js";
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

router.get("/programs/catalog", requirePermission("events:manage"), getProgramCatalog);
router.get("/programs", requirePermission("events:manage"), listEventPrograms);
router.get("/programs/:eventId", requirePermission("events:manage"), getEventProgram);
router.put("/programs/:eventId", requirePermission("events:manage"), replaceEventProgram);
router.post("/programs/:eventId/items", requirePermission("events:manage"), createProgramItem);
router.put(
  "/programs/:eventId/items/:itemId",
  requirePermission("events:manage"),
  updateProgramItem
);
router.delete(
  "/programs/:eventId/items/:itemId",
  requirePermission("events:manage"),
  deleteProgramItem
);

router.post(
  "/events/:eventId/seating/generate",
  requirePermission("events:manage"),
  generateEventSeating
);
router.get(
  "/events/:eventId/seating",
  requirePermission("events:manage"),
  getAdminEventSeating
);
router.patch(
  "/events/:eventId/seating/seats",
  requirePermission("events:manage"),
  manageEventSeats
);

router.get("/event-payouts", requirePermission("events:manage"), listEventPayoutStatuses);
router.get(
  "/events/:eventId/payout",
  requirePermission("events:manage"),
  getEventPayoutStatus
);
router.patch(
  "/events/:eventId/payout",
  requirePermission("events:manage"),
  updateEventPayoutAdmin
);
router.put(
  "/events/:eventId/payout",
  requirePermission("events:manage"),
  updateEventPayoutAdmin
);
router.delete(
  "/events/:eventId/payout",
  requirePermission("events:manage"),
  deleteEventPayoutAdmin
);
router.post(
  "/events/:eventId/settle-payout",
  requirePermission("events:manage"),
  settleEventPayoutAdmin
);

router.get(
  "/payment-contracts/catalog",
  requirePermission("events:manage"),
  getPaymentContractCatalog
);
router.get(
  "/payment-contracts",
  requirePermission("events:manage"),
  listPaymentContractsAdmin
);
router.post(
  "/payment-contracts",
  requirePermission("events:manage"),
  createPaymentContractAdmin
);
router.post(
  "/payment-contracts/seed",
  requirePermission("events:manage"),
  seedPaymentContractsAdmin
);
router.get(
  "/payment-contracts/:id",
  requirePermission("events:manage"),
  getPaymentContractAdmin
);
router.patch(
  "/payment-contracts/:id",
  requirePermission("events:manage"),
  updatePaymentContractAdmin
);
router.put(
  "/payment-contracts/:id",
  requirePermission("events:manage"),
  updatePaymentContractAdmin
);
router.delete(
  "/payment-contracts/:id",
  requirePermission("events:manage"),
  deletePaymentContractAdmin
);
router.get(
  "/payment-contracts/:id/pdf",
  requirePermission("events:manage"),
  downloadPaymentContractPdfAdmin
);
router.post(
  "/payment-contracts/:id/pdf",
  requirePermission("events:manage"),
  regeneratePaymentContractPdfAdmin
);
router.post(
  "/payment-contracts/:id/stages/:stageId/settle",
  requirePermission("events:manage"),
  settlePaymentStageAdmin
);
router.patch(
  "/payment-contracts/:id/stages/:stageId",
  requirePermission("events:manage"),
  patchPaymentStageAdmin
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
router.get("/users/:id", requirePermission("users:read", "roles:manage"), getUser);
router.post("/users", requirePermission("users:write"), createUser);
router.patch("/users/:id", requirePermission("roles:manage", "users:write"), updateUser);
router.delete("/users/:id", requirePermission("users:write"), deleteUser);

export default router;
