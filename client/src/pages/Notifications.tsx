import { useMemo, useState } from "react";
import {
  GlassNotificationCenter,
  GlassSkeleton,
  GlassTabs,
} from "@components/enterprise";
import {
  Archive,
  AtSign,
  Bell,
  Bot,
  Check,
  CheckCheck,
  CircleAlert,
  ClipboardCheck,
  HeartPulse,
  Search,
  Sparkles,
} from "lucide-react";
import { useNavigate } from "react-router-dom";
import {
  useArchiveNotification,
  useMarkAllNotificationsRead,
  useMarkNotificationRead,
  useNotifications,
} from "../features/core/hooks/useNotifications";
import type { Notification } from "../features/core/types";

const categories: { id: Notification["type"] | "all"; label: string }[] = [
  { id: "all", label: "All" },
  { id: "mention", label: "Mentions" },
  { id: "approval", label: "Approvals" },
  { id: "task", label: "Tasks" },
  { id: "health", label: "Health" },
  { id: "insight", label: "AI insights" },
];

function NotificationIcon({ type }: { type: Notification["type"] }) {
  if (type === "mention") return <AtSign aria-hidden="true" />;
  if (type === "approval") return <ClipboardCheck aria-hidden="true" />;
  if (type === "task") return <Check aria-hidden="true" />;
  if (type === "health") return <HeartPulse aria-hidden="true" />;
  if (type === "insight") return <Sparkles aria-hidden="true" />;
  if (type === "alert") return <CircleAlert aria-hidden="true" />;
  return <Bell aria-hidden="true" />;
}

export function NotificationsPage() {
  const navigate = useNavigate();
  const [status, setStatus] = useState<"all" | "unread" | "archived">("all");
  const [type, setType] = useState<Notification["type"] | "all">("all");
  const [search, setSearch] = useState("");
  const notifications = useNotifications({
    status,
    type: type === "all" ? undefined : type,
    search: search.trim() || undefined,
  });
  const markRead = useMarkNotificationRead();
  const markAllRead = useMarkAllNotificationsRead();
  const archive = useArchiveNotification();

  const aiSummaryPrompt = useMemo(() => {
    const items = notifications.data?.items.filter((item) => !item.read).slice(0, 12) ?? [];
    if (!items.length) return "Summarize my latest workspace activity and recommend the next actions.";
    const activity = items.map((item) => `${item.type}: ${item.title} — ${item.message}`).join("\n");
    return `Summarize these unread workspace notifications, prioritize risks and approvals, and recommend next actions:\n${activity}`;
  }, [notifications.data?.items]);

  const openNotification = (notification: Notification) => {
    if (!notification.read) markRead.mutate(notification.id);
    if (notification.actionPath) navigate(notification.actionPath);
  };

  return (
    <div className="notification-workspace mx-auto w-full max-w-6xl pb-12">
      <GlassNotificationCenter
        title="Notification center"
        unread={notifications.data?.unread ?? 0}
        actions={(
          <div className="notification-header-actions">
            <button type="button" onClick={() => navigate(`/ai?prompt=${encodeURIComponent(aiSummaryPrompt)}`)}>
              <Bot aria-hidden="true" /> AI summary
            </button>
            {(notifications.data?.unread ?? 0) > 0 && (
              <button type="button" onClick={() => markAllRead.mutate()} disabled={markAllRead.isPending}>
                <CheckCheck aria-hidden="true" /> Mark all read
              </button>
            )}
          </div>
        )}
      >
        <div className="notification-controls">
          <label>
            <Search aria-hidden="true" />
            <span className="sr-only">Search notifications</span>
            <input
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Search activity"
            />
          </label>
          <GlassTabs
            tabs={[
              { id: "all", label: "Active" },
              { id: "unread", label: "Unread", badge: notifications.data?.unread },
              { id: "archived", label: "Archived" },
            ]}
            value={status}
            onChange={(next) => setStatus(next as typeof status)}
            ariaLabel="Notification status"
          />
        </div>

        <GlassTabs
          tabs={categories}
          value={type}
          onChange={(next) => setType(next as typeof type)}
          ariaLabel="Notification category"
          className="notification-category-tabs"
        />

        {notifications.error && (
          <div role="alert" className="notification-error">
            <CircleAlert aria-hidden="true" /> {(notifications.error as Error).message}
          </div>
        )}

        {notifications.isLoading && (
          <div className="notification-loading">
            <GlassSkeleton lines={2} />
            <GlassSkeleton lines={2} />
            <GlassSkeleton lines={2} />
          </div>
        )}

        {!notifications.isLoading && notifications.data?.items.length === 0 && (
          <div className="notification-empty">
            <Bell aria-hidden="true" />
            <h2>No matching activity</h2>
            <p>New alerts, mentions, approvals, AI insights, and health events will appear here live.</p>
          </div>
        )}

        <div className="notification-feed" aria-live="polite">
          {notifications.data?.items.map((notification) => (
            <article
              key={notification.id}
              className={`${notification.read ? "is-read" : "is-unread"} ${notification.archived ? "is-archived" : ""}`}
            >
              <div className={`notification-type-icon is-${notification.type}`}>
                <NotificationIcon type={notification.type} />
              </div>
              <div className="notification-copy">
                <header>
                  <span>{notification.type}</span>
                  <time>{new Date(notification.timestamp).toLocaleString()}</time>
                </header>
                <h2>{notification.title}</h2>
                <p>{notification.message}</p>
                <div>
                  {notification.actionable && notification.actionPath && (
                    <button type="button" className="is-primary" onClick={() => openNotification(notification)}>
                      {notification.actionLabel ?? "Open"} <Check aria-hidden="true" />
                    </button>
                  )}
                  {!notification.read && (
                    <button type="button" onClick={() => markRead.mutate(notification.id)}>
                      <Check aria-hidden="true" /> Mark read
                    </button>
                  )}
                  {!notification.archived && (
                    <button type="button" onClick={() => archive.mutate(notification.id)}>
                      <Archive aria-hidden="true" /> Archive
                    </button>
                  )}
                </div>
              </div>
              {!notification.read && <span className="notification-unread-dot" aria-label="Unread" />}
            </article>
          ))}
        </div>
      </GlassNotificationCenter>
    </div>
  );
}
