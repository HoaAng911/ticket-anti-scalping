import { Router } from "express";
import {
  createInvoice,
  listMyInvoices,
  listByWallet,
  getByTokenId,
  getInvoice,
  downloadInvoicePdf,
} from "../controllers/invoiceController.js";
import { authRequired, authOptional } from "../middlewares/authMiddleware.js";

const router = Router();

router.post("/", authOptional, createInvoice);
router.get("/mine", authRequired, listMyInvoices);
router.get("/by-wallet/:wallet", listByWallet);
router.get("/by-token/:tokenId", getByTokenId);
router.get("/:id/pdf", authOptional, downloadInvoicePdf);
router.get("/:id", authOptional, getInvoice);

export default router;
