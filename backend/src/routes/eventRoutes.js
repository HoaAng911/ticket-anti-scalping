import { Router } from "express";
import {
  listEvents,
  getEvent,
  createEvent,
  updateEvent,
} from "../controllers/eventController.js";
import { authRequired, requireRole } from "../middlewares/authMiddleware.js";

const router = Router();

router.get("/", listEvents);
router.get("/:id", getEvent);
router.post("/", authRequired, requireRole("organizer", "admin"), createEvent);
router.put("/:id", authRequired, requireRole("organizer", "admin"), updateEvent);

export default router;
