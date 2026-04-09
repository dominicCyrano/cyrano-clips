import type { Timeline } from "../../../shared/types";

export interface SequenceClipLayout {
  id: string;
  label: string;
  speaker: string;
  transcriptText: string;
  sourceStart: number;
  sourceEnd: number;
  duration: number;
  clipStart: number;
  clipEnd: number;
}

export interface SequenceLayout {
  clips: SequenceClipLayout[];
  sequenceDuration: number;
  reportedDuration: number;
  durationDelta: number;
}

const TICK_INTERVALS = [
  0.25,
  0.5,
  1,
  2,
  5,
  10,
  15,
  30,
  60,
  120,
  300,
  600,
];

export function buildSequenceLayout(timeline: Timeline | null): SequenceLayout {
  if (!timeline?.clips.length) {
    return {
      clips: [],
      sequenceDuration: 0,
      reportedDuration: timeline?.total_duration ?? 0,
      durationDelta: 0,
    };
  }

  let cursor = 0;
  const clips = timeline.clips.map((clip, index) => {
    const duration = Math.max(clip.source_end - clip.source_start, 0);
    const out: SequenceClipLayout = {
      id: clip.id,
      label: clip.transcript_text.trim().slice(0, 48) || `Clip ${index + 1}`,
      speaker: clip.speaker,
      transcriptText: clip.transcript_text,
      sourceStart: clip.source_start,
      sourceEnd: clip.source_end,
      duration,
      clipStart: cursor,
      clipEnd: cursor + duration,
    };
    cursor += duration;
    return out;
  });

  const reportedDuration = timeline.total_duration ?? cursor;
  return {
    clips,
    sequenceDuration: cursor,
    reportedDuration,
    durationDelta: reportedDuration - cursor,
  };
}

export function findSequenceClipAtTime(
  time: number,
  clips: SequenceClipLayout[]
): SequenceClipLayout | null {
  for (const clip of clips) {
    if (time >= clip.clipStart && time < clip.clipEnd) return clip;
  }
  return clips[clips.length - 1] ?? null;
}

export function clampSequenceTime(time: number, duration: number): number {
  if (!Number.isFinite(time) || duration <= 0) return 0;
  return Math.max(0, Math.min(time, duration));
}

export function getTickInterval(pxPerSecond: number): number {
  if (!Number.isFinite(pxPerSecond) || pxPerSecond <= 0) return 10;

  const targetSeconds = 84 / pxPerSecond;
  return (
    TICK_INTERVALS.find((interval) => interval >= targetSeconds) ??
    TICK_INTERVALS[TICK_INTERVALS.length - 1]
  );
}

export function formatClock(seconds: number, includeTenths = false): string {
  const clamped = Math.max(seconds, 0);
  const mins = Math.floor(clamped / 60);
  const secs = Math.floor(clamped % 60);

  if (!includeTenths) {
    return `${String(mins).padStart(2, "0")}:${String(secs).padStart(2, "0")}`;
  }

  const tenths = Math.floor((clamped % 1) * 10);
  return `${String(mins).padStart(2, "0")}:${String(secs).padStart(2, "0")}.${tenths}`;
}
