import dotenv from "dotenv";
import { connectDB } from "./config/database";
import app from "./app";

dotenv.config({ path: "./.env" });

const PORT = process.env.PORT || 3000;

// For standalone server (Local development)
if (process.env.NODE_ENV !== "production") {
  connectDB()
    .then(() => {
      app.listen(PORT, () => {
        console.log(`Server is running on port : ${PORT}`);
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
