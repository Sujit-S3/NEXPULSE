import { motion } from "framer-motion";

// Privacy/Terms/Security/Status have no pages to link to yet (no legal content,
// no public status page) — rendered as plain labels rather than fake interactive links.
export function AuthFooterLinks() {
  return (
    <motion.div
      className="mt-10 flex items-center gap-6 text-xs text-[var(--color-fg-subtle)]"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ delay: 0.8 }}
    >
      <span>Privacy</span>
      <span className="w-px h-3 bg-[var(--color-border)]" />
      <span>Terms</span>
      <span className="w-px h-3 bg-[var(--color-border)]" />
      <span>Security</span>
      <span className="w-px h-3 bg-[var(--color-border)]" />
      <span>Status</span>
    </motion.div>
  );
}
