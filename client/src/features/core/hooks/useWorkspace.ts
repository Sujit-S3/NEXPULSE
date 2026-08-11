import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { setAccessToken } from "../../../contexts/AuthContext";
import { useAuth } from "../../../hooks/useAuth";
import { QUERY_KEYS } from "../constants";
import { workspaceApi } from "../services/api";
import type { Workspace } from "../types";

export function useWorkspaces(options?: { enabled?: boolean }) {
  const { isAuthenticated } = useAuth();
  return useQuery({
    queryKey: QUERY_KEYS.workspace.all,
    queryFn: workspaceApi.getWorkspaces,
    staleTime: 10 * 60 * 1000,
    enabled: options?.enabled ?? isAuthenticated,
  });
}

export function useCurrentWorkspace() {
  const { isAuthenticated } = useAuth();
  return useQuery({
    queryKey: QUERY_KEYS.workspace.current,
    queryFn: workspaceApi.getCurrent,
    staleTime: 10 * 60 * 1000,
    enabled: isAuthenticated,
  });
}

export function useSwitchWorkspace() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (workspace: Workspace) => workspaceApi.switchWorkspace(workspace.id),
    onSuccess: ({ workspace, accessToken }) => {
      setAccessToken(accessToken);
      queryClient.setQueryData(QUERY_KEYS.workspace.current, workspace);
      void queryClient.invalidateQueries();
    },
  });
}
