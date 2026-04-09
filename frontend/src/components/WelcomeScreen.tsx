import { useState, useRef } from "react";
import { useProjectStore } from "../stores/useProjectStore";
import { createProject, uploadVideo } from "../api/client";

export function WelcomeScreen() {
  const [name, setName] = useState("");
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState<number | null>(null);
  const [step, setStep] = useState<"name" | "upload">("name");
  const [projectId, setProjectId] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const setProject = useProjectStore((s) => s.setProject);

  const handleCreate = async () => {
    if (!name.trim()) return;
    const proj = await createProject(name.trim());
    setProjectId(proj.id);
    setStep("upload");
  };

  const handleFile = async (file: File) => {
    if (!projectId) return;
    setUploading(true);
    setUploadProgress(0);
    try {
      await uploadVideo(projectId, file, setUploadProgress);
      setProject(projectId, name, "extracting_audio");
    } catch {
      setUploading(false);
      setUploadProgress(null);
    }
  };

  return (
    <div style={styles.root}>
      <div style={styles.card}>
        <div style={{ ...styles.logo, ...styles.logoAnimated }}>C</div>
        <h1 style={{ ...styles.title, ...styles.titleAnimated }}>Cyrano Clips</h1>
        <p style={{ ...styles.subtitle, ...styles.subtitleAnimated }}>
          AI-powered video editing
        </p>

        {step === "name" ? (
          <div style={{ ...styles.form, ...styles.formAnimated }}>
            <input
              style={styles.input}
              placeholder="Project name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleCreate()}
              autoFocus
            />
            <button
              style={{
                ...styles.btn,
                opacity: name.trim() ? 1 : 0.4,
              }}
              onClick={handleCreate}
              disabled={!name.trim()}
            >
              Create Project
            </button>
          </div>
        ) : (
          <div style={{ ...styles.form, ...styles.formAnimated }}>
            <input
              ref={fileRef}
              type="file"
              accept="video/*"
              style={{ display: "none" }}
              onChange={(e) => {
                const f = e.target.files?.[0];
                if (f) handleFile(f);
              }}
            />
            <button
              style={styles.dropZone}
              onClick={() => fileRef.current?.click()}
              disabled={uploading}
            >
              {uploading ? (
                <div style={styles.uploadingState}>
                  <span style={styles.spinner} />
                  <span style={{ color: "var(--accent)", fontWeight: 600 }}>
                    {uploadProgress == null
                      ? "Uploading..."
                      : `Uploading... ${Math.round(uploadProgress)}%`}
                  </span>
                </div>
              ) : (
                <>
                  <span style={{ fontSize: 28, marginBottom: 8 }}>+</span>
                  <span>Click to upload video</span>
                  <span style={{ color: "var(--text-muted)", fontSize: 12 }}>
                    MP4, MOV, AVI, MKV, WebM
                  </span>
                </>
              )}
            </button>
          </div>
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
  },
  card: {
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    gap: 8,
    width: 380,
    animation: "fadeUp 0.55s ease-out",
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
    marginBottom: 8,
  },
  logoAnimated: {
    animation: "fadeUp 0.55s ease-out 0.05s both",
  },
  title: {
    fontSize: 24,
    fontWeight: 600,
    color: "var(--text-primary)",
  },
  titleAnimated: {
    animation: "fadeUp 0.55s ease-out 0.12s both",
  },
  subtitle: {
    fontSize: 14,
    color: "var(--text-secondary)",
    marginBottom: 24,
  },
  subtitleAnimated: {
    animation: "fadeUp 0.55s ease-out 0.18s both",
  },
  form: {
    display: "flex",
    flexDirection: "column",
    gap: 12,
    width: "100%",
  },
  formAnimated: {
    animation: "fadeUp 0.55s ease-out 0.24s both",
  },
  input: {
    padding: "12px 16px",
    borderRadius: 8,
    border: "1px solid var(--border)",
    background: "var(--bg-input)",
    color: "var(--text-primary)",
    outline: "none",
    fontSize: 14,
  },
  btn: {
    padding: "12px 16px",
    borderRadius: 8,
    background: "var(--accent)",
    color: "#fff",
    fontWeight: 600,
    fontSize: 14,
    transition: "opacity 0.15s",
  },
  dropZone: {
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    gap: 4,
    padding: "40px 20px",
    borderRadius: 10,
    border: "2px dashed var(--border)",
    background: "var(--bg-surface)",
    color: "var(--text-secondary)",
    cursor: "pointer",
    transition: "border-color 0.15s",
    fontSize: 14,
  },
  uploadingState: {
    display: "flex",
    alignItems: "center",
    gap: 10,
  },
  spinner: {
    width: 16,
    height: 16,
    borderRadius: "50%",
    border: "2px solid rgba(124, 92, 252, 0.3)",
    borderTopColor: "var(--accent)",
    animation: "spin 0.8s linear infinite",
  },
};
