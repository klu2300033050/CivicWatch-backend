import { Request, Response } from "express";
import { IssueModel } from "../models/issue.model";
import { MultimediaModel } from "../models/multimedia.model";
import { CitizenModel } from "../models/citizen.model";

// Calculate distance in KM between two points
function getDistanceFromLatLonInKm(lat1: number, lon1: number, lat2: number, lon2: number) {
  const R = 6371; // Radius of the earth in km
  const dLat = (lat2 - lat1) * (Math.PI / 180);
  const dLon = (lon2 - lon1) * (Math.PI / 180);
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(lat1 * (Math.PI / 180)) * Math.cos(lat2 * (Math.PI / 180)) *
    Math.sin(dLon / 2) * Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

export const createIssue = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    console.log("--> CREATE ISSUE START");
    const files = (req.files as Express.Multer.File[]) || [];
    console.log(`Files uploaded: ${files.length}`);

    const { title = "Untitled", description, location, issueType, isAnonymous } = req.body;

    let parsedLocation = location;
    if (typeof location === "string") {
      try {
        parsedLocation = JSON.parse(location);
      } catch (e) {
        console.error("Location Parse Error:", e);
        res.status(400).json({ message: "Invalid location JSON format" });
        return;
      }
    }

    if (!title || !description || !parsedLocation || !parsedLocation.latitude || !parsedLocation.longitude || !issueType) {
      console.log("Validation Failed:", { title, description, parsedLocation, issueType });
      res.status(400).json({ message: "Please fill all the required fields" });
      return;
    }

    const existingIssue = await IssueModel.findOne({ title });
    if (existingIssue) {
      res.status(400).json({ message: "Issue with this title already exists" });
      return;
    }

    console.log("Querying for similar issues nearby...");
    const recentSimilarIssues = await IssueModel.find({ issueType });
    for (const recent of recentSimilarIssues) {
      if (!recent.location || !recent.location.latitude || !recent.location.longitude) continue;

      const dist = getDistanceFromLatLonInKm(
        parsedLocation.latitude, parsedLocation.longitude,
        recent.location.latitude, recent.location.longitude
      );
      if (dist < 0.5 && !["Resolved", "Rejected"].includes(recent.status)) {
        res.status(409).json({ message: "A similar issue was already reported nearby." });
        return;
      }
    }

    const citizenId = (req as any).citizenId || (req as any).adminId;
    if (!citizenId) {
      res.status(401).json({ message: "Unauthorized. Missing user ID in token request." });
      return;
    }
    console.log(`Saving issue to DB for citizenId/adminId: ${citizenId}`);

    const issue = await IssueModel.create({
      citizenId,
      issueType, // MUST match the Mongoose strict literal Enum!
      title,
      description,
      location: parsedLocation,
      status: "Reported",
      isAnonymous: isAnonymous === true || isAnonymous === "true",
    });

    console.log("Issue DB Save complete. Granting reputation...");
    if ((req as any).citizenId) {
      await CitizenModel.findByIdAndUpdate(citizenId, { $inc: { reputationPoints: 10 } }).catch(e => console.error("Rep error:", e));
    }

    console.log("Processing Media...");
    const mediaDocs = await Promise.all(
      files.map((file) => {
        const base64Data = file.buffer.toString("base64");
        const dataUrl = `data:${file.mimetype};base64,${base64Data}`;
        return MultimediaModel.create({
          issueID: issue._id,
          fileType: file.mimetype.startsWith("video") ? "video" : "image",
          url: dataUrl,
          filename: file.originalname,
        });
      })
    );

    if (mediaDocs.length > 0) {
      issue.media = mediaDocs[0]._id as any;
      await issue.save();
    }

    console.log("Issue created perfectly! Returning 200 payload.");
    res.status(200).json({ message: "Issue created", issue, media: mediaDocs });
  } catch (error: any) {
    if (error && error.name === "ValidationError") {
      console.warn("Issue Validation Error:", error.message);
      res.status(400).json({ message: error.message });
      return;
    }
    console.error("/// CRITICAL 500 IN CREATE ISSUE ///", error);
    res.status(500).json({ message: "Internal Server Error" });
  }
};

export const getIssues = async (req: Request, res: Response) => {
  try {
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 50;
    const skip = (page - 1) * limit;

    const [total, issues] = await Promise.all([
      IssueModel.countDocuments(),
      IssueModel.find({})
        .populate("citizenId", "fullName")
        .populate("media")
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .lean(),
    ]);

    const issuesWithMedia = issues.map((issue) => ({
      _id: issue._id,
      title: issue.title,
      description: issue.description,
      type: issue.issueType,
      issueType: issue.issueType,
      location: issue.location,
      reportedBy: (issue.citizenId as any)?.fullName || "Anonymous",
      reportedAt: (issue as any).createdAt,
      image: (issue as any).media?.url || null,
      status: issue.status,
      upvotes: issue.upvotes || [],
      isAnonymous: issue.isAnonymous,
    }));

    res.json({ issues: issuesWithMedia, total, page, pages: Math.ceil(total / limit) });
  } catch (err) {
    console.error("Error fetching issues:", err);
    res.status(500).json({ message: "Something went wrong" });
  }
};

export const checkDuplicateIssues = async (req: Request, res: Response) => {
  try {
    const { lat, lng } = req.query;
    if (!lat || !lng) {
      res.status(400).json({ message: "Latitude and longitude are required" });
      return;
    }

    const latitude = parseFloat(lat as string);
    const longitude = parseFloat(lng as string);

    if (isNaN(latitude) || isNaN(longitude)) {
      res.status(400).json({ message: "Invalid coordinates" });
      return;
    }

    // ~50 meter bounding box. 1 degree latitude is ~111km, so 0.00045 is ~50 meters.
    const LAT_THRESHOLD = 0.00045;
    const LNG_THRESHOLD = 0.00045;

    // Find issues nearby that are NOT resolved or rejected
    const duplicates = await IssueModel.find({
      status: { $nin: ["Resolved", "Rejected"] },
      "location.latitude": { $gte: latitude - LAT_THRESHOLD, $lte: latitude + LAT_THRESHOLD },
      "location.longitude": { $gte: longitude - LNG_THRESHOLD, $lte: longitude + LNG_THRESHOLD }
    }).select("title issueType status location createdAt").limit(5);

    res.json({ duplicates });
  } catch (err) {
    console.error("Error checking duplicates:", err);
    res.status(500).json({ message: "Failed to check duplicates" });
  }
};
