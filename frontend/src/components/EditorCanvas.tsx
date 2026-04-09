import { useCallback, useMemo, useState } from "react";
import { useProjectStore } from "../stores/useProjectStore";
import type { Timeline } from "../../../shared/types";
import { buildSequenceLayout } from "../lib/timelineLayout";
import { TimelinePreview } from "./TimelinePreview";
import { TimelineWorkspace } from "./TimelineWorkspace";

interface EditorCanvasProps {
  timeline: Timeline | null;
  exports: string[];
}

export function EditorCanvas({ timeline, exports }: EditorCanvasProps) {
  const projectId = useProjectStore((s) => s.projectId)!;
  const projectStatus = useProjectStore((s) => s.status);
  const [playheadTime, setPlayheadTime] = useState(0);
  const [seekRequest, setSeekRequest] = useState<{ time: number; nonce: number } | null>(
    null
  );

  const sequence = useMemo(() => buildSequenceLayout(timeline), [timeline]);

  const handleTimeUpdate = useCallback((time: number) => {
    setPlayheadTime(time);
  }, []);

  const handleSeek = useCallback((time: number) => {
    setPlayheadTime(time);
    setSeekRequest({ time, nonce: Date.now() });
  }, []);

  return (
    <div style={styles.root}>
      <section style={styles.previewPane}>
        <div style={styles.previewHeader}>
          <div>
            <div style={styles.eyebrow}>Program Monitor</div>
            <div style={styles.title}>
              {timeline ? `Cut v${timeline.version} preview` : "Source preview"}
            </div>
          </div>
          <div style={styles.badges}>
            <span style={styles.badge}>
              Version: {timeline ? `v${timeline.version}` : "none"}
            </span>
            <span style={styles.badge}>
              Duration: {timeline ? `${sequence.sequenceDuration.toFixed(1)}s` : "0.0s"}
            </span>
            <span style={styles.badge}>Format: Timeline preview</span>
            <span
              style={{
                ...styles.badge,
                color: exports.length > 0 ? "#9ee6c7" : "var(--text-secondary)",
              }}
            >
              Render: {exports.length > 0 ? `${exports.length} export(s)` : projectStatus}
            </span>
          </div>
        </div>

        <div style={styles.previewBody}>
          <TimelinePreview
            projectId={projectId}
            timeline={timeline}
            onTimeUpdate={handleTimeUpdate}
            seekRequest={seekRequest}
          />
        </div>
      </section>

      <section style={styles.timelinePane}>
        <TimelineWorkspace
          timeline={timeline}
          playheadTime={playheadTime}
          onSeek={handleSeek}
        />
      </section>
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  root: {
    display: "flex",
    flexDirection: "column",
    gap: 16,
    height: "100%",
    minHeight: 0,
    padding: 16,
    overflow: "hidden",
  },
  previewPane: {
    display: "flex",
    flexDirection: "column",
    flex: "1 1 0",
    minHeight: 200,
    borderRadius: 24,
    border: "1px solid var(--border-subtle)",
    background:
      "linear-gradient(180deg, rgba(255,255,255,0.035), rgba(255,255,255,0.015))",
    overflow: "hidden",
    boxShadow: "0 24px 80px rgba(0,0,0,0.24)",
  },
  previewHeader: {
    display: "flex",
    justifyContent: "space-between",
    gap: 12,
    padding: "18px 20px 14px",
    borderBottom: "1px solid var(--border-subtle)",
    flexWrap: "wrap",
  },
  eyebrow: {
    fontSize: 10,
    textTransform: "uppercase",
    letterSpacing: "0.08em",
    color: "var(--text-muted)",
    marginBottom: 4,
  },
  title: {
    fontSize: 18,
    fontWeight: 600,
  },
  badges: {
    display: "flex",
    gap: 8,
    flexWrap: "wrap",
  },
  badge: {
    fontSize: 11,
    borderRadius: 999,
    padding: "6px 10px",
    background: "rgba(255,255,255,0.04)",
    border: "1px solid var(--border-subtle)",
    color: "var(--text-secondary)",
  },
  previewBody: {
    flex: 1,
    minHeight: 0,
    padding: 16,
    overflow: "hidden",
  },
  timelinePane: {
    flexShrink: 0,
    padding: "0 16px 16px",
  },
};
