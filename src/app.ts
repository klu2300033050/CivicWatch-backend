import express from "express";
import cors from "cors";
import cookieParser from "cookie-parser";
import helmet from "helmet";
import adminRoutes from "./routes/admin.routes";
import citizenRoutes from "./routes/citizen.routes";
import issueRoutes from "./routes/issue.routes";
import commentRoutes from "./routes/comment.routes";
import upvoteRoutes from "./routes/upvote.routes";
import analyticsRoutes from "./routes/analytics.routes";
import notificationRoutes from "./routes/notification.routes";
import { globalRateLimiter } from "./middlerware/ratelimit.middleware";

const app = express();

// Security headers
app.use(helmet());

// CORS
app.use(
  cors({
    origin: true,
    credentials: true,
  })
);

// Body parsers
app.use(express.json({ limit: "50mb" }));
app.use(express.urlencoded({ extended: true, limit: "50mb" }));
app.use(express.static("public"));
app.use(cookieParser());

// Global rate limiter
app.use(globalRateLimiter);

// API routes (versioned)
app.use("/api/v1", citizenRoutes);
app.use("/api/v1", adminRoutes);
app.use("/api/v1", issueRoutes);
app.use("/api/v1", commentRoutes);
app.use("/api/v1", upvoteRoutes);
app.use("/api/v1", analyticsRoutes);
app.use("/api/v1", notificationRoutes);

// 404 catch-all for /api
app.use("/api", (_req, res) => {
  res.status(404).json({ message: "API route not found" });
});

// Health check
app.get("/", (_req, res) => {
  res.send("CivicWatch Backend is Running ✅");
});

export default app;
