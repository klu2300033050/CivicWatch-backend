"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.IssueModel = exports.LocationModel = void 0;
const mongoose_1 = require("mongoose");
const locationSchema = new mongoose_1.Schema({
    latitude: { type: Number, required: true, min: -90, max: 90 },
    longitude: { type: Number, required: true, min: -180, max: 180 },
    address: String,
}, { _id: false });
const IssueSchema = new mongoose_1.Schema({
    citizenId: {
        type: mongoose_1.Schema.Types.ObjectId,
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
    media: { type: mongoose_1.Schema.Types.ObjectId, ref: "Multimedia" },
    handledBy: { type: mongoose_1.Schema.Types.ObjectId, ref: "Admin" },
    upvotes: [{ type: mongoose_1.Schema.Types.ObjectId, ref: "Citizen" }],
    isAnonymous: { type: Boolean, default: false },
}, { timestamps: true });
IssueSchema.index({ issueType: 1, status: 1 });
IssueSchema.index({ "location.latitude": 1, "location.longitude": 1 });
exports.LocationModel = (0, mongoose_1.model)("Location", locationSchema);
exports.IssueModel = (0, mongoose_1.model)("Issue", IssueSchema);
