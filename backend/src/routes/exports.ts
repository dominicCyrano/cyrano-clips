import { Router } from "express";
import path from "path";
import fs from "fs";
import { getProjectDir, listDir } from "../services/storage.js";

export const exportsRouter = Router();

// GET /api/projects/:id/exports — list exported files
exportsRouter.get("/:id/exports", async (req, res) => {
  try {
    const exportsDir = path.join(getProjectDir(req.params.id), "exports");
    const files = await listDir(exportsDir);
    const videoFiles = files.filter((f) =>
      [".mp4", ".mov", ".mkv", ".webm"].includes(
        path.extname(f).toLowerCase()
      )
    );
    res.json(videoFiles);
  } catch (err) {
    console.error("Failed to list exports:", err);
    res.status(500).json({ error: "Failed to list exports" });
  }
});

// GET /api/projects/:id/exports/:filename — download a rendered file
exportsRouter.get("/:id/exports/:filename", async (req, res) => {
  try {
    const filePath = path.join(
      getProjectDir(req.params.id),
      "exports",
      req.params.filename
    );

    if (!fs.existsSync(filePath)) {
      res.status(404).json({ error: "Export not found" });
      return;
    }

    res.download(filePath);
  } catch (err) {
    console.error("Failed to download export:", err);
    res.status(500).json({ error: "Failed to download export" });
  }
});
