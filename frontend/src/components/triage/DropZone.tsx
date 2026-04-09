import { useState, useRef, useCallback } from "react";

interface DropZoneProps {
  onFiles: (files: File[]) => void;
  disabled?: boolean;
}

export function DropZone({ onFiles, disabled }: DropZoneProps) {
  const [dragOver, setDragOver] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setDragOver(false);
      if (disabled) return;
      const files = Array.from(e.dataTransfer.files);
      if (files.length > 0) onFiles(files);
    },
    [onFiles, disabled]
  );

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(true);
  }, []);

  const handleDragLeave = useCallback(() => {
    setDragOver(false);
  }, []);

  return (
    <>
      <input
        ref={fileRef}
        type="file"
        multiple
        accept="video/*,image/*,audio/*,.pdf,.doc,.docx,.txt"
        style={{ display: "none" }}
        onChange={(e) => {
          const files = Array.from(e.target.files || []);
          if (files.length > 0) onFiles(files);
          e.target.value = "";
        }}
      />
      <button
        style={{
          ...styles.zone,
          borderColor: dragOver ? "var(--accent)" : "var(--border)",
          background: dragOver ? "var(--accent-dim)" : "var(--bg-surface)",
        }}
        onClick={() => !disabled && fileRef.current?.click()}
        onDrop={handleDrop}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        disabled={disabled}
      >
        <svg
          width="24"
          height="24"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.5"
          strokeLinecap="round"
          strokeLinejoin="round"
          style={{ color: "var(--text-muted)", marginBottom: 4 }}
        >
          <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
          <polyline points="17 8 12 3 7 8" />
          <line x1="12" y1="3" x2="12" y2="15" />
        </svg>
        <span style={{ fontSize: 13, color: "var(--text-secondary)" }}>
          Drop files here or click to browse
        </span>
        <span style={{ fontSize: 11, color: "var(--text-muted)" }}>
          Video, images, PDFs, audio
        </span>
      </button>
    </>
  );
}

const styles: Record<string, React.CSSProperties> = {
  zone: {
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    gap: 4,
    padding: "24px 16px",
    borderRadius: 10,
    border: "2px dashed var(--border)",
    cursor: "pointer",
    transition: "all 0.15s",
    width: "100%",
  },
};
