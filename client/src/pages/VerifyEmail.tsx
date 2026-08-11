import { useEffect, useState } from "react";
import {
  AuthBackground,
  AuthParticles,
  AuthFloatingLogo,
  AuthPanel,
  PremiumButton,
  AuthFooterLinks,
} from "@components/auth";
import { motion } from "framer-motion";
import { Check, X, Loader2 } from "lucide-react";
import { Link, useSearchParams } from "react-router-dom";
import { authApi } from "../services/auth";

export function VerifyEmailPage() {
  const [searchParams] = useSearchParams();
  const [token] = useState(() => searchParams.get("token"));

  const [status, setStatus] = useState<"loading" | "success" | "error">("loading");
  const [message, setMessage] = useState("");
  const [countdown, setCountdown] = useState(0);
  const [resending, setResending] = useState(false);
  const [resendEmail, setResendEmail] = useState("");

  useEffect(() => {
    if (token && window.location.search) window.history.replaceState({}, "", window.location.pathname);
  }, [token]);

  useEffect(() => {
    if (!token) {
      setStatus("error");
      setMessage("No verification token provided");
      return;
    }

    const verify = async () => {
      try {
        await authApi.verifyEmail(token);
        setStatus("success");
        setMessage("Your email has been verified successfully!");
      } catch (err: unknown) {
        const apiError = err as { response?: { data?: { error?: { message?: string } } } };
        setStatus("error");
        setMessage(
          apiError?.response?.data?.error?.message ??
            "Verification failed. The link may have expired.",
        );
      }
    };

    verify();
  }, [token]);

  useEffect(() => {
    if (countdown <= 0) return;
    const id = setInterval(() => setCountdown((c) => c - 1), 1000);
    return () => clearInterval(id);
  }, [countdown]);

  const handleResend = async () => {
    if (countdown > 0 || resending) return;
    setResending(true);
    try {
      if (!resendEmail) return;
      await authApi.resendVerification(resendEmail);
      setMessage("If verification is required, a new link has been sent.");
      setCountdown(60);
    } catch (error: unknown) {
      const apiError = error as { response?: { data?: { error?: { message?: string } } } };
      setMessage(apiError.response?.data?.error?.message ?? "The verification email could not be sent.");
    } finally {
      setResending(false);
    }
  };

  return (
    <div className="auth-page">
      <AuthBackground />
      <AuthParticles />

      <div className="relative z-10 min-h-screen flex flex-col items-center justify-center px-4">
        {/* Large floating logo for illustration */}
        <AuthFloatingLogo />
        <div className="h-8" />

        <AuthPanel className="w-full max-w-[560px]">
          <div className="pt-[72px] px-[72px] pb-[72px] text-center">

            {status === "loading" && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
              >
                {/* Animated logo loading instead of spinner */}
                <motion.div
                  className="w-20 h-20 mx-auto mb-6"
                  animate={{
                    scale: [1, 1.05, 1],
                    opacity: [0.7, 1, 0.7],
                  }}
                  transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
                >
                  <div className="w-full h-full rounded-full bg-[var(--color-accent)]/10 flex items-center justify-center border border-[var(--color-accent)]/20">
                    <Loader2 size={32} className="text-[var(--color-accent)] animate-spin" />
                  </div>
                </motion.div>
                <p className="auth-subline">Verifying your email...</p>
              </motion.div>
            )}

            {status === "success" && (
              <motion.div
                initial={{ scale: 0.9, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                transition={{ type: "spring", stiffness: 200, damping: 18 }}
              >
                {/* Animated success ring */}
                <div className="relative w-20 h-20 mx-auto mb-6">
                  <motion.div
                    className="absolute inset-0 rounded-full border-2 border-[var(--color-success)]/30"
                    initial={{ scale: 0.8, opacity: 0 }}
                    animate={{ scale: 1.3, opacity: 0 }}
                    transition={{ duration: 1.5, repeat: Infinity, ease: "easeOut" }}
                  />
                  <motion.div
                    className="absolute inset-0 rounded-full border-2 border-[var(--color-success)]/20"
                    initial={{ scale: 0.8, opacity: 0 }}
                    animate={{ scale: 1.6, opacity: 0 }}
                    transition={{ duration: 1.5, repeat: Infinity, ease: "easeOut", delay: 0.3 }}
                  />
                  <div className="w-full h-full rounded-full bg-[var(--color-success)]/15 flex items-center justify-center border border-[var(--color-success)]/30">
                    <Check size={36} className="text-[var(--color-success)]" />
                  </div>
                </div>
                <h2 className="auth-headline mb-2">Email Verified!</h2>
                <p className="auth-subline mb-7">{message}</p>
                <Link to="/login">
                  <PremiumButton>Go to Sign In</PremiumButton>
                </Link>
              </motion.div>
            )}

            {status === "error" && (
              <motion.div
                initial={{ scale: 0.9, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                transition={{ type: "spring", stiffness: 200, damping: 18 }}
              >
                <motion.div
                  className="w-20 h-20 rounded-full bg-[var(--color-error)]/15 flex items-center justify-center mx-auto mb-6 border border-[var(--color-error)]/30"
                  initial={{ rotate: -90, opacity: 0 }}
                  animate={{ rotate: 0, opacity: 1 }}
                  transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
                >
                  <X size={36} className="text-[var(--color-error)]" />
                </motion.div>
                <h2 className="auth-headline mb-2">Verification Failed</h2>
                <p className="auth-subline mb-7">{message}</p>
                <div className="flex w-full flex-col items-center gap-3">
                  <label className="w-full text-left text-xs text-[var(--color-fg-muted)]">Email address<input type="email" value={resendEmail} onChange={(event) => setResendEmail(event.target.value)} className="mt-1 h-10 w-full rounded-[var(--radius-lg)] border border-[var(--color-border)] bg-[var(--color-bg-surface)] px-3 text-sm" autoComplete="email" required /></label>
                  <button
                    type="button"
                    onClick={handleResend}
                    disabled={countdown > 0 || resending || !resendEmail}
                    className="text-sm text-[var(--color-accent)] hover:text-[var(--color-accent-hover)] font-medium transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
                  >
                    {resending ? "Resending..." : `Resend verification${countdown > 0 ? ` (${countdown}s)` : ""}`}
                  </button>
                  <Link
                    to="/login"
                    className="text-sm text-[var(--color-fg-muted)] hover:text-[var(--color-fg)] transition-colors"
                  >
                    Back to Sign In
                  </Link>
                </div>
              </motion.div>
            )}

          </div>
        </AuthPanel>

        <AuthFooterLinks />
      </div>
    </div>
  );
}
