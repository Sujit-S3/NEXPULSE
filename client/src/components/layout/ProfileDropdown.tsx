import { useState, useRef, useEffect } from "react";
import { GlassAvatar } from "@components/glass";
import { motion, AnimatePresence } from "framer-motion";
import { LogOut, Settings } from "lucide-react";
import { Link } from "react-router-dom";
import { useAuth } from "../../hooks/useAuth";

interface ProfileDropdownProps {
  onOpenChange?: (open: boolean) => void;
}

export function ProfileDropdown({ onOpenChange }: ProfileDropdownProps) {
  const { user, logout } = useAuth();
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    onOpenChange?.(open);
  }, [open, onOpenChange]);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  if (!user) return null;

  const initials = `${user.firstName.charAt(0)}${user.lastName.charAt(0)}`.toUpperCase();
  const displayName = `${user.firstName} ${user.lastName}`;

  return (
    <div ref={ref} className="relative">
      <button
        onClick={() => setOpen(!open)}
        className="flex items-center gap-[var(--spacing-2)] p-1 rounded-[var(--radius-md)] hover:bg-[var(--color-glass-hover)] transition-colors"
        aria-expanded={open}
        aria-haspopup="true"
      >
        <GlassAvatar src={user.avatar} fallback={initials} size="sm" />
        <span className="hidden md:block text-sm font-medium text-[var(--color-fg)] max-w-[120px] truncate">
          {displayName}
        </span>
      </button>

      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: -8, scale: 0.96 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -8, scale: 0.96 }}
            transition={{ duration: 0.15 }}
            className="absolute right-0 mt-2 w-56 bg-[var(--color-elevated)] border border-[var(--color-glass-border)] rounded-[var(--radius-lg)] shadow-[var(--shadow-lg)] backdrop-blur-[var(--glass-blur-md)] overflow-hidden z-50"
          >
            <div className="px-4 py-3 border-b border-[var(--color-glass-border)]">
              <p className="text-sm font-medium text-[var(--color-fg)]">{displayName}</p>
              <p className="text-xs text-[var(--color-fg-muted)] truncate">{user.email}</p>
            </div>

            <div className="py-1">
              <Link
                to="/settings"
                onClick={() => setOpen(false)}
                className="flex items-center gap-3 px-4 py-2 text-sm text-[var(--color-fg)] hover:bg-[var(--color-glass-hover)] transition-colors"
              >
                <Settings size={16} className="text-[var(--color-fg-muted)]" />
                Settings
              </Link>
            </div>

            <div className="border-t border-[var(--color-glass-border)] py-1">
              <button
                onClick={() => {
                  setOpen(false);
                  logout();
                }}
                className="flex items-center gap-3 w-full px-4 py-2 text-sm text-[var(--color-error)] hover:bg-[var(--color-glass-hover)] transition-colors"
              >
                <LogOut size={16} />
                Sign Out
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
