import { Router } from "express";
import { authMiddleware } from "../middlerware/auth.middleware";
import { getNotifications, markRead, markAllRead } from "../controllers/notification.controller";

const router = Router();

router.get("/notifications", authMiddleware, getNotifications);
router.patch("/notifications/:id/read", authMiddleware, markRead);
router.patch("/notifications/read-all", authMiddleware, markAllRead);

export default router;
