import React from "react";
import type { ChatMessage } from "../stores/useChatStore";

interface Props {
  message: ChatMessage;
  compact?: boolean;
}

// Minimal markdown: **bold** and `code`
function renderInline(text: string): React.ReactNode[] {
  const parts: React.ReactNode[] = [];
  const regex = /(\*\*(.+?)\*\*|`(.+?)`)/g;
  let last = 0;
  let match: RegExpExecArray | null;

  while ((match = regex.exec(text)) !== null) {
    if (match.index > last) {
      parts.push(text.slice(last, match.index));
    }
    if (match[2]) {
      parts.push(
        <strong key={match.index} style={{ fontWeight: 600 }}>
          {match[2]}
        </strong>
      );
    } else if (match[3]) {
      parts.push(
        <code
          key={match.index}
          style={{
            fontFamily: "var(--font-mono)",
            fontSize: "0.9em",
            background: "var(--bg-hover)",
            padding: "1px 5px",
            borderRadius: 4,
          }}
        >
          {match[3]}
        </code>
      );
    }
    last = match.index + match[0].length;
  }
  if (last < text.length) parts.push(text.slice(last));
  return parts;
}

function isMarkdownTable(block: string) {
  const lines = block
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean);

  if (lines.length < 2) return false;
  if (!lines.every((line) => line.includes("|"))) return false;

  return /^\|?[\s:-]+(?:\|[\s:-]+)+\|?$/.test(lines[1]);
}

function renderText(text: string) {
  return text.split(/\n{2,}/).map((block, index) => {
    if (isMarkdownTable(block)) {
      return (
        <pre key={index} style={styles.tableBlock}>
          {block}
        </pre>
      );
    }

    const lines = block.split("\n");
    return (
      <p key={index} style={styles.paragraph}>
        {lines.map((line, lineIndex) => (
          <React.Fragment key={lineIndex}>
            {lineIndex > 0 && <br />}
            {renderInline(line)}
          </React.Fragment>
        ))}
      </p>
    );
  });
}

export const ChatBubble = React.memo(function ChatBubble({
  message,
  compact = false,
}: Props) {
  const isUser = message.role === "user";
  const showTypingIndicator =
    !isUser && !message.text && !message.timelineCard;
  const visibleActivities = message.activities.slice(-5);
  const hiddenActivityCount = Math.max(
    message.activities.length - visibleActivities.length,
    0
  );

  return (
    <div style={{ padding: compact ? "6px 14px" : "6px 48px" }}>
      <div
        style={{
          maxWidth: compact ? "100%" : 640,
          margin: isUser ? "0 0 0 auto" : "0 auto 0 0",
          contain: "layout paint",
        }}
      >
        {/* Role label */}
        <div
          style={{
            fontSize: 11,
            fontWeight: 600,
            textTransform: "uppercase" as const,
            letterSpacing: "0.05em",
            color: isUser ? "var(--text-muted)" : "var(--accent)",
            marginBottom: 4,
            textAlign: isUser ? ("right" as const) : ("left" as const),
          }}
        >
          {isUser ? "You" : "Cyrano"}
        </div>

        {/* Bubble */}
        <div
          style={{
            padding: "12px 16px",
            borderRadius: isUser ? "14px 14px 4px 14px" : "14px 14px 14px 4px",
            background: isUser ? "var(--accent-dim)" : "var(--bg-surface)",
            border: `1px solid ${isUser ? "rgba(124,92,252,0.15)" : "var(--border-subtle)"}`,
          }}
        >
          {/* Activities (assistant only) */}
          {!isUser && message.activities.length > 0 && (
            <div style={styles.activities}>
              {hiddenActivityCount > 0 && (
                <div style={styles.activitySummary}>
                  {hiddenActivityCount} earlier actions hidden
                </div>
              )}
              {visibleActivities.map((a) => (
                <div key={a.id} style={styles.activityRow}>
                  {a.done ? (
                    <svg
                      width="12"
                      height="12"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="var(--success)"
                      strokeWidth="2.5"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    >
                      <polyline points="20 6 9 17 4 12" />
                    </svg>
                  ) : (
                    <span
                      style={{
                        width: 12,
                        height: 12,
                        borderRadius: "50%",
                        border: "2px solid var(--accent)",
                        borderTopColor: "transparent",
                        display: "inline-block",
                        animation: "spin 0.8s linear infinite",
                      }}
                    />
                  )}
                  <span style={styles.activityLabel}>{a.label}</span>
                  {a.elapsed != null && !a.done && (
                    <span style={styles.activityTime}>
                      {a.elapsed.toFixed(0)}s
                    </span>
                  )}
                </div>
              ))}
            </div>
          )}

          {/* Text */}
          {message.text ? (
            <div style={styles.text}>{renderText(message.text)}</div>
          ) : null}

          {showTypingIndicator && (
            <div style={styles.typingIndicator} aria-label="Cyrano is typing">
              <span style={styles.typingDot} />
              <span style={styles.typingDot} />
              <span style={styles.typingDot} />
            </div>
          )}

          {/* Timeline card */}
          {message.timelineCard && (
            <div style={styles.timelineCard}>
              <div style={styles.timelineCardHeader}>
                <span style={{ fontWeight: 600, fontSize: 12 }}>
                  Timeline v{message.timelineCard.version}
                </span>
                <span style={{ color: "var(--text-muted)", fontSize: 12 }}>
                  {message.timelineCard.clipCount} clips
                  {" \u00b7 "}
                  {message.timelineCard.duration.toFixed(1)}s
                </span>
              </div>
              {message.timelineCard.purpose && (
                <div
                  style={{
                    fontSize: 12,
                    color: "var(--text-secondary)",
                    marginBottom: 8,
                  }}
                >
                  {message.timelineCard.purpose}
                </div>
              )}
              <div style={styles.clipBar}>
                {message.timelineCard.labels.map((_, i) => (
                  <div
                    key={i}
                    style={{
                      ...styles.clipBlock,
                      flex: 1,
                      background:
                        i % 2 === 0
                          ? "var(--accent)"
                          : "rgba(124, 92, 252, 0.5)",
                    }}
                  />
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
});

const styles: Record<string, React.CSSProperties> = {
  activities: {
    display: "flex",
    flexDirection: "column",
    gap: 6,
    marginBottom: 12,
    paddingBottom: 12,
    borderBottom: "1px solid var(--border-subtle)",
  },
  activitySummary: {
    fontSize: 11,
    color: "var(--text-muted)",
    fontFamily: "var(--font-mono)",
  },
  activityRow: {
    display: "flex",
    alignItems: "center",
    gap: 8,
    fontSize: 12,
    fontFamily: "var(--font-mono)",
    color: "var(--text-secondary)",
  },
  activityLabel: {
    flex: 1,
    overflow: "hidden",
    textOverflow: "ellipsis",
    whiteSpace: "nowrap" as const,
  },
  activityTime: {
    color: "var(--text-muted)",
    fontSize: 11,
    flexShrink: 0,
  },
  text: {
    fontSize: 14,
    lineHeight: 1.7,
    wordBreak: "break-word",
    display: "flex",
    flexDirection: "column",
    gap: 10,
  },
  paragraph: {
    margin: 0,
    whiteSpace: "pre-wrap",
  },
  tableBlock: {
    margin: 0,
    padding: "10px 12px",
    borderRadius: 8,
    background: "rgba(255,255,255,0.03)",
    border: "1px solid var(--border-subtle)",
    color: "var(--text-secondary)",
    fontFamily: "var(--font-mono)",
    fontSize: 12,
    lineHeight: 1.6,
    overflowX: "auto",
  },
  typingIndicator: {
    display: "inline-flex",
    alignItems: "center",
    gap: 6,
    minHeight: 18,
    padding: "2px 0",
  },
  typingDot: {
    width: 6,
    height: 6,
    borderRadius: "50%",
    background: "var(--text-secondary)",
    animation: "pulse 1.1s infinite",
  },
  timelineCard: {
    marginTop: 12,
    padding: 12,
    borderRadius: 8,
    background: "var(--bg-elevated)",
    border: "1px solid var(--border-subtle)",
  },
  timelineCardHeader: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 6,
  },
  clipBar: {
    display: "flex",
    gap: 2,
    height: 8,
    borderRadius: 4,
    overflow: "hidden",
  },
  clipBlock: {
    borderRadius: 3,
    minWidth: 10,
  },
};
