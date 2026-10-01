import { Router } from "express";
import { getActiveListings, getHistory } from "../controllers/marketplaceController.js";

const router = Router();

router.get("/listings", getActiveListings);
router.get("/history/:tokenId", getHistory);

export default router;
