import multer from "multer";

// Use memory storage to avoid Vercel's read-only filesystem
// We will store the file data directly in MongoDB/Mongoose
const storage = multer.memoryStorage();

export const upload = multer({
  storage,
  limits: { fileSize: 5 * 1024 * 1024 }, // 5MB limit to prevent MongoDB size issues
});
