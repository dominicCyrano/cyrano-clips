import { useProjectStore } from "./stores/useProjectStore";
import { WelcomeScreen } from "./components/WelcomeScreen";
import { EditorLayout } from "./components/EditorLayout";
import { ProjectStatusScreen } from "./components/ProjectStatusScreen";
import { ErrorBoundary } from "./components/ErrorBoundary";

export default function App() {
  const projectId = useProjectStore((s) => s.projectId);
  const status = useProjectStore((s) => s.status);

  return (
    <ErrorBoundary>
      <div style={{ height: "100%", width: "100%", overflow: "hidden" }}>
        {!projectId ? (
          <WelcomeScreen />
        ) : status === "editing" ? (
          <EditorLayout />
        ) : (
          <ProjectStatusScreen />
        )}
      </div>
    </ErrorBoundary>
  );
}
