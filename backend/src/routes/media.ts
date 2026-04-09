import { Router } from "express";
import path from "path";
import fs from "fs";
import { getProjectDir, fileExists } from "../services/storage.js";

export const mediaRouter = Router();

// GET /api/projects/:id/media — stream video with Range support
mediaRouter.get("/:id/media", async (req, res) => {
  try {
    const projectDir = getProjectDir(req.params.id);

    // Find the source video (could be .mp4, .mov, etc.)
    const rawDir = path.join(projectDir, "raw");
    const files = fs.readdirSync(rawDir);
    const videoFile = files.find((f) =>
      [".mp4", ".mov", ".avi", ".mkv", ".webm"].includes(
        path.extname(f).toLowerCase()
      )
    );

    if (!videoFile) {
      res.status(404).json({ error: "No video file found" });
      return;
    }

    const videoPath = path.join(rawDir, videoFile);
    const stat = fs.statSync(videoPath);
    const fileSize = stat.size;
    const ext = path.extname(videoFile).toLowerCase();
    const mimeTypes: Record<string, string> = {
      ".mp4": "video/mp4",
      ".mov": "video/quicktime",
      ".avi": "video/x-msvideo",
      ".mkv": "video/x-matroska",
      ".webm": "video/webm",
    };
    const contentType = mimeTypes[ext] || "video/mp4";

    const range = req.headers.range;
    if (range) {
      const parts = range.replace(/bytes=/, "").split("-");
      const start = parseInt(parts[0], 10);
      const end = parts[1] ? parseInt(parts[1], 10) : fileSize - 1;
      const chunkSize = end - start + 1;

      res.writeHead(206, {
        "Content-Range": `bytes ${start}-${end}/${fileSize}`,
        "Accept-Ranges": "bytes",
        "Content-Length": chunkSize,
        "Content-Type": contentType,
      });

      fs.createReadStream(videoPath, { start, end }).pipe(res);
    } else {
      res.writeHead(200, {
        "Content-Length": fileSize,
        "Content-Type": contentType,
      });
      fs.createReadStream(videoPath).pipe(res);
    }
  } catch (err) {
    console.error("Media streaming failed:", err);
    res.status(500).json({ error: "Media streaming failed" });
  }
});
