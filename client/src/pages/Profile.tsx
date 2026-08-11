import { useRef, useState } from "react";
import { ErrorBoundary, EmptyState, Skeleton } from "@components/common";
import { ScrollReveal } from "@components/effects/ScrollReveal";
import { AtroposCard } from "@components/ui/AtroposCard";
import { User, Mail, Calendar, Shield, Camera, Pencil, X, Check } from "lucide-react";
import { useAuth } from "../hooks/useAuth";

function errorMessage(error: unknown): string {
  const value = error as { response?: { data?: { error?: { message?: string } } }; message?: string };
  return value.response?.data?.error?.message ?? value.message ?? "The request could not be completed";
}

const inputClass = "h-10 w-full rounded-[var(--radius-lg)] border border-[var(--color-border)] bg-[var(--color-bg-surface)] px-3 text-sm text-[var(--color-fg)] outline-none focus:border-[var(--color-accent)]";
const secondaryButton = "inline-flex h-9 items-center justify-center gap-2 rounded-[var(--radius-lg)] border border-[var(--color-border)] bg-[var(--color-glass)] px-3 text-xs font-medium text-[var(--color-fg)] transition-colors hover:bg-[var(--color-glass-hover)] disabled:cursor-not-allowed disabled:opacity-50";
const primaryButton = "inline-flex h-9 items-center justify-center gap-2 rounded-[var(--radius-lg)] bg-[var(--color-accent)] px-3 text-xs font-semibold text-white transition-opacity hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50";
const passwordMinLength = 15;

function AvatarUpload({ user }: { user: NonNullable<ReturnType<typeof useAuth>["user"]> }) {
  const { uploadAvatar } = useAuth();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleFileChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;
    setBusy(true);
    setError(null);
    try {
      await uploadAvatar(file);
    } catch (requestError) {
      setError(errorMessage(requestError));
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="relative group">
      <input ref={fileInputRef} type="file" accept="image/png,image/jpeg,image/webp" className="hidden" onChange={(event) => void handleFileChange(event)} />
      <button
        type="button"
        onClick={() => fileInputRef.current?.click()}
        disabled={busy}
        aria-label="Change avatar"
        className="relative flex size-20 items-center justify-center overflow-hidden rounded-full bg-[var(--color-accent-muted)] text-[var(--color-accent)] text-[var(--font-size-2xl)] font-[var(--font-weight-bold)] disabled:cursor-not-allowed"
      >
        {user.avatar ? (
          <img src={user.avatar} alt="" className="size-full object-cover" />
        ) : (
          (user.firstName?.charAt(0) ?? user.email?.charAt(0) ?? "U").toUpperCase()
        )}
        <span className="absolute inset-0 flex items-center justify-center bg-black/50 opacity-0 transition-opacity group-hover:opacity-100">
          <Camera className="size-5 text-white" aria-hidden="true" />
        </span>
      </button>
      {error && <p role="alert" className="absolute top-full mt-1 w-48 text-[10px] text-[var(--color-error)]">{error}</p>}
    </div>
  );
}

function EditProfileForm({ user, onDone }: { user: NonNullable<ReturnType<typeof useAuth>["user"]>; onDone: () => void }) {
  const { updateProfile } = useAuth();
  const [firstName, setFirstName] = useState(user.firstName ?? "");
  const [lastName, setLastName] = useState(user.lastName ?? "");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setBusy(true);
    setError(null);
    try {
      await updateProfile({ firstName: firstName.trim(), lastName: lastName.trim() });
      onDone();
    } catch (requestError) {
      setError(errorMessage(requestError));
    } finally {
      setBusy(false);
    }
  };

  return (
    <form onSubmit={(event) => void handleSubmit(event)} className="space-y-[var(--spacing-3)]">
      {error && <div role="alert" className="rounded-[var(--radius-lg)] border border-[var(--color-error)]/30 bg-[var(--color-error)]/10 p-2.5 text-xs text-[var(--color-error)]">{error}</div>}
      <div className="grid gap-[var(--spacing-3)] sm:grid-cols-2">
        <input className={inputClass} value={firstName} onChange={(event) => setFirstName(event.target.value)} placeholder="First name" maxLength={50} required />
        <input className={inputClass} value={lastName} onChange={(event) => setLastName(event.target.value)} placeholder="Last name" maxLength={50} required />
      </div>
      <div className="flex items-center gap-[var(--spacing-2)]">
        <button type="submit" className={primaryButton} disabled={busy || !firstName.trim() || !lastName.trim()}>
          <Check className="size-3.5" aria-hidden="true" /> Save
        </button>
        <button type="button" className={secondaryButton} onClick={onDone} disabled={busy}>
          <X className="size-3.5" aria-hidden="true" /> Cancel
        </button>
      </div>
    </form>
  );
}

function ChangePasswordForm() {
  const { changePassword } = useAuth();
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const mismatch = confirmPassword.length > 0 && newPassword !== confirmPassword;
  const tooShort = newPassword.length > 0 && newPassword.length < passwordMinLength;

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (mismatch || tooShort) return;
    setBusy(true);
    setError(null);
    setSuccess(false);
    try {
      await changePassword(currentPassword, newPassword);
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
      setSuccess(true);
    } catch (requestError) {
      setError(errorMessage(requestError));
    } finally {
      setBusy(false);
    }
  };

  return (
    <AtroposCard className="!p-[var(--spacing-5)] bg-white/5 border border-white/10 rounded-[var(--radius-2xl)] shadow-2xl backdrop-blur-xl transition-all duration-500">
      <h2 className="text-sm font-semibold mb-[var(--spacing-1)]">Change Password</h2>
      <p className="text-xs text-[var(--color-fg-muted)] mb-[var(--spacing-4)]">Must be at least {passwordMinLength} characters.</p>
      <form onSubmit={(event) => void handleSubmit(event)} className="space-y-[var(--spacing-3)]">
        {error && <div role="alert" className="rounded-[var(--radius-lg)] border border-[var(--color-error)]/30 bg-[var(--color-error)]/10 p-2.5 text-xs text-[var(--color-error)]">{error}</div>}
        {success && <div role="status" className="rounded-[var(--radius-lg)] border border-[var(--color-success)]/30 bg-[var(--color-success)]/10 p-2.5 text-xs text-[var(--color-success)]">Password changed successfully.</div>}
        <input className={inputClass} type="password" value={currentPassword} onChange={(event) => setCurrentPassword(event.target.value)} placeholder="Current password" autoComplete="current-password" required />
        <input className={inputClass} type="password" value={newPassword} onChange={(event) => setNewPassword(event.target.value)} placeholder="New password" autoComplete="new-password" required />
        <input className={inputClass} type="password" value={confirmPassword} onChange={(event) => setConfirmPassword(event.target.value)} placeholder="Confirm new password" autoComplete="new-password" required />
        {mismatch && <p className="text-xs text-[var(--color-error)]">Passwords do not match.</p>}
        {tooShort && <p className="text-xs text-[var(--color-error)]">Password must be at least {passwordMinLength} characters.</p>}
        <button type="submit" className={primaryButton} disabled={busy || !currentPassword || !newPassword || !confirmPassword || mismatch || tooShort}>
          Update password
        </button>
      </form>
    </AtroposCard>
  );
}

function ProfileContent() {
  const { user, isLoading } = useAuth();
  const [editing, setEditing] = useState(false);

  if (isLoading) {
    return (
      <div className="space-y-[var(--spacing-6)] max-w-2xl">
        <div className="flex items-center gap-[var(--spacing-5)]">
          <Skeleton variant="circle" className="!size-20" />
          <div className="space-y-[var(--spacing-2)]">
            <Skeleton variant="text" className="!w-40 !h-6" />
            <Skeleton variant="text" className="!w-56 !h-4" />
          </div>
        </div>
        <div className="bg-[var(--color-glass)] border border-[var(--color-glass-border)] rounded-[var(--radius-xl)] p-[var(--spacing-5)] space-y-[var(--spacing-4)]">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="flex items-center justify-between">
              <div className="flex items-center gap-[var(--spacing-3)]">
                <Skeleton variant="circle" className="!size-8" />
                <Skeleton className="!w-24 !h-4" />
              </div>
              <Skeleton className="!w-36 !h-4" />
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="space-y-[var(--spacing-6)] max-w-2xl">
        <h1 className="text-[var(--font-size-2xl)] md:text-[var(--font-size-3xl)] font-[var(--font-weight-bold)]">Profile</h1>
        <EmptyState
          icon={User}
          title="No profile data"
          description="Sign in to view your profile information."
        />
      </div>
    );
  }

  return (
    <div className="space-y-[var(--spacing-6)] max-w-2xl">
      <div className="flex items-center gap-[var(--spacing-5)]">
        <AvatarUpload user={user} />
        <div className="flex-1">
          <h1 className="text-[var(--font-size-2xl)] md:text-[var(--font-size-3xl)] font-[var(--font-weight-bold)] tracking-[var(--letter-spacing-tight)]">
            {user.firstName ? `${user.firstName} ${user.lastName ?? ""}`.trim() : "User"}
          </h1>
          <p className="text-[var(--color-fg-muted)] text-[var(--font-size-sm)] mt-[var(--spacing-0-5)]">{user.email}</p>
        </div>
        {!editing && (
          <button type="button" className={secondaryButton} onClick={() => setEditing(true)}>
            <Pencil className="size-3.5" aria-hidden="true" /> Edit
          </button>
        )}
      </div>

      <AtroposCard className="!p-[var(--spacing-5)] bg-white/5 border border-white/10 rounded-[var(--radius-2xl)] shadow-2xl backdrop-blur-xl transition-all duration-500">
        {editing ? (
          <EditProfileForm user={user} onDone={() => setEditing(false)} />
        ) : (
          <div className="space-y-[var(--spacing-4)]">
            <ProfileRow icon={Mail} label="Email" value={user.email ?? "—"} />
            <ProfileRow icon={User} label="Display Name" value={user.firstName ? `${user.firstName} ${user.lastName ?? ""}`.trim() : "—"} />
            <ProfileRow icon={Calendar} label="Member Since" value={user.createdAt ? new Date(user.createdAt).toLocaleDateString(undefined, { year: "numeric", month: "long", day: "numeric" }) : "—"} />
            <ProfileRow icon={Shield} label="Role" value={user.role ?? "User"} />
          </div>
        )}
      </AtroposCard>

      <ChangePasswordForm />
    </div>
  );
}

function ProfileRow({ icon: Icon, label, value }: { icon: React.ComponentType<{ className?: string }>; label: string; value: string }) {
  return (
    <div className="flex items-center justify-between">
      <div className="flex items-center gap-[var(--spacing-3)]">
        <div className="flex size-8 items-center justify-center rounded-[var(--radius-md)] bg-[var(--color-glass)] text-[var(--color-fg-muted)]">
          <Icon className="size-4" aria-hidden="true" />
        </div>
        <span className="text-[var(--font-size-sm)]">{label}</span>
      </div>
      <span className="text-[var(--font-size-xs)] text-[var(--color-fg-muted)]">{value}</span>
    </div>
  );
}

export function ProfilePage() {
  return (
    <ErrorBoundary>
      <ScrollReveal>
        <ProfileContent />
      </ScrollReveal>
    </ErrorBoundary>
  );
}
