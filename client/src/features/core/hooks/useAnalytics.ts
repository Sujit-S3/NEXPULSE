import { useInfiniteQuery, useQuery, useQueryClient } from "@tanstack/react-query";
import { QUERY_KEYS } from "../constants";
import { analyticsApi } from "../services/api";

function range(days: number, offsetDays = 0) {
  const to = new Date(Date.now() - offsetDays * 86_400_000);
  return { from: new Date(to.getTime() - days * 86_400_000), to };
}

export function useAnalytics(
  connectionId: string | null,
  options?: { enabled?: boolean; days?: number; compare?: boolean },
) {
  const days = options?.days ?? 30;
  const queryClient = useQueryClient();
  const queryKey = [...QUERY_KEYS.analytics.all, connectionId, days] as const;
  const currentRange = range(days);
  const current = useInfiniteQuery({
    queryKey,
    queryFn: ({ pageParam }) => analyticsApi.getAnalytics({
      connectionId: connectionId ?? "",
      ...currentRange,
      cursor: pageParam,
      limit: 25,
    }),
    initialPageParam: undefined as string | undefined,
    getNextPageParam: (lastPage) => lastPage.nextCursor,
    enabled: (options?.enabled ?? true) && Boolean(connectionId),
    staleTime: 5 * 60 * 1000,
  });

  const previousRange = range(days, days);
  const comparison = useQuery({
    queryKey: [...QUERY_KEYS.analytics.all, "comparison", connectionId, days],
    queryFn: () => analyticsApi.getAnalytics({
      connectionId: connectionId ?? "",
      ...previousRange,
      limit: 25,
    }),
    enabled: (options?.enabled ?? true) && Boolean(connectionId) && Boolean(options?.compare),
    staleTime: 5 * 60 * 1000,
  });

  async function refreshFromProvider() {
    if (!connectionId) return;
    const refreshed = await analyticsApi.getAnalytics({
      connectionId,
      ...range(days),
      forceRefresh: true,
      limit: 25,
    });
    queryClient.setQueryData(queryKey, { pages: [refreshed], pageParams: [undefined] });
    if (options?.compare) await comparison.refetch();
  }

  return { ...current, comparison, refreshFromProvider };
}
