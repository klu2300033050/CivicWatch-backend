import { model, Schema, Document, Types } from "mongoose";

export interface INotification {
    recipientId: Types.ObjectId;
    recipientRole: "citizen" | "admin";
    type: "status_update" | "comment" | "upvote";
    message: string;
    issueId?: Types.ObjectId;
    read: boolean;
    createdAt?: Date;
}

export interface NotificationDocument extends INotification, Document { }

const NotificationSchema = new Schema<NotificationDocument>(
    {
        recipientId: { type: Schema.Types.ObjectId, required: true },
        recipientRole: { type: String, enum: ["citizen", "admin"], required: true },
        type: {
            type: String,
            enum: ["status_update", "comment", "upvote"],
            required: true,
        },
        message: { type: String, required: true },
        issueId: { type: Schema.Types.ObjectId, ref: "Issue" },
        read: { type: Boolean, default: false },
    },
    { timestamps: true }
);

NotificationSchema.index({ recipientId: 1, read: 1, createdAt: -1 });

export const NotificationModel = model<NotificationDocument>(
    "Notification",
    NotificationSchema
);
