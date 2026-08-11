import { useEffect, useMemo, useRef, useState } from "react";
import { GlassButton } from "@components/glass/GlassButton";
import axios from "axios";
import { AnimatePresence, motion } from "framer-motion";
import {
  AlertCircle,
  Check,
  CheckCircle2,
  Search,
  ShieldCheck,
  Star,
  UserRound,
  Users,
  X,
} from "lucide-react";
import {
  usePendingOAuthAccounts,
  useSelectOAuthAccounts,
} from "../../features/core/hooks/usePlatforms";

interface OAuthAccountPickerProps {
  sessionId: string | null;
  onClose: () => void;
  onConnected: () => void;
}

function errorMessage(error: unknown): string {
  if (axios.isAxiosError(error)) {
    const message = error.response?.data?.error?.message;
    if (typeof message === "string") return message;
  }
  return error instanceof Error ? error.message : "Unable to load provider accounts";
}

function followerLabel(value: number): string {
  return new Intl.NumberFormat(undefined, { notation: "compact", maximumFractionDigits: 1 }).format(value);
}

export function OAuthAccountPicker({
  sessionId,
  onClose,
  onConnected,
}: OAuthAccountPickerProps) {
  const { data, isLoading, error } = usePendingOAuthAccounts(sessionId);
  const selectMutation = useSelectOAuthAccounts();
  const [query, setQuery] = useState("");
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [primaryId, setPrimaryId] = useState<string | null>(null);
  const closeRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (!sessionId) return;
    closeRef.current?.focus();
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape" && !selectMutation.isPending) onClose();
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [onClose, selectMutation.isPending, sessionId]);

  const filteredAccounts = useMemo(() => {
    const search = query.trim().toLowerCase();
    if (!search) return data?.accounts ?? [];
    return (data?.accounts ?? []).filter((account) =>
      [account.displayName, account.username, account.accountType]
        .filter(Boolean)
        .some((value) => value?.toLowerCase().includes(search)),
    );
  }, [data?.accounts, query]);

  const toggleAccount = (accountId: string) => {
    setSelectedIds((current) => {
      const next = new Set(current);
      if (next.has(accountId)) {
        next.delete(accountId);
        if (primaryId === accountId) setPrimaryId(null);
      } else {
        next.add(accountId);
      }
      return next;
    });
  };

  const selectAll = () => {
    setSelectedIds(new Set(filteredAccounts.map((account) => account.providerAccountId)));
    setPrimaryId(null);
  };

  const handleContinue = async () => {
    if (!sessionId || !primaryId || selectedIds.size === 0) return;
    await selectMutation.mutateAsync({
      sessionId,
      accountIds: Array.from(selectedIds),
      primaryAccountId: primaryId,
    });
    onConnected();
  };

  return (
    <AnimatePresence>
      {sessionId && (
        <motion.div
          className="fixed inset-0 z-[10000] flex items-center justify-center bg-black/65 p-4 backdrop-blur-md"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          role="presentation"
        >
          <motion.section
            initial={{ opacity: 0, y: 18, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 12, scale: 0.98 }}
            role="dialog"
            aria-modal="true"
            aria-labelledby="oauth-account-picker-title"
            className="flex max-h-[min(760px,92dvh)] w-full max-w-3xl flex-col overflow-hidden rounded-[var(--radius-2xl)] border border-[var(--color-glass-border)] bg-[var(--color-bg-elevated)] shadow-[var(--shadow-xl)]"
          >
            <header className="flex items-start justify-between gap-4 border-b border-[var(--color-border)] p-5">
              <div>
                <div className="mb-2 flex items-center gap-2 text-[var(--color-accent)]">
                  <ShieldCheck className="size-4" aria-hidden="true" />
                  <span className="text-xs font-semibold uppercase tracking-[0.12em]">OAuth verified</span>
                </div>
                <h2 id="oauth-account-picker-title" className="text-xl font-semibold">
                  Choose {data?.providerName ?? "provider"} accounts
                </h2>
                <p className="mt-1 text-sm text-[var(--color-fg-muted)]">
                  Nothing is connected until you select accounts and choose a primary account.
                </p>
              </div>
              <button
                ref={closeRef}
                type="button"
                onClick={onClose}
                disabled={selectMutation.isPending}
                className="flex size-9 shrink-0 items-center justify-center rounded-full border border-[var(--color-border)] text-[var(--color-fg-muted)] transition-colors hover:bg-[var(--color-glass-hover)] hover:text-[var(--color-fg)]"
                aria-label="Cancel account selection"
              >
                <X className="size-4" />
              </button>
            </header>

            {isLoading ? (
              <div className="grid flex-1 place-items-center p-12" role="status">
                <div className="text-center">
                  <div className="mx-auto size-8 animate-spin rounded-full border-2 border-[var(--color-border)] border-t-[var(--color-accent)]" />
                  <p className="mt-3 text-sm text-[var(--color-fg-muted)]">Loading accounts from the provider…</p>
                </div>
              </div>
            ) : error ? (
              <div className="m-5 rounded-[var(--radius-xl)] border border-[var(--color-error)]/30 bg-[var(--color-error)]/10 p-5">
                <div className="flex gap-3">
                  <AlertCircle className="mt-0.5 size-5 shrink-0 text-[var(--color-error)]" />
                  <div>
                    <h3 className="font-semibold">Account discovery failed</h3>
                    <p className="mt-1 text-sm text-[var(--color-fg-muted)]">{errorMessage(error)}</p>
                  </div>
                </div>
              </div>
            ) : data?.accounts.length === 0 ? (
              <div className="grid flex-1 place-items-center p-12 text-center">
                <div>
                  <Users className="mx-auto size-8 text-[var(--color-fg-subtle)]" />
                  <h3 className="mt-3 font-semibold">No accessible accounts found</h3>
                  <p className="mx-auto mt-1 max-w-md text-sm text-[var(--color-fg-muted)]">
                    The provider returned no pages, channels, businesses, or professional accounts. Check the account role and granted permissions, then reconnect.
                  </p>
                </div>
              </div>
            ) : (
              <>
                <div className="flex flex-col gap-3 border-b border-[var(--color-border)] p-4 sm:flex-row sm:items-center">
                  <label className="relative flex-1">
                    <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-[var(--color-fg-subtle)]" />
                    <span className="sr-only">Search accounts</span>
                    <input
                      value={query}
                      onChange={(event) => setQuery(event.target.value)}
                      placeholder="Search accounts"
                      className="h-10 w-full rounded-[var(--radius-lg)] border border-[var(--color-border)] bg-[var(--color-glass)] pl-9 pr-3 text-sm outline-none focus:border-[var(--color-accent)]"
                    />
                  </label>
                  <button
                    type="button"
                    onClick={selectAll}
                    className="h-10 rounded-[var(--radius-lg)] border border-[var(--color-border)] px-4 text-sm font-medium text-[var(--color-fg-muted)] hover:bg-[var(--color-glass-hover)] hover:text-[var(--color-fg)]"
                  >
                    Select all results
                  </button>
                </div>

                <div className="flex-1 space-y-2 overflow-y-auto p-4">
                  {filteredAccounts.map((account) => {
                    const checked = selectedIds.has(account.providerAccountId);
                    return (
                      <div
                        key={account.providerAccountId}
                        className={`rounded-[var(--radius-xl)] border p-4 transition-colors ${
                          checked
                            ? "border-[var(--color-accent)]/60 bg-[var(--color-accent-muted)]"
                            : "border-[var(--color-border)] bg-[var(--color-glass)]"
                        }`}
                      >
                        <div className="flex items-start gap-3">
                          <button
                            type="button"
                            onClick={() => toggleAccount(account.providerAccountId)}
                            className={`mt-3 flex size-5 shrink-0 items-center justify-center rounded border ${
                              checked
                                ? "border-[var(--color-accent)] bg-[var(--color-accent)] text-white"
                                : "border-[var(--color-border-strong)]"
                            }`}
                            role="checkbox"
                            aria-checked={checked}
                            aria-label={`Select ${account.displayName}`}
                          >
                            {checked && <Check className="size-3.5" />}
                          </button>

                          <div className="flex size-12 shrink-0 items-center justify-center overflow-hidden rounded-full border border-[var(--color-border)] bg-[var(--color-bg-surface)]">
                            {account.avatar ? (
                              <img src={account.avatar} alt="" className="size-full object-cover" referrerPolicy="no-referrer" />
                            ) : (
                              <UserRound className="size-5 text-[var(--color-fg-subtle)]" aria-hidden="true" />
                            )}
                          </div>

                          <div className="min-w-0 flex-1">
                            <div className="flex flex-wrap items-center gap-2">
                              <p className="truncate font-semibold">{account.displayName}</p>
                              {account.connected && (
                                <span className="inline-flex items-center gap-1 rounded-full bg-[var(--color-success)]/10 px-2 py-0.5 text-[10px] font-semibold text-[var(--color-success)]">
                                  <CheckCircle2 className="size-3" /> Connected
                                </span>
                              )}
                            </div>
                            <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-[var(--color-fg-muted)]">
                              {account.username && <span>@{account.username.replace(/^@/, "")}</span>}
                              <span className="capitalize">{account.accountType.replace(/[:_]/g, " ")}</span>
                              {typeof account.followers === "number" && (
                                <span>{followerLabel(account.followers)} followers</span>
                              )}
                            </div>
                            {checked && (
                              <button
                                type="button"
                                onClick={() => setPrimaryId(account.providerAccountId)}
                                className={`mt-3 inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs font-medium ${
                                  primaryId === account.providerAccountId
                                    ? "border-[var(--color-accent)] bg-[var(--color-accent)] text-white"
                                    : "border-[var(--color-border)] text-[var(--color-fg-muted)] hover:text-[var(--color-fg)]"
                                }`}
                                aria-pressed={primaryId === account.providerAccountId}
                              >
                                <Star className="size-3" />
                                {primaryId === account.providerAccountId ? "Primary account" : "Make primary"}
                              </button>
                            )}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </>
            )}

            <footer className="border-t border-[var(--color-border)] p-4">
              {selectMutation.error && (
                <p className="mb-3 flex items-center gap-2 text-sm text-[var(--color-error)]" role="alert">
                  <AlertCircle className="size-4" /> {errorMessage(selectMutation.error)}
                </p>
              )}
              <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
                <GlassButton variant="secondary" onClick={onClose} disabled={selectMutation.isPending}>
                  Cancel
                </GlassButton>
                <GlassButton
                  variant="primary"
                  onClick={() => void handleContinue()}
                  disabled={!primaryId || selectedIds.size === 0 || selectMutation.isPending}
                  loading={selectMutation.isPending}
                >
                  Continue with {selectedIds.size || 0} account{selectedIds.size === 1 ? "" : "s"}
                </GlassButton>
              </div>
              {selectedIds.size > 0 && !primaryId && (
                <p className="mt-2 text-right text-xs text-[var(--color-warning)]">
                  Choose which selected account should be primary.
                </p>
              )}
            </footer>
          </motion.section>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
