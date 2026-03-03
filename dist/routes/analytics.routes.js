"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const auth_middleware_1 = require("../middlerware/auth.middleware");
const role_middleware_1 = require("../middlerware/role.middleware");
const analytics_controller_1 = require("../controllers/analytics.controller");
const router = (0, express_1.Router)();
// Public — no auth needed (used by hero section)
router.get("/stats", analytics_controller_1.getPublicStats);
// Admin only
router.get("/admin/analytics", auth_middleware_1.authMiddleware, role_middleware_1.adminOnly, analytics_controller_1.getAnalytics);
router.get("/admin/export-csv", auth_middleware_1.authMiddleware, role_middleware_1.adminOnly, analytics_controller_1.exportCsv);
exports.default = router;
