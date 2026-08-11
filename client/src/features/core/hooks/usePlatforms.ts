import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "../../../hooks/useAuth";
import type { PlatformType } from "../../../types";
import { QUERY_KEYS } from "../constants";
import { platformApi } from "../services/api";

export function useOAuthProviders() {
  const { isAuthenticated } = useAuth();
  return useQuery({
    queryKey: [...QUERY_KEYS.platforms.all, "providers"],
    queryFn: () => platformApi.getProviders(),
    enabled: isAuthenticated,
    staleTime: 10 * 60 * 1000,
  });
}

export function useOAuthProviderStatus() {
  const { isAuthenticated } = useAuth();
  return useQuery({
    queryKey: [...QUERY_KEYS.platforms.all, "provider-status"],
    queryFn: () => platformApi.getProviderStatus(),
    enabled: isAuthenticated,
    staleTime: 10 * 60 * 1000,
  });
}

export function usePlatformConnections(options?: { enabled?: boolean }) {
  const { isAuthenticated } = useAuth();
  return useQuery({
    queryKey: QUERY_KEYS.platforms.connections,
    queryFn: () => platformApi.getConnections(),
    staleTime: 60_000,
    enabled: options?.enabled ?? isAuthenticated,
  });

}

export function useProviderHealth(options?: { enabled?: boolean }) {
  const { isAuthenticated } = useAuth();
  return useQuery({
    queryKey: [...QUERY_KEYS.platforms.all, "health"],
    queryFn: () => platformApi.getHealth(),
    enabled: options?.enabled ?? isAuthenticated,
    refetchInterval: 30_000,
    staleTime: 15_000,
  });
}

export function useStartPlatformOAuth() {
  return useMutation({
    mutationFn: ({
      provider,
      returnTo,
      forceConsent,
    }: {
      provider: PlatformType;
      returnTo: "/platforms" | "/settings";
      forceConsent?: boolean;
    }) => platformApi.startOAuth(provider, { returnTo, forceConsent }),
  });
}

export function usePendingOAuthAccounts(sessionId: string | null) {
  return useQuery({
    queryKey: [...QUERY_KEYS.platforms.accounts, sessionId],
    queryFn: () => platformApi.getPendingAccounts(sessionId ?? ""),
    enabled: Boolean(sessionId),
    staleTime: 0,
    retry: false,
  });
}

export function useSelectOAuthAccounts() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({
      sessionId,
      accountIds,
      primaryAccountId,
    }: {
      sessionId: string;
      accountIds: string[];
      primaryAccountId: string;
    }) => platformApi.selectAccounts(sessionId, { accountIds, primaryAccountId }),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: QUERY_KEYS.platforms.connections });
    },
  });
}

export function useSetPrimaryPlatformAccount() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (connectionId: string) => platformApi.setPrimary(connectionId),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: QUERY_KEYS.platforms.connections });
    },
  });
}

export function useDisconnectPlatformAccount() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (connectionId: string) => platformApi.disconnect(connectionId),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: QUERY_KEYS.platforms.connections });
    },
  });
}
