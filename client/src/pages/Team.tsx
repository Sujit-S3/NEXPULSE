import { useCallback, useEffect, useState } from "react";
import { GlassCard } from "@components/glass/GlassCard";
import { MailPlus, RefreshCw, Trash2, Users } from "lucide-react";
import { useCurrentWorkspace } from "../features/core/hooks/useWorkspace";
import { useAuth } from "../hooks/useAuth";
import { identityApi, type WorkspaceInvitation, type WorkspaceMember } from "../services/identity";

const roles = ["workspace_admin", "manager", "editor", "analyst", "viewer", "guest"];
const inputClass = "h-10 rounded-[var(--radius-lg)] border border-[var(--color-border)] bg-[var(--color-bg-surface)] px-3 text-sm outline-none focus:border-[var(--color-accent)]";
const buttonClass = "inline-flex h-9 items-center justify-center gap-2 rounded-[var(--radius-lg)] border border-[var(--color-border)] bg-[var(--color-glass)] px-3 text-xs font-medium transition-colors hover:bg-[var(--color-glass-hover)] disabled:opacity-50";

function message(error: unknown) {
  const value = error as { response?: { data?: { error?: { message?: string } } }; message?: string };
  return value.response?.data?.error?.message ?? value.message ?? "The team request failed";
}

export function TeamPage() {
  const workspace = useCurrentWorkspace();
  const { user } = useAuth();
  const [members, setMembers] = useState<WorkspaceMember[]>([]);
  const [invitations, setInvitations] = useState<WorkspaceInvitation[]>([]);
  const [membersLoading, setMembersLoading] = useState(true);
  const [email, setEmail] = useState("");
  const [role, setRole] = useState("viewer");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const canInvite = user?.permissions.includes("team.invite") ?? false;
  const canManage = user?.permissions.includes("team.manage") ?? false;
  const canRemove = user?.permissions.includes("team.remove") ?? false;

  const load = useCallback(async () => {
    setError(null);
    try {
      const [nextMembers, nextInvitations] = await Promise.all([
        identityApi.members(),
        identityApi.invitations(),
      ]);
      setMembers(nextMembers);
      setInvitations(nextInvitations);
    } catch (requestError) {
      setError(message(requestError));
    } finally {
      setMembersLoading(false);
    }
  }, []);

  useEffect(() => { void load(); }, [load]);

  const run = async (action: () => Promise<unknown>) => {
    setBusy(true);
    setError(null);
    try { await action(); await load(); } catch (requestError) { setError(message(requestError)); } finally { setBusy(false); }
  };

  return (
    <div className="space-y-6 pb-12">
      <div className="flex items-center justify-between"><div><h1 className="text-3xl font-bold tracking-tight">Team</h1><p className="mt-1 text-sm text-[var(--color-fg-muted)]">Manage real workspace memberships, roles, and expiring invitations.</p></div><button className={buttonClass} type="button" onClick={() => void load()} disabled={busy}><RefreshCw className="size-3.5" />Refresh</button></div>
      {error && <div role="alert" className="rounded-[var(--radius-lg)] border border-[var(--color-error)]/30 bg-[var(--color-error)]/10 p-4 text-sm text-[var(--color-error)]">{error}</div>}
      {workspace.isLoading ? <div className="h-40 animate-pulse rounded-[var(--radius-2xl)] bg-[var(--color-glass)]" role="status" /> : workspace.error ? <div role="alert" className="rounded-[var(--radius-lg)] border border-[var(--color-error)]/30 bg-[var(--color-error)]/10 p-4 text-sm text-[var(--color-error)]">{(workspace.error as Error).message}</div> : workspace.data && <GlassCard className="!p-6" spotlight={false}><Users className="size-8 text-[var(--color-accent)]" /><h2 className="mt-4 text-xl font-semibold">{workspace.data.name}</h2><p className="mt-1 text-sm text-[var(--color-fg-muted)]">{members.length.toLocaleString()} active workspace member{members.length === 1 ? "" : "s"}</p></GlassCard>}

      {canInvite && <GlassCard className="!p-5" spotlight={false}><h2 className="text-sm font-semibold">Invite a member</h2><form className="mt-4 grid gap-3 sm:grid-cols-[1fr_180px_auto]" onSubmit={(event) => { event.preventDefault(); void run(async () => { await identityApi.createInvitation(email, role); setEmail(""); }); }}><input className={inputClass} type="email" value={email} onChange={(event) => setEmail(event.target.value)} placeholder="name@company.com" required /><select className={inputClass} value={role} onChange={(event) => setRole(event.target.value)}>{roles.map((value) => <option key={value} value={value}>{value.replaceAll("_", " ")}</option>)}</select><button type="submit" className={buttonClass} disabled={busy}><MailPlus className="size-3.5" />Send invite</button></form></GlassCard>}

      <GlassCard className="!p-0 overflow-hidden" spotlight={false}>
        <div className="border-b border-[var(--color-border)] p-5"><h2 className="text-sm font-semibold">Members</h2></div>
        <div className="divide-y divide-[var(--color-border)]">
          {membersLoading ? (
            <div className="space-y-3 p-4" role="status" aria-label="Loading members">
              {[1, 2, 3].map((i) => <div key={i} className="h-12 animate-pulse rounded-[var(--radius-lg)] bg-[var(--color-glass)]" />)}
            </div>
          ) : members.length === 0 ? (
            <p className="p-5 text-xs text-[var(--color-fg-muted)]">No members yet.</p>
          ) : members.map((member) => <div key={member.id} className="flex flex-wrap items-center justify-between gap-3 p-4"><div className="min-w-0"><p className="truncate text-sm font-medium">{member.firstName} {member.lastName}{member.id === user?.id && <span className="text-[var(--color-accent)]"> · You</span>}</p><p className="truncate text-xs text-[var(--color-fg-muted)]">{member.email} · {member.status}</p></div><div className="flex items-center gap-2">{canManage && member.role !== "workspace_owner" && member.id !== user?.id ? <select className={inputClass} value={member.role} disabled={busy} aria-label={`Role for ${member.firstName} ${member.lastName}`} onChange={(event) => void run(() => identityApi.updateMemberRole(member.id, event.target.value))}>{roles.map((value) => <option key={value} value={value}>{value.replaceAll("_", " ")}</option>)}</select> : <span className="rounded-full border border-[var(--color-border)] px-3 py-1 text-xs">{member.role.replaceAll("_", " ")}</span>}{canRemove && member.role !== "workspace_owner" && member.id !== user?.id && <button type="button" className={buttonClass} disabled={busy} aria-label={`Remove ${member.firstName} ${member.lastName}`} onClick={() => void run(() => identityApi.removeMember(member.id))}><Trash2 className="size-3.5" /></button>}</div></div>)}
        </div>
      </GlassCard>

      {canInvite && <GlassCard className="!p-0 overflow-hidden" spotlight={false}><div className="border-b border-[var(--color-border)] p-5"><h2 className="text-sm font-semibold">Invitations</h2></div><div className="divide-y divide-[var(--color-border)]">{invitations.filter((invitation) => invitation.status === "pending").length === 0 ? <p className="p-5 text-xs text-[var(--color-fg-muted)]">No pending invitations.</p> : invitations.filter((invitation) => invitation.status === "pending").map((invitation) => <div key={invitation.id} className="flex items-center justify-between gap-3 p-4"><div><p className="text-sm font-medium">{invitation.email}</p><p className="text-xs text-[var(--color-fg-muted)]">{invitation.role.replaceAll("_", " ")} · expires {new Date(invitation.expiresAt).toLocaleDateString()}</p></div><div className="flex gap-2"><button className={buttonClass} type="button" disabled={busy} onClick={() => void run(() => identityApi.resendInvitation(invitation.id))}>Resend</button><button className={buttonClass} type="button" disabled={busy} onClick={() => void run(() => identityApi.revokeInvitation(invitation.id))}>Revoke</button></div></div>)}</div></GlassCard>}
    </div>
  );
}
