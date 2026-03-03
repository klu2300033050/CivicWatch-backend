import { Router } from "express";
import { authMiddleware } from "../middlerware/auth.middleware";
import { addComment, getComments, deleteComment } from "../controllers/comment.controller";

const router = Router();

router.get("/issues/:id/comments", authMiddleware, getComments);
router.post("/issues/:id/comments", authMiddleware, addComment);
router.delete("/issues/:issueId/comments/:commentId", authMiddleware, deleteComment);

export default router;
