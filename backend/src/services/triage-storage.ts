import fs from "fs/promises";
import path from "path";
import os from "os";
import crypto from "crypto";
import type { TriageSession, TriageAsset, AssetCategory } from "../../../shared/types.js";

const TRIAGE_DIR = path.join(os.homedir(), "cyrano-clips-data", "triage");

export async function ensureTriageDir(): Promise<void> {
  await fs.mkdir(TRIAGE_DIR, { recursive: true });
}

export function getTriageDir(sessionId: string): string {
  return path.join(TRIAGE_DIR, sessionId);
}

export async function createTriageSession(): Promise<TriageSession> {
  const id = crypto.randomUUID();
  const dir = getTriageDir(id);
  await fs.mkdir(path.join(dir, "assets"), { recursive: true });

  const session: TriageSession = {
    id,
    status: "active",
    assets: [],
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  };

  await writeSession(session);
  return session;
}

export async function getTriageSession(id: string): Promise<TriageSession | null> {
  try {
    const raw = await fs.readFile(sessionPath(id), "utf-8");
    return JSON.parse(raw) as TriageSession;
  } catch {
    return null;
  }
}

export async function saveTriageSession(session: TriageSession): Promise<void> {
  session.updated_at = new Date().toISOString();
  await writeSession(session);
}

export function addAssetMetadata(
  originalName: string,
  mimeType: string,
  sizeBytes: number
): TriageAsset {
  return {
    id: crypto.randomUUID(),
    original_name: originalName,
    mime_type: mimeType,
    size_bytes: sizeBytes,
    category: categorize(mimeType, originalName),
    uploaded_at: new Date().toISOString(),
  };
}

export function getAssetPath(sessionId: string, filename: string): string {
  return path.join(getTriageDir(sessionId), "assets", filename);
}

// ---- internals ----

function sessionPath(id: string): string {
  return path.join(getTriageDir(id), "session.json");
}

async function writeSession(session: TriageSession): Promise<void> {
  await fs.writeFile(sessionPath(session.id), JSON.stringify(session, null, 2), "utf-8");
}

function categorize(mimeType: string, filename: string): AssetCategory {
  if (mimeType.startsWith("video/")) return "video";
  if (mimeType.startsWith("image/")) return "image";
  if (mimeType.startsWith("audio/")) return "audio";
  if (
    mimeType === "application/pdf" ||
    mimeType.includes("document") ||
    mimeType.includes("text/")
  )
    return "document";

  // Fallback by extension
  const ext = path.extname(filename).toLowerCase();
  if ([".mp4", ".mov", ".avi", ".mkv", ".webm"].includes(ext)) return "video";
  if ([".jpg", ".jpeg", ".png", ".gif", ".webp", ".heic"].includes(ext)) return "image";
  if ([".mp3", ".wav", ".aac", ".m4a"].includes(ext)) return "audio";
  if ([".pdf", ".doc", ".docx", ".txt"].includes(ext)) return "document";
  return "other";
}
