import { Request, Response } from "express";
import { CommentModel } from "../models/comment.model";
import { IssueModel } from "../models/issue.model";
import { NotificationModel } from "../models/notification.model";
import { io } from "../socket";

interface AuthRequest extends Request {
    citizenId?: string;
    adminId?: string;
    role?: "citizen" | "admin";
}

/** POST /api/v1/issues/:id/comments */
export const addComment = async (req: AuthRequest, res: Response): Promise<void> => {
    try {
        const { id } = req.params;
        const { text, parentId } = req.body;

        if (!text || text.trim().length === 0) {
            res.status(400).json({ message: "Comment text is required" });
            return;
        }

        const issue = await IssueModel.findById(id);
        if (!issue) {
            res.status(404).json({ message: "Issue not found" });
            return;
        }

        const authorId = req.role === "admin" ? req.adminId! : req.citizenId!;
        const authorRole = req.role!;

        // Get author name from DB
        let authorName = "Unknown";
        if (req.role === "citizen") {
            const { CitizenModel } = await import("../models/citizen.model");
            const citizen = await CitizenModel.findById(authorId).select("fullName").lean();
            authorName = citizen?.fullName || "Anonymous";
        } else {
            const { AdminModel } = await import("../models/admin.model");
            const admin = await AdminModel.findById(authorId).select("fullName").lean();
            authorName = admin?.fullName || "Admin";
        }

        const comment = await CommentModel.create({
            issueId: id,
            authorId,
            authorRole,
            authorName,
            text: text.trim(),
            parentId: parentId || null,
        });

        // Notify issue reporter if commenter is someone else
        if (issue.citizenId.toString() !== authorId) {
            const notification = await NotificationModel.create({
                recipientId: issue.citizenId,
                recipientRole: "citizen",
                type: "comment",
                message: `${authorName} commented on your issue: "${issue.title}"`,
                issueId: issue._id,
            });

            // Emit socket event
            io.to(`user_${issue.citizenId.toString()}`).emit("notification", notification);
        }

        res.status(201).json({ message: "Comment added", comment });
    } catch (error) {
        console.error("Error adding comment:", error);
        res.status(500).json({ message: "Internal Server Error" });
    }
};

/** GET /api/v1/issues/:id/comments */
export const getComments = async (req: Request, res: Response): Promise<void> => {
    try {
        const { id } = req.params;
        const comments = await CommentModel.find({ issueId: id })
            .sort({ createdAt: 1 })
            .lean();

        res.json({ comments });
    } catch (error) {
        console.error("Error fetching comments:", error);
        res.status(500).json({ message: "Internal Server Error" });
    }
};

/** DELETE /api/v1/issues/:issueId/comments/:commentId */
export const deleteComment = async (req: AuthRequest, res: Response): Promise<void> => {
    try {
        const { commentId } = req.params;
        const requesterId = req.role === "admin" ? req.adminId! : req.citizenId!;

        const comment = await CommentModel.findById(commentId);
        if (!comment) {
            res.status(404).json({ message: "Comment not found" });
            return;
        }

        // Only author or admin can delete
        if (req.role !== "admin" && comment.authorId.toString() !== requesterId) {
            res.status(403).json({ message: "Not authorized to delete this comment" });
            return;
        }

        await comment.deleteOne();
        res.json({ message: "Comment deleted" });
    } catch (error) {
        console.error("Error deleting comment:", error);
        res.status(500).json({ message: "Internal Server Error" });
    }
};
