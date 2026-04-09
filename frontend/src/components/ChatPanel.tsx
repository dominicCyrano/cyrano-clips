import { useState, useRef, useEffect, useCallback } from "react";
import { useChatStore } from "../stores/useChatStore";
import { useProjectStore } from "../stores/useProjectStore";
import { streamChat, getTimeline } from "../api/client";
import { ChatBubble } from "./ChatBubble";


interface ChatPanelProps {
  refreshTimeline: () => Promise<void>;
  compact?: boolean;
  onResult?: (assistantId: string) => Promise<void>;
  suggestions?: string[];
  quickRevisions?: string[];
}


function isNearBottom(el: HTMLDivElement, threshold = 48) {
  return el.scrollHeight - el.scrollTop - el.clientHeight <= threshold;
}

const DEFAULT_SUGGESTIONS = [
  "Make me a 60-second highlight reel",
  "Pick the 3 most compelling moments",
  "Create a punchy 30-second ad",
  "Build a 2-minute narrative edit",
];

const DEFAULT_QUICK_REVISIONS = [
  "Tighten the opening",
  "Make it feel more premium",
  "Use more b-roll",
  "Sharpen the ending",
];

export function ChatPanel({
  refreshTimeline,
  compact = false,
  onResult,
  suggestions: suggestionsOverride,
  quickRevisions: quickRevisionsOverride,
}: ChatPanelProps) {
  const activeSuggestions = suggestionsOverride ?? DEFAULT_SUGGESTIONS;
  const activeQuickRevisions = quickRevisionsOverride ?? DEFAULT_QUICK_REVISIONS;
  const [input, setInput] = useState("");
  const [requestError, setRequestError] = useState<string | null>(null);
  const [retryMessage, setRetryMessage] = useState<string | null>(null);
  const messages = useChatStore((s) => s.messages);
  const isStreaming = useChatStore((s) => s.isStreaming);
  const projectId = useProjectStore((s) => s.projectId)!;
  const scrollRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const abortRef = useRef<AbortController | null>(null);
  const shouldAutoScrollRef = useRef(true);
  const prevStreamingRef = useRef(false);

  useEffect(() => {
    const el = scrollRef.current;
    if (el && shouldAutoScrollRef.current) {
      el.scrollTop = el.scrollHeight;
    }
  }, [messages, isStreaming]);

  useEffect(() => {
    return () => {
      abortRef.current?.abort();
    };
  }, []);

  useEffect(() => {
    if (prevStreamingRef.current && !isStreaming) {
      inputRef.current?.focus();
    }
    prevStreamingRef.current = isStreaming;
  }, [isStreaming]);

  const send = useCallback(
    async (text: string) => {
      if (!text.trim() || isStreaming) return;

      const trimmed = text.trim();
      const store = useChatStore.getState();
      setRequestError(null);
      setRetryMessage(null);
      shouldAutoScrollRef.current = true;
      store.addUserMessage(trimmed);
      const assistantId = store.startAssistantMessage();
      store.setStreaming(true);

      // Abort previous stream
      abortRef.current?.abort();
      const controller = new AbortController();
      abortRef.current = controller;

      try {
        for await (const event of streamChat(
          projectId,
          trimmed,
          controller.signal
        )) {
          const s = useChatStore.getState();

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

            case "tool_summary":
              // Mark all unfinished activities as done when we get a summary
              const msg = s.messages.find((m) => m.id === assistantId);
              if (msg) {
                for (const a of msg.activities) {
                  if (!a.done) s.markActivityDone(assistantId, a.id);
                }
              }
              break;

            case "result":
              if (onResult) {
                await onResult(assistantId);
              } else {
                try {
                  const tl = await getTimeline(projectId);
                  if (tl) {
                    s.setTimelineCard(assistantId, {
                      version: tl.version,
                      purpose: tl.purpose,
                      clipCount: tl.clips?.length || 0,
                      duration: tl.total_duration,
                      labels: (tl.clips || []).map(
                        (c: any) =>
                          c.transcript_text?.slice(0, 30) + "..."
                      ),
                    });
                  }
                } catch {
                  // Timeline might not exist yet.
                }
              }
              await refreshTimeline();
              break;

            case "error":
              s.appendText(
                assistantId,
                `\n\n**Error:** ${event.message}`
              );
              break;

            case "done":
              break;
          }
        }
      } catch (err: any) {
        if (err.name !== "AbortError") {
          setRequestError(err.message || "Chat request failed.");
          setRetryMessage(trimmed);
          useChatStore
            .getState()
            .appendText(assistantId, `\n\n**Error:** ${err.message}`);
        }
      } finally {
        useChatStore.getState().setStreaming(false);
      }
    },
    [projectId, isStreaming, refreshTimeline, onResult]
  );

  const handleSubmit = () => {
    send(input);
    setInput("");
  };

  const handleScroll = () => {
    const el = scrollRef.current;
    if (!el) return;
    shouldAutoScrollRef.current = isNearBottom(el);
  };

  const latestAssistant = [...messages]
    .reverse()
    .find((message) => message.role === "assistant");
  const showThinkingIndicator =
    isStreaming && !!latestAssistant && latestAssistant.text.length === 0;

  return (
    <div style={styles.root}>
      {/* Messages */}
      <div ref={scrollRef} style={styles.messages} onScroll={handleScroll}>
        {messages.length === 0 && (
          <div style={styles.empty}>
            <div style={styles.emptyLogo}>C</div>
            <p style={{ fontSize: 18, fontWeight: 600, marginBottom: 4 }}>
              What should we make?
            </p>
            <p
              style={{
                color: "var(--text-muted)",
                fontSize: 13,
                marginBottom: 20,
                maxWidth: 360,
                textAlign: "center" as const,
              }}
            >
              Cyrano will read your transcript, pick the best moments, and
              build an edit. You direct, it cuts.
            </p>
            <div style={styles.suggestions}>
              {activeSuggestions.map((s) => (
                <button
                  key={s}
                  className="hover-btn"
                  style={styles.pill}
                  onClick={() => {
                    setInput(s);
                    send(s);
                  }}
                >
                  {s}
                </button>
              ))}
            </div>
          </div>
        )}
        {messages.map((msg) => (
          <ChatBubble key={msg.id} message={msg} compact={compact} />
        ))}
        {showThinkingIndicator && (
          <div style={{ ...styles.streaming, padding: compact ? "8px 16px" : "8px 48px" }}>
            <span style={styles.dot} />
            Cyrano is thinking...
          </div>
        )}
      </div>

      {/* Input */}
      <div
        style={{
          ...styles.inputWrap,
          padding: compact ? "12px 16px 16px" : "12px 48px 20px",
          borderTop: compact ? "1px solid var(--border-subtle)" : undefined,
          background: compact ? "rgba(0,0,0,0.12)" : undefined,
        }}
      >
        {messages.length > 0 && (
          <div style={styles.quickActions}>
            {activeQuickRevisions.map((item) => (
              <button
                key={item}
                type="button"
                className="hover-btn"
                style={styles.quickAction}
                onClick={() => {
                  setInput(item);
                  send(item);
                }}
                disabled={isStreaming}
              >
                {item}
              </button>
            ))}
          </div>
        )}
        {requestError && retryMessage && (
          <div style={styles.errorBanner}>
            <span style={{ flex: 1 }}>
              {requestError}
            </span>
            <button
              type="button"
              style={styles.retryBtn}
              onClick={() => send(retryMessage)}
              disabled={isStreaming}
            >
              Retry
            </button>
          </div>
        )}
        <div
          style={{
            ...styles.inputRow,
            maxWidth: compact ? "100%" : 640,
          }}
        >
          <input
            ref={inputRef}
            style={styles.input}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                handleSubmit();
              }
            }}
            placeholder="Message Cyrano..."
            disabled={isStreaming}
          />
          <button
            style={{
              ...styles.sendBtn,
              opacity: input.trim() && !isStreaming ? 1 : 0.3,
            }}
            onClick={handleSubmit}
            disabled={!input.trim() || isStreaming}
          >
            <svg
              width="18"
              height="18"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <line x1="22" y1="2" x2="11" y2="13" />
              <polygon points="22 2 15 22 11 13 2 9 22 2" />
            </svg>
          </button>
        </div>
      </div>
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  root: {
    display: "flex",
    flexDirection: "column",
    height: "100%",
    overflow: "hidden",
  },
  messages: {
    flex: 1,
    overflowY: "auto",
    padding: "24px 0",
    display: "flex",
    flexDirection: "column",
    gap: 4,
  },
  empty: {
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    justifyContent: "center",
    flex: 1,
    gap: 6,
    color: "var(--text-secondary)",
  },
  streaming: {
    display: "flex",
    alignItems: "center",
    gap: 8,
    padding: "8px 48px",
    fontSize: 13,
    color: "var(--text-muted)",
  },
  dot: {
    width: 6,
    height: 6,
    borderRadius: "50%",
    background: "var(--accent)",
    animation: "pulse 1.5s infinite",
  },
  inputWrap: {
    padding: "12px 48px 20px",
    flexShrink: 0,
  },
  quickActions: {
    display: "flex",
    gap: 8,
    flexWrap: "wrap" as const,
    maxWidth: 640,
    margin: "0 auto 10px",
  },
  quickAction: {
    padding: "6px 10px",
    borderRadius: 999,
    fontSize: 12,
    color: "var(--text-secondary)",
    background: "rgba(255,255,255,0.04)",
    border: "1px solid var(--border-subtle)",
  },
  errorBanner: {
    maxWidth: 640,
    margin: "0 auto 10px",
    padding: "10px 12px",
    borderRadius: 10,
    border: "1px solid rgba(226, 75, 74, 0.3)",
    background: "rgba(226, 75, 74, 0.08)",
    color: "#f5b6b6",
    display: "flex",
    alignItems: "center",
    gap: 12,
    fontSize: 13,
  },
  retryBtn: {
    padding: "6px 10px",
    borderRadius: 8,
    background: "rgba(255,255,255,0.06)",
    color: "#fff",
    border: "1px solid rgba(255,255,255,0.08)",
    flexShrink: 0,
  },
  inputRow: {
    display: "flex",
    gap: 8,
    maxWidth: 640,
    margin: "0 auto",
  },
  input: {
    flex: 1,
    padding: "12px 16px",
    borderRadius: 10,
    border: "1px solid var(--border)",
    background: "var(--bg-input)",
    color: "var(--text-primary)",
    outline: "none",
    fontSize: 14,
  },
  sendBtn: {
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    width: 42,
    height: 42,
    borderRadius: 10,
    background: "var(--accent)",
    color: "#fff",
    flexShrink: 0,
    transition: "opacity 0.15s",
  },
  emptyLogo: {
    width: 48,
    height: 48,
    borderRadius: 12,
    background: "var(--accent)",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    fontSize: 20,
    fontWeight: 700,
    color: "#fff",
    marginBottom: 12,
  },
  suggestions: {
    display: "flex",
    flexWrap: "wrap" as const,
    gap: 8,
    justifyContent: "center",
    maxWidth: 480,
  },
  pill: {
    padding: "8px 16px",
    borderRadius: 20,
    fontSize: 13,
    color: "var(--text-secondary)",
    background: "var(--bg-surface)",
    border: "1px solid var(--border)",
    transition: "all 0.15s",
    cursor: "pointer",
  },
};
