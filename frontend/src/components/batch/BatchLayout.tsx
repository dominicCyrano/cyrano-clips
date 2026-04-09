import { useState, useCallback } from "react";
import { useProjectStore } from "../../stores/useProjectStore";
import { useChatStore } from "../../stores/useChatStore";
import { getBatchClips } from "../../api/client";
import { ChatPanel } from "../ChatPanel";
import { BatchClipGrid } from "./BatchClipGrid";
import { BatchClipPreview } from "./BatchClipPreview";
import type { BatchClip, BatchTimeline } from "../../../../shared/types";

const BATCH_SUGGESTIONS = [
  "Find me 15 viral clips",
  "Mine every hookable moment",
  "Find clips under 30 seconds",
  "Get me TikTok-ready clips",
];

const BATCH_QUICK_REVISIONS = [
  "Find more clips",
  "Make them shorter",
  "Stronger hooks only",
  "Export all clips",
];

export function BatchLayout() {
  const projectId = useProjectStore((s) => s.projectId)!;
  const projectName = useProjectStore((s) => s.projectName);
  const [batch, setBatch] = useState<BatchTimeline | null>(null);
  const [selectedClip, setSelectedClip] = useState<BatchClip | null>(null);

  const refreshBatch = useCallback(async () => {
    try {
      const data = await getBatchClips(projectId);
      if (data) setBatch(data);
    } catch {
      // batch not ready yet
    }
  }, [projectId]);

  const handleResult = useCallback(
    async (assistantId: string) => {
      try {
        const data = await getBatchClips(projectId);
        if (data) {
          setBatch(data);
          // Set a summary card on the assistant message
          const store = useChatStore.getState();
          store.setTimelineCard(assistantId, {
            version: data.version,
            purpose: `${data.total_clips} viral clips found`,
            clipCount: data.total_clips,
            duration: data.clips.reduce((sum, c) => sum + c.duration, 0),
            labels: data.clips.slice(0, 6).map((c) => c.hook.slice(0, 30) + "..."),
          });
        }
      } catch {
        // batch not ready yet
      }
    },
    [projectId]
  );

  return (
    <div style={styles.root}>
      {/* Header */}
      <div style={styles.header}>
        <div style={styles.brand}>
          <div style={styles.logo}>B</div>
          <span style={styles.brandName}>Cyrano Batch</span>
        </div>
        <span style={styles.projectName}>{projectName}</span>
        {batch && (
          <span style={styles.clipCount}>
            {batch.total_clips} clips
          </span>
        )}
      </div>

      {/* Two-panel layout */}
      <div style={styles.panels}>
        {/* Left: Clip grid */}
        <div style={styles.gridPanel}>
          <BatchClipGrid
            clips={batch?.clips || []}
            onClipSelect={setSelectedClip}
          />
        </div>

        {/* Divider */}
        <div style={styles.divider} />

        {/* Right: Chat */}
        <div style={styles.chatPanel}>
          <ChatPanel
            refreshTimeline={refreshBatch}
            compact
            onResult={handleResult}
            suggestions={BATCH_SUGGESTIONS}
            quickRevisions={BATCH_QUICK_REVISIONS}
          />
        </div>
      </div>

      {/* Clip preview modal */}
      {selectedClip && (
        <BatchClipPreview
          clip={selectedClip}
          onClose={() => setSelectedClip(null)}
        />
      )}
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  root: {
    display: "flex",
    flexDirection: "column",
    height: "100%",
    overflow: "hidden",
    background: "var(--bg-root)",
  },
  header: {
    display: "flex",
    alignItems: "center",
    gap: 16,
    padding: "10px 20px",
    borderBottom: "1px solid var(--border-subtle)",
    flexShrink: 0,
  },
  brand: {
    display: "flex",
    alignItems: "center",
    gap: 8,
  },
  logo: {
    width: 28,
    height: 28,
    borderRadius: 7,
    background: "linear-gradient(135deg, #e24b4a, #ff7b6b)",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    fontSize: 13,
    fontWeight: 700,
    color: "#fff",
  },
  brandName: {
    fontSize: 16,
    fontWeight: 700,
    color: "var(--text-primary)",
  },
  projectName: {
    fontSize: 13,
    color: "var(--text-secondary)",
    flex: 1,
  },
  clipCount: {
    fontSize: 12,
    fontWeight: 600,
    color: "#e24b4a",
    background: "rgba(226, 75, 74, 0.12)",
    padding: "3px 10px",
    borderRadius: 8,
  },
  panels: {
    display: "flex",
    flex: 1,
    overflow: "hidden",
  },
  gridPanel: {
    flex: 1,
    overflowY: "auto",
    padding: 16,
  },
  divider: {
    width: 1,
    background: "var(--border-subtle)",
    flexShrink: 0,
  },
  chatPanel: {
    width: 420,
    flexShrink: 0,
    overflow: "hidden",
  },
};
