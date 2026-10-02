import { Router } from "express";
import {
  myTickets,
  getTicket,
  remaining,
  getChain,
  ledgerStatus,
  ticketHistory,
} from "../controllers/ticketController.js";

const router = Router();

router.get("/my", myTickets);
router.get("/chain", getChain);
router.get("/ledger-status", ledgerStatus);
router.get("/remaining/:eventChainId", remaining);
router.get("/:tokenId/history", ticketHistory);
router.get("/:tokenId", getTicket);

export default router;
