import { useState, useCallback } from "react";
import { useTriageStore } from "../../stores/useTriageStore";
import { createTriageSession, uploadTriageAssets, getTriageAssetUrl } from "../../api/client";
import type { TriageAsset } from "../../../../shared/types";
import { DropZone } from "./DropZone";

interface AssetPanelProps {
  onAssetsUploaded?: (assets: TriageAsset[]) => void;
}

const CATEGORY_ICONS: Record<string, string> = {
  video: "\u25B6",
  image: "\u25A3",
  document: "\u25A1",
  audio: "\u266B",
  other: "\u25C7",
};

function formatSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`;
  if (bytes < 1024 * 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  return `${(bytes / (1024 * 1024 * 1024)).toFixed(2)} GB`;
}

export function AssetPanel({ onAssetsUploaded }: AssetPanelProps) {
  const sessionId = useTriageStore((s) => s.sessionId);
  const assets = useTriageStore((s) => s.assets);
  const setSession = useTriageStore((s) => s.setSession);
  const addAssets = useTriageStore((s) => s.addAssets);
  const removeAsset = useTriageStore((s) => s.removeAsset);
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState<number | null>(null);

  const handleFiles = useCallback(
    async (files: File[]) => {
      setUploading(true);
      setProgress(0);

      try {
        let sid = sessionId;
        if (!sid) {
          const session = await createTriageSession();
          sid = session.id;
          setSession(sid);
        }

        const newAssets = await uploadTriageAssets(sid, files, setProgress);
        addAssets(newAssets);
        onAssetsUploaded?.(newAssets);
      } catch (err) {
        console.error("Upload failed:", err);
      } finally {
        setUploading(false);
        setProgress(null);
      }
    },
    [sessionId, setSession, addAssets, onAssetsUploaded]
  );

  return (
    <div style={styles.root}>
      <div style={styles.header}>
        <span style={styles.headerTitle}>Assets</span>
        {assets.length > 0 && (
          <span style={styles.headerCount}>{assets.length}</span>
        )}
      </div>

      <DropZone onFiles={handleFiles} disabled={uploading} />

      {uploading && (
        <div style={styles.progressBar}>
          <div
            style={{
              ...styles.progressFill,
              width: `${progress ?? 0}%`,
            }}
          />
        </div>
      )}

      {assets.length > 0 && (
        <div style={styles.assetList}>
          {assets.map((asset) => (
            <AssetRow
              key={asset.id}
              asset={asset}
              sessionId={sessionId!}
              onRemove={() => removeAsset(asset.id)}
            />
          ))}
        </div>
      )}
    </div>
  );
}

function AssetRow({
  asset,
  sessionId,
  onRemove,
}: {
  asset: TriageAsset;
  sessionId: string;
  onRemove: () => void;
}) {
  const isImage = asset.category === "image";
  const thumbUrl = isImage ? getTriageAssetUrl(sessionId, asset.id) : null;

  return (
    <div className="hover-row" style={styles.assetRow}>
      <div style={styles.assetThumb}>
        {thumbUrl ? (
          <img
            src={thumbUrl}
            alt={asset.original_name}
            style={styles.thumbImg}
          />
        ) : (
          <span style={styles.assetIcon}>
            {CATEGORY_ICONS[asset.category] || "\u25C7"}
          </span>
        )}
      </div>
      <div style={styles.assetInfo}>
        <span style={styles.assetName}>{asset.original_name}</span>
        <span style={styles.assetMeta}>
          {asset.category} &middot; {formatSize(asset.size_bytes)}
        </span>
      </div>
      <button style={styles.removeBtn} onClick={onRemove} title="Remove">
        &times;
      </button>
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  root: {
    display: "flex",
    flexDirection: "column",
    gap: 12,
    height: "100%",
    overflow: "hidden",
  },
  header: {
    display: "flex",
    alignItems: "center",
    gap: 8,
  },
  headerTitle: {
    fontSize: 13,
    fontWeight: 600,
    textTransform: "uppercase",
    letterSpacing: "0.05em",
    color: "var(--text-secondary)",
  },
  headerCount: {
    fontSize: 11,
    fontWeight: 600,
    color: "var(--accent)",
    background: "var(--accent-dim)",
    padding: "1px 6px",
    borderRadius: 8,
  },
  progressBar: {
    height: 3,
    borderRadius: 2,
    background: "var(--bg-hover)",
    overflow: "hidden",
  },
  progressFill: {
    height: "100%",
    background: "var(--accent)",
    borderRadius: 2,
    transition: "width 0.2s",
  },
  assetList: {
    display: "flex",
    flexDirection: "column",
    gap: 2,
    flex: 1,
    overflowY: "auto",
  },
  assetRow: {
    display: "flex",
    alignItems: "center",
    gap: 10,
    padding: "8px 10px",
    borderRadius: 8,
    transition: "background 0.1s",
  },
  assetThumb: {
    width: 36,
    height: 36,
    borderRadius: 6,
    background: "var(--bg-elevated)",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    overflow: "hidden",
    flexShrink: 0,
  },
  thumbImg: {
    width: "100%",
    height: "100%",
    objectFit: "cover",
  },
  assetIcon: {
    fontSize: 16,
    color: "var(--text-muted)",
  },
  assetInfo: {
    flex: 1,
    minWidth: 0,
    display: "flex",
    flexDirection: "column",
    gap: 1,
  },
  assetName: {
    fontSize: 13,
    fontWeight: 500,
    color: "var(--text-primary)",
    overflow: "hidden",
    textOverflow: "ellipsis",
    whiteSpace: "nowrap",
  },
  assetMeta: {
    fontSize: 11,
    color: "var(--text-muted)",
  },
  removeBtn: {
    fontSize: 18,
    color: "var(--text-muted)",
    padding: "2px 6px",
    borderRadius: 4,
    lineHeight: 1,
    opacity: 0.5,
    transition: "opacity 0.1s",
    flexShrink: 0,
  },
};
