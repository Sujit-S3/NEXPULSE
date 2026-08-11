import { useEffect, useState } from "react";
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
import { Eye, EyeOff, Mail, Lock, LogIn, ShieldCheck } from "lucide-react";
import { Link, Navigate, useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "../hooks/useAuth";
import { identityApi } from "../services/identity";
import type { MfaChallenge, MfaMethod } from "../types";

export function LoginPage() {
  const { login, verifyMfa, isAuthenticated } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [rememberMe, setRememberMe] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [challenge, setChallenge] = useState<MfaChallenge | null>(null);
  const [mfaMethod, setMfaMethod] = useState<MfaMethod>("totp");
  const [mfaCode, setMfaCode] = useState("");
  const [rememberDevice, setRememberDevice] = useState(false);

  const queryReturnTo = new URLSearchParams(location.search).get("returnTo");
  const safeReturnTo = queryReturnTo?.startsWith("/") && !queryReturnTo.startsWith("//")
    ? queryReturnTo
    : undefined;
  const from = (location.state as { from?: string })?.from ?? safeReturnTo ?? "/dashboard";
  const [invitationToken] = useState(() => new URLSearchParams(location.search).get("invitation"));

  const completeLogin = async (destination = from) => {
    if (invitationToken) await identityApi.respondToInvitation(invitationToken, "accept");
    navigate(destination, { replace: true });
  };

  useEffect(() => {
    if (invitationToken && window.location.search) window.history.replaceState({}, "", window.location.pathname);
  }, [invitationToken]);

  useEffect(() => {
    if (!isAuthenticated || !invitationToken) return;
    setLoading(true);
    identityApi.respondToInvitation(invitationToken, "accept")
      .then(() => navigate(from, { replace: true }))
      .catch((requestError: unknown) => {
        const apiError = requestError as { response?: { data?: { error?: { message?: string } } } };
        setError(apiError.response?.data?.error?.message ?? "The invitation could not be accepted.");
      })
      .finally(() => setLoading(false));
  }, [from, invitationToken, isAuthenticated, navigate]);

  if (isAuthenticated && !invitationToken) return <Navigate to={from} replace />;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    if (!email || !password) { setError("Please fill in all fields"); return; }
    setLoading(true);
    try {
      const nextChallenge = await login(email, password, rememberMe);
      if ("mfaRequired" in nextChallenge) {
        setChallenge(nextChallenge);
        setMfaMethod(nextChallenge.methods[0] ?? "totp");
      } else {
        await completeLogin(nextChallenge.enrollmentRequired ? "/settings?section=identity-security" : from);
      }
    } catch (err: unknown) {
      const apiError = err as { response?: { data?: { error?: { message?: string } } } };
      setError(apiError?.response?.data?.error?.message ?? "Login failed. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const handleMfaSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!challenge || !mfaCode.trim()) return;
    setError(null);
    setLoading(true);
    try {
      await verifyMfa(challenge.challengeToken, mfaMethod, mfaCode.trim(), rememberDevice);
      await completeLogin();
    } catch (err: unknown) {
      const apiError = err as { response?: { data?: { error?: { message?: string } } } };
      setError(apiError?.response?.data?.error?.message ?? "Verification failed. Check the code and try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-page">
      <AuthBackground />
      <AuthParticles />

      {/* Theme toggle — top right */}
      <div className="fixed top-10 right-12 z-50">
        <AuthThemeToggle />
      </div>

      {/* Cinematic composition */}
      <div className="relative z-10 min-h-screen flex flex-col items-center justify-center px-4 py-12">

        {/* Floating logo above card */}
        <AuthFloatingLogo />

        {/* Spacer */}
        <div className="h-8" />

        {/* Glass auth card — 560px max-width */}
        <AuthPanel className="w-full max-w-[560px]">
          <div className="pt-[72px] px-[72px] pb-[72px]">

            {/* Card heading */}
            <motion.div
              className="mb-8 text-center"
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.35, duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
            >
              <h1 className="auth-headline">{challenge ? "Verify it’s you" : "Welcome Back"}</h1>
              <p className="auth-subline mt-2">
                {challenge ? "Complete multi-factor authentication to continue" : "Continue to your AI workspace"}
              </p>
            </motion.div>

            {/* Form */}
            <motion.form
              onSubmit={challenge ? handleMfaSubmit : handleSubmit}
              className="flex flex-col gap-5"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.45, duration: 0.5 }}
            >
              {/* Error */}
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

              {!challenge && <PremiumInput
                label="Email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                autoComplete="email"
                required
                icon={<Mail size={22} />}
              />}

              {!challenge && <PremiumInput
                label="Password"
                type={showPassword ? "text" : "password"}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                autoComplete="current-password"
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
              />}

              {challenge && (
                <>
                  {challenge.methods.length > 1 && (
                    <fieldset className="flex flex-wrap gap-2" aria-label="Verification method">
                      {challenge.methods.map((method) => (
                        <button
                          key={method}
                          type="button"
                          onClick={() => { setMfaMethod(method); setMfaCode(""); }}
                          className={`rounded-[var(--radius-md)] border px-3 py-2 text-xs font-medium transition-colors ${mfaMethod === method ? "border-[var(--color-accent)] bg-[var(--color-accent)]/10 text-[var(--color-fg)]" : "border-[var(--color-border)] text-[var(--color-fg-muted)]"}`}
                        >
                          {method === "totp" ? "Authenticator" : method === "email" ? "Email code" : "Recovery code"}
                        </button>
                      ))}
                    </fieldset>
                  )}
                  <PremiumInput
                    label={mfaMethod === "recovery" ? "Recovery code" : "6-digit code"}
                    type="text"
                    inputMode={mfaMethod === "recovery" ? "text" : "numeric"}
                    value={mfaCode}
                    onChange={(e) => setMfaCode(e.target.value)}
                    autoComplete="one-time-code"
                    required
                    icon={<ShieldCheck size={22} />}
                  />
                </>
              )}

              {/* Remember + Forgot */}
              <div className="flex items-center justify-between">
                <label className="flex items-center gap-2 cursor-pointer select-none group">
                  <div className="auth-checkbox-wrap">
                    <input
                      type="checkbox"
                      checked={challenge ? rememberDevice : rememberMe}
                      onChange={(e) => challenge ? setRememberDevice(e.target.checked) : setRememberMe(e.target.checked)}
                      className="sr-only"
                    />
                    <div className={`auth-checkbox ${(challenge ? rememberDevice : rememberMe) ? "auth-checkbox-checked" : ""}`} />
                  </div>
                  <span className="text-xs text-[var(--color-fg-muted)] group-hover:text-[var(--color-fg)] transition-colors">
                    {challenge ? "Trust this device" : "Remember me"}
                  </span>
                </label>
                {!challenge && <Link to="/forgot-password" className="auth-link text-xs">
                  Forgot password?
                </Link>}
              </div>

              <PremiumButton type="submit" loading={loading}>
                <LogIn size={18} />
                {challenge ? "Verify and continue" : "Continue"}
              </PremiumButton>
            </motion.form>

            {/* Bottom link */}
            <div className="mt-8 text-center">
              {challenge && (
                <button type="button" className="auth-link mb-4 text-sm" onClick={() => { setChallenge(null); setMfaCode(""); setError(null); }}>
                  Use a different account
                </button>
              )}
              <p className="text-sm text-[var(--color-fg-muted)]">
                Don&apos;t have an account?{" "}
                <Link
                  to={
                    invitationToken
                      ? `/register?invitation=${encodeURIComponent(invitationToken)}`
                      : safeReturnTo
                        ? `/register?plan=professional&cycle=${safeReturnTo.includes("cycle=monthly") ? "monthly" : "annual"}`
                        : "/register"
                  }
                  className="auth-link font-semibold"
                >
                  Create one
                </Link>
              </p>
            </div>

          </div>
        </AuthPanel>

        <AuthFooterLinks />
      </div>
    </div>
  );
}
