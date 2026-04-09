import { Router } from "express";
import path from "path";
import { getProjectDir, readJson, fileExists } from "../services/storage.js";

export const timelineRouter = Router();

// GET /api/projects/:id/timeline — serve latest.json
timelineRouter.get("/:id/timeline", async (req, res) => {
  try {
    const projectDir = getProjectDir(req.params.id);
    const latestPath = path.join(projectDir, "timelines", "latest.json");

    if (!(await fileExists(latestPath))) {
      res.status(404).json({ error: "No timeline yet" });
      return;
    }

    const timeline = await readJson(latestPath);
    res.json(timeline);
  } catch (err) {
    console.error("Failed to read timeline:", err);
    res.status(500).json({ error: "Failed to read timeline" });
  }
});

// GET /api/projects/:id/batch — serve batch.json
timelineRouter.get("/:id/batch", async (req, res) => {
  try {
    const projectDir = getProjectDir(req.params.id);
    const batchPath = path.join(projectDir, "timelines", "batch.json");

    if (!(await fileExists(batchPath))) {
      res.status(404).json({ error: "No batch clips yet" });
      return;
    }

    const batch = await readJson(batchPath);
    res.json(batch);
  } catch (err) {
    console.error("Failed to read batch clips:", err);
    res.status(500).json({ error: "Failed to read batch clips" });
  }
});

// GET /api/projects/:id/transcript — serve transcript.json
timelineRouter.get("/:id/transcript", async (req, res) => {
  try {
    const projectDir = getProjectDir(req.params.id);
    const transcriptPath = path.join(
      projectDir,
      "transcripts",
      "transcript.json"
    );

    if (!(await fileExists(transcriptPath))) {
      res.status(404).json({ error: "No transcript yet" });
      return;
    }

    const transcript = await readJson(transcriptPath);
    res.json(transcript);
  } catch (err) {
    console.error("Failed to read transcript:", err);
    res.status(500).json({ error: "Failed to read transcript" });
  }
});

// PUT /api/projects/:id/speakers — save speaker name map
timelineRouter.put("/:id/speakers", async (req, res) => {
  try {
    const projectDir = getProjectDir(req.params.id);
    const mapPath = path.join(projectDir, "transcripts", "speaker_map.json");
    const fs = await import("fs/promises");
    await fs.writeFile(mapPath, JSON.stringify(req.body, null, 2), "utf-8");
    res.json({ ok: true });
  } catch (err) {
    console.error("Failed to save speaker map:", err);
    res.status(500).json({ error: "Failed to save speaker map" });
  }
});
