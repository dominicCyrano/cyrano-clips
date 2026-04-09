import { useState, useRef, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { useTriageChatStore } from "../../stores/useTriageChatStore";
import { useTriageStore } from "../../stores/useTriageStore";
import { useProjectStore } from "../../stores/useProjectStore";
import {
  streamTriageChat,
  createTriageSession,
} from "../../api/client";
import { ChatBubble } from "../ChatBubble";
import type { ChatMessage } from "../../stores/useChatStore";

const SUGGESTIONS = [
  "I want to make social media clips",
  "Help me create a highlight reel",
  "I need a short promo video",
  "What can I make from these assets?",
];

function isNearBottom(el: HTMLDivElement, threshold = 48) {
  return el.scrollHeight - el.scrollTop - el.clientHeight <= threshold;
}

export function TriageChatPanel() {
  const navigate = useNavigate();
  const [input, setInput] = useState("");
  const [requestError, setRequestError] = useState<string | null>(null);
  const messages = useTriageChatStore((s) => s.messages);
  const isStreaming = useTriageChatStore((s) => s.isStreaming);
  const sessionId = useTriageStore((s) => s.sessionId);
  const setSession = useTriageStore((s) => s.setSession);
  const setTriageStatus = useTriageStore((s) => s.setStatus);

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
      const store = useTriageChatStore.getState();
      setRequestError(null);
      shouldAutoScrollRef.current = true;
      store.addUserMessage(trimmed);
      const assistantId = store.startAssistantMessage();
      store.setStreaming(true);

      abortRef.current?.abort();
      const controller = new AbortController();
      abortRef.current = controller;

      try {
        // Ensure session exists
        let sid = sessionId;
        if (!sid) {
          const session = await createTriageSession();
          sid = session.id;
          setSession(sid);
        }

        for await (const event of streamTriageChat(
          sid,
          trimmed,
          controller.signal
        )) {
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

            case "route_action": {
              // Agent decided to route — navigate to the target app
              setTriageStatus("routed");
              const projectStore = useProjectStore.getState();
              projectStore.setProject(
                event.project_id,
                "Routed from triage",
                "extracting_audio"
              );
              // Short delay for the user to see the routing message
              const route = event.app === "batch" ? "/batch" : "/clips";
              setTimeout(() => navigate(route), 1200);
              break;
            }

            case "result":
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
          useTriageChatStore
            .getState()
            .appendText(assistantId, `\n\n**Error:** ${err.message}`);
        }
      } finally {
        useTriageChatStore.getState().setStreaming(false);
      }
    },
    [sessionId, isStreaming, setSession, setTriageStatus, navigate]
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
    .find((m) => m.role === "assistant");
  const showThinking =
    isStreaming && !!latestAssistant && latestAssistant.text.length === 0;

  // Map triage messages to ChatBubble-compatible format
  const chatMessages: ChatMessage[] = messages.map((m) => ({
    ...m,
    timelineCard: undefined,
  }));

  return (
    <div style={styles.root}>
      {/* Messages */}
      <div ref={scrollRef} style={styles.messages} onScroll={handleScroll}>
        {messages.length === 0 && (
          <div style={styles.empty}>
            <div style={styles.emptyLogo}>cy</div>
            <p style={{ fontSize: 18, fontWeight: 600, marginBottom: 4 }}>
              What would you like to create?
            </p>
            <p
              style={{
                color: "var(--text-muted)",
                fontSize: 13,
                marginBottom: 20,
                maxWidth: 400,
                textAlign: "center" as const,
              }}
            >
              Upload your assets and tell me what you're going for.
              I'll help you figure out the best approach and get you
              into the right tool.
            </p>
            <div style={styles.suggestions}>
              {SUGGESTIONS.map((s) => (
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
        {chatMessages.map((msg) => (
          <ChatBubble key={msg.id} message={msg} compact />
        ))}
        {showThinking && (
          <div style={styles.streaming}>
            <span style={styles.dot} />
            Cyrano is thinking...
          </div>
        )}
      </div>

      {/* Input */}
      <div style={styles.inputWrap}>
        {requestError && (
          <div style={styles.errorBanner}>
            <span style={{ flex: 1 }}>{requestError}</span>
          </div>
        )}
        <div style={styles.inputRow}>
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
            placeholder="Tell Cyrano what you want to make..."
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
  emptyLogo: {
    width: 48,
    height: 48,
    borderRadius: 12,
    background: "linear-gradient(135deg, #7c5cfc, #a78bfa)",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    fontSize: 18,
    fontWeight: 700,
    color: "#fff",
    fontFamily: "var(--font-mono)",
    letterSpacing: -1,
    marginBottom: 12,
  },
  streaming: {
    display: "flex",
    alignItems: "center",
    gap: 8,
    padding: "8px 16px",
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
    padding: "12px 16px 16px",
    borderTop: "1px solid var(--border-subtle)",
    flexShrink: 0,
  },
  errorBanner: {
    margin: "0 0 10px",
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
  inputRow: {
    display: "flex",
    gap: 8,
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
