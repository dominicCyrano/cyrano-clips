import { useEffect, useState } from "react";
import type { ProjectStatus } from "../../../shared/types";
import { getProject } from "../api/client";
import { useProjectStore } from "../stores/useProjectStore";

const STATUS_COPY: Record<
  Exclude<ProjectStatus, "editing">,
  { title: string; detail: string }
> = {
  uploading: {
    title: "Preparing upload",
    detail: "Cyrano is getting the project ready.",
  },
  extracting_audio: {
    title: "Extracting audio",
    detail: "Pulling a clean mono track from the source video.",
  },
  transcribing: {
    title: "Transcribing on Modal",
    detail: "Running WhisperX alignment and speaker diarization on the extracted audio.",
  },
  error: {
    title: "Processing failed",
    detail: "The backend hit an error while preparing the project.",
  },
};

export function ProjectStatusScreen() {
  const projectId = useProjectStore((s) => s.projectId)!;
  const projectName = useProjectStore((s) => s.projectName) || "Untitled Project";
  const status = useProjectStore((s) => s.status);
  const setProject = useProjectStore((s) => s.setProject);
  const clear = useProjectStore((s) => s.clear);
  const [errorDetail, setErrorDetail] = useState<string | null>(null);
  const [requestError, setRequestError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    let timer: ReturnType<typeof setTimeout> | null = null;

    const poll = async () => {
      try {
        const project = await getProject(projectId);
        if (!active) return;

        setProject(project.id, project.name, project.status);
        setErrorDetail(project.error_detail || null);
        setRequestError(null);

        if (project.status !== "editing" && project.status !== "error") {
          timer = setTimeout(poll, 2500);
        }
      } catch (err: any) {
        if (!active) return;
        setRequestError(err.message || "Failed to refresh project status.");
        timer = setTimeout(poll, 2500);
      }
    };

    void poll();

    return () => {
      active = false;
      if (timer) clearTimeout(timer);
    };
  }, [projectId, setProject]);

  const currentStatus = status ?? "uploading";
  const copy =
    currentStatus === "editing"
      ? null
      : STATUS_COPY[currentStatus as Exclude<ProjectStatus, "editing">];

  return (
    <div style={styles.root}>
      <div style={styles.card}>
        <div style={styles.logo}>C</div>
        <div style={styles.eyebrow}>{projectName}</div>
        <h1 style={styles.title}>{copy?.title || "Preparing editor"}</h1>
        <p style={styles.subtitle}>{copy?.detail}</p>

        {currentStatus !== "error" && (
          <>
            <div style={styles.progressRow}>
              <span style={styles.spinner} />
              <span style={styles.progressLabel}>
                {currentStatus === "transcribing"
                  ? "This can take a minute or two on longer footage."
                  : "Waiting for the backend to finish setup."}
              </span>
            </div>
            <div style={styles.badges}>
              <span style={styles.badge}>Status: {currentStatus}</span>
              <span style={styles.badge}>Polling every 2.5s</span>
            </div>
          </>
        )}

        {currentStatus === "error" && (
          <div style={styles.errorBox}>
            <div style={{ fontWeight: 600, marginBottom: 6 }}>Project setup failed</div>
            <div style={{ color: "var(--text-secondary)" }}>
              {errorDetail || "No error detail was provided by the backend."}
            </div>
          </div>
        )}

        {requestError && (
          <div style={styles.notice}>
            Status refresh failed: {requestError}
          </div>
        )}

        {currentStatus === "error" && (
          <button style={styles.btn} onClick={clear}>
            Start Over
          </button>
        )}
      </div>
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  root: {
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    height: "100%",
    background: "var(--bg-root)",
    padding: 24,
  },
  card: {
    width: 460,
    borderRadius: 18,
    padding: 28,
    background: "linear-gradient(180deg, rgba(255,255,255,0.04), rgba(255,255,255,0.02))",
    border: "1px solid var(--border)",
    boxShadow: "0 24px 80px rgba(0,0,0,0.35)",
  },
  logo: {
    width: 56,
    height: 56,
    borderRadius: 14,
    background: "var(--accent)",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    fontSize: 24,
    fontWeight: 700,
    color: "#fff",
    marginBottom: 16,
  },
  eyebrow: {
    fontSize: 12,
    letterSpacing: "0.08em",
    textTransform: "uppercase",
    color: "var(--text-muted)",
    marginBottom: 10,
  },
  title: {
    fontSize: 28,
    lineHeight: 1.1,
    marginBottom: 10,
  },
  subtitle: {
    color: "var(--text-secondary)",
    fontSize: 15,
    lineHeight: 1.6,
    marginBottom: 24,
  },
  progressRow: {
    display: "flex",
    alignItems: "center",
    gap: 12,
    padding: "14px 16px",
    borderRadius: 12,
    background: "rgba(124, 92, 252, 0.08)",
    border: "1px solid rgba(124, 92, 252, 0.18)",
  },
  spinner: {
    width: 16,
    height: 16,
    borderRadius: "50%",
    border: "2px solid rgba(124, 92, 252, 0.28)",
    borderTopColor: "var(--accent)",
    animation: "spin 0.8s linear infinite",
    flexShrink: 0,
  },
  progressLabel: {
    fontSize: 13,
    color: "var(--text-primary)",
  },
  badges: {
    display: "flex",
    gap: 8,
    flexWrap: "wrap",
    marginTop: 14,
  },
  badge: {
    fontSize: 12,
    color: "var(--text-secondary)",
    background: "var(--bg-surface)",
    border: "1px solid var(--border-subtle)",
    borderRadius: 999,
    padding: "6px 10px",
  },
  errorBox: {
    borderRadius: 12,
    padding: 16,
    background: "rgba(226, 75, 74, 0.08)",
    border: "1px solid rgba(226, 75, 74, 0.24)",
    color: "#f4c0c0",
  },
  notice: {
    marginTop: 16,
    fontSize: 12,
    color: "var(--warning)",
  },
  btn: {
    marginTop: 20,
    padding: "12px 16px",
    borderRadius: 10,
    background: "var(--accent)",
    color: "#fff",
    fontWeight: 600,
  },
};
