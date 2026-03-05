import { Request, Response } from "express";
import { IssueModel } from "../models/issue.model";

interface AuthRequest extends Request {
    citizenId?: string;
}

/** POST /api/v1/issues/:id/feedback */
export const submitFeedback = async (req: AuthRequest, res: Response): Promise<void> => {
    try {
        const { id } = req.params;
        const { rating, comment } = req.body;
        const citizenId = req.citizenId!;

        if (!rating || typeof rating !== "number" || rating < 1 || rating > 5) {
            res.status(400).json({ message: "Rating must be a number between 1 and 5" });
            return;
        }

        const issue = await IssueModel.findById(id);
        if (!issue) {
            res.status(404).json({ message: "Issue not found" });
            return;
        }

        // Only the issue reporter can submit feedback
        if (issue.citizenId.toString() !== citizenId) {
            res.status(403).json({ message: "Only the issue reporter can submit feedback" });
            return;
        }

        // Only allow feedback on resolved issues
        if (issue.status !== "Resolved") {
            res.status(400).json({ message: "Feedback can only be submitted for resolved issues" });
            return;
        }

        // Don't allow re-submission
        if ((issue as any).feedback?.rating) {
            res.status(400).json({ message: "Feedback already submitted for this issue" });
            return;
        }

        (issue as any).feedback = {
            rating,
            comment: comment?.trim() || "",
            submittedAt: new Date(),
        };
        await issue.save();

        res.json({ message: "Feedback submitted successfully", feedback: (issue as any).feedback });
    } catch (error) {
        console.error("Error submitting feedback:", error);
        res.status(500).json({ message: "Internal Server Error" });
    }
};
