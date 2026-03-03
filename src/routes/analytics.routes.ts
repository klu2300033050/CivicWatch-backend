import { Router } from "express";
import { authMiddleware } from "../middlerware/auth.middleware";
import { adminOnly } from "../middlerware/role.middleware";
import { getAnalytics, exportCsv, getPublicStats } from "../controllers/analytics.controller";

const router = Router();

// Public — no auth needed (used by hero section)
router.get("/stats", getPublicStats);

// Admin only
router.get("/admin/analytics", authMiddleware, adminOnly, getAnalytics);
router.get("/admin/export-csv", authMiddleware, adminOnly, exportCsv);

export default router;
