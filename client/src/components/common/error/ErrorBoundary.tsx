import { Component, type ReactNode, type ErrorInfo } from "react";
import { AlertTriangle, RefreshCw } from "lucide-react";
import { GlassButton } from "../../glass/GlassButton";
import { LoadingLogo } from "../BrandLogo";

interface ErrorBoundaryProps {
  children: ReactNode;
  fallback?: ReactNode;
  onReset?: () => void;
}

interface ErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { hasError: true, error };
  }

  override componentDidCatch(error: Error, errorInfo: ErrorInfo): void {
    console.error("ErrorBoundary caught:", error, errorInfo);
  }

  handleReset = () => {
    this.setState({ hasError: false, error: null });
    this.props.onReset?.();
  };

  override render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback;
      }

      return (
        <div className="flex flex-col items-center justify-center min-h-[200px] p-[var(--spacing-8)] text-center">
          <div className="flex size-14 items-center justify-center rounded-full bg-[var(--color-error)]/10 mb-[var(--spacing-4)]">
            <AlertTriangle className="size-6 text-[var(--color-error)]" aria-hidden="true" />
          </div>
          <h3 className="text-[var(--font-size-lg)] font-[var(--font-weight-semibold)] mb-[var(--spacing-2)]">
            Something went wrong
          </h3>
          <p className="text-[var(--font-size-sm)] text-[var(--color-fg-muted)] mb-[var(--spacing-6)] max-w-md">
            {this.state.error?.message ?? "An unexpected error occurred. Please try again."}
          </p>
          <GlassButton variant="primary" onClick={this.handleReset}>
            <RefreshCw className="size-4" aria-hidden="true" />
            Try Again
          </GlassButton>
        </div>
      );
    }

    return this.props.children;
  }
}

export function ErrorFallback({ error, resetErrorBoundary }: { error: Error; resetErrorBoundary: () => void }) {
  return (
    <div className="flex flex-col items-center justify-center min-h-[200px] p-[var(--spacing-8)] text-center">
      <div className="flex size-14 items-center justify-center rounded-full bg-[var(--color-error)]/10 mb-[var(--spacing-4)]">
        <AlertTriangle className="size-6 text-[var(--color-error)]" aria-hidden="true" />
      </div>
      <h3 className="text-[var(--font-size-lg)] font-[var(--font-weight-semibold)] mb-[var(--spacing-2)]">
        Failed to load data
      </h3>
      <p className="text-[var(--font-size-sm)] text-[var(--color-fg-muted)] mb-[var(--spacing-6)] max-w-md">
        {error.message}
      </p>
      <GlassButton variant="primary" onClick={resetErrorBoundary}>
        <RefreshCw className="size-4" aria-hidden="true" />
        Retry
      </GlassButton>
    </div>
  );
}

export function EmptyState({
  icon: Icon,
  title,
  description,
  action,
}: {
  icon: React.ComponentType<{ className?: string }>;
  title: string;
  description: string;
  action?: { label: string; onClick: () => void };
}) {
  return (
    <div className="flex flex-col items-center justify-center py-[var(--spacing-16)] text-center">
      <div className="flex size-16 items-center justify-center rounded-full bg-[var(--color-glass)] border border-[var(--color-glass-border)] mb-[var(--spacing-4)]">
        {Icon && <Icon className="size-7 text-[var(--color-fg-muted)]" aria-hidden="true" />}
      </div>
      <h3 className="text-[var(--font-size-xl)] font-[var(--font-weight-semibold)] mb-[var(--spacing-2)]">
        {title}
      </h3>
      <p className="text-[var(--color-fg-muted)] max-w-md mb-[var(--spacing-6)]">
        {description}
      </p>
      {action && (
        <GlassButton variant="primary" onClick={action.onClick}>
          {action.label}
        </GlassButton>
      )}
    </div>
  );
}

export function LoadingOverlay({ label = "Loading..." }: { label?: string }) {
  return (
    <div className="flex min-h-[60vh] items-center justify-center" role="status">
      <div className="flex flex-col items-center gap-6">
        <LoadingLogo size={64} />
        <p className="text-sm text-[var(--color-fg-muted)]">{label}</p>
      </div>
    </div>
  );
}
