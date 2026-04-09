import { useProjectStore } from "./stores/useProjectStore";
import { BatchWelcome } from "./components/batch/BatchWelcome";
import { BatchLayout } from "./components/batch/BatchLayout";
import { ProjectStatusScreen } from "./components/ProjectStatusScreen";
import { ErrorBoundary } from "./components/ErrorBoundary";

export default function BatchApp() {
  const projectId = useProjectStore((s) => s.projectId);
  const status = useProjectStore((s) => s.status);

  return (
    <ErrorBoundary>
      <div style={{ height: "100%", width: "100%", overflow: "hidden" }}>
        {!projectId ? (
          <BatchWelcome />
        ) : status === "editing" ? (
          <BatchLayout />
        ) : (
          <ProjectStatusScreen />
        )}
      </div>
    </ErrorBoundary>
  );
}
