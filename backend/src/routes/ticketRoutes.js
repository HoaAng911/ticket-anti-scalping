import { Router } from "express";
import {
  myTickets,
  getTicket,
  remaining,
  getChain,
  ledgerStatus,
  ticketHistory,
  getTicketPass,
  getTicketPassPdf,
  verifyTicketEntry,
  checkInTicketEntry,
} from "../controllers/ticketController.js";

const router = Router();

router.get("/my", myTickets);
router.get("/chain", getChain);
router.get("/ledger-status", ledgerStatus);
router.get("/remaining/:eventChainId", remaining);
router.post("/verify-entry", verifyTicketEntry);
router.post("/check-in", checkInTicketEntry);
router.get("/:tokenId/history", ticketHistory);
router.get("/:tokenId/pass", getTicketPass);
router.get("/:tokenId/pass.pdf", getTicketPassPdf);
router.get("/:tokenId", getTicket);

export default router;
