import { model, Schema, Document, Types } from "mongoose";

export interface ILocation {
  latitude: number;
  longitude: number;
  address?: string;
}

export interface IIssue {
  citizenId: Types.ObjectId;
  issueType: string;
  title: string;
  description: string;
  status: string;
  location: ILocation;
  media?: Types.ObjectId;
  handledBy?: Types.ObjectId;
  upvotes: Types.ObjectId[];   // array of citizen IDs who upvoted
  isAnonymous: boolean;
}

const locationSchema = new Schema<ILocation>(
  {
    latitude: { type: Number, required: true, min: -90, max: 90 },
    longitude: { type: Number, required: true, min: -180, max: 180 },
    address: String,
  },
  { _id: false }
);

const IssueSchema = new Schema<IIssue & Document>(
  {
    citizenId: {
      type: Schema.Types.ObjectId,
      ref: "Citizen",
      required: true,
    },
    issueType: {
      type: String,
      enum: [
        "Roads",
        "Electricity",
        "Water",
        "Garbage",
        "Public Safety",
        "Road Infrastructure",
        "Waste Management",
        "Environmental Issues",
        "Utilities & Infrastructure",
        "Other",
      ],
      default: "Roads",
      required: true,
    },
    title: { type: String, required: true, maxlength: 100, minlength: 5 },
    description: { type: String, required: true },
    status: {
      type: String,
      enum: ["Reported", "Pending", "Assigned", "In Progress", "Resolved", "Rejected"],
      default: "Reported",
    },
    location: { type: locationSchema, required: true },
    media: { type: Schema.Types.ObjectId, ref: "Multimedia" },
    handledBy: { type: Schema.Types.ObjectId, ref: "Admin" },
    upvotes: [{ type: Schema.Types.ObjectId, ref: "Citizen" }],
    isAnonymous: { type: Boolean, default: false },
  },
  { timestamps: true }
);

IssueSchema.index({ issueType: 1, status: 1 });
IssueSchema.index({ "location.latitude": 1, "location.longitude": 1 });

export const LocationModel = model("Location", locationSchema);

export interface IssueDocument extends IIssue, Document { }
export const IssueModel = model<IssueDocument>("Issue", IssueSchema);
