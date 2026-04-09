import type { BatchClip } from "../../../../shared/types";

const PLATFORM_COLORS: Record<string, string> = {
  tiktok: "#ff0050",
  reels: "#e1306c",
  shorts: "#ff0000",
  twitter: "#1da1f2",
};

interface BatchClipGridProps {
  clips: BatchClip[];
  onClipSelect: (clip: BatchClip) => void;
}

export function BatchClipGrid({ clips, onClipSelect }: BatchClipGridProps) {
  if (clips.length === 0) {
    return (
      <div style={styles.empty}>
        <p style={{ fontSize: 15, fontWeight: 500 }}>No clips yet</p>
        <p style={{ fontSize: 13, color: "var(--text-muted)" }}>
          Ask Cyrano to find viral moments in your footage
        </p>
      </div>
    );
  }

  return (
    <div style={styles.grid}>
      {clips.map((clip, i) => (
        <button
          key={clip.id}
          style={{
            ...styles.card,
            animation: `fadeUp 0.4s ease-out ${i * 0.04}s both`,
          }}
          onClick={() => onClipSelect(clip)}
          onMouseEnter={(e) => {
            e.currentTarget.style.borderColor = "var(--accent)";
            e.currentTarget.style.transform = "translateY(-2px)";
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.borderColor = "var(--border)";
            e.currentTarget.style.transform = "translateY(0)";
          }}
        >
          {/* Header */}
          <div style={styles.cardHeader}>
            <span style={styles.clipNum}>{clip.id.replace("batch_", "#")}</span>
            <span style={styles.duration}>{clip.duration.toFixed(1)}s</span>
          </div>

          {/* Hook */}
          <p style={styles.hook}>
            {clip.hook.length > 80 ? clip.hook.slice(0, 80) + "..." : clip.hook}
          </p>

          {/* Transcript preview */}
          <p style={styles.transcript}>
            {clip.transcript_text.length > 100
              ? clip.transcript_text.slice(0, 100) + "..."
              : clip.transcript_text}
          </p>

          {/* Footer */}
          <div style={styles.cardFooter}>
            <span
              style={{
                ...styles.platform,
                background: `${PLATFORM_COLORS[clip.platform] || "var(--accent)"}20`,
                color: PLATFORM_COLORS[clip.platform] || "var(--accent)",
              }}
            >
              {clip.platform}
            </span>
            <span style={styles.speaker}>{clip.speaker}</span>
          </div>
        </button>
      ))}
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  empty: {
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    height: "100%",
    color: "var(--text-secondary)",
  },
  grid: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fill, minmax(220px, 1fr))",
    gap: 12,
    padding: 4,
  },
  card: {
    display: "flex",
    flexDirection: "column",
    gap: 8,
    padding: 16,
    borderRadius: 12,
    border: "1px solid var(--border)",
    background: "var(--bg-surface)",
    cursor: "pointer",
    transition: "all 0.15s",
    textAlign: "left",
  },
  cardHeader: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
  },
  clipNum: {
    fontSize: 12,
    fontWeight: 700,
    fontFamily: "var(--font-mono)",
    color: "var(--accent)",
  },
  duration: {
    fontSize: 12,
    fontWeight: 600,
    fontFamily: "var(--font-mono)",
    color: "var(--text-secondary)",
    background: "var(--bg-hover)",
    padding: "2px 6px",
    borderRadius: 4,
  },
  hook: {
    fontSize: 14,
    fontWeight: 600,
    color: "var(--text-primary)",
    lineHeight: 1.4,
    margin: 0,
  },
  transcript: {
    fontSize: 12,
    color: "var(--text-muted)",
    lineHeight: 1.5,
    margin: 0,
    flex: 1,
  },
  cardFooter: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    marginTop: 4,
  },
  platform: {
    fontSize: 11,
    fontWeight: 600,
    textTransform: "uppercase",
    letterSpacing: "0.04em",
    padding: "2px 8px",
    borderRadius: 6,
  },
  speaker: {
    fontSize: 11,
    color: "var(--text-muted)",
    fontFamily: "var(--font-mono)",
  },
};
