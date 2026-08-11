import { useState } from "react";
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
import { Mail, ArrowLeft, Check } from "lucide-react";
import { Link } from "react-router-dom";
import { authApi } from "../services/auth";

export function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [sent, setSent] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    if (!email) { setError("Please enter your email address"); return; }
    setLoading(true);
    try {
      await authApi.forgotPassword(email);
      setSent(true);
    } catch (err: unknown) {
      const apiError = err as { response?: { data?: { error?: { message?: string } } } };
      setError(apiError?.response?.data?.error?.message ?? "Something went wrong. Please try again.");
    } finally {
      setLoading(false);
    }
  };

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
            {sent ? (
              <motion.div
                className="text-center"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ duration: 0.5 }}
              >
                <motion.div
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  transition={{ type: "spring", stiffness: 200 }}
                  className="w-16 h-16 rounded-full bg-[var(--color-success)]/20 flex items-center justify-center mx-auto mb-5"
                >
                  <Check size={32} className="text-[var(--color-success)]" />
                </motion.div>
                <h2 className="auth-headline mb-2">Check Your Email</h2>
                <p className="auth-subline mb-6">
                  If an account exists for <strong className="text-[var(--color-fg)]">{email}</strong>,
                  we&apos;ve sent a password reset link.
                </p>
                <Link
                  to="/login"
                  className="inline-flex items-center gap-1.5 text-sm text-[var(--color-accent)] hover:text-[var(--color-accent-hover)] font-medium transition-colors"
                >
                  <ArrowLeft size={16} />
                  Back to Sign In
                </Link>
              </motion.div>
            ) : (
              <>
                <motion.div
                  className="mb-8 text-center"
                  initial={{ opacity: 0, y: 12 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.35, duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
                >
                  <h1 className="auth-headline">Forgot Password?</h1>
                  <p className="auth-subline mt-2">Enter your email and we&apos;ll send you a reset link</p>
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

                  <PremiumInput
                    label="Email"
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    autoComplete="email"
                    required
                    icon={<Mail size={22} />}
                  />

                  <PremiumButton type="submit" loading={loading}>
                    Send Reset Link
                  </PremiumButton>

                  <Link
                    to="/login"
                    className="flex items-center justify-center gap-1.5 text-sm text-[var(--color-fg-muted)] hover:text-[var(--color-fg)] transition-colors"
                  >
                    <ArrowLeft size={16} />
                    Back to Sign In
                  </Link>
                </motion.form>
              </>
            )}
          </div>
        </AuthPanel>

        <AuthFooterLinks />
      </div>
    </div>
  );
}
