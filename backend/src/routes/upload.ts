import { Router } from "express";
import multer from "multer";
import path from "path";
import { spawn } from "child_process";
import {
  getProjectDir,
  getProject,
  saveProject,
} from "../services/storage.js";
import { transcribeAudio } from "../services/transcription.js";

export const uploadRouter = Router();

const ALLOWED_EXTENSIONS = [".mp4", ".mov", ".avi", ".mkv", ".webm"];
const MAX_SIZE = 5 * 1024 * 1024 * 1024; // 5 GB

const storage = multer.diskStorage({
  destination: (_req, _file, cb) => {
    const projectId = Array.isArray(_req.params.id)
      ? _req.params.id[0]
      : _req.params.id;
    cb(null, path.join(getProjectDir(projectId), "raw"));
  },
  filename: (_req, _file, cb) => {
    cb(null, "source" + path.extname(_file.originalname));
  },
});

const upload = multer({
  storage,
  limits: { fileSize: MAX_SIZE },
  fileFilter: (_req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase();
    if (ALLOWED_EXTENSIONS.includes(ext)) {
      cb(null, true);
    } else {
      cb(new Error(`Unsupported file type: ${ext}`));
    }
  },
});

// POST /api/projects/:id/upload
uploadRouter.post("/:id/upload", upload.single("video"), async (req, res) => {
  try {
    const projectId = Array.isArray(req.params.id)
      ? req.params.id[0]
      : req.params.id;
    const meta = await getProject(projectId);
    if (!meta) {
      res.status(404).json({ error: "Project not found" });
      return;
    }
    if (!req.file) {
      res.status(400).json({ error: "No video file provided" });
      return;
    }

    // Process video in background (extract audio → transcribe → mark editing)
    void processVideo(projectId, req.file.path).catch(async (err: any) => {
      console.error("Project processing failed:", err);
      meta.status = "error";
      meta.error_detail = `Project processing failed: ${err.message}`;
      meta.updated_at = new Date().toISOString();
      await saveProject(meta);
    });

    res.json({
      message: "Upload received, extracting audio...",
      status: meta.status,
    });
  } catch (err) {
    console.error("Upload failed:", err);
    res.status(500).json({ error: "Upload failed" });
  }
});

export function extractAudio(videoPath: string, audioPath: string): Promise<void> {
  return new Promise((resolve, reject) => {
    const proc = spawn("ffmpeg", [
      "-i",
      videoPath,
      "-vn",
      "-acodec",
      "pcm_s16le",
      "-ar",
      "16000",
      "-ac",
      "1",
      "-y",
      audioPath,
    ]);

    let stderr = "";
    proc.stderr.on("data", (d) => (stderr += d.toString()));
    proc.on("close", (code) => {
      if (code === 0) resolve();
      else reject(new Error(`FFmpeg exited with code ${code}: ${stderr.slice(-500)}`));
    });
    proc.on("error", reject);
  });
}

/**
 * Run the full video processing pipeline: extract audio → transcribe → mark editing.
 * Used by both the upload route and the triage routing flow.
 */
export async function processVideo(
  projectId: string,
  videoPath: string
): Promise<void> {
  const meta = await getProject(projectId);
  if (!meta) throw new Error("Project not found");

  const audioPath = path.join(getProjectDir(projectId), "audio", "source.wav");

  meta.status = "extracting_audio";
  meta.error_detail = undefined;
  meta.updated_at = new Date().toISOString();
  await saveProject(meta);

  await extractAudio(videoPath, audioPath);

  meta.status = "transcribing";
  meta.error_detail = undefined;
  meta.updated_at = new Date().toISOString();
  await saveProject(meta);

  const transcript = await transcribeAudio(audioPath);
  const fs = await import("fs/promises");
  await fs.writeFile(
    path.join(getProjectDir(projectId), "transcripts", "transcript.json"),
    JSON.stringify(transcript, null, 2),
    "utf-8"
  );

  meta.status = "editing";
  meta.error_detail = undefined;
  meta.updated_at = new Date().toISOString();
  await saveProject(meta);
}
