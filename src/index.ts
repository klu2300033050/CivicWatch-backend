import dotenv from "dotenv";
import http from "http";
import { connectDB } from "./config/database";
import app from "./app";
import { initSocket } from "./socket";

dotenv.config({ path: "./.env" });

const PORT = process.env.PORT || 3000;

// Create HTTP server so Socket.io can attach
const server = http.createServer(app);
initSocket(server);

// For standalone server (Local development)
if (process.env.NODE_ENV !== "production") {
  connectDB()
    .then(() => {
      server.listen(PORT, () => {
        console.log(`🚀 Server is running on port: ${PORT}`);
      });
    })
    .catch((error) => {
      console.error("MongoDB connection failed!\n", error);
      process.exit(1);
    });
}

// For Serverless environments (Vercel)
const handler = async (req: any, res: any) => {
  try {
    await connectDB();
    return app(req, res);
  } catch (error) {
    console.error("Serverless handle error:", error);
    res.status(500).json({ message: "Internal Server Error - Database connection failed" });
  }
};

export default handler;
