import { useRef, useEffect } from "react";
import { useProjectStore } from "../../stores/useProjectStore";
import { getMediaUrl } from "../../api/client";
import type { BatchClip } from "../../../../shared/types";

interface BatchClipPreviewProps {
  clip: BatchClip;
  onClose: () => void;
}

export function BatchClipPreview({ clip, onClose }: BatchClipPreviewProps) {
  const projectId = useProjectStore((s) => s.projectId)!;
  const videoRef = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    video.currentTime = clip.source_start;
    video.play().catch(() => {});

    const handleTimeUpdate = () => {
      if (video.currentTime >= clip.source_end) {
        video.pause();
        video.currentTime = clip.source_start;
      }
    };

    video.addEventListener("timeupdate", handleTimeUpdate);
    return () => video.removeEventListener("timeupdate", handleTimeUpdate);
  }, [clip]);

  return (
    <div style={styles.overlay} onClick={onClose}>
      <div style={styles.modal} onClick={(e) => e.stopPropagation()}>
        {/* Close button */}
        <button style={styles.closeBtn} onClick={onClose}>
          &times;
        </button>

        {/* Video */}
        <video
          ref={videoRef}
          src={getMediaUrl(projectId)}
          style={styles.video}
          controls
        />

        {/* Details */}
        <div style={styles.details}>
          <div style={styles.detailsHeader}>
            <span style={styles.clipId}>{clip.id}</span>
            <span style={styles.duration}>{clip.duration.toFixed(1)}s</span>
            <span style={styles.platform}>{clip.platform}</span>
          </div>

          <div style={styles.section}>
            <span style={styles.sectionLabel}>Hook</span>
            <p style={styles.hookText}>{clip.hook}</p>
          </div>

          <div style={styles.section}>
            <span style={styles.sectionLabel}>Transcript</span>
            <p style={styles.transcriptText}>{clip.transcript_text}</p>
          </div>

          <div style={styles.meta}>
            <span>Speaker: {clip.speaker}</span>
            <span>
              {clip.source_start.toFixed(2)}s — {clip.source_end.toFixed(2)}s
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  overlay: {
    position: "fixed",
    inset: 0,
    background: "rgba(0, 0, 0, 0.7)",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    zIndex: 1000,
    animation: "fadeUp 0.2s ease-out",
  },
  modal: {
    width: "90%",
    maxWidth: 640,
    maxHeight: "90vh",
    borderRadius: 16,
    background: "var(--bg-surface)",
    border: "1px solid var(--border)",
    overflow: "hidden",
    display: "flex",
    flexDirection: "column",
    position: "relative",
  },
  closeBtn: {
    position: "absolute",
    top: 12,
    right: 12,
    fontSize: 24,
    color: "#fff",
    background: "rgba(0,0,0,0.5)",
    width: 36,
    height: 36,
    borderRadius: 8,
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    zIndex: 10,
    lineHeight: 1,
  },
  video: {
    width: "100%",
    maxHeight: 360,
    background: "#000",
    objectFit: "contain",
  },
  details: {
    padding: 20,
    display: "flex",
    flexDirection: "column",
    gap: 16,
    overflowY: "auto",
  },
  detailsHeader: {
    display: "flex",
    gap: 10,
    alignItems: "center",
  },
  clipId: {
    fontSize: 14,
    fontWeight: 700,
    fontFamily: "var(--font-mono)",
    color: "var(--accent)",
  },
  duration: {
    fontSize: 13,
    fontWeight: 600,
    fontFamily: "var(--font-mono)",
    color: "var(--text-secondary)",
    background: "var(--bg-hover)",
    padding: "2px 8px",
    borderRadius: 6,
  },
  platform: {
    fontSize: 11,
    fontWeight: 600,
    textTransform: "uppercase",
    letterSpacing: "0.04em",
    color: "#e24b4a",
    background: "rgba(226, 75, 74, 0.12)",
    padding: "2px 8px",
    borderRadius: 6,
  },
  section: {
    display: "flex",
    flexDirection: "column",
    gap: 4,
  },
  sectionLabel: {
    fontSize: 11,
    fontWeight: 600,
    textTransform: "uppercase",
    letterSpacing: "0.05em",
    color: "var(--text-muted)",
  },
  hookText: {
    fontSize: 15,
    fontWeight: 600,
    color: "var(--text-primary)",
    lineHeight: 1.5,
    margin: 0,
  },
  transcriptText: {
    fontSize: 13,
    color: "var(--text-secondary)",
    lineHeight: 1.6,
    margin: 0,
  },
  meta: {
    display: "flex",
    justifyContent: "space-between",
    fontSize: 12,
    fontFamily: "var(--font-mono)",
    color: "var(--text-muted)",
  },
};
