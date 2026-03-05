import { Request, Response } from "express";
import { IssueModel } from "../models/issue.model";
import { CitizenModel } from "../models/citizen.model";

/** GET /api/v1/stats (Public) */
export const getPublicStats = async (_req: Request, res: Response): Promise<void> => {
    try {
        const [total, byStatus] = await Promise.all([
            IssueModel.countDocuments(),
            IssueModel.aggregate([
                { $group: { _id: "$status", count: { $sum: 1 } } },
                { $project: { status: "$_id", count: 1, _id: 0 } },
            ]),
        ]);

        const resolvedCount = byStatus.find((s: any) => s.status === "Resolved")?.count || 0;
        const resolvedPercentage = total > 0 ? Math.round((resolvedCount / total) * 100) : 0;

        res.json({ total, resolvedCount, resolvedPercentage, byStatus });
    } catch (error) {
        console.error("Error fetching public stats:", error);
        res.status(500).json({ message: "Internal Server Error" });
    }
};

/** GET /api/v1/admin/analytics */
export const getAnalytics = async (_req: Request, res: Response): Promise<void> => {
    try {
        const [total, byStatus, byCategory, monthly] = await Promise.all([
            IssueModel.countDocuments(),

            // Status distribution
            IssueModel.aggregate([
                { $group: { _id: "$status", count: { $sum: 1 } } },
                { $project: { status: "$_id", count: 1, _id: 0 } },
            ]),

            // Category distribution
            IssueModel.aggregate([
                { $group: { _id: "$issueType", count: { $sum: 1 } } },
                { $project: { category: "$_id", count: 1, _id: 0 } },
                { $sort: { count: -1 } },
            ]),

            // Monthly trends (last 6 months)
            IssueModel.aggregate([
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

        const resolvedCount = byStatus.find((s: any) => s.status === "Resolved")?.count || 0;
        const resolvedPercentage = total > 0 ? Math.round((resolvedCount / total) * 100) : 0;

        res.json({
            total,
            resolvedCount,
            resolvedPercentage,
            byStatus,
            byCategory,
            monthly,
        });
    } catch (error) {
        console.error("Error fetching analytics:", error);
        res.status(500).json({ message: "Internal Server Error" });
    }
};

/** GET /api/v1/admin/export-csv  – export all issues as CSV */
export const exportCsv = async (_req: Request, res: Response): Promise<void> => {
    try {
        const issues = await IssueModel.find({})
            .populate("citizenId", "fullName email")
            .lean();

        const headers = [
            "ID", "Title", "Description", "Category", "Status",
            "Address", "Latitude", "Longitude", "Reporter", "Email", "Upvotes", "Created At",
        ];

        const rows = issues.map((i: any) => [
            i._id.toString(),
            `"${(i.title || "").replace(/"/g, '""')}"`,
            `"${(i.description || "").replace(/"/g, '""')}"`,
            i.issueType || "",
            i.status || "",
            `"${(i.location?.address || "").replace(/"/g, '""')}"`,
            i.location?.latitude ?? "",
            i.location?.longitude ?? "",
            `"${(i.citizenId?.fullName || "Anonymous").replace(/"/g, '""')}"`,
            i.citizenId?.email || "",
            (i.upvotes || []).length,
            new Date(i.createdAt).toISOString(),
        ]);

        const csv = [headers.join(","), ...rows.map((r: (string | number)[]) => r.join(","))].join("\n");

        res.setHeader("Content-Type", "text/csv");
        res.setHeader("Content-Disposition", `attachment; filename=civicwatch_complaints_${Date.now()}.csv`);
        res.send(csv);
    } catch (error) {
        console.error("Error exporting CSV:", error);
        res.status(500).json({ message: "Internal Server Error" });
    }
};
/** GET /api/v1/leaderboard */
export const getLeaderboard = async (_req: Request, res: Response): Promise<void> => {
    try {
        // Top 10 citizens by reputation
        const topCitizens = await CitizenModel.find({})
            .select("fullName reputationPoints")
            .sort({ reputationPoints: -1 })
            .limit(10)
            .lean();

        // For each top citizen, count issues by type to assign badges
        const leaderboard = await Promise.all(
            topCitizens.map(async (citizen, index) => {
                const issueCounts = await IssueModel.aggregate([
                    { $match: { citizenId: citizen._id } },
                    { $group: { _id: "$issueType", count: { $sum: 1 } } },
                ]);

                const badges: string[] = [];
                const totalIssues = issueCounts.reduce((sum: number, g: any) => sum + g.count, 0);

                for (const g of issueCounts) {
                    if (g._id === "Roads" && g.count >= 3) badges.push("🛣️ Road Warrior");
                    if (g._id === "Garbage" && g.count >= 3) badges.push("🌿 Eco Guardian");
                    if (g._id === "Electricity" && g.count >= 3) badges.push("⚡ Power Sentinel");
                    if (g._id === "Water" && g.count >= 3) badges.push("💧 Water Watcher");
                    if (g._id === "Public Safety" && g.count >= 3) badges.push("🛡️ Safety Guardian");
                }
                if (totalIssues >= 10) badges.push("🏆 Community Champion");
                if (totalIssues >= 5 && badges.length === 0) badges.push("⭐ Active Citizen");
                if (index === 0) badges.push("👑 Top Reporter");

                return {
                    rank: index + 1,
                    _id: citizen._id,
                    fullName: citizen.fullName,
                    reputationPoints: citizen.reputationPoints,
                    totalIssues,
                    badges,
                };
            })
        );

        res.json({ leaderboard });
    } catch (error) {
        console.error("Error fetching leaderboard:", error);
        res.status(500).json({ message: "Internal Server Error" });
    }
};
