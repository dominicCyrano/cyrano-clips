import "dotenv/config";
import express from "express";
import cors from "cors";
import { ensureDataDir } from "./services/storage.js";
import { projectsRouter } from "./routes/projects.js";
import { uploadRouter } from "./routes/upload.js";
import { chatRouter } from "./routes/chat.js";
import { timelineRouter } from "./routes/timeline.js";
import { mediaRouter } from "./routes/media.js";
import { exportsRouter } from "./routes/exports.js";
import { triageRouter } from "./routes/triage.js";
import { ensureTriageDir } from "./services/triage-storage.js";

const PORT = parseInt(process.env.PORT || "3001", 10);
const app = express();

app.use(cors());
app.use(express.json());

// Routes
app.use("/api/projects", projectsRouter);
app.use("/api/projects", uploadRouter);
app.use("/api/projects", chatRouter);
app.use("/api/projects", timelineRouter);
app.use("/api/projects", mediaRouter);
app.use("/api/projects", exportsRouter);
app.use("/api/triage", triageRouter);

// Health check
app.get("/api/health", (_req, res) => {
  res.json({ status: "ok" });
});

async function start() {
  await ensureDataDir();
  await ensureTriageDir();
  app.listen(PORT, () => {
    console.log(`Cyrano Clips backend running on http://localhost:${PORT}`);
  });
}

start().catch((err) => {
  console.error("Failed to start server:", err);
  process.exit(1);
});
