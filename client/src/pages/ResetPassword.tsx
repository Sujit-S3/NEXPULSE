import { useEffect, useState, useMemo } from "react";
import {
  AuthBackground,
  AuthParticles,
  AuthFloatingLogo,
  AuthPanel,
  PremiumInput,
  PremiumButton,
  AuthThemeToggle,
  AuthFooterLinks,
} from "@components/auth";
import { motion, AnimatePresence } from "framer-motion";
import { Eye, EyeOff, KeyRound, Check, X, ArrowLeft, Lock } from "lucide-react";
import { Link, useSearchParams, useNavigate } from "react-router-dom";
import { authApi } from "../services/auth";

const passwordRequirements = [
  { id: "len", label: "15+ characters", test: (p: string) => p.length >= 15 },
  { id: "max", label: "128 or fewer", test: (p: string) => p.length <= 128 },
  { id: "variety", label: "Not a repeated phrase", test: (p: string) => !/^(.{1,8})\1+$/.test(p) },
];

function StrengthBar({ password }: { password: string }) {
  const strength = useMemo(
    () => passwordRequirements.filter((r) => r.test(password)).length,
    [password],
  );
  if (!password) return null;

  const color =
    strength <= 1 ? "var(--color-error)" :
    strength <= 2 ? "var(--color-warning)" :
    "var(--color-success)";

  const label = strength <= 1 ? "Weak" : strength <= 2 ? "Good" : "Strong";

  return (
    <motion.div
      className="mt-2 space-y-2"
      initial={{ opacity: 0, height: 0 }}
      animate={{ opacity: 1, height: "auto" }}
      transition={{ duration: 0.25 }}
    >
      <div className="flex justify-between items-center">
        <span className="text-[11px] text-[var(--color-fg-subtle)]">Strength</span>
        <span className="text-[11px] font-semibold" style={{ color }}>{label}</span>
      </div>
      <div className="flex gap-1 h-1 w-full">
        {[1, 2, 3].map((lvl) => (
          <motion.div
            key={lvl}
            className="flex-1 rounded-full"
            animate={{ backgroundColor: strength >= lvl ? color : "rgba(255,255,255,0.08)" }}
            transition={{ duration: 0.3 }}
          />
        ))}
      </div>
      <div className="flex flex-wrap gap-x-3 gap-y-1 pt-0.5">
        {passwordRequirements.map((req) => {
          const met = req.test(password);
          return (
            <span
              key={req.id}
              className="flex items-center gap-1 text-[10px] transition-colors"
              style={{ color: met ? "var(--color-success)" : "var(--color-fg-subtle)" }}
            >
              {met ? <Check size={10} /> : <X size={10} />}
              {req.label}
            </span>
          );
        })}
      </div>
    </motion.div>
  );
}

export function ResetPasswordPage() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const [token] = useState(() => searchParams.get("token"));

  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  useEffect(() => {
    if (token && window.location.search) window.history.replaceState({}, "", window.location.pathname);
  }, [token]);

  if (!token) {
    return (
      <div className="auth-page">
        <AuthBackground />
        <AuthParticles />
        <div className="relative z-10 min-h-screen flex items-center justify-center px-4">
          <AuthPanel className="w-full max-w-[560px]">
            <div className="pt-[72px] px-[72px] pb-[72px] text-center">
              <h2 className="auth-headline mb-2">Invalid Link</h2>
              <p className="auth-subline mb-6">This reset link is invalid or has expired.</p>
              <Link
                to="/forgot-password"
                className="text-[var(--color-accent)] hover:text-[var(--color-accent-hover)] font-medium transition-colors"
              >
                Request a new reset link
              </Link>
            </div>
          </AuthPanel>
        </div>
      </div>
    );
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    if (!password || !confirmPassword) { setError("Please fill in all fields"); return; }
    if (password !== confirmPassword) { setError("Passwords do not match"); return; }
    if (!passwordRequirements.every((requirement) => requirement.test(password))) { setError("Choose a password between 15 and 128 characters that is not a repeated phrase"); return; }
    setLoading(true);
    try {
      await authApi.resetPassword({ token, password, confirmPassword });
      setSuccess(true);
    } catch (err: unknown) {
      const apiError = err as { response?: { data?: { error?: { message?: string } } } };
      setError(apiError?.response?.data?.error?.message ?? "Reset failed. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  if (success) {
    return (
      <div className="auth-page">
        <AuthBackground />
        <AuthParticles />
        <div className="relative z-10 min-h-screen flex flex-col items-center justify-center px-4">
          <AuthFloatingLogo />
          <div className="h-8" />
          <AuthPanel className="w-full max-w-[560px]">
            <div className="pt-[72px] px-[72px] pb-[72px] text-center">
              <motion.div
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ type: "spring", stiffness: 200 }}
                className="w-16 h-16 rounded-full bg-[var(--color-success)]/20 flex items-center justify-center mx-auto mb-5"
              >
                <Check size={32} className="text-[var(--color-success)]" />
              </motion.div>
              <h2 className="auth-headline mb-2">Password Reset</h2>
              <p className="auth-subline mb-7">Your password has been successfully reset.</p>
              <PremiumButton onClick={() => navigate("/login")}>
                Go to Sign In
              </PremiumButton>
            </div>
          </AuthPanel>
        </div>
      </div>
    );
  }

  return (
    <div className="auth-page">
      <AuthBackground />
      <AuthParticles />

      <div className="fixed top-10 right-12 z-50">
        <AuthThemeToggle />
      </div>

      <div className="relative z-10 min-h-screen flex flex-col items-center justify-center px-4 py-12">
        <AuthFloatingLogo />
        <div className="h-8" />

        <AuthPanel className="w-full max-w-[560px]">
          <div className="pt-[72px] px-[72px] pb-[72px]">
            <motion.div
              className="mb-8 text-center"
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.35, duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
            >
              <h1 className="auth-headline">Reset Password</h1>
              <p className="auth-subline mt-2">Enter your new password</p>
            </motion.div>

            <motion.form
              onSubmit={handleSubmit}
              className="flex flex-col gap-5"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.45, duration: 0.5 }}
            >
              <AnimatePresence>
                {error && (
                  <motion.div
                    className="auth-error"
                    initial={{ opacity: 0, y: -8, height: 0 }}
                    animate={{ opacity: 1, y: 0, height: "auto" }}
                    exit={{ opacity: 0, y: -8, height: 0 }}
                    role="alert"
                  >
                    {error}
                  </motion.div>
                )}
              </AnimatePresence>

              <div>
                <PremiumInput
                  label="New Password"
                  type={showPassword ? "text" : "password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  autoComplete="new-password"
                  required
                  icon={<Lock size={22} />}
                  suffix={
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="auth-input-toggle"
                      tabIndex={-1}
                      aria-label={showPassword ? "Hide password" : "Show password"}
                    >
                      {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                    </button>
                  }
                />
                <StrengthBar password={password} />
              </div>

              <PremiumInput
                label="Confirm Password"
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                autoComplete="new-password"
                required
                icon={<Lock size={22} />}
              />

              <PremiumButton type="submit" loading={loading}>
                <KeyRound size={18} />
                Reset Password
              </PremiumButton>

              <Link
                to="/login"
                className="flex items-center justify-center gap-1.5 text-sm text-[var(--color-fg-muted)] hover:text-[var(--color-fg)] transition-colors"
              >
                <ArrowLeft size={16} />
                Back to Sign In
              </Link>
            </motion.form>
          </div>
        </AuthPanel>

        <AuthFooterLinks />
      </div>
    </div>
  );
}
