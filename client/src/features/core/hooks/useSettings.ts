import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { QUERY_KEYS } from "../constants";
import { settingsApi } from "../services/api";
import type { SettingsData } from "../types";

export function useSettings() {
  return useQuery({
    queryKey: QUERY_KEYS.settings.all,
    queryFn: settingsApi.getSettings,
    staleTime: 10 * 60 * 1000,
  });
}

export function useUpdateSettings() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (updates: Partial<SettingsData>) => settingsApi.updateSettings(updates),
    onMutate: async (updates) => {
      await queryClient.cancelQueries({ queryKey: QUERY_KEYS.settings.all });
      const previous = queryClient.getQueryData<SettingsData>(QUERY_KEYS.settings.all);
      if (previous) {
        queryClient.setQueryData<SettingsData>(QUERY_KEYS.settings.all, {
          ...previous,
          ...updates,
          workspace: updates.workspace
            ? { ...previous.workspace, ...updates.workspace }
            : previous.workspace,
        });
      }
      return { previous };
    },
    onError: (_error, _updates, context) => {
      if (context?.previous) queryClient.setQueryData(QUERY_KEYS.settings.all, context.previous);
    },
    onSuccess: (data) => queryClient.setQueryData(QUERY_KEYS.settings.all, data),
  });
}
