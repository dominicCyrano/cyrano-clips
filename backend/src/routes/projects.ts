import { Router } from "express";
import { v4 as uuid } from "uuid";
import {
  createProjectDirs,
  saveProject,
  getProject,
  listProjects,
  type ProjectMeta,
} from "../services/storage.js";

export const projectsRouter = Router();

// POST /api/projects — create a new project
projectsRouter.post("/", async (req, res) => {
  try {
    const { name, client_name, app_type } = req.body;
    if (!name) {
      res.status(400).json({ error: "name is required" });
      return;
    }

    const id = uuid();
    const now = new Date().toISOString();
    const meta: ProjectMeta = {
      id,
      name,
      client_name,
      app_type: app_type || "clips",
      status: "uploading",
      created_at: now,
      updated_at: now,
    };

    await createProjectDirs(id);
    await saveProject(meta);
    res.status(201).json(meta);
  } catch (err) {
    console.error("Failed to create project:", err);
    res.status(500).json({ error: "Failed to create project" });
  }
});

// GET /api/projects — list all projects
projectsRouter.get("/", async (_req, res) => {
  try {
    const projects = await listProjects();
    res.json(projects);
  } catch (err) {
    console.error("Failed to list projects:", err);
    res.status(500).json({ error: "Failed to list projects" });
  }
});

// GET /api/projects/:id — get a single project
projectsRouter.get("/:id", async (req, res) => {
  try {
    const meta = await getProject(req.params.id);
    if (!meta) {
      res.status(404).json({ error: "Project not found" });
      return;
    }
    res.json(meta);
  } catch (err) {
    console.error("Failed to get project:", err);
    res.status(500).json({ error: "Failed to get project" });
  }
});
