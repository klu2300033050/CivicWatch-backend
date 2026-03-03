"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.CommentModel = void 0;
const mongoose_1 = require("mongoose");
const CommentSchema = new mongoose_1.Schema({
    issueId: { type: mongoose_1.Schema.Types.ObjectId, ref: "Issue", required: true },
    authorId: { type: mongoose_1.Schema.Types.ObjectId, required: true },
    authorRole: { type: String, enum: ["citizen", "admin"], required: true },
    authorName: { type: String, required: true },
    text: { type: String, required: true, maxlength: 1000 },
    parentId: { type: mongoose_1.Schema.Types.ObjectId, ref: "Comment", default: null },
}, { timestamps: true });
CommentSchema.index({ issueId: 1, createdAt: -1 });
exports.CommentModel = (0, mongoose_1.model)("Comment", CommentSchema);
