import fs from "fs/promises";
import path from "path";
import os from "os";

const DATA_DIR = path.join(os.homedir(), "cyrano-clips-data", "projects");

export async function ensureDataDir(): Promise<void> {
  await fs.mkdir(DATA_DIR, { recursive: true });
}

export function getProjectDir(projectId: string): string {
  return path.join(DATA_DIR, projectId);
}

// Sub-directories within a project
const PROJECT_SUBDIRS = [
  "raw",
  "audio",
  "transcripts",
  "timelines",
  "exports",
];

export async function createProjectDirs(projectId: string): Promise<string> {
  const dir = getProjectDir(projectId);
  for (const sub of PROJECT_SUBDIRS) {
    await fs.mkdir(path.join(dir, sub), { recursive: true });
  }
  return dir;
}

// ---- JSON helpers ----

export async function readJson<T>(filePath: string): Promise<T | null> {
  try {
    const raw = await fs.readFile(filePath, "utf-8");
    return JSON.parse(raw) as T;
  } catch {
    return null;
  }
}

export async function writeJson(
  filePath: string,
  data: unknown
): Promise<void> {
  await fs.writeFile(filePath, JSON.stringify(data, null, 2), "utf-8");
}

// ---- Project metadata ----

export interface ProjectMeta {
  id: string;
  name: string;
  client_name?: string;
  app_type?: string;
  status: string;
  error_detail?: string;
  session_id?: string;
  created_at: string;
  updated_at: string;
}

function metaPath(projectId: string): string {
  return path.join(getProjectDir(projectId), "project.json");
}

export async function getProject(
  projectId: string
): Promise<ProjectMeta | null> {
  return readJson<ProjectMeta>(metaPath(projectId));
}

export async function saveProject(meta: ProjectMeta): Promise<void> {
  await writeJson(metaPath(meta.id), meta);
}

export async function listProjects(): Promise<ProjectMeta[]> {
  await ensureDataDir();
  const entries = await fs.readdir(DATA_DIR, { withFileTypes: true });
  const projects: ProjectMeta[] = [];
  for (const entry of entries) {
    if (entry.isDirectory()) {
      const meta = await getProject(entry.name);
      if (meta) projects.push(meta);
    }
  }
  return projects.sort(
    (a, b) =>
      new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
  );
}

// ---- File helpers ----

export async function fileExists(filePath: string): Promise<boolean> {
  try {
    await fs.access(filePath);
    return true;
  } catch {
    return false;
  }
}

export async function listDir(dirPath: string): Promise<string[]> {
  try {
    return await fs.readdir(dirPath);
  } catch {
    return [];
  }
}
