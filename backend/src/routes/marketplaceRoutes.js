import { Router } from "express";
import { getActiveListings, getHistory, getMoneyFlow } from "../controllers/marketplaceController.js";

const router = Router();

router.get("/listings", getActiveListings);
router.get("/history/:tokenId", getHistory);
router.get("/money-flow", getMoneyFlow);

export default router;
