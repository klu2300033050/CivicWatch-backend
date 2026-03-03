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
Object.defineProperty(exports, "__esModule", { value: true });
exports.getIssues = exports.createIssue = void 0;
const issue_model_1 = require("../models/issue.model");
const multimedia_model_1 = require("../models/multimedia.model");
const citizen_model_1 = require("../models/citizen.model");
// Calculate distance in KM between two points
function getDistanceFromLatLonInKm(lat1, lon1, lat2, lon2) {
    const R = 6371; // Radius of the earth in km
    const dLat = (lat2 - lat1) * (Math.PI / 180);
    const dLon = (lon2 - lon1) * (Math.PI / 180);
    const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
        Math.cos(lat1 * (Math.PI / 180)) * Math.cos(lat2 * (Math.PI / 180)) *
            Math.sin(dLon / 2) * Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
}
const createIssue = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const files = req.files || [];
        const { title = "Untitled", description, location, issueType, isAnonymous } = req.body;
        // location stuff
        let parsedLocation = location;
        if (typeof location === "string") {
            try {
                parsedLocation = JSON.parse(location);
            }
            catch (_a) {
                res.status(400).json({ message: "Invalid location JSON format" });
                return;
            }
        }
        if (!title ||
            !description ||
            !parsedLocation ||
            !parsedLocation.latitude ||
            !parsedLocation.longitude ||
            !issueType) {
            res.status(400).json({ message: "Please fill all the required fields " });
            return;
        }
        const existingIssue = yield issue_model_1.IssueModel.findOne({ title });
        if (existingIssue) {
            res
                .status(400)
                .json({ message: " Issue with this title already exists" });
            return;
        }
        // Duplicate complaint detection: same type within 500 Meters reported recently
        const recentSimilarIssues = yield issue_model_1.IssueModel.find({ issueType });
        for (const recent of recentSimilarIssues) {
            const dist = getDistanceFromLatLonInKm(parsedLocation.latitude, parsedLocation.longitude, recent.location.latitude, recent.location.longitude);
            // 0.5km = 500 meters
            if (dist < 0.5 && !["Resolved", "Rejected"].includes(recent.status)) {
                res.status(409).json({ message: "A similar issue was already reported nearby." });
                return;
            }
        }
        const citizenId = req.citizenId;
        const issue = yield issue_model_1.IssueModel.create({
            citizenId, // Fix: match authMiddleware
            issueType,
            title,
            description,
            location: parsedLocation,
            status: "Reported",
            isAnonymous: isAnonymous === true || isAnonymous === "true",
        });
        // Reward the user with 10 reputation points for contributing
        if (citizenId) {
            yield citizen_model_1.CitizenModel.findByIdAndUpdate(citizenId, { $inc: { reputationPoints: 10 } }).catch(console.error);
        }
        const mediaDocs = yield Promise.all(files.map((file) => {
            const base64Data = file.buffer.toString("base64");
            const dataUrl = `data:${file.mimetype};base64,${base64Data}`;
            return multimedia_model_1.MultimediaModel.create({
                issueID: issue._id,
                fileType: file.mimetype.startsWith("video") ? "video" : "image",
                url: dataUrl,
                filename: file.originalname,
            });
        }));
        // Link the first media to the issue for convenience
        if (mediaDocs.length > 0) {
            issue.media = mediaDocs[0]._id;
            yield issue.save();
        }
        res.status(200).json({ message: "Issue created", issue, media: mediaDocs });
    }
    catch (error) {
        console.error("Error creating issue:", error);
        res.status(500).json({ message: "Internal server error" });
    }
});
exports.createIssue = createIssue;
const getIssues = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const page = parseInt(req.query.page) || 1;
        const limit = parseInt(req.query.limit) || 50;
        const skip = (page - 1) * limit;
        const [total, issues] = yield Promise.all([
            issue_model_1.IssueModel.countDocuments(),
            issue_model_1.IssueModel.find({})
                .populate("citizenId", "fullName")
                .populate("media")
                .sort({ createdAt: -1 })
                .skip(skip)
                .limit(limit)
                .lean(),
        ]);
        const issuesWithMedia = issues.map((issue) => {
            var _a, _b;
            return ({
                _id: issue._id,
                title: issue.title,
                description: issue.description,
                type: issue.issueType,
                issueType: issue.issueType,
                location: issue.location,
                reportedBy: ((_a = issue.citizenId) === null || _a === void 0 ? void 0 : _a.fullName) || "Anonymous",
                reportedAt: issue.createdAt,
                image: ((_b = issue.media) === null || _b === void 0 ? void 0 : _b.url) || null,
                status: issue.status,
                upvotes: issue.upvotes || [],
                isAnonymous: issue.isAnonymous,
            });
        });
        res.json({ issues: issuesWithMedia, total, page, pages: Math.ceil(total / limit) });
    }
    catch (err) {
        console.error("Error fetching issues:", err);
        res.status(500).json({ message: "Something went wrong" });
    }
});
exports.getIssues = getIssues;
