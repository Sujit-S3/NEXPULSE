import { useEffect } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { QUERY_KEYS } from "../constants";
import { notificationApi } from "../services/api";
import { useNotificationStore } from "../store/notificationStore";
import type { Notification } from "../types";

export function useNotifications(input?: {
  status?: "all" | "read" | "unread" | "archived";
  type?: Notification["type"];
  search?: string;
}) {
  return useQuery({
    queryKey: [...QUERY_KEYS.notifications.all, input ?? {}],
    queryFn: () => notificationApi.getNotifications(input),
    staleTime: 30_000,
  });
}

export function useMarkNotificationRead() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: notificationApi.markRead,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: QUERY_KEYS.notifications.all }),
  });
}

export function useMarkAllNotificationsRead() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: notificationApi.markAllRead,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: QUERY_KEYS.notifications.all }),
  });
}

export function useArchiveNotification() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: notificationApi.archive,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: QUERY_KEYS.notifications.all }),
  });
}

export function useNotificationStream() {
  const queryClient = useQueryClient();
  const addToast = useNotificationStore((state) => state.addToast);

  useEffect(() => {
    const controller = new AbortController();
    let stopped = false;
    const reconnect = async () => {
      while (!stopped) {
        try {
          await notificationApi.stream((event) => {
            void queryClient.invalidateQueries({ queryKey: QUERY_KEYS.notifications.all });
            if (event.kind === "created" && event.notification) {
              addToast({
                type: event.notification.type === "alert" || event.notification.type === "health"
                  ? "warning"
                  : "info",
                title: event.notification.title,
                message: event.notification.message,
              });
            }
          }, controller.signal);
        } catch {
          if (controller.signal.aborted) return;
        }
        await new Promise((resolve) => window.setTimeout(resolve, 2_500));
      }
    };
    void reconnect();
    return () => {
      stopped = true;
      controller.abort();
    };
  }, [addToast, queryClient]);
}
