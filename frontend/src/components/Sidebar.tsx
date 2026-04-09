import { useState } from "react";
import { useProjectStore } from "../stores/useProjectStore";
import { getExportUrl } from "../api/client";
import type { Timeline } from "../../../shared/types";

interface SidebarProps {
  timeline: Timeline | null;
  exports: string[];
}

export function Sidebar({ timeline, exports }: SidebarProps) {
  const projectId = useProjectStore((s) => s.projectId)!;
  const projectName =
    useProjectStore((s) => s.projectName) || "Untitled Project";
  const [collapsed, setCollapsed] = useState({
    inspector: false,
    assets: false,
    exports: false,
  });

  const assetItems = [
    "raw/source.mp4",
    "audio/source.wav",
    "transcripts/transcript.json",
    timeline ? "timelines/latest.json" : "timelines/",
  ];

  const toggleSection = (section: keyof typeof collapsed) => {
    setCollapsed((state) => ({ ...state, [section]: !state[section] }));
  };

  return (
    <div style={styles.root}>
      <div style={styles.section}>
        <button
          type="button"
          style={styles.sectionHeader}
          onClick={() => toggleSection("inspector")}
        >
          <div style={styles.sectionLabel}>Inspector</div>
          <span style={styles.sectionToggle}>
            {collapsed.inspector ? "+" : "-"}
          </span>
        </button>
        {!collapsed.inspector && (
          <div style={styles.cardStack}>
            <div style={styles.infoCard}>
              <div style={styles.cardTitle}>Current Cut</div>
              <div style={styles.cardValue}>
                {timeline ? `Version ${timeline.version}` : "No active timeline"}
              </div>
              <div style={styles.cardMeta}>
                {timeline
                  ? `${timeline.clips.length} clips · ${timeline.total_duration.toFixed(
                      1
                    )}s`
                  : "Ask Cyrano to build a sequence"}
              </div>
            </div>
            <div style={styles.infoCard}>
              <div style={styles.cardTitle}>Intent</div>
              <div style={styles.cardValue}>
                {timeline?.purpose || "No purpose saved yet"}
              </div>
              <div style={styles.cardMeta}>{projectName}</div>
            </div>
          </div>
        )}
      </div>

      <div style={styles.section}>
        <button
          type="button"
          style={styles.sectionHeader}
          onClick={() => toggleSection("assets")}
        >
          <div style={styles.sectionLabel}>Project Assets</div>
          <span style={styles.sectionToggle}>{collapsed.assets ? "+" : "-"}</span>
        </button>
        {!collapsed.assets && (
          <div style={styles.assetList}>
            {assetItems.map((item) => (
              <div key={item} style={styles.assetRow}>
                <span style={styles.assetDot} />
                <span style={styles.assetPath}>{item}</span>
              </div>
            ))}
            <div style={styles.assetHint}>
              Raw media and transcripts stay fixed; Cyrano updates the timeline.
            </div>
          </div>
        )}
      </div>

      <div style={styles.section}>
        <button
          type="button"
          style={styles.sectionHeader}
          onClick={() => toggleSection("exports")}
        >
          <div style={styles.sectionLabel}>Exports</div>
          <span style={styles.sectionToggle}>{collapsed.exports ? "+" : "-"}</span>
        </button>
        {!collapsed.exports &&
          (exports.length > 0 ? (
            exports.map((f) => (
              <a
                key={f}
                href={getExportUrl(projectId, f)}
                download
                style={styles.exportLink}
              >
                {f}
              </a>
            ))
          ) : (
            <div style={styles.placeholder}>No exports yet</div>
          ))}
      </div>
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  root: {
    width: 300,
    flexShrink: 0,
    borderLeft: "1px solid var(--border-subtle)",
    background: "var(--bg-elevated)",
    overflowY: "auto",
    display: "flex",
    flexDirection: "column",
  },
  section: {
    padding: "14px 16px",
    borderBottom: "1px solid var(--border-subtle)",
  },
  sectionHeader: {
    width: "100%",
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 12,
    textAlign: "left",
    marginBottom: 10,
  },
  sectionLabel: {
    fontSize: 11,
    fontWeight: 600,
    textTransform: "uppercase",
    letterSpacing: "0.05em",
    color: "var(--text-secondary)",
  },
  sectionToggle: {
    color: "var(--text-muted)",
    fontSize: 16,
    lineHeight: 1,
  },
  cardStack: {
    display: "flex",
    flexDirection: "column",
    gap: 10,
  },
  infoCard: {
    borderRadius: 12,
    padding: 12,
    background: "rgba(255,255,255,0.03)",
    border: "1px solid var(--border-subtle)",
  },
  cardTitle: {
    fontSize: 10,
    textTransform: "uppercase",
    letterSpacing: "0.08em",
    color: "var(--text-muted)",
    marginBottom: 6,
  },
  cardValue: {
    fontSize: 13,
    color: "var(--text-primary)",
    fontWeight: 600,
    lineHeight: 1.5,
  },
  cardMeta: {
    marginTop: 6,
    fontSize: 11,
    color: "var(--text-secondary)",
    lineHeight: 1.5,
  },
  assetList: {
    display: "flex",
    flexDirection: "column",
    gap: 8,
  },
  assetRow: {
    display: "flex",
    alignItems: "center",
    gap: 8,
    fontSize: 12,
    color: "var(--text-secondary)",
  },
  assetDot: {
    width: 7,
    height: 7,
    borderRadius: "50%",
    background: "var(--accent)",
    flexShrink: 0,
  },
  assetPath: {
    fontFamily: "var(--font-mono)",
    overflow: "hidden",
    textOverflow: "ellipsis",
    whiteSpace: "nowrap",
  },
  assetHint: {
    marginTop: 6,
    fontSize: 11,
    color: "var(--text-muted)",
    lineHeight: 1.5,
  },
  placeholder: {
    fontSize: 12,
    color: "var(--text-muted)",
    padding: "8px 0",
  },
  exportLink: {
    display: "block",
    fontSize: 13,
    color: "var(--accent)",
    textDecoration: "none",
    padding: "4px 0",
  },
};
