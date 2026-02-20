import { Request, Response } from "express";
import { IssueModel } from "../models/issue.model";
import { MultimediaModel } from "../models/multimedia.model";

export const createIssue = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    const files = (req.files as Express.Multer.File[]) || [];

    const { title = "Untitled", description, location, issueType } = req.body;
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

    const issue = await IssueModel.create({
      citizenId: (req as any).citizenId, // Fix: match authMiddleware
      issueType,
      title,
      description,
      location: parsedLocation,
      status: "Reported",
    });

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
    const issues = await IssueModel.find({})
      .populate("citizenId", "fullName")
      .populate("media") // Populate to get the image URL
      .lean();

    const issuesWithMedia = issues.map((issue) => {
      return {
        _id: issue._id,
        title: issue.title,
        description: issue.description,
        type: issue.issueType,
        location: issue.location,
        reportedBy: (issue.citizenId as any)?.fullName || "Anonymous",
        reportedAt: (issue as any).createdAt,
        image: (issue as any).media?.url || null, // This is the Base64 string
        status: issue.status,
      };
    });

    res.json({ issues: issuesWithMedia });
  } catch (err) {
    console.error("Error fetching issues:", err);
    res.status(500).json({
      message: "Something went wrong",
    });
  }
};
