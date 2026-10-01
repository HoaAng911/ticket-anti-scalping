import { Router } from "express";
import { register, login, linkWallet, me } from "../controllers/authController.js";
import { authRequired } from "../middlewares/authMiddleware.js";
import { authLimiter } from "../middlewares/rateLimiter.js";

const router = Router();

router.post("/register", authLimiter, register);
router.post("/login", authLimiter, login);
router.post("/link-wallet", authRequired, linkWallet);
router.get("/me", authRequired, me);

export default router;
