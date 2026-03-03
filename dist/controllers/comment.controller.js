"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.deleteComment = exports.getComments = exports.addComment = void 0;
const comment_model_1 = require("../models/comment.model");
const issue_model_1 = require("../models/issue.model");
const notification_model_1 = require("../models/notification.model");
const socket_1 = require("../socket");
/** POST /api/v1/issues/:id/comments */
const addComment = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { id } = req.params;
        const { text, parentId } = req.body;
        if (!text || text.trim().length === 0) {
            res.status(400).json({ message: "Comment text is required" });
            return;
        }
        const issue = yield issue_model_1.IssueModel.findById(id);
        if (!issue) {
            res.status(404).json({ message: "Issue not found" });
            return;
        }
        const authorId = req.role === "admin" ? req.adminId : req.citizenId;
        const authorRole = req.role;
        // Get author name from DB
        let authorName = "Unknown";
        if (req.role === "citizen") {
            const { CitizenModel } = yield Promise.resolve().then(() => __importStar(require("../models/citizen.model")));
            const citizen = yield CitizenModel.findById(authorId).select("fullName").lean();
            authorName = (citizen === null || citizen === void 0 ? void 0 : citizen.fullName) || "Anonymous";
        }
        else {
            const { AdminModel } = yield Promise.resolve().then(() => __importStar(require("../models/admin.model")));
            const admin = yield AdminModel.findById(authorId).select("fullName").lean();
            authorName = (admin === null || admin === void 0 ? void 0 : admin.fullName) || "Admin";
        }
        const comment = yield comment_model_1.CommentModel.create({
            issueId: id,
            authorId,
            authorRole,
            authorName,
            text: text.trim(),
            parentId: parentId || null,
        });
        // Notify issue reporter if commenter is someone else
        if (issue.citizenId.toString() !== authorId) {
            const notification = yield notification_model_1.NotificationModel.create({
                recipientId: issue.citizenId,
                recipientRole: "citizen",
                type: "comment",
                message: `${authorName} commented on your issue: "${issue.title}"`,
                issueId: issue._id,
            });
            // Emit socket event
            socket_1.io.to(`user_${issue.citizenId.toString()}`).emit("notification", notification);
        }
        res.status(201).json({ message: "Comment added", comment });
    }
    catch (error) {
        console.error("Error adding comment:", error);
        res.status(500).json({ message: "Internal Server Error" });
    }
});
exports.addComment = addComment;
/** GET /api/v1/issues/:id/comments */
const getComments = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { id } = req.params;
        const comments = yield comment_model_1.CommentModel.find({ issueId: id })
            .sort({ createdAt: 1 })
            .lean();
        res.json({ comments });
    }
    catch (error) {
        console.error("Error fetching comments:", error);
        res.status(500).json({ message: "Internal Server Error" });
    }
});
exports.getComments = getComments;
/** DELETE /api/v1/issues/:issueId/comments/:commentId */
const deleteComment = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { commentId } = req.params;
        const requesterId = req.role === "admin" ? req.adminId : req.citizenId;
        const comment = yield comment_model_1.CommentModel.findById(commentId);
        if (!comment) {
            res.status(404).json({ message: "Comment not found" });
            return;
        }
        // Only author or admin can delete
        if (req.role !== "admin" && comment.authorId.toString() !== requesterId) {
            res.status(403).json({ message: "Not authorized to delete this comment" });
            return;
        }
        yield comment.deleteOne();
        res.json({ message: "Comment deleted" });
    }
    catch (error) {
        console.error("Error deleting comment:", error);
        res.status(500).json({ message: "Internal Server Error" });
    }
});
exports.deleteComment = deleteComment;
