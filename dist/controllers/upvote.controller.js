"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.getTrendingIssues = exports.upvoteIssue = void 0;
const issue_model_1 = require("../models/issue.model");
const notification_model_1 = require("../models/notification.model");
const socket_1 = require("../socket");
const mongoose_1 = __importDefault(require("mongoose"));
/** POST /api/v1/issues/:id/upvote */
const upvoteIssue = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { id } = req.params;
        const citizenId = req.citizenId;
        const issue = yield issue_model_1.IssueModel.findById(id);
        if (!issue) {
            res.status(404).json({ message: "Issue not found" });
            return;
        }
        const citizenObjId = new mongoose_1.default.Types.ObjectId(citizenId);
        const hasUpvoted = issue.upvotes.some((uid) => uid.equals(citizenObjId));
        if (hasUpvoted) {
            // Remove upvote
            issue.upvotes = issue.upvotes.filter((uid) => !uid.equals(citizenObjId));
            yield issue.save();
            res.json({ message: "Upvote removed", upvotes: issue.upvotes.length, upvoted: false });
            return;
        }
        // Add upvote
        issue.upvotes.push(citizenObjId);
        yield issue.save();
        // Notify reporter if someone else upvotes
        if (issue.citizenId.toString() !== citizenId) {
            const notification = yield notification_model_1.NotificationModel.create({
                recipientId: issue.citizenId,
                recipientRole: "citizen",
                type: "upvote",
                message: `Your issue "${issue.title}" received a new upvote! (${issue.upvotes.length} total)`,
                issueId: issue._id,
            });
            socket_1.io.to(`user_${issue.citizenId.toString()}`).emit("notification", notification);
        }
        res.json({ message: "Upvoted", upvotes: issue.upvotes.length, upvoted: true });
    }
    catch (error) {
        console.error("Error upvoting:", error);
        res.status(500).json({ message: "Internal Server Error" });
    }
});
exports.upvoteIssue = upvoteIssue;
/** GET /api/v1/issues/trending – top 5 by upvotes */
const getTrendingIssues = (_req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const trending = yield issue_model_1.IssueModel.aggregate([
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
    }
    catch (error) {
        console.error("Error fetching trending:", error);
        res.status(500).json({ message: "Internal Server Error" });
    }
});
exports.getTrendingIssues = getTrendingIssues;
