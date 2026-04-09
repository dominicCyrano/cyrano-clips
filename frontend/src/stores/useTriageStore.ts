import { create } from "zustand";
import type { TriageAsset } from "../../../shared/types";

type TriageStatus = "idle" | "uploading" | "active" | "routing" | "routed";

interface TriageState {
  sessionId: string | null;
  assets: TriageAsset[];
  status: TriageStatus;

  setSession: (id: string) => void;
  addAssets: (assets: TriageAsset[]) => void;
  removeAsset: (id: string) => void;
  setStatus: (status: TriageStatus) => void;
  clear: () => void;
}

export const useTriageStore = create<TriageState>((set) => ({
  sessionId: null,
  assets: [],
  status: "idle",

  setSession: (id) => set({ sessionId: id, status: "active" }),
  addAssets: (assets) =>
    set((s) => ({ assets: [...s.assets, ...assets] })),
  removeAsset: (id) =>
    set((s) => ({ assets: s.assets.filter((a) => a.id !== id) })),
  setStatus: (status) => set({ status }),
  clear: () => set({ sessionId: null, assets: [], status: "idle" }),
}));
