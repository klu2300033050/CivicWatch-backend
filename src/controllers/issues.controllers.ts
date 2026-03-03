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
    const files = (req.files as Express.Multer.File[]) || [];

    const { title = "Untitled", description, location, issueType, isAnonymous } = req.body;
    // location stuff

    let parsedLocation = location;
    if (typeof location === "string") {
      try {
        parsedLocation = JSON.parse(location);
      } catch {
        res.status(400).json({ message: "Invalid location JSON format" });
        return;
      }
    }

    if (
      !title ||
      !description ||
      !parsedLocation ||
      !parsedLocation.latitude ||
      !parsedLocation.longitude ||
      !issueType
    ) {
      res.status(400).json({ message: "Please fill all the required fields " });
      return;
    }

    const existingIssue = await IssueModel.findOne({ title });
    if (existingIssue) {
      res
        .status(400)
        .json({ message: " Issue with this title already exists" });
      return;
    }

    // Duplicate complaint detection: same type within 500 Meters reported recently
    const recentSimilarIssues = await IssueModel.find({ issueType });
    for (const recent of recentSimilarIssues) {
      const dist = getDistanceFromLatLonInKm(
        parsedLocation.latitude, parsedLocation.longitude,
        recent.location.latitude, recent.location.longitude
      );
      // 0.5km = 500 meters
      if (dist < 0.5 && !["Resolved", "Rejected"].includes(recent.status)) {
        res.status(409).json({ message: "A similar issue was already reported nearby." });
        return;
      }
    }

    const citizenId = (req as any).citizenId;

    const issue = await IssueModel.create({
      citizenId, // Fix: match authMiddleware
      issueType,
      title,
      description,
      location: parsedLocation,
      status: "Reported",
      isAnonymous: isAnonymous === true || isAnonymous === "true",
    });

    // Reward the user with 10 reputation points for contributing
    if (citizenId) {
      await CitizenModel.findByIdAndUpdate(citizenId, { $inc: { reputationPoints: 10 } }).catch(console.error);
    }

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

    // Link the first media to the issue for convenience
    if (mediaDocs.length > 0) {
      issue.media = mediaDocs[0]._id as any;
      await issue.save();
    }

    res.status(200).json({ message: "Issue created", issue, media: mediaDocs });
  } catch (error) {
    console.error("Error creating issue:", error);
    res.status(500).json({ message: "Internal server error" });
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
