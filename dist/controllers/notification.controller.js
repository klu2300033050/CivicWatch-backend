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
exports.markAllRead = exports.markRead = exports.getNotifications = void 0;
const notification_model_1 = require("../models/notification.model");
/** GET /api/v1/notifications */
const getNotifications = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const recipientId = req.role === "admin" ? req.adminId : req.citizenId;
        const notifications = yield notification_model_1.NotificationModel.find({ recipientId })
            .sort({ createdAt: -1 })
            .limit(20)
            .lean();
        res.json({ notifications });
    }
    catch (error) {
        console.error("Error fetching notifications:", error);
        res.status(500).json({ message: "Internal Server Error" });
    }
});
exports.getNotifications = getNotifications;
/** PATCH /api/v1/notifications/:id/read */
const markRead = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { id } = req.params;
        yield notification_model_1.NotificationModel.findByIdAndUpdate(id, { read: true });
        res.json({ message: "Marked as read" });
    }
    catch (error) {
        res.status(500).json({ message: "Internal Server Error" });
    }
});
exports.markRead = markRead;
/** PATCH /api/v1/notifications/read-all */
const markAllRead = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const recipientId = req.role === "admin" ? req.adminId : req.citizenId;
        yield notification_model_1.NotificationModel.updateMany({ recipientId, read: false }, { read: true });
        res.json({ message: "All notifications marked as read" });
    }
    catch (error) {
        res.status(500).json({ message: "Internal Server Error" });
    }
});
exports.markAllRead = markAllRead;
