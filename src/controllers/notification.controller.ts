import { Request, Response } from "express";
import { NotificationModel } from "../models/notification.model";

interface AuthRequest extends Request {
    citizenId?: string;
    adminId?: string;
    role?: "citizen" | "admin";
}

/** GET /api/v1/notifications */
export const getNotifications = async (req: AuthRequest, res: Response): Promise<void> => {
    try {
        const recipientId = req.role === "admin" ? req.adminId! : req.citizenId!;
        const notifications = await NotificationModel.find({ recipientId })
            .sort({ createdAt: -1 })
            .limit(20)
            .lean();
        res.json({ notifications });
    } catch (error) {
        console.error("Error fetching notifications:", error);
        res.status(500).json({ message: "Internal Server Error" });
    }
};

/** PATCH /api/v1/notifications/:id/read */
export const markRead = async (req: AuthRequest, res: Response): Promise<void> => {
    try {
        const { id } = req.params;
        await NotificationModel.findByIdAndUpdate(id, { read: true });
        res.json({ message: "Marked as read" });
    } catch (error) {
        res.status(500).json({ message: "Internal Server Error" });
    }
};

/** PATCH /api/v1/notifications/read-all */
export const markAllRead = async (req: AuthRequest, res: Response): Promise<void> => {
    try {
        const recipientId = req.role === "admin" ? req.adminId! : req.citizenId!;
        await NotificationModel.updateMany({ recipientId, read: false }, { read: true });
        res.json({ message: "All notifications marked as read" });
    } catch (error) {
        res.status(500).json({ message: "Internal Server Error" });
    }
};
