import { type ReactNode, useEffect } from "react";
import { useWorkspaces } from "../hooks/useWorkspace";

export function AppDataProvider({ children }: { children: ReactNode }) {
  const { isLoading } = useWorkspaces();

  useEffect(() => {
    if (!isLoading) {
      document.documentElement.setAttribute("data-loaded", "true");
    }
  }, [isLoading]);

  return <>{children}</>;
}
