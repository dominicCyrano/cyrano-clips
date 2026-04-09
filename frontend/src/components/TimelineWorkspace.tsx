import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type CSSProperties,
} from "react";
import type { Timeline } from "../../../shared/types";
import {
  buildSequenceLayout,
  clampSequenceTime,
  findSequenceClipAtTime,
  formatClock,
  getTickInterval,
} from "../lib/timelineLayout";

interface TimelineWorkspaceProps {
  timeline: Timeline | null;
  playheadTime?: number;
  onSeek?: (time: number) => void;
}

const SPEAKER_COLORS: Record<string, string> = {};
const PALETTE = [
  "#7c5cfc",
  "#34d399",
  "#60a5fa",
  "#fbbf24",
  "#f472b6",
  "#e24b4a",
];
const LABEL_COLUMN_WIDTH = 56;
const RULER_HEIGHT = 32;
const VIDEO_TRACK_HEIGHT = 72;
const AUDIO_TRACK_HEIGHT = 42;
const CONTENT_HEIGHT = RULER_HEIGHT + VIDEO_TRACK_HEIGHT + AUDIO_TRACK_HEIGHT;

function speakerColor(speaker: string): string {
  if (!SPEAKER_COLORS[speaker]) {
    SPEAKER_COLORS[speaker] = PALETTE[Object.keys(SPEAKER_COLORS).length % PALETTE.length];
  }
  return SPEAKER_COLORS[speaker];
}

export function TimelineWorkspace({
  timeline,
  playheadTime = 0,
  onSeek,
}: TimelineWorkspaceProps) {
  const viewportRef = useRef<HTMLDivElement | null>(null);
  const [viewportWidth, setViewportWidth] = useState(0);
  const [scrollLeft, setScrollLeft] = useState(0);
  const [zoom, setZoom] = useState(1);

  const sequence = useMemo(() => buildSequenceLayout(timeline), [timeline]);
  const clips = sequence.clips;
  const totalDuration = sequence.sequenceDuration;

  useEffect(() => {
    const node = viewportRef.current;
    if (!node) return;

    const measure = () => setViewportWidth(node.clientWidth);
    measure();

    const observer = new ResizeObserver(measure);
    observer.observe(node);
    return () => observer.disconnect();
  }, []);

  const fitPxPerSecond = useMemo(() => {
    if (!totalDuration || !viewportWidth) return 64;
    return Math.max(viewportWidth / totalDuration, 6);
  }, [totalDuration, viewportWidth]);

  const pxPerSecond = fitPxPerSecond * zoom;
  const contentWidth = useMemo(() => {
    if (!totalDuration || !viewportWidth) return viewportWidth;
    return Math.max(viewportWidth, totalDuration * pxPerSecond);
  }, [pxPerSecond, totalDuration, viewportWidth]);

  const clampedPlayhead = clampSequenceTime(playheadTime, totalDuration);
  const playheadX = clampedPlayhead * pxPerSecond;
  const activeClipId = findSequenceClipAtTime(clampedPlayhead, clips)?.id ?? null;

  const markers = useMemo(() => {
    if (!totalDuration) return [];

    const interval = getTickInterval(pxPerSecond);
    const items: number[] = [];
    for (let t = 0; t <= totalDuration + interval; t += interval) {
      items.push(Math.min(t, totalDuration));
      if (t >= totalDuration) break;
    }
    return Array.from(new Set(items));
  }, [pxPerSecond, totalDuration]);

  const visibleStart = pxPerSecond > 0 ? scrollLeft / pxPerSecond : 0;
  const visibleEnd = pxPerSecond > 0 ? (scrollLeft + viewportWidth) / pxPerSecond : 0;

  const seekFromClientX = useCallback(
    (clientX: number) => {
      const viewport = viewportRef.current;
      if (!viewport || !onSeek || pxPerSecond <= 0) return;

      const bounds = viewport.getBoundingClientRect();
      const x = clientX - bounds.left + viewport.scrollLeft;
      onSeek(clampSequenceTime(x / pxPerSecond, totalDuration));
    },
    [onSeek, pxPerSecond, totalDuration]
  );

  const handleTimelinePointerDown = useCallback(
    (event: React.PointerEvent<HTMLDivElement>) => {
      if (event.button !== 0) return;
      event.preventDefault();
      seekFromClientX(event.clientX);

      const handleMove = (moveEvent: PointerEvent) => {
        seekFromClientX(moveEvent.clientX);
      };

      const handleUp = () => {
        window.removeEventListener("pointermove", handleMove);
        window.removeEventListener("pointerup", handleUp);
      };

      window.addEventListener("pointermove", handleMove);
      window.addEventListener("pointerup", handleUp);
    },
    [seekFromClientX]
  );

  const clipPositionStyle = useCallback(
    (clipStart: number, duration: number, color: string, active: boolean): CSSProperties => ({
      position: "absolute",
      left: clipStart * pxPerSecond,
      width: duration * pxPerSecond,
      background: color,
      boxShadow: active
        ? "0 0 0 1px rgba(255,255,255,0.5), 0 0 22px rgba(124,92,252,0.3)"
        : "none",
      zIndex: active ? 2 : 1,
    }),
    [pxPerSecond]
  );

  return (
    <div style={styles.root}>
      <div style={styles.header}>
        <div>
          <div style={styles.eyebrow}>Timeline</div>
          <div style={styles.title}>
            {timeline ? `Sequence v${timeline.version}` : "Waiting for first cut"}
          </div>
        </div>
        <div style={styles.badges}>
          <span style={styles.badge}>{timeline ? `${clips.length} clips` : "No clips"}</span>
          <span style={styles.badge}>
            {timeline ? `${totalDuration.toFixed(1)}s actual` : "0.0s"}
          </span>
          <span style={styles.badge}>
            View {formatClock(visibleStart)} - {formatClock(visibleEnd)}
          </span>
        </div>
      </div>

      <div style={styles.frame}>
        <div style={styles.toolbar}>
          <div style={styles.zoomGroup}>
            <button
              type="button"
              style={styles.zoomButton}
              onClick={() => setZoom(1)}
              disabled={!timeline || !clips.length}
            >
              Fit
            </button>
            <input
              type="range"
              min={1}
              max={8}
              step={0.25}
              value={zoom}
              onChange={(event) => setZoom(Number(event.target.value))}
              disabled={!timeline || !clips.length}
              style={styles.zoomSlider}
            />
            <span style={styles.zoomLabel}>{zoom.toFixed(2)}x</span>
          </div>
          <div style={styles.meta}>
            {timeline ? `Sequence ${formatClock(totalDuration)}` : "Build a cut to activate the timeline"}
          </div>
        </div>

        <div style={styles.body}>
          <div style={styles.labels}>
            <div style={{ ...styles.labelCell, height: RULER_HEIGHT }} />
            <div style={{ ...styles.labelCell, height: VIDEO_TRACK_HEIGHT }}>
              <span style={styles.trackLabel}>V1</span>
            </div>
            <div style={{ ...styles.labelCell, height: AUDIO_TRACK_HEIGHT }}>
              <span style={styles.trackLabel}>A1</span>
            </div>
          </div>

          <div
            ref={viewportRef}
            style={styles.viewport}
            onScroll={(event) => setScrollLeft(event.currentTarget.scrollLeft)}
            onPointerDown={handleTimelinePointerDown}
          >
            <div
              style={{
                ...styles.canvas,
                width: Math.max(contentWidth, 0),
                height: CONTENT_HEIGHT,
              }}
            >
              <div style={{ ...styles.ruler, height: RULER_HEIGHT }}>
                {markers.map((marker, index) => {
                  const x = marker * pxPerSecond;
                  const interval = markers[1] ? markers[1] - markers[0] : 0;
                  const isMajor = interval > 0 ? index % 2 === 0 : true;

                  return (
                    <div
                      key={`${marker}-${index}`}
                      style={{
                        ...styles.tick,
                        left: x,
                        height: isMajor ? 18 : 10,
                      }}
                    >
                      {isMajor && <span style={styles.markerText}>{formatClock(marker)}</span>}
                    </div>
                  );
                })}
              </div>

              <div
                style={{
                  ...styles.trackSurface,
                  top: RULER_HEIGHT,
                  height: VIDEO_TRACK_HEIGHT,
                }}
              >
                {clips.length > 0 ? (
                  clips.map((clip) => {
                    const color = speakerColor(clip.speaker);
                    const width = clip.duration * pxPerSecond;
                    const active = clip.id === activeClipId;
                    return (
                      <div
                        key={clip.id}
                        title={`${clip.speaker}: ${clip.transcriptText}`}
                        style={{
                          ...styles.videoClip,
                          ...clipPositionStyle(clip.clipStart, clip.duration, color, active),
                        }}
                      >
                        <div style={styles.clipLabel}>{clip.label}</div>
                        {width > 120 && (
                          <div style={styles.clipMeta}>
                            {clip.speaker} &middot; {clip.duration.toFixed(1)}s
                          </div>
                        )}
                      </div>
                    );
                  })
                ) : (
                  <div style={styles.placeholder}>
                    Ask Cyrano to build a timeline and it will appear here.
                  </div>
                )}
              </div>

              <div
                style={{
                  ...styles.trackSurface,
                  top: RULER_HEIGHT + VIDEO_TRACK_HEIGHT,
                  height: AUDIO_TRACK_HEIGHT,
                }}
              >
                {clips.map((clip) => {
                  const color = speakerColor(clip.speaker);
                  const active = clip.id === activeClipId;
                  return (
                    <div
                      key={`audio-${clip.id}`}
                      style={{
                        ...styles.audioBlock,
                        ...clipPositionStyle(clip.clipStart, clip.duration, color, active),
                      }}
                    />
                  );
                })}
              </div>

              {totalDuration > 0 && (
                <div
                  style={{
                    ...styles.playhead,
                    left: playheadX,
                    height: CONTENT_HEIGHT,
                  }}
                >
                  <div style={styles.playheadHead} />
                  <div style={styles.playheadLine} />
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

const styles: Record<string, CSSProperties> = {
  root: {
    display: "flex",
    flexDirection: "column",
    gap: 10,
  },
  header: {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 12,
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
    fontSize: 16,
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
    padding: "5px 10px",
    color: "var(--text-secondary)",
    background: "rgba(255,255,255,0.04)",
    border: "1px solid var(--border-subtle)",
  },
  frame: {
    borderRadius: 14,
    border: "1px solid var(--border-subtle)",
    background: "rgba(255,255,255,0.02)",
    overflow: "hidden",
  },
  toolbar: {
    display: "flex",
    justifyContent: "space-between",
    gap: 12,
    alignItems: "center",
    padding: "10px 12px",
    borderBottom: "1px solid var(--border-subtle)",
    background: "rgba(255,255,255,0.02)",
    flexWrap: "wrap",
  },
  zoomGroup: {
    display: "flex",
    alignItems: "center",
    gap: 10,
  },
  zoomButton: {
    borderRadius: 8,
    padding: "6px 10px",
    background: "rgba(255,255,255,0.05)",
    border: "1px solid var(--border-subtle)",
    color: "var(--text-secondary)",
    fontSize: 11,
  },
  zoomSlider: {
    width: 120,
  },
  zoomLabel: {
    minWidth: 42,
    fontSize: 11,
    fontFamily: "var(--font-mono)",
    color: "var(--text-secondary)",
  },
  meta: {
    fontSize: 11,
    color: "var(--text-muted)",
    fontFamily: "var(--font-mono)",
  },
  body: {
    display: "grid",
    gridTemplateColumns: `${LABEL_COLUMN_WIDTH}px minmax(0, 1fr)`,
    minHeight: CONTENT_HEIGHT,
  },
  labels: {
    borderRight: "1px solid var(--border-subtle)",
    background: "rgba(0,0,0,0.12)",
  },
  labelCell: {
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    borderBottom: "1px solid var(--border-subtle)",
  },
  trackLabel: {
    fontSize: 11,
    fontWeight: 600,
    fontFamily: "var(--font-mono)",
    color: "var(--text-muted)",
  },
  viewport: {
    overflowX: "auto",
    overflowY: "hidden",
    position: "relative",
    cursor: "pointer",
  },
  canvas: {
    position: "relative",
    background:
      "linear-gradient(180deg, rgba(255,255,255,0.02), rgba(255,255,255,0.01))",
  },
  ruler: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    borderBottom: "1px solid var(--border-subtle)",
    background: "rgba(0,0,0,0.14)",
  },
  tick: {
    position: "absolute",
    top: 0,
    width: 1,
    background: "rgba(255,255,255,0.18)",
  },
  markerText: {
    position: "absolute",
    top: 18,
    left: 4,
    fontSize: 9,
    color: "var(--text-muted)",
    fontFamily: "var(--font-mono)",
    whiteSpace: "nowrap",
  },
  trackSurface: {
    position: "absolute",
    left: 0,
    right: 0,
    borderBottom: "1px solid var(--border-subtle)",
    backgroundImage:
      "linear-gradient(90deg, rgba(255,255,255,0.03) 1px, transparent 1px)",
    backgroundSize: "48px 100%",
  },
  videoClip: {
    top: 10,
    height: 50,
    borderRadius: 8,
    border: "1px solid rgba(255,255,255,0.16)",
    padding: "7px 8px",
    overflow: "hidden",
    display: "flex",
    flexDirection: "column",
    justifyContent: "space-between",
  },
  clipLabel: {
    fontSize: 11,
    fontWeight: 600,
    color: "#fff",
    whiteSpace: "nowrap",
    overflow: "hidden",
    textOverflow: "ellipsis",
    lineHeight: 1.3,
  },
  clipMeta: {
    fontSize: 9,
    color: "rgba(255,255,255,0.72)",
    whiteSpace: "nowrap",
    overflow: "hidden",
    textOverflow: "ellipsis",
  },
  audioBlock: {
    top: 9,
    height: 22,
    borderRadius: 5,
    border: "1px solid rgba(255,255,255,0.08)",
    opacity: 0.4,
  },
  placeholder: {
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    height: "100%",
    color: "var(--text-muted)",
    fontSize: 12,
    position: "absolute",
    inset: 0,
  },
  playhead: {
    position: "absolute",
    top: 0,
    width: 0,
    zIndex: 6,
    pointerEvents: "none",
  },
  playheadHead: {
    position: "absolute",
    top: 0,
    left: -5,
    width: 10,
    height: 10,
    background: "var(--playhead)",
    borderRadius: "2px 2px 50% 50%",
  },
  playheadLine: {
    position: "absolute",
    top: 10,
    bottom: 0,
    left: 0,
    width: 1.5,
    background: "var(--playhead)",
    transform: "translateX(-50%)",
  },
};
