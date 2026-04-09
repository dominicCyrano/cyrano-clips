import { getProject, saveProject } from "./storage.js";

// In-memory cache: projectId -> sessionId
const sessionCache = new Map<string, string>();

export async function getSessionId(
  projectId: string
): Promise<string | undefined> {
  // Check in-memory first
  const cached = sessionCache.get(projectId);
  if (cached) return cached;

  // Fall back to disk
  const meta = await getProject(projectId);
  if (meta?.session_id) {
    sessionCache.set(projectId, meta.session_id);
    return meta.session_id;
  }
  return undefined;
}

export async function persistSessionId(
  projectId: string,
  sessionId: string
): Promise<void> {
  sessionCache.set(projectId, sessionId);
  const meta = await getProject(projectId);
  if (meta) {
    meta.session_id = sessionId;
    meta.updated_at = new Date().toISOString();
    await saveProject(meta);
  }
}
