import { useState, useEffect } from "react";
import { useProjectStore } from "../stores/useProjectStore";
import { getTranscript } from "../api/client";
import type { TranscriptSegment } from "../../../shared/types";

const SPEAKER_COLORS = [
  "#7c5cfc",
  "#e24b4a",
  "#34d399",
  "#fbbf24",
  "#60a5fa",
  "#f472b6",
];

function formatTime(sec: number): string {
  const m = Math.floor(sec / 60);
  const s = Math.floor(sec % 60);
  return `${m}:${s.toString().padStart(2, "0")}`;
}

export function TranscriptDrawer() {
  const projectId = useProjectStore((s) => s.projectId)!;
  const [segments, setSegments] = useState<TranscriptSegment[]>([]);
  const [speakers, setSpeakers] = useState<string[]>([]);

  useEffect(() => {
    getTranscript(projectId).then((t) => {
      if (t) {
        setSegments(t.segments || []);
        setSpeakers(t.speakers || []);
      }
    });
  }, [projectId]);

  const colorMap = new Map<string, string>();
  speakers.forEach((s, i) => {
    colorMap.set(s, SPEAKER_COLORS[i % SPEAKER_COLORS.length]);
  });

  if (segments.length === 0) {
    return (
      <div style={styles.root}>
        <div style={styles.empty}>No transcript available</div>
      </div>
    );
  }

  return (
    <div style={styles.root}>
      <div style={styles.inner}>
        {segments.map((seg) => (
          <div key={seg.id} className="hover-row" style={styles.row}>
            <span style={styles.time}>{formatTime(seg.start)}</span>
            <span
              style={{
                ...styles.speaker,
                color: colorMap.get(seg.speaker) || "var(--text-secondary)",
              }}
            >
              {seg.speaker}
            </span>
            <span style={styles.text}>{seg.text}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  root: {
    height: 160,
    flexShrink: 0,
    borderTop: "1px solid var(--border-subtle)",
    background: "var(--bg-surface)",
    overflowY: "auto",
  },
  inner: {
    padding: "8px 16px",
    display: "flex",
    flexDirection: "column",
    gap: 2,
  },
  empty: {
    padding: 16,
    fontSize: 12,
    color: "var(--text-muted)",
    textAlign: "center" as const,
  },
  row: {
    display: "flex",
    gap: 10,
    padding: "5px 8px",
    borderRadius: 4,
    fontSize: 13,
    alignItems: "baseline",
    cursor: "default",
  },
  time: {
    fontFamily: "var(--font-mono)",
    fontSize: 11,
    color: "var(--text-muted)",
    flexShrink: 0,
    width: 36,
  },
  speaker: {
    fontSize: 11,
    fontWeight: 600,
    flexShrink: 0,
    width: 90,
    overflow: "hidden",
    textOverflow: "ellipsis",
    whiteSpace: "nowrap" as const,
  },
  text: {
    color: "var(--text-primary)",
    flex: 1,
  },
};
