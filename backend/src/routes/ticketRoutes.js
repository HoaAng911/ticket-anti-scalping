import { Router } from "express";
import { myTickets, getTicket, remaining, getChain } from "../controllers/ticketController.js";

const router = Router();

router.get("/my", myTickets);
router.get("/chain", getChain);
router.get("/remaining/:eventChainId", remaining);
router.get("/:tokenId", getTicket);

export default router;
