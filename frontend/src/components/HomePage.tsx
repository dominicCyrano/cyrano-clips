import { useCallback, useMemo } from "react";
import { useTriageStore } from "../stores/useTriageStore";
import { useTriageChatStore } from "../stores/useTriageChatStore";
import { streamTriageChat, createTriageSession } from "../api/client";
import { AssetPanel } from "./triage/AssetPanel";
import { TriageChatPanel } from "./triage/TriageChatPanel";
import type { TriageAsset } from "../../../shared/types";

export function HomePage() {
  const sessionId = useTriageStore((s) => s.sessionId);
  const setSession = useTriageStore((s) => s.setSession);
  const triageStatus = useTriageStore((s) => s.status);
  const isStreaming = useTriageChatStore((s) => s.isStreaming);

  const hasSession = useMemo(
    () => triageStatus !== "idle" || sessionId !== null,
    [triageStatus, sessionId]
  );

  const handleRefresh = useCallback(() => {
    useTriageChatStore.getState().clear();
    useTriageStore.getState().clear();
  }, []);

  // When assets are uploaded, auto-notify the agent
  const handleAssetsUploaded = useCallback(
    async (assets: TriageAsset[]) => {
      const sid = useTriageStore.getState().sessionId;
      if (!sid || assets.length === 0) return;

      const listing = assets
        .map(
          (a) =>
            `${a.original_name} (${a.category}, ${formatSize(a.size_bytes)})`
        )
        .join(", ");

      const message = `[System: User uploaded ${assets.length} new asset${assets.length > 1 ? "s" : ""}: ${listing}]`;

      // Only auto-send if there's already a chat going or if the user has a session
      const chatStore = useTriageChatStore.getState();
      if (chatStore.messages.length > 0) {
        // Send the notification as a chat message
        chatStore.addUserMessage(message);
        const assistantId = chatStore.startAssistantMessage();
        chatStore.setStreaming(true);

        try {
          for await (const event of streamTriageChat(sid, message)) {
            const s = useTriageChatStore.getState();
            switch (event.type) {
              case "text_delta":
                s.appendText(assistantId, event.content);
                break;
              case "activity_start":
                s.addActivity(assistantId, {
                  id: event.id,
                  tool: event.tool,
                  label: event.label,
                  done: false,
                });
                break;
              case "activity_end":
                s.markActivityDone(assistantId, event.id);
                break;
              case "tool_progress":
                s.updateActivityElapsed(assistantId, event.id, event.elapsed);
                break;
              case "tool_summary": {
                const msg = s.messages.find((m) => m.id === assistantId);
                if (msg) {
                  for (const a of msg.activities) {
                    if (!a.done) s.markActivityDone(assistantId, a.id);
                  }
                }
                break;
              }
              case "error":
                s.appendText(assistantId, `\n\n**Error:** ${event.message}`);
                break;
            }
          }
        } catch (err: any) {
          if (err.name !== "AbortError") {
            useTriageChatStore
              .getState()
              .appendText(assistantId, `\n\n**Error:** ${err.message}`);
          }
        } finally {
          useTriageChatStore.getState().setStreaming(false);
        }
      }
    },
    []
  );

  return (
    <div style={styles.root}>
      {/* Header */}
      <div style={styles.header}>
        <div style={styles.brand}>
          <div style={styles.logo}>cy</div>
          <span style={styles.brandName}>cyrano</span>
        </div>
        <div style={styles.headerRight}>
          <span style={styles.tagline}>AI creative studio</span>
          {hasSession && (
            <button
              onClick={handleRefresh}
              disabled={isStreaming}
              style={{
                ...styles.refreshBtn,
                opacity: isStreaming ? 0.4 : 1,
                cursor: isStreaming ? "not-allowed" : "pointer",
              }}
              title="Start a new session"
            >
              <svg width="14" height="14" viewBox="0 0 16 16" fill="none" style={{ marginRight: 6 }}>
                <path
                  d="M13.65 2.35A7.96 7.96 0 0 0 8 0C3.58 0 0 3.58 0 8s3.58 8 8 8c3.73 0 6.84-2.55 7.73-6h-2.08A5.99 5.99 0 0 1 8 14 6 6 0 1 1 8 2c1.66 0 3.14.69 4.22 1.78L9 7h7V0l-2.35 2.35z"
                  fill="currentColor"
                />
              </svg>
              New session
            </button>
          )}
        </div>
      </div>

      {/* Two-panel layout */}
      <div style={styles.panels}>
        {/* Left: Assets */}
        <div style={styles.leftPanel}>
          <AssetPanel onAssetsUploaded={handleAssetsUploaded} />
        </div>

        {/* Divider */}
        <div style={styles.divider} />

        {/* Right: Chat */}
        <div style={styles.rightPanel}>
          <TriageChatPanel />
        </div>
      </div>
    </div>
  );
}

function formatSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`;
  if (bytes < 1024 * 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  return `${(bytes / (1024 * 1024 * 1024)).toFixed(2)} GB`;
}

const styles: Record<string, React.CSSProperties> = {
  root: {
    display: "flex",
    flexDirection: "column",
    height: "100%",
    background: "var(--bg-root)",
    overflow: "hidden",
  },
  header: {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    padding: "12px 24px",
    borderBottom: "1px solid var(--border-subtle)",
    flexShrink: 0,
  },
  brand: {
    display: "flex",
    alignItems: "center",
    gap: 10,
  },
  logo: {
    width: 32,
    height: 32,
    borderRadius: 8,
    background: "linear-gradient(135deg, #7c5cfc, #a78bfa)",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    fontSize: 14,
    fontWeight: 700,
    color: "#fff",
    fontFamily: "var(--font-mono)",
    letterSpacing: -1,
  },
  brandName: {
    fontSize: 20,
    fontWeight: 700,
    color: "var(--text-primary)",
    letterSpacing: -0.5,
  },
  headerRight: {
    display: "flex",
    alignItems: "center",
    gap: 12,
  },
  tagline: {
    fontSize: 13,
    color: "var(--text-muted)",
  },
  refreshBtn: {
    display: "flex",
    alignItems: "center",
    padding: "6px 14px",
    borderRadius: 8,
    border: "1px solid var(--border-subtle)",
    background: "transparent",
    color: "var(--text-secondary)",
    fontSize: 13,
    fontFamily: "var(--font-sans)",
    fontWeight: 500,
    transition: "all 0.15s ease",
  },
  panels: {
    display: "flex",
    flex: 1,
    overflow: "hidden",
  },
  leftPanel: {
    width: 340,
    flexShrink: 0,
    padding: "16px 20px",
    overflowY: "auto",
  },
  divider: {
    width: 1,
    background: "var(--border-subtle)",
    flexShrink: 0,
  },
  rightPanel: {
    flex: 1,
    overflow: "hidden",
  },
};
