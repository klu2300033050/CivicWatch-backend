import mongoose from "mongoose";
import "dotenv/config";

const DATABASE_URL = process.env.DATABASE_URL || "";

let isConnected = false;

export const connectDB = async () => {
  if (isConnected) {
    return;
  }

  mongoose.set("strictQuery", true);

  try {
    const db = await mongoose.connect(DATABASE_URL);
    isConnected = db.connections[0].readyState === 1;
    console.log("Connected to DB !");
  } catch (err) {
    console.error("DB connection error:", err);
    throw err; // Throw error to handle it in transition
  }
};
