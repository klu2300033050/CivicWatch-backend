"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.citizenOnly = exports.adminOnly = void 0;
/**
 * Middleware: only allows requests where req.role === "admin"
 */
const adminOnly = (req, res, next) => {
    if (req.role !== "admin") {
        res.status(403).json({ message: "Admin access required" });
        return;
    }
    next();
};
exports.adminOnly = adminOnly;
/**
 * Middleware: only allows requests where req.role === "citizen"
 */
const citizenOnly = (req, res, next) => {
    if (req.role !== "citizen") {
        res.status(403).json({ message: "Citizen access required" });
        return;
    }
    next();
};
exports.citizenOnly = citizenOnly;
