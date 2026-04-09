import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { Timeline } from "../../../shared/types";
import { getMediaUrl } from "../api/client";
import {
  buildSequenceLayout,
  clampSequenceTime,
  findSequenceClipAtTime,
  formatClock,
  type SequenceClipLayout,
} from "../lib/timelineLayout";

interface TimelinePreviewProps {
  projectId: string;
  timeline: Timeline | null;
  onTimeUpdate?: (time: number) => void;
  seekRequest?: {
    time: number;
    nonce: number;
  } | null;
}

export function TimelinePreview({
  projectId,
  timeline,
  onTimeUpdate,
  seekRequest,
}: TimelinePreviewProps) {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const rafRef = useRef<number | null>(null);
  const lastFrameRef = useRef(0);
  const activeClipRef = useRef<SequenceClipLayout | null>(null);
  const timelineTimeRef = useRef(0);

  const sequence = useMemo(() => buildSequenceLayout(timeline), [timeline]);
  const playbackClips = sequence.clips;
  const totalDuration = sequence.sequenceDuration;

  const [playing, setPlaying] = useState(false);
  const [displayTime, setDisplayTime] = useState(0);
  const [ready, setReady] = useState(false);

  const seekToTimeline = useCallback(
    (time: number) => {
      const video = videoRef.current;
      if (!video || playbackClips.length === 0) return;

      const clip = findSequenceClipAtTime(
        Math.min(time, Math.max(totalDuration - 0.001, 0)),
        playbackClips
      );
      if (!clip) return;

      const sourceTime = clip.sourceStart + (time - clip.clipStart);
      const clipChanged = activeClipRef.current?.id !== clip.id;
      const drift = Math.abs(video.currentTime - sourceTime);

      if (clipChanged || drift > 0.3) {
        video.currentTime = sourceTime;
      }

      activeClipRef.current = clip;
    },
    [playbackClips, totalDuration]
  );

  const applyTimelineTime = useCallback(
    (time: number) => {
      const next = clampSequenceTime(time, totalDuration);
      timelineTimeRef.current = next;
      setDisplayTime(next);
      seekToTimeline(next);
    },
    [seekToTimeline, totalDuration]
  );

  const tick = useCallback(
    (now: number) => {
      if (!lastFrameRef.current) lastFrameRef.current = now;
      const delta = (now - lastFrameRef.current) / 1000;
      lastFrameRef.current = now;

      const next = timelineTimeRef.current + delta;

      if (next >= totalDuration) {
        timelineTimeRef.current = totalDuration;
        setDisplayTime(totalDuration);
        setPlaying(false);
        videoRef.current?.pause();
        return;
      }

      timelineTimeRef.current = next;
      setDisplayTime(next);

      const currentClip = activeClipRef.current;
      if (currentClip && next >= currentClip.clipEnd) {
        seekToTimeline(next);
      }

      rafRef.current = requestAnimationFrame(tick);
    },
    [seekToTimeline, totalDuration]
  );

  useEffect(() => {
    if (!playing) {
      if (rafRef.current != null) {
        cancelAnimationFrame(rafRef.current);
        rafRef.current = null;
      }
      lastFrameRef.current = 0;
      return;
    }

    const video = videoRef.current;
    if (video) {
      seekToTimeline(timelineTimeRef.current);
      video.play().catch(() => setPlaying(false));
    }

    rafRef.current = requestAnimationFrame(tick);
    return () => {
      if (rafRef.current != null) {
        cancelAnimationFrame(rafRef.current);
        rafRef.current = null;
      }
      lastFrameRef.current = 0;
    };
  }, [playing, seekToTimeline, tick]);

  useEffect(() => {
    timelineTimeRef.current = 0;
    activeClipRef.current = null;
    setDisplayTime(0);
    setPlaying(false);

    const video = videoRef.current;
    if (video) {
      video.pause();
      video.currentTime = playbackClips[0]?.sourceStart ?? 0;
    }
  }, [playbackClips]);

  useEffect(() => {
    return () => {
      if (rafRef.current != null) {
        cancelAnimationFrame(rafRef.current);
      }
    };
  }, []);

  const lastSeekNonceRef = useRef<number>(0);
  useEffect(() => {
    if (!seekRequest || seekRequest.nonce === lastSeekNonceRef.current) return;
    lastSeekNonceRef.current = seekRequest.nonce;

    applyTimelineTime(seekRequest.time);
    if (playing) {
      videoRef.current?.play().catch(() => setPlaying(false));
    }
  }, [applyTimelineTime, playing, seekRequest]);

  const handleTogglePlay = () => {
    if (!playbackClips.length) return;

    if (timelineTimeRef.current >= totalDuration && totalDuration > 0) {
      applyTimelineTime(0);
    }

    setPlaying((current) => {
      if (current) {
        videoRef.current?.pause();
      }
      return !current;
    });
  };

  const handleScrub = (value: number) => {
    applyTimelineTime(value);
    if (playing) {
      videoRef.current?.play().catch(() => setPlaying(false));
    }
  };

  useEffect(() => {
    onTimeUpdate?.(displayTime);
  }, [displayTime, onTimeUpdate]);

  return (
    <div style={styles.root}>
      <div style={styles.videoFrame}>
        <video
          ref={videoRef}
          src={getMediaUrl(projectId)}
          preload="auto"
          playsInline
          style={styles.video}
          onLoadedMetadata={() => setReady(true)}
        />
        {!timeline && (
          <div style={styles.emptyOverlay}>
            The raw source is loaded. Create a timeline to preview the cut.
          </div>
        )}
        {timeline && !ready && (
          <div style={styles.emptyOverlay}>Loading source media...</div>
        )}
      </div>

      <div style={styles.controlBar}>
        <button
          type="button"
          onClick={handleTogglePlay}
          disabled={!timeline || !playbackClips.length}
          style={{
            ...styles.playButton,
            opacity: timeline && playbackClips.length ? 1 : 0.35,
          }}
        >
          {playing ? "\u275A\u275A" : "\u25B6"}
        </button>

        <input
          type="range"
          min={0}
          max={Math.max(totalDuration, 0.001)}
          step={0.01}
          value={Math.min(displayTime, totalDuration)}
          onChange={(event) => handleScrub(Number(event.target.value))}
          disabled={!timeline || !playbackClips.length}
          style={styles.scrubber}
        />

        <div style={styles.timecode}>
          {formatClock(displayTime, true)} / {formatClock(totalDuration, true)}
        </div>
      </div>
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  root: {
    display: "flex",
    flexDirection: "column",
    gap: 8,
    height: "100%",
    minHeight: 0,
  },
  videoFrame: {
    position: "relative",
    borderRadius: 10,
    overflow: "hidden",
    background: "#000",
    border: "1px solid var(--border-subtle)",
    flex: 1,
    minHeight: 0,
  },
  video: {
    width: "100%",
    height: "100%",
    objectFit: "contain",
    display: "block",
    background: "#000",
  },
  emptyOverlay: {
    position: "absolute",
    inset: 0,
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    textAlign: "center",
    padding: 20,
    background: "rgba(0,0,0,0.45)",
    color: "var(--text-secondary)",
    fontSize: 12,
  },
  controlBar: {
    display: "flex",
    alignItems: "center",
    gap: 10,
    flexShrink: 0,
  },
  playButton: {
    width: 32,
    height: 32,
    borderRadius: 8,
    background: "var(--accent)",
    color: "#fff",
    fontWeight: 600,
    fontSize: 12,
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    flexShrink: 0,
  },
  scrubber: {
    flex: 1,
    height: 4,
    cursor: "pointer",
  },
  timecode: {
    fontFamily: "var(--font-mono)",
    fontSize: 11,
    color: "var(--text-secondary)",
    flexShrink: 0,
    whiteSpace: "nowrap",
  },
};
