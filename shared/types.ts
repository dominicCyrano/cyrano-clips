// ---- Project ----

export type ProjectStatus =
  | "uploading"
  | "extracting_audio"
  | "transcribing"
  | "editing"
  | "error";

export type AppType = "clips" | "batch";

export interface Project {
  id: string;
  name: string;
  client_name?: string;
  app_type?: AppType;
  status: ProjectStatus;
  error_detail?: string;
  session_id?: string; // Claude Agent SDK session ID
  created_at: string;
  updated_at: string;
}

// ---- Timeline ----

export interface Clip {
  id: string;
  source_start: number;
  source_end: number;
  speaker: string;
  transcript_text: string;
}

export interface Timeline {
  version: number;
  purpose?: string;
  clips: Clip[];
  total_duration: number;
}

// ---- Batch ----

export interface BatchClip {
  id: string;
  source_start: number;
  source_end: number;
  speaker: string;
  transcript_text: string;
  hook: string;
  platform: string;
  duration: number;
}

export interface BatchTimeline {
  version: number;
  clips: BatchClip[];
  total_clips: number;
}

// ---- Transcript ----

export interface Word {
  word: string;
  start: number;
  end: number;
  score: number;
}

export interface TranscriptSegment {
  id: string;
  start: number;
  end: number;
  text: string;
  speaker: string;
  words: Word[];
}

export interface Transcript {
  media_id: string;
  duration: number;
  language: string;
  speakers: string[];
  segments: TranscriptSegment[];
}

// ---- SSE Events (backend -> frontend) ----

export type SSEEvent =
  | { type: "text_delta"; content: string }
  | { type: "activity_start"; id: string; tool: string; label: string }
  | { type: "activity_end"; id: string }
  | { type: "tool_progress"; id: string; tool: string; elapsed: number }
  | { type: "tool_summary"; summary: string }
  | { type: "result"; cost: number; turns: number; text: string }
  | { type: "error"; message: string }
  | { type: "done" };

// ---- Triage ----

export type AssetCategory = "video" | "image" | "document" | "audio" | "other";

export interface TriageAsset {
  id: string;
  original_name: string;
  mime_type: string;
  size_bytes: number;
  category: AssetCategory;
  uploaded_at: string;
}

export interface TriageSession {
  id: string;
  status: "active" | "routed";
  session_id?: string;
  routed_to?: {
    app: string;
    project_id: string;
  };
  assets: TriageAsset[];
  created_at: string;
  updated_at: string;
}

export type TriageSSEEvent =
  | SSEEvent
  | { type: "route_action"; app: string; project_id: string };
