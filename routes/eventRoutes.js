import express from "express";
import { protect } from "../middleware/authMiddleware.js";
import { upload } from "../middleware/uploadMiddleware.js";
import { createEvent, getEvents } from "../controllers/eventController.js";
import { getEventById } from "../controllers/eventController.js";

const router = express.Router();


router.post("/", protect, upload.single("poster"), createEvent);


router.get("/", getEvents);

router.get("/:id", getEventById);

export default router;
