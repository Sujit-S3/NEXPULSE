import { useCallback, useEffect, useState } from "react";
import { KeyRound, Laptop, LogOut, RefreshCw, ShieldCheck, Trash2 } from "lucide-react";
import { useAuth } from "../../hooks/useAuth";
import { identityApi, type ApiCredential, type IdentitySession, type MfaStatus, type SecurityEvent, type ServiceAccount } from "../../services/identity";

function errorMessage(error: unknown): string {
  const value = error as { response?: { data?: { error?: { message?: string } } }; message?: string };
  return value.response?.data?.error?.message ?? value.message ?? "The request could not be completed";
}

function Section({ title, description, children }: { title: string; description: string; children: React.ReactNode }) {
  return (
    <section className="rounded-[var(--radius-xl)] border border-[var(--color-glass-border)] bg-[var(--color-glass)] p-[var(--spacing-5)]">
      <div className="mb-[var(--spacing-4)]">
        <h2 className="text-sm font-semibold text-[var(--color-fg)]">{title}</h2>
        <p className="mt-1 text-xs text-[var(--color-fg-muted)]">{description}</p>
      </div>
      {children}
    </section>
  );
}

const inputClass = "h-10 w-full rounded-[var(--radius-lg)] border border-[var(--color-border)] bg-[var(--color-bg-surface)] px-3 text-sm text-[var(--color-fg)] outline-none focus:border-[var(--color-accent)]";
const secondaryButton = "inline-flex h-9 items-center justify-center gap-2 rounded-[var(--radius-lg)] border border-[var(--color-border)] bg-[var(--color-glass)] px-3 text-xs font-medium text-[var(--color-fg)] transition-colors hover:bg-[var(--color-glass-hover)] disabled:cursor-not-allowed disabled:opacity-50";
const primaryButton = "inline-flex h-9 items-center justify-center gap-2 rounded-[var(--radius-lg)] bg-[var(--color-accent)] px-3 text-xs font-semibold text-white transition-opacity hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50";

export function IdentitySecuritySettings() {
  const { user } = useAuth();
  const [sessions, setSessions] = useState<IdentitySession[]>([]);
  const [mfa, setMfa] = useState<MfaStatus | null>(null);
  const [credentials, setCredentials] = useState<ApiCredential[]>([]);
  const [events, setEvents] = useState<SecurityEvent[]>([]);
  const [serviceAccounts, setServiceAccounts] = useState<ServiceAccount[]>([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [setupPassword, setSetupPassword] = useState("");
  const [totpSetup, setTotpSetup] = useState<{ secret: string; uri: string } | null>(null);
  const [totpCode, setTotpCode] = useState("");
  const [recoveryCodes, setRecoveryCodes] = useState<string[]>([]);
  const [mfaPassword, setMfaPassword] = useState("");
  const [mfaVerificationCode, setMfaVerificationCode] = useState("");
  const [credentialName, setCredentialName] = useState("");
  const [credentialPermission, setCredentialPermission] = useState("analytics.read");
  const [newCredential, setNewCredential] = useState<string | null>(null);
  const [serviceAccountName, setServiceAccountName] = useState("");
  const [serviceAccountPurpose, setServiceAccountPurpose] = useState<ServiceAccount["purpose"]>("integration");
  const [newServiceToken, setNewServiceToken] = useState<string | null>(null);

  const canManageCredentials = user?.permissions.includes("identity.api_keys.manage") ?? false;
  const canManageServiceAccounts = user?.permissions.includes("identity.service_accounts.manage") ?? false;

  const load = useCallback(async () => {
    setError(null);
    try {
      const [nextSessions, nextMfa, nextEvents, nextCredentials, nextServiceAccounts] = await Promise.all([
        identityApi.sessions(),
        identityApi.mfaStatus(),
        identityApi.securityEvents(),
        canManageCredentials ? identityApi.credentials() : Promise.resolve([]),
        canManageServiceAccounts ? identityApi.serviceAccounts() : Promise.resolve([]),
      ]);
      setSessions(nextSessions);
      setMfa(nextMfa);
      setEvents(nextEvents);
      setCredentials(nextCredentials);
      setServiceAccounts(nextServiceAccounts);
    } catch (requestError) {
      setError(errorMessage(requestError));
    } finally {
      setLoading(false);
    }
  }, [canManageCredentials, canManageServiceAccounts]);

  useEffect(() => { void load(); }, [load]);

  const run = async (action: () => Promise<unknown>, refresh = true) => {
    setBusy(true);
    setError(null);
    try {
      await action();
      if (refresh) await load();
    } catch (requestError) {
      setError(errorMessage(requestError));
    } finally {
      setBusy(false);
    }
  };

  if (loading) {
    return <div className="rounded-[var(--radius-xl)] border border-[var(--color-glass-border)] bg-[var(--color-glass)] p-5 text-sm text-[var(--color-fg-muted)]">Loading identity security…</div>;
  }

  return (
    <div className="space-y-[var(--spacing-4)]" aria-label="Identity and security settings">
      <div className="flex items-center justify-between gap-4">
        <div>
          <h2 className="text-lg font-semibold">Identity &amp; Security</h2>
          <p className="mt-1 text-xs text-[var(--color-fg-muted)]">Manage authentication, active devices, and revocable credentials.</p>
        </div>
        <button type="button" className={secondaryButton} onClick={() => void load()} disabled={busy}>
          <RefreshCw className="size-3.5" aria-hidden="true" /> Refresh
        </button>
      </div>

      {error && <div role="alert" className="rounded-[var(--radius-lg)] border border-[var(--color-error)]/30 bg-[var(--color-error)]/10 p-3 text-xs text-[var(--color-error)]">{error}</div>}

      <Section title="Multi-factor authentication" description="Use an authenticator app and single-use recovery codes.">
        <div className="flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <span className="flex size-9 items-center justify-center rounded-full bg-[var(--color-accent)]/10 text-[var(--color-accent)]"><ShieldCheck className="size-4" /></span>
            <div><p className="text-sm font-medium">{mfa?.enabled ? "Enabled" : "Not enabled"}</p><p className="text-xs text-[var(--color-fg-muted)]">{mfa?.recoveryCodesRemaining ?? 0} recovery codes remaining</p></div>
          </div>
        </div>

        {!mfa?.totpEnabled && !totpSetup && (
          <form className="mt-4 flex gap-2" onSubmit={(event) => { event.preventDefault(); void run(async () => { const setup = await identityApi.beginTotp(setupPassword); setTotpSetup(setup); setSetupPassword(""); }, false); }}>
            <input className={inputClass} type="password" value={setupPassword} onChange={(event) => setSetupPassword(event.target.value)} placeholder="Confirm your password" autoComplete="current-password" required />
            <button className={primaryButton} type="submit" disabled={busy}>Set up</button>
          </form>
        )}

        {totpSetup && (
          <form className="mt-4 space-y-3 rounded-[var(--radius-lg)] border border-[var(--color-border)] p-3" onSubmit={(event) => { event.preventDefault(); void run(async () => { const result = await identityApi.confirmTotp(totpCode); setRecoveryCodes(result.recoveryCodes); setTotpSetup(null); setTotpCode(""); }, true); }}>
            <p className="text-xs text-[var(--color-fg-muted)]">Add this secret to your authenticator, then enter its six-digit code.</p>
            <code className="block break-all rounded bg-[var(--color-bg-surface)] p-2 text-xs select-all">{totpSetup.secret}</code>
            <input className={inputClass} value={totpCode} onChange={(event) => setTotpCode(event.target.value.replace(/\D/g, "").slice(0, 6))} inputMode="numeric" autoComplete="one-time-code" placeholder="000000" required />
            <button className={primaryButton} type="submit" disabled={busy || totpCode.length !== 6}>Confirm authenticator</button>
          </form>
        )}

        {recoveryCodes.length > 0 && (
          <div className="mt-4 rounded-[var(--radius-lg)] border border-[var(--color-warning)]/30 bg-[var(--color-warning)]/10 p-3">
            <p className="text-xs font-semibold">Save these recovery codes now. They will not be shown again.</p>
            <div className="mt-2 grid grid-cols-2 gap-1 font-mono text-xs">{recoveryCodes.map((code) => <span key={code}>{code}</span>)}</div>
            <button type="button" className={`${secondaryButton} mt-3`} onClick={() => { setRecoveryCodes([]); if (user?.mfa.enrollmentRequired) window.location.reload(); }}>I saved them</button>
          </div>
        )}

        {mfa?.enabled && (
          <div className="mt-4 space-y-3 border-t border-[var(--color-border)] pt-4">
            {!mfa.emailOtpEnabled && (
              <form className="flex gap-2" onSubmit={(event) => { event.preventDefault(); void run(async () => { const result = await identityApi.enableEmailOtp(mfaPassword); if (result.recoveryCodes) setRecoveryCodes(result.recoveryCodes); setMfaPassword(""); }, true); }}>
                <input className={inputClass} type="password" value={mfaPassword} onChange={(event) => setMfaPassword(event.target.value)} placeholder="Password to enable email OTP" autoComplete="current-password" required />
                <button className={secondaryButton} type="submit" disabled={busy}>Enable email OTP</button>
              </form>
            )}
            <div className="flex gap-2">
              <input className={inputClass} value={mfaVerificationCode} onChange={(event) => setMfaVerificationCode(event.target.value)} placeholder="Authenticator or recovery code" autoComplete="one-time-code" />
              <button className={secondaryButton} type="button" disabled={busy || !mfaVerificationCode} onClick={() => void run(async () => { const result = await identityApi.regenerateRecoveryCodes(mfaVerificationCode); setRecoveryCodes(result.recoveryCodes); setMfaVerificationCode(""); }, true)}>New recovery codes</button>
            </div>
            <form className="grid gap-2 sm:grid-cols-[1fr_1fr_auto]" onSubmit={(event) => { event.preventDefault(); void run(async () => { await identityApi.disableMfa(mfaPassword, mfaVerificationCode); setMfaPassword(""); setMfaVerificationCode(""); setRecoveryCodes([]); }, true); }}>
              <input className={inputClass} type="password" value={mfaPassword} onChange={(event) => setMfaPassword(event.target.value)} placeholder="Password" autoComplete="current-password" required />
              <input className={inputClass} value={mfaVerificationCode} onChange={(event) => setMfaVerificationCode(event.target.value)} placeholder="Authenticator or recovery code" autoComplete="one-time-code" required />
              <button className={secondaryButton} type="submit" disabled={busy}>Disable MFA</button>
            </form>
          </div>
        )}
        {(mfa?.trustedDevices.length ?? 0) > 0 && (
          <div className="mt-4 border-t border-[var(--color-border)] pt-4">
            <p className="mb-2 text-xs font-semibold">Trusted devices</p>
            <div className="space-y-2">{mfa?.trustedDevices.map((device) => <div key={device.id} className="flex items-center justify-between rounded-[var(--radius-lg)] border border-[var(--color-border)] p-3"><div><p className="text-xs font-medium">{device.name}</p><p className="text-xs text-[var(--color-fg-muted)]">Trusted until {new Date(device.expiresAt).toLocaleDateString()}</p></div><button type="button" className={secondaryButton} disabled={busy} onClick={() => void run(() => identityApi.removeTrustedDevice(device.id))}>Remove</button></div>)}</div>
          </div>
        )}
      </Section>

      <Section title="Active sessions" description="Review devices and remotely revoke access.">
        <div className="space-y-2">
          {sessions.filter((session) => !session.revokedAt).map((session) => (
            <div key={session.id} className="flex items-center justify-between gap-3 rounded-[var(--radius-lg)] border border-[var(--color-border)] p-3">
              <div className="flex min-w-0 items-center gap-3">
                <Laptop className="size-4 shrink-0 text-[var(--color-fg-muted)]" aria-hidden="true" />
                <div className="min-w-0"><p className="truncate text-sm font-medium">{session.deviceName} {session.current && <span className="text-[var(--color-accent)]">· Current</span>}</p><p className="truncate text-xs text-[var(--color-fg-muted)]">{session.browser} on {session.os} · {session.ipAddress} · active {new Date(session.lastActiveAt).toLocaleString()}</p></div>
              </div>
              {!session.current && <button type="button" className={secondaryButton} disabled={busy} onClick={() => void run(() => identityApi.revokeSession(session.id))}><LogOut className="size-3.5" /> Revoke</button>}
            </div>
          ))}
        </div>
        {sessions.some((session) => !session.current && !session.revokedAt) && <button type="button" className={`${secondaryButton} mt-3`} disabled={busy} onClick={() => void run(() => identityApi.revokeOtherSessions())}>Sign out other devices</button>}
      </Section>

      {canManageCredentials && (
        <Section title="API credentials" description="Scoped credentials are shown once and can be revoked immediately.">
          <form className="grid gap-2 sm:grid-cols-[1fr_1fr_auto]" onSubmit={(event) => { event.preventDefault(); void run(async () => { const result = await identityApi.createCredential({ type: "api_key", name: credentialName, permissions: [credentialPermission] }); setNewCredential(result.token); setCredentialName(""); }, true); }}>
            <input className={inputClass} value={credentialName} onChange={(event) => setCredentialName(event.target.value)} placeholder="Credential name" required maxLength={100} />
            <select className={inputClass} value={credentialPermission} onChange={(event) => setCredentialPermission(event.target.value)}>
              {(user?.permissions ?? []).filter((permission) => !permission.startsWith("identity.") && permission !== "workspace.delete" && permission !== "billing.manage").map((permission) => <option key={permission} value={permission}>{permission}</option>)}
            </select>
            <button className={primaryButton} type="submit" disabled={busy}>Create</button>
          </form>
          {newCredential && <div className="mt-3 rounded-[var(--radius-lg)] border border-[var(--color-warning)]/30 bg-[var(--color-warning)]/10 p-3"><p className="text-xs font-semibold">Copy this credential now</p><code className="mt-2 block break-all text-xs select-all">{newCredential}</code><button type="button" className={`${secondaryButton} mt-2`} onClick={() => setNewCredential(null)}>I copied it</button></div>}
          <div className="mt-3 space-y-2">{credentials.filter((credential) => !credential.revokedAt).map((credential) => <div key={credential.id} className="flex items-center justify-between rounded-[var(--radius-lg)] border border-[var(--color-border)] p-3"><div className="flex items-center gap-3"><KeyRound className="size-4 text-[var(--color-fg-muted)]" /><div><p className="text-sm font-medium">{credential.name}</p><p className="text-xs text-[var(--color-fg-muted)]">{credential.prefix} · {credential.permissions.join(", ")}</p></div></div><div className="flex gap-2"><button type="button" className={secondaryButton} disabled={busy} aria-label={`Rotate ${credential.name}`} onClick={() => void run(async () => { const result = await identityApi.rotateCredential(credential.id); setNewCredential(result.token); }, true)}><RefreshCw className="size-3.5" /> Rotate</button><button type="button" className={secondaryButton} disabled={busy} aria-label={`Revoke ${credential.name}`} onClick={() => void run(() => identityApi.revokeCredential(credential.id))}><Trash2 className="size-3.5" /> Revoke</button></div></div>)}</div>
        </Section>
      )}

      {canManageServiceAccounts && (
        <Section title="Service accounts" description="Issue limited machine identities for automation, integrations, bots, and CI/CD.">
          <form className="grid gap-2 sm:grid-cols-[1fr_160px_auto]" onSubmit={(event) => { event.preventDefault(); void run(async () => { const result = await identityApi.createServiceAccount({ name: serviceAccountName, purpose: serviceAccountPurpose, permissions: [credentialPermission] }); setNewServiceToken(result.token); setServiceAccountName(""); }, true); }}>
            <input className={inputClass} value={serviceAccountName} onChange={(event) => setServiceAccountName(event.target.value)} placeholder="Machine identity name" required maxLength={100} />
            <select className={inputClass} value={serviceAccountPurpose} onChange={(event) => setServiceAccountPurpose(event.target.value as ServiceAccount["purpose"])}><option value="automation">Automation</option><option value="integration">Integration</option><option value="bot">Bot</option><option value="ci_cd">CI/CD</option></select>
            <button className={primaryButton} type="submit" disabled={busy}>Create</button>
          </form>
          {newServiceToken && <div className="mt-3 rounded-[var(--radius-lg)] border border-[var(--color-warning)]/30 bg-[var(--color-warning)]/10 p-3"><p className="text-xs font-semibold">Copy this service token now</p><code className="mt-2 block break-all text-xs select-all">{newServiceToken}</code><button type="button" className={`${secondaryButton} mt-2`} onClick={() => setNewServiceToken(null)}>I copied it</button></div>}
          <div className="mt-3 space-y-2">{serviceAccounts.filter((account) => account.status === "active").map((account) => <div key={account.id} className="flex items-center justify-between gap-3 rounded-[var(--radius-lg)] border border-[var(--color-border)] p-3"><div><p className="text-sm font-medium">{account.name}</p><p className="text-xs text-[var(--color-fg-muted)]">{account.purpose.replaceAll("_", "/")} · {account.permissions.join(", ")}</p></div><div className="flex gap-2"><button type="button" className={secondaryButton} disabled={busy} onClick={() => void run(async () => { const result = await identityApi.rotateServiceToken(account.id); setNewServiceToken(result.token); }, true)}><RefreshCw className="size-3.5" />Rotate</button><button type="button" className={secondaryButton} disabled={busy} onClick={() => void run(() => identityApi.disableServiceAccount(account.id))}><Trash2 className="size-3.5" />Disable</button></div></div>)}</div>
        </Section>
      )}

      <Section title="Recent security activity" description="Authentication and identity changes associated with your account.">
        <div className="space-y-2">{events.length === 0 ? <p className="text-xs text-[var(--color-fg-muted)]">No security events recorded.</p> : events.map((event) => <div key={event.id} className="flex items-center justify-between gap-3 text-xs"><span className="truncate">{event.type.replaceAll(".", " ")}</span><span className="shrink-0 text-[var(--color-fg-muted)]">{new Date(event.createdAt).toLocaleString()}</span></div>)}</div>
      </Section>
    </div>
  );
}
