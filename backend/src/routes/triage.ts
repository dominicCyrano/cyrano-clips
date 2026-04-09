import { Router } from "express";
import multer from "multer";
import path from "path";
import fs from "fs/promises";
import crypto from "crypto";
import { query } from "@anthropic-ai/claude-agent-sdk";
import type { SSEEvent, TriageSSEEvent } from "../../../shared/types.js";
import {
  ensureTriageDir,
  getTriageDir,
  createTriageSession,
  getTriageSession,
  saveTriageSession,
  addAssetMetadata,
  getAssetPath,
} from "../services/triage-storage.js";
import { translateToSSE } from "../services/sse-helpers.js";
import { buildTriagePrompt } from "../prompts/triage-system.js";
import {
  createProjectDirs,
  saveProject,
  getProjectDir,
} from "../services/storage.js";
import { processVideo } from "./upload.js";

export const triageRouter = Router();

// ---- Session Management ----

// POST /api/triage — create new triage session
triageRouter.post("/", async (_req, res) => {
  try {
    await ensureTriageDir();
    const session = await createTriageSession();
    res.status(201).json(session);
  } catch (err) {
    console.error("Failed to create triage session:", err);
    res.status(500).json({ error: "Failed to create triage session" });
  }
});

// GET /api/triage/:id — get session metadata
triageRouter.get("/:id", async (req, res) => {
  try {
    const session = await getTriageSession(req.params.id);
    if (!session) {
      res.status(404).json({ error: "Session not found" });
      return;
    }
    res.json(session);
  } catch (err) {
    console.error("Failed to get triage session:", err);
    res.status(500).json({ error: "Failed to get triage session" });
  }
});

// ---- Multi-File Upload ----

const ALLOWED_EXTENSIONS = [
  ".mp4", ".mov", ".avi", ".mkv", ".webm",
  ".jpg", ".jpeg", ".png", ".gif", ".webp", ".heic",
  ".pdf", ".doc", ".docx", ".txt",
  ".mp3", ".wav", ".aac", ".m4a",
];

const paramId = (req: any): string =>
  Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;

const storage = multer.diskStorage({
  destination: (req, _file, cb) => {
    cb(null, path.join(getTriageDir(paramId(req)), "assets"));
  },
  filename: (_req, file, cb) => {
    // Preserve original name but prefix with short uuid to avoid collisions
    const prefix = crypto.randomUUID().slice(0, 8);
    cb(null, `${prefix}_${file.originalname}`);
  },
});

const upload = multer({
  storage,
  limits: { fileSize: 5 * 1024 * 1024 * 1024 }, // 5 GB per file
  fileFilter: (_req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase();
    if (ALLOWED_EXTENSIONS.includes(ext)) {
      cb(null, true);
    } else {
      cb(new Error(`Unsupported file type: ${ext}`));
    }
  },
});

// POST /api/triage/:id/upload — multi-file upload
triageRouter.post("/:id/upload", upload.array("files", 20), async (req, res) => {
  try {
    const session = await getTriageSession(paramId(req));
    if (!session) {
      res.status(404).json({ error: "Session not found" });
      return;
    }

    const files = req.files as Express.Multer.File[];
    if (!files || files.length === 0) {
      res.status(400).json({ error: "No files provided" });
      return;
    }

    const newAssets = files.map((f) => {
      const asset = addAssetMetadata(f.originalname, f.mimetype, f.size);
      // Store the actual filename on disk for retrieval
      (asset as any)._disk_filename = f.filename;
      return asset;
    });

    // Save disk filenames mapping for asset serving
    for (let i = 0; i < files.length; i++) {
      const mapPath = path.join(
        getTriageDir(paramId(req)),
        "assets",
        `${newAssets[i].id}.map`
      );
      await fs.writeFile(mapPath, files[i].filename, "utf-8");
    }

    session.assets.push(
      ...newAssets.map(({ ...a }) => {
        delete (a as any)._disk_filename;
        return a;
      })
    );
    await saveTriageSession(session);

    res.json({ assets: newAssets.map(({ ...a }) => { delete (a as any)._disk_filename; return a; }) });
  } catch (err) {
    console.error("Triage upload failed:", err);
    res.status(500).json({ error: "Upload failed" });
  }
});

// GET /api/triage/:id/assets/:aid — serve asset file
triageRouter.get("/:id/assets/:aid", async (req, res) => {
  try {
    const session = await getTriageSession(req.params.id);
    if (!session) {
      res.status(404).json({ error: "Session not found" });
      return;
    }

    const asset = session.assets.find((a) => a.id === req.params.aid);
    if (!asset) {
      res.status(404).json({ error: "Asset not found" });
      return;
    }

    // Read disk filename from map file
    const mapPath = path.join(
      getTriageDir(req.params.id),
      "assets",
      `${asset.id}.map`
    );
    const diskFilename = await fs.readFile(mapPath, "utf-8");
    const filePath = getAssetPath(req.params.id, diskFilename);

    res.sendFile(filePath);
  } catch (err) {
    console.error("Failed to serve asset:", err);
    res.status(500).json({ error: "Failed to serve asset" });
  }
});

// ---- Triage Chat (SSE) ----

// In-memory session ID cache for triage agent
const triageSessionCache = new Map<string, string>();

triageRouter.post("/:id/chat", async (req, res) => {
  const sessionId = req.params.id;
  const { message } = req.body;

  if (!message || typeof message !== "string") {
    res.status(400).json({ error: "message is required" });
    return;
  }

  const session = await getTriageSession(sessionId);
  if (!session) {
    res.status(404).json({ error: "Session not found" });
    return;
  }

  const triageDir = getTriageDir(sessionId);
  const agentSessionId = triageSessionCache.get(sessionId) || session.session_id;

  // SSE headers
  res.writeHead(200, {
    "Content-Type": "text/event-stream",
    "Cache-Control": "no-cache",
    Connection: "keep-alive",
    "X-Accel-Buffering": "no",
  });

  const send = (event: TriageSSEEvent) => {
    res.write(`data: ${JSON.stringify(event)}\n\n`);
  };

  try {
    const q = query({
      prompt: message,
      options: {
        cwd: triageDir,
        ...(agentSessionId ? { resume: agentSessionId } : {}),
        allowedTools: ["Read", "Write", "Bash", "Glob", "Grep"],
        systemPrompt: {
          type: "preset" as const,
          preset: "claude_code" as const,
          append: buildTriagePrompt(triageDir, session.assets),
        },
        permissionMode: "bypassPermissions" as const,
        allowDangerouslySkipPermissions: true,
        model: "claude-sonnet-4-6",
        includePartialMessages: true,
        maxTurns: 15,
      },
    });

    for await (const msg of q) {
      const event = translateToSSE(msg, triageDir);
      if (event) send(event);

      // Persist session ID
      if ("session_id" in msg && msg.session_id) {
        triageSessionCache.set(sessionId, msg.session_id);
        session.session_id = msg.session_id;
        await saveTriageSession(session);
      }
    }

    // After chat turn completes, check for route-decision.json
    const routeDecisionPath = path.join(triageDir, "route-decision.json");
    try {
      const raw = await fs.readFile(routeDecisionPath, "utf-8");
      const decision = JSON.parse(raw) as {
        app: string;
        asset_ids: string[];
        brief: string;
      };

      // Execute routing
      const routeResult = await executeRoute(session, decision);
      if (routeResult) {
        send({
          type: "route_action",
          app: decision.app,
          project_id: routeResult.project_id,
        });
      }

      // Clean up decision file
      await fs.unlink(routeDecisionPath).catch(() => {});
    } catch {
      // No route-decision.json — normal case
    }
  } catch (err: any) {
    send({ type: "error", message: err.message || "Unknown error" });
  }

  send({ type: "done" });
  res.end();
});

// ---- Routing ----

// POST /api/triage/:id/route — manual routing trigger
triageRouter.post("/:id/route", async (req, res) => {
  try {
    const session = await getTriageSession(req.params.id);
    if (!session) {
      res.status(404).json({ error: "Session not found" });
      return;
    }

    const { app, asset_ids, brief } = req.body;
    if (!app || !asset_ids) {
      res.status(400).json({ error: "app and asset_ids are required" });
      return;
    }

    const result = await executeRoute(session, { app, asset_ids, brief });
    if (!result) {
      res.status(400).json({ error: "No suitable video asset found" });
      return;
    }

    res.json(result);
  } catch (err) {
    console.error("Routing failed:", err);
    res.status(500).json({ error: "Routing failed" });
  }
});

async function executeRoute(
  session: ReturnType<typeof Object>,
  decision: { app: string; asset_ids: string[]; brief?: string }
): Promise<{ project_id: string; app: string } | null> {
  const triageSession = session as Awaited<ReturnType<typeof getTriageSession>>;
  if (!triageSession) return null;

  if (decision.app === "clips" || decision.app === "batch") {
    // Find the first video asset from the specified IDs
    const videoAsset = triageSession.assets.find(
      (a) =>
        decision.asset_ids.includes(a.id) && a.category === "video"
    );

    const asset = videoAsset || triageSession.assets.find((a) => a.category === "video");
    if (!asset) return null;
    return await routeToApp(triageSession, asset, decision.app, decision.brief);
  }

  return null;
}

async function routeToApp(
  session: NonNullable<Awaited<ReturnType<typeof getTriageSession>>>,
  videoAsset: NonNullable<Awaited<ReturnType<typeof getTriageSession>>>["assets"][0],
  app: string,
  brief?: string
): Promise<{ project_id: string; app: string }> {
  const projectId = crypto.randomUUID();

  await createProjectDirs(projectId);
  const now = new Date().toISOString();
  await saveProject({
    id: projectId,
    name: brief || `From triage: ${videoAsset.original_name}`,
    app_type: app,
    status: "uploading",
    created_at: now,
    updated_at: now,
  });

  // Copy video asset to project
  const mapPath = path.join(
    getTriageDir(session.id),
    "assets",
    `${videoAsset.id}.map`
  );
  const diskFilename = await fs.readFile(mapPath, "utf-8");
  const sourcePath = getAssetPath(session.id, diskFilename);
  const ext = path.extname(videoAsset.original_name) || ".mp4";
  const destPath = path.join(getProjectDir(projectId), "raw", `source${ext}`);
  await fs.copyFile(sourcePath, destPath);

  // Update triage session
  session.status = "routed";
  session.routed_to = { app, project_id: projectId };
  await saveTriageSession(session);

  // Start video processing pipeline in background
  void processVideo(projectId, destPath).catch(async (err: any) => {
    console.error("Routed project processing failed:", err);
    const { getProject: getProj, saveProject: saveProj } = await import("../services/storage.js");
    const meta = await getProj(projectId);
    if (meta) {
      meta.status = "error";
      meta.error_detail = `Processing failed: ${err.message}`;
      meta.updated_at = new Date().toISOString();
      await saveProj(meta);
    }
  });

  return { project_id: projectId, app };
}
