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
exports.exportCsv = exports.getAnalytics = exports.getPublicStats = void 0;
const issue_model_1 = require("../models/issue.model");
/** GET /api/v1/stats (Public) */
const getPublicStats = (_req, res) => __awaiter(void 0, void 0, void 0, function* () {
    var _a;
    try {
        const [total, byStatus] = yield Promise.all([
            issue_model_1.IssueModel.countDocuments(),
            issue_model_1.IssueModel.aggregate([
                { $group: { _id: "$status", count: { $sum: 1 } } },
                { $project: { status: "$_id", count: 1, _id: 0 } },
            ]),
        ]);
        const resolvedCount = ((_a = byStatus.find((s) => s.status === "Resolved")) === null || _a === void 0 ? void 0 : _a.count) || 0;
        const resolvedPercentage = total > 0 ? Math.round((resolvedCount / total) * 100) : 0;
        res.json({ total, resolvedCount, resolvedPercentage, byStatus });
    }
    catch (error) {
        console.error("Error fetching public stats:", error);
        res.status(500).json({ message: "Internal Server Error" });
    }
});
exports.getPublicStats = getPublicStats;
/** GET /api/v1/admin/analytics */
const getAnalytics = (_req, res) => __awaiter(void 0, void 0, void 0, function* () {
    var _a;
    try {
        const [total, byStatus, byCategory, monthly] = yield Promise.all([
            issue_model_1.IssueModel.countDocuments(),
            // Status distribution
            issue_model_1.IssueModel.aggregate([
                { $group: { _id: "$status", count: { $sum: 1 } } },
                { $project: { status: "$_id", count: 1, _id: 0 } },
            ]),
            // Category distribution
            issue_model_1.IssueModel.aggregate([
                { $group: { _id: "$issueType", count: { $sum: 1 } } },
                { $project: { category: "$_id", count: 1, _id: 0 } },
                { $sort: { count: -1 } },
            ]),
            // Monthly trends (last 6 months)
            issue_model_1.IssueModel.aggregate([
                {
                    $match: {
                        createdAt: {
                            $gte: new Date(new Date().setMonth(new Date().getMonth() - 6)),
                        },
                    },
                },
                {
                    $group: {
                        _id: {
                            year: { $year: "$createdAt" },
                            month: { $month: "$createdAt" },
                        },
                        count: { $sum: 1 },
                        resolved: {
                            $sum: { $cond: [{ $eq: ["$status", "Resolved"] }, 1, 0] },
                        },
                    },
                },
                { $sort: { "_id.year": 1, "_id.month": 1 } },
                {
                    $project: {
                        _id: 0,
                        year: "$_id.year",
                        month: "$_id.month",
                        count: 1,
                        resolved: 1,
                    },
                },
            ]),
        ]);
        const resolvedCount = ((_a = byStatus.find((s) => s.status === "Resolved")) === null || _a === void 0 ? void 0 : _a.count) || 0;
        const resolvedPercentage = total > 0 ? Math.round((resolvedCount / total) * 100) : 0;
        res.json({
            total,
            resolvedCount,
            resolvedPercentage,
            byStatus,
            byCategory,
            monthly,
        });
    }
    catch (error) {
        console.error("Error fetching analytics:", error);
        res.status(500).json({ message: "Internal Server Error" });
    }
});
exports.getAnalytics = getAnalytics;
/** GET /api/v1/admin/export-csv  – export all issues as CSV */
const exportCsv = (_req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const issues = yield issue_model_1.IssueModel.find({})
            .populate("citizenId", "fullName email")
            .lean();
        const headers = [
            "ID", "Title", "Description", "Category", "Status",
            "Address", "Latitude", "Longitude", "Reporter", "Email", "Upvotes", "Created At",
        ];
        const rows = issues.map((i) => {
            var _a, _b, _c, _d, _e, _f, _g;
            return [
                i._id.toString(),
                `"${(i.title || "").replace(/"/g, '""')}"`,
                `"${(i.description || "").replace(/"/g, '""')}"`,
                i.issueType || "",
                i.status || "",
                `"${(((_a = i.location) === null || _a === void 0 ? void 0 : _a.address) || "").replace(/"/g, '""')}"`,
                (_c = (_b = i.location) === null || _b === void 0 ? void 0 : _b.latitude) !== null && _c !== void 0 ? _c : "",
                (_e = (_d = i.location) === null || _d === void 0 ? void 0 : _d.longitude) !== null && _e !== void 0 ? _e : "",
                `"${(((_f = i.citizenId) === null || _f === void 0 ? void 0 : _f.fullName) || "Anonymous").replace(/"/g, '""')}"`,
                ((_g = i.citizenId) === null || _g === void 0 ? void 0 : _g.email) || "",
                (i.upvotes || []).length,
                new Date(i.createdAt).toISOString(),
            ];
        });
        const csv = [headers.join(","), ...rows.map((r) => r.join(","))].join("\n");
        res.setHeader("Content-Type", "text/csv");
        res.setHeader("Content-Disposition", `attachment; filename=civicwatch_complaints_${Date.now()}.csv`);
        res.send(csv);
    }
    catch (error) {
        console.error("Error exporting CSV:", error);
        res.status(500).json({ message: "Internal Server Error" });
    }
});
exports.exportCsv = exportCsv;
