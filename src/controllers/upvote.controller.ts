import { Request, Response } from "express";
import { IssueModel } from "../models/issue.model";
import { NotificationModel } from "../models/notification.model";
import { io } from "../socket";
import mongoose from "mongoose";

interface AuthRequest extends Request {
    citizenId?: string;
    role?: "citizen" | "admin";
}

/** POST /api/v1/issues/:id/upvote */
export const upvoteIssue = async (req: AuthRequest, res: Response): Promise<void> => {
    try {
        const { id } = req.params;
        const citizenId = req.citizenId!;

        const issue = await IssueModel.findById(id);
        if (!issue) {
            res.status(404).json({ message: "Issue not found" });
            return;
        }

        const citizenObjId = new mongoose.Types.ObjectId(citizenId);
        const hasUpvoted = issue.upvotes.some((uid) => uid.equals(citizenObjId));

        if (hasUpvoted) {
            // Remove upvote
            issue.upvotes = issue.upvotes.filter((uid) => !uid.equals(citizenObjId));
            await issue.save();
            res.json({ message: "Upvote removed", upvotes: issue.upvotes.length, upvoted: false });
            return;
        }

        // Add upvote
        issue.upvotes.push(citizenObjId);
        await issue.save();

        // Notify reporter if someone else upvotes
        if (issue.citizenId.toString() !== citizenId) {
            const notification = await NotificationModel.create({
                recipientId: issue.citizenId,
                recipientRole: "citizen",
                type: "upvote",
                message: `Your issue "${issue.title}" received a new upvote! (${issue.upvotes.length} total)`,
                issueId: issue._id,
            });
            io.to(`user_${issue.citizenId.toString()}`).emit("notification", notification);
        }

        res.json({ message: "Upvoted", upvotes: issue.upvotes.length, upvoted: true });
    } catch (error) {
        console.error("Error upvoting:", error);
        res.status(500).json({ message: "Internal Server Error" });
    }
};

/** GET /api/v1/issues/trending – top 5 by upvotes */
export const getTrendingIssues = async (_req: Request, res: Response): Promise<void> => {
    try {
        const trending = await IssueModel.aggregate([
            { $match: { status: { $ne: "Rejected" } } },
            { $addFields: { upvoteCount: { $size: "$upvotes" } } },
            { $sort: { upvoteCount: -1 } },
            { $limit: 10 },
            {
                $lookup: {
                    from: "multimedias",
                    localField: "media",
                    foreignField: "_id",
                    as: "mediaDoc",
                },
            },
            {
                $project: {
                    title: 1, description: 1, issueType: 1, status: 1,
                    location: 1, upvoteCount: 1,
                    image: { $arrayElemAt: ["$mediaDoc.url", 0] },
                    createdAt: 1,
                },
            },
        ]);
        res.json({ trending });
    } catch (error) {
        console.error("Error fetching trending:", error);
        res.status(500).json({ message: "Internal Server Error" });
    }
};
