"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.NotificationModel = void 0;
const mongoose_1 = require("mongoose");
const NotificationSchema = new mongoose_1.Schema({
    recipientId: { type: mongoose_1.Schema.Types.ObjectId, required: true },
    recipientRole: { type: String, enum: ["citizen", "admin"], required: true },
    type: {
        type: String,
        enum: ["status_update", "comment", "upvote"],
        required: true,
    },
    message: { type: String, required: true },
    issueId: { type: mongoose_1.Schema.Types.ObjectId, ref: "Issue" },
    read: { type: Boolean, default: false },
}, { timestamps: true });
NotificationSchema.index({ recipientId: 1, read: 1, createdAt: -1 });
exports.NotificationModel = (0, mongoose_1.model)("Notification", NotificationSchema);
