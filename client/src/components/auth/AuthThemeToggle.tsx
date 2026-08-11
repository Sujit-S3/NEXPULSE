import { useTheme } from "@theme/useTheme";
import { motion } from "framer-motion";
import { Sun, Moon } from "lucide-react";

export function AuthThemeToggle() {
  const { resolved, toggle } = useTheme();
  const isDark = resolved === "dark";

  return (
    <motion.button
      onClick={toggle}
      className="auth-theme-toggle"
      aria-label={`Switch to ${isDark ? "light" : "dark"} mode`}
      type="button"
      whileHover={{ scale: 1.05 }}
      whileTap={{ scale: 0.93 }}
      initial={{ opacity: 0, y: -10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.6, duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
    >
      {isDark ? <Sun className="size-[18px]" /> : <Moon className="size-[18px]" />}
    </motion.button>
  );
}
