import { Request, Response, NextFunction } from "express";

/**
 * Middleware: only allows requests where req.role === "admin"
 */
export const adminOnly = (req: Request, res: Response, next: NextFunction): void => {
    if (req.role !== "admin") {
        res.status(403).json({ message: "Admin access required" });
        return;
    }
    next();
};

/**
 * Middleware: only allows requests where req.role === "citizen"
 */
export const citizenOnly = (req: Request, res: Response, next: NextFunction): void => {
    if (req.role !== "citizen") {
        res.status(403).json({ message: "Citizen access required" });
        return;
    }
    next();
};
