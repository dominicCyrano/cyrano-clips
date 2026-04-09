import type { Project, SSEEvent, TriageSession, TriageAsset, TriageSSEEvent, BatchTimeline } from "../../../shared/types";

const BASE = "/api";

export async function createProject(
  name: string,
  clientName?: string,
  appType?: string
): Promise<any> {
  const res = await fetch(`${BASE}/projects`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ name, client_name: clientName, app_type: appType }),
  });
  if (!res.ok) throw new Error("Failed to create project");
  return res.json();
}

export async function listProjects(): Promise<any[]> {
  const res = await fetch(`${BASE}/projects`);
  if (!res.ok) throw new Error("Failed to list projects");
  return res.json();
}

export async function getProject(id: string): Promise<Project> {
  const res = await fetch(`${BASE}/projects/${id}`);
  if (!res.ok) throw new Error("Failed to get project");
  return res.json();
}

export async function uploadVideo(
  projectId: string,
  file: File,
  onProgress?: (progress: number | null) => void
): Promise<any> {
  return new Promise((resolve, reject) => {
    const form = new FormData();
    form.append("video", file);

    const xhr = new XMLHttpRequest();
    xhr.open("POST", `${BASE}/projects/${projectId}/upload`);

    xhr.upload.onprogress = (event) => {
      if (!onProgress) return;
      if (event.lengthComputable) {
        onProgress((event.loaded / event.total) * 100);
      } else {
        onProgress(null);
      }
    };

    xhr.onload = () => {
      if (xhr.status >= 200 && xhr.status < 300) {
        onProgress?.(100);
        resolve(xhr.responseText ? JSON.parse(xhr.responseText) : null);
        return;
      }

      reject(new Error("Failed to upload video"));
    };

    xhr.onerror = () => reject(new Error("Failed to upload video"));
    xhr.onabort = () => reject(new Error("Upload aborted"));
    xhr.send(form);
  });
}

export async function getTimeline(projectId: string): Promise<any> {
  const res = await fetch(`${BASE}/projects/${projectId}/timeline`);
  if (res.status === 404) return null;
  if (!res.ok) throw new Error("Failed to get timeline");
  return res.json();
}

export async function getBatchClips(projectId: string): Promise<BatchTimeline | null> {
  const res = await fetch(`${BASE}/projects/${projectId}/batch`);
  if (res.status === 404) return null;
  if (!res.ok) throw new Error("Failed to get batch clips");
  return res.json();
}

export async function getTranscript(projectId: string): Promise<any> {
  const res = await fetch(`${BASE}/projects/${projectId}/transcript`);
  if (res.status === 404) return null;
  if (!res.ok) throw new Error("Failed to get transcript");
  return res.json();
}

export async function getExports(projectId: string): Promise<string[]> {
  const res = await fetch(`${BASE}/projects/${projectId}/exports`);
  if (!res.ok) return [];
  return res.json();
}

export function getMediaUrl(projectId: string): string {
  return `${BASE}/projects/${projectId}/media`;
}

export function getExportUrl(projectId: string, filename: string): string {
  return `${BASE}/projects/${projectId}/exports/${filename}`;
}

// ---- Triage API ----

export async function createTriageSession(): Promise<TriageSession> {
  const res = await fetch(`${BASE}/triage`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
  });
  if (!res.ok) throw new Error("Failed to create triage session");
  return res.json();
}

export async function getTriageSession(id: string): Promise<TriageSession> {
  const res = await fetch(`${BASE}/triage/${id}`);
  if (!res.ok) throw new Error("Failed to get triage session");
  return res.json();
}

export async function uploadTriageAssets(
  sessionId: string,
  files: File[],
  onProgress?: (progress: number | null) => void
): Promise<TriageAsset[]> {
  return new Promise((resolve, reject) => {
    const form = new FormData();
    for (const file of files) {
      form.append("files", file);
    }

    const xhr = new XMLHttpRequest();
    xhr.open("POST", `${BASE}/triage/${sessionId}/upload`);

    xhr.upload.onprogress = (event) => {
      if (!onProgress) return;
      if (event.lengthComputable) {
        onProgress((event.loaded / event.total) * 100);
      } else {
        onProgress(null);
      }
    };

    xhr.onload = () => {
      if (xhr.status >= 200 && xhr.status < 300) {
        onProgress?.(100);
        const data = xhr.responseText ? JSON.parse(xhr.responseText) : {};
        resolve(data.assets || []);
        return;
      }
      reject(new Error("Failed to upload assets"));
    };

    xhr.onerror = () => reject(new Error("Failed to upload assets"));
    xhr.onabort = () => reject(new Error("Upload aborted"));
    xhr.send(form);
  });
}

export function getTriageAssetUrl(sessionId: string, assetId: string): string {
  return `${BASE}/triage/${sessionId}/assets/${assetId}`;
}

export async function* streamTriageChat(
  sessionId: string,
  message: string,
  signal?: AbortSignal
): AsyncGenerator<TriageSSEEvent> {
  const res = await fetch(`${BASE}/triage/${sessionId}/chat`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ message }),
    signal,
  });

  if (!res.ok) {
    throw new Error(`Triage chat request failed: ${res.status}`);
  }

  const reader = res.body!.getReader();
  const decoder = new TextDecoder();
  let buffer = "";

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;

    buffer += decoder.decode(value, { stream: true });
    const lines = buffer.split("\n");
    buffer = lines.pop() || "";

    for (const line of lines) {
      if (line.startsWith("data: ")) {
        try {
          const event: TriageSSEEvent = JSON.parse(line.slice(6));
          yield event;
        } catch {
          // skip malformed events
        }
      }
    }
  }
}

export async function routeTriageSession(
  sessionId: string,
  app: string,
  assetIds: string[],
  brief?: string
): Promise<{ project_id: string; app: string }> {
  const res = await fetch(`${BASE}/triage/${sessionId}/route`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ app, asset_ids: assetIds, brief }),
  });
  if (!res.ok) throw new Error("Failed to route triage session");
  return res.json();
}

// SSE streaming chat
export async function* streamChat(
  projectId: string,
  message: string,
  signal?: AbortSignal
): AsyncGenerator<SSEEvent> {
  const res = await fetch(`${BASE}/projects/${projectId}/chat`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ message }),
    signal,
  });

  if (!res.ok) {
    throw new Error(`Chat request failed: ${res.status}`);
  }

  const reader = res.body!.getReader();
  const decoder = new TextDecoder();
  let buffer = "";

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;

    buffer += decoder.decode(value, { stream: true });
    const lines = buffer.split("\n");
    buffer = lines.pop() || "";

    for (const line of lines) {
      if (line.startsWith("data: ")) {
        try {
          const event: SSEEvent = JSON.parse(line.slice(6));
          yield event;
        } catch {
          // skip malformed events
        }
      }
    }
  }
}
