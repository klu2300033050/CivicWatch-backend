import { model, Schema, Document, Types } from "mongoose";

export interface IComment {
  issueId: Types.ObjectId;
  authorId: Types.ObjectId;
  authorRole: "citizen" | "admin";
  authorName: string;
  text: string;
  parentId?: Types.ObjectId | null;
  createdAt?: Date;
  updatedAt?: Date;
}

export interface CommentDocument extends IComment, Document {}

const CommentSchema = new Schema<CommentDocument>(
  {
    issueId: { type: Schema.Types.ObjectId, ref: "Issue", required: true },
    authorId: { type: Schema.Types.ObjectId, required: true },
    authorRole: { type: String, enum: ["citizen", "admin"], required: true },
    authorName: { type: String, required: true },
    text: { type: String, required: true, maxlength: 1000 },
    parentId: { type: Schema.Types.ObjectId, ref: "Comment", default: null },
  },
  { timestamps: true }
);

CommentSchema.index({ issueId: 1, createdAt: -1 });

export const CommentModel = model<CommentDocument>("Comment", CommentSchema);
