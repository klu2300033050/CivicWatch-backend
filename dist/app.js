"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const cors_1 = __importDefault(require("cors"));
const cookie_parser_1 = __importDefault(require("cookie-parser"));
const helmet_1 = __importDefault(require("helmet"));
const admin_routes_1 = __importDefault(require("./routes/admin.routes"));
const citizen_routes_1 = __importDefault(require("./routes/citizen.routes"));
const issue_routes_1 = __importDefault(require("./routes/issue.routes"));
const comment_routes_1 = __importDefault(require("./routes/comment.routes"));
const upvote_routes_1 = __importDefault(require("./routes/upvote.routes"));
const analytics_routes_1 = __importDefault(require("./routes/analytics.routes"));
const notification_routes_1 = __importDefault(require("./routes/notification.routes"));
const ratelimit_middleware_1 = require("./middlerware/ratelimit.middleware");
const app = (0, express_1.default)();
// Security headers
app.use((0, helmet_1.default)());
// CORS
app.use((0, cors_1.default)({
    origin: true,
    credentials: true,
}));
// Body parsers
app.use(express_1.default.json({ limit: "50mb" }));
app.use(express_1.default.urlencoded({ extended: true, limit: "50mb" }));
app.use(express_1.default.static("public"));
app.use((0, cookie_parser_1.default)());
// Global rate limiter
app.use(ratelimit_middleware_1.globalRateLimiter);
// API routes (versioned)
app.use("/api/v1", citizen_routes_1.default);
app.use("/api/v1", admin_routes_1.default);
app.use("/api/v1", issue_routes_1.default);
app.use("/api/v1", comment_routes_1.default);
app.use("/api/v1", upvote_routes_1.default);
app.use("/api/v1", analytics_routes_1.default);
app.use("/api/v1", notification_routes_1.default);
// 404 catch-all for /api
app.use("/api", (_req, res) => {
    res.status(404).json({ message: "API route not found" });
});
// Health check
app.get("/", (_req, res) => {
    res.send("CivicWatch Backend is Running ✅");
});
exports.default = app;
