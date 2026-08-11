import { CheckCircle, XCircle, AlertTriangle, Info, X } from "lucide-react";
import { useNotificationStore } from "../../../features/core/store/notificationStore";

const iconMap = {
  success: CheckCircle,
  error: XCircle,
  warning: AlertTriangle,
  info: Info,
};

const colorMap = {
  success: "var(--color-success)",
  error: "var(--color-error)",
  warning: "var(--color-warning)",
  info: "var(--color-accent)",
};

export function ToastContainer() {
  const toasts = useNotificationStore((s) => s.toasts);
  const removeToast = useNotificationStore((s) => s.removeToast);

  return (
    <div className="fixed bottom-4 right-4 z-[100] flex flex-col gap-[var(--spacing-2)] max-w-sm">
      {toasts.map((toast) => {
          const Icon = iconMap[toast.type];
          const color = colorMap[toast.type];
          return (
            <div
              key={toast.id}
              className="animate-fade-up bg-[var(--color-bg-elevated)] border border-[var(--color-border)] rounded-[var(--radius-lg)] shadow-[var(--shadow-lg)] backdrop-blur-[var(--glass-blur-md)] p-[var(--spacing-4)] flex items-start gap-[var(--spacing-3)]"
            >
              <Icon className="size-5 shrink-0 mt-0.5" style={{ color }} aria-hidden="true" />
              <div className="flex-1 min-w-0">
                <p className="text-[var(--font-size-sm)] font-[var(--font-weight-semibold)] text-[var(--color-fg)]">
                  {toast.title}
                </p>
                {toast.message && (
                  <p className="text-[var(--font-size-xs)] text-[var(--color-fg-muted)] mt-[var(--spacing-0-5)]">
                    {toast.message}
                  </p>
                )}
              </div>
              <button
                onClick={() => removeToast(toast.id)}
                className="flex size-6 items-center justify-center rounded-[var(--radius-sm)] text-[var(--color-fg-subtle)] hover:bg-[var(--color-glass-hover)] hover:text-[var(--color-fg)] transition-colors shrink-0"
                type="button"
                aria-label="Dismiss"
              >
                <X className="size-3.5" />
              </button>
            </div>
          );
        })}
    </div>
  );
}
