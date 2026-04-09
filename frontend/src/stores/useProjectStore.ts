import { create } from "zustand";
import { persist } from "zustand/middleware";
import type { ProjectStatus } from "../../../shared/types";

interface ProjectState {
  projectId: string | null;
  projectName: string | null;
  status: ProjectStatus | null;
  setProject: (id: string, name: string, status: ProjectStatus) => void;
  setStatus: (status: ProjectStatus) => void;
  clear: () => void;
}

export const useProjectStore = create<ProjectState>()(
  persist(
    (set) => ({
      projectId: null,
      projectName: null,
      status: null,
      setProject: (id, name, status) =>
        set({ projectId: id, projectName: name, status }),
      setStatus: (status) => set({ status }),
      clear: () => set({ projectId: null, projectName: null, status: null }),
    }),
    {
      name: "cyrano-project",
      partialize: (state) => ({
        projectId: state.projectId,
        projectName: state.projectName,
        status: state.status,
      }),
    }
  )
);
