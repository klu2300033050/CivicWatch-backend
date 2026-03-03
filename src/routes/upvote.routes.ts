import { Router } from "express";
import { authMiddleware } from "../middlerware/auth.middleware";
import { citizenOnly } from "../middlerware/role.middleware";
import { upvoteIssue, getTrendingIssues } from "../controllers/upvote.controller";

const router = Router();

router.get("/issues/trending", authMiddleware, getTrendingIssues);
router.post("/issues/:id/upvote", authMiddleware, citizenOnly, upvoteIssue);

export default router;
