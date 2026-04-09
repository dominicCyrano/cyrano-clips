import { useState, useEffect, useCallback } from "react";
import { useProjectStore } from "../stores/useProjectStore";
import { getTimeline, getExports } from "../api/client";
import type { Timeline } from "../../../shared/types";
import { ChatPanel } from "./ChatPanel";
import { Sidebar } from "./Sidebar";
import { TranscriptDrawer } from "./TranscriptDrawer";
import { EditorCanvas } from "./EditorCanvas";

function isNarrowViewport() {
  return typeof window !== "undefined" && window.innerWidth < 1220;
}

export function EditorLayout() {
  const projectId = useProjectStore((s) => s.projectId)!;
  const projectName = useProjectStore((s) => s.projectName);
  const [sidebarOpen, setSidebarOpen] = useState(() => !isNarrowViewport());
  const [transcriptOpen, setTranscriptOpen] = useState(false);
  const [timeline, setTimeline] = useState<Timeline | null>(null);
  const [exports, setExports] = useState<string[]>([]);

  const refreshTimeline = useCallback(async () => {
    try {
      setTimeline(await getTimeline(projectId));
    } catch {
      setTimeline(null);
    }

    try {
      setExports(await getExports(projectId));
    } catch {
      setExports([]);
    }
  }, [projectId]);

  useEffect(() => {
    refreshTimeline();
  }, [refreshTimeline]);

  useEffect(() => {
    const handleResize = () => {
      setSidebarOpen(!isNarrowViewport());
    };

    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  return (
    <div style={styles.root}>
      <header style={styles.header}>
        <div style={styles.headerLeft}>
          <div style={styles.logo}>C</div>
          <span style={styles.brand}>Cyrano Clips</span>
        </div>
        <span style={styles.projectName}>{projectName}</span>
        <div style={styles.headerRight}>
          <button
            className="hover-btn"
            style={styles.headerBtn}
            onClick={() => setTranscriptOpen((v) => !v)}
          >
            {transcriptOpen ? "Hide Transcript" : "Transcript"}
          </button>
          <button
            className="hover-btn"
            style={styles.headerBtn}
            onClick={() => setSidebarOpen((v) => !v)}
          >
            {sidebarOpen ? "Hide Inspector" : "Inspector"}
          </button>
        </div>
      </header>

      <div style={styles.body}>
        <aside style={styles.chatRail}>
          <div style={styles.chatRailHeader}>
            <div style={styles.railEyebrow}>Editor Chat</div>
            <div style={styles.railTitle}>Cyrano</div>
            <div style={styles.railCopy}>
              Direct the cut, request revisions, and keep the edit moving.
            </div>
          </div>
          <div style={styles.chatRailBody}>
            <ChatPanel refreshTimeline={refreshTimeline} compact />
          </div>
        </aside>

        <div style={styles.canvasWrap}>
          <EditorCanvas timeline={timeline} exports={exports} />
        </div>

        {sidebarOpen && <Sidebar timeline={timeline} exports={exports} />}
      </div>

      {transcriptOpen && <TranscriptDrawer />}
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  root: {
    display: "flex",
    flexDirection: "column",
    height: "100%",
    background: "var(--bg-root)",
  },
  header: {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 12,
    height: 48,
    padding: "0 16px",
    borderBottom: "1px solid var(--border-subtle)",
    flexShrink: 0,
  },
  headerLeft: {
    display: "flex",
    alignItems: "center",
    gap: 10,
  },
  logo: {
    width: 28,
    height: 28,
    borderRadius: 7,
    background: "var(--accent)",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    fontSize: 13,
    fontWeight: 700,
    color: "#fff",
  },
  brand: {
    fontSize: 14,
    fontWeight: 600,
    color: "var(--text-primary)",
  },
  projectName: {
    fontSize: 13,
    color: "var(--text-secondary)",
    overflow: "hidden",
    textOverflow: "ellipsis",
    whiteSpace: "nowrap",
  },
  headerRight: {
    display: "flex",
    gap: 4,
    flexShrink: 0,
  },
  headerBtn: {
    padding: "5px 12px",
    borderRadius: 6,
    fontSize: 12,
    fontWeight: 500,
    color: "var(--text-secondary)",
    background: "var(--bg-elevated)",
    border: "1px solid var(--border-subtle)",
    transition: "all 0.15s",
  },
  body: {
    display: "flex",
    flex: 1,
    minHeight: 0,
  },
  chatRail: {
    width: 340,
    flexShrink: 0,
    display: "flex",
    flexDirection: "column",
    borderRight: "1px solid var(--border-subtle)",
    background: "var(--bg-surface)",
  },
  chatRailHeader: {
    padding: "18px 16px 14px",
    borderBottom: "1px solid var(--border-subtle)",
  },
  railEyebrow: {
    fontSize: 10,
    textTransform: "uppercase",
    letterSpacing: "0.08em",
    color: "var(--text-muted)",
    marginBottom: 6,
  },
  railTitle: {
    fontSize: 18,
    fontWeight: 600,
    marginBottom: 6,
  },
  railCopy: {
    fontSize: 13,
    color: "var(--text-secondary)",
    lineHeight: 1.6,
  },
  chatRailBody: {
    flex: 1,
    minHeight: 0,
  },
  canvasWrap: {
    flex: 1,
    minWidth: 0,
    display: "flex",
    flexDirection: "column",
    overflow: "hidden",
  },
};
