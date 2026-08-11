import { QueryClient } from "@tanstack/react-query";

/**
 * Configured QueryClient for NEXPULSE AI.
 *
 * Production-ready defaults:
 * - 5 minute stale time (avoid unnecessary refetches)
 * - 10 minute garbage collection time (keep cached data available)
 * - 2 retries with exponential backoff
 * - No refetch on window focus (data doesn't change that fast)
 */

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 5 * 60 * 1000,
      gcTime: 10 * 60 * 1000,
      retry: (failureCount, error) => {
        if (
          error &&
          typeof error === "object" &&
          "response" in error
        ) {
          const err = error as { response?: { status?: number } };
          if (err.response?.status && err.response.status < 500) {
            return false;
          }
        }
        return failureCount < 2;
      },
      retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 30_000),
      refetchOnWindowFocus: false,
      refetchOnReconnect: true,
    },
    mutations: {
      retry: (failureCount, error) => {
        if (
          error &&
          typeof error === "object" &&
          "response" in error
        ) {
          const err = error as { response?: { status?: number } };
          if (err.response?.status && err.response.status < 500) {
            return false;
          }
        }
        return failureCount < 1;
      },
      retryDelay: 1000,
    },
  },
});
