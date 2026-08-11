import { useQuery } from "@tanstack/react-query";
import { QUERY_KEYS } from "../constants";
import { dashboardApi } from "../services/api";

export function useDashboard(connectionId: string | null, options?: { enabled?: boolean; days?: number }) {
  const days = options?.days ?? 30;
  const to = new Date();
  const from = new Date(to.getTime() - days * 86_400_000);
  return useQuery({
    queryKey: [...QUERY_KEYS.dashboard.all, connectionId, days],
    queryFn: () => dashboardApi.getDashboard({ connectionId: connectionId ?? "", from, to }),
    enabled: (options?.enabled ?? true) && Boolean(connectionId),
    staleTime: 30_000,
    refetchInterval: 60_000,
  });
}
