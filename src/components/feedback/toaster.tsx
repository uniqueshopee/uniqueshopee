"use client";

import { useEffect } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { CheckCircle2, AlertTriangle, XCircle, Info, X } from "lucide-react";
import { useToasts, type Toast, type ToastVariant } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";

const ICONS: Record<ToastVariant, typeof Info> = {
  default: Info,
  success: CheckCircle2,
  warning: AlertTriangle,
  danger: XCircle,
};

const ICON_COLOR: Record<ToastVariant, string> = {
  default: "text-accent",
  success: "text-success",
  warning: "text-warning",
  danger: "text-danger",
};

function ToastCard({ toast, onDismiss }: { toast: Toast; onDismiss: () => void }) {
  const variant = toast.variant ?? "default";
  const Icon = ICONS[variant];

  useEffect(() => {
    const timer = setTimeout(onDismiss, toast.duration ?? 4000);
    return () => clearTimeout(timer);
  }, [toast.duration, onDismiss]);

  return (
    <motion.div
      layout
      role="status"
      initial={{ opacity: 0, y: 16, scale: 0.95 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, x: 32, transition: { duration: 0.15 } }}
      transition={{ duration: 0.2, ease: [0.16, 1, 0.3, 1] }}
      className={cn(
        "pointer-events-auto flex w-full max-w-sm items-start gap-3 rounded-[var(--radius-lg)]",
        "border border-border bg-background p-4 shadow-[var(--shadow-lg)]",
      )}
    >
      <Icon className={cn("mt-0.5 h-5 w-5 shrink-0", ICON_COLOR[variant])} aria-hidden="true" />
      <div className="min-w-0 flex-1">
        <p className="text-sm font-bold text-text">{toast.title}</p>
        {toast.description && (
          <p className="mt-0.5 text-sm font-medium text-muted">{toast.description}</p>
        )}
      </div>
      <button
        onClick={onDismiss}
        aria-label="Dismiss notification"
        className="shrink-0 rounded-[var(--radius-sm)] p-1 text-muted hover:bg-background-secondary hover:text-text focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent"
      >
        <X className="h-4 w-4" />
      </button>
    </motion.div>
  );
}

/** Mount once near the root of the tree (see app/layout.tsx). */
function Toaster() {
  const { toasts, dismiss } = useToasts();

  return (
    <div
      className="pointer-events-none fixed inset-x-0 bottom-0 z-[100] flex flex-col items-end gap-2 p-4 sm:bottom-4 sm:right-4 sm:left-auto"
      aria-live="polite"
    >
      <AnimatePresence>
        {toasts.map((t) => (
          <ToastCard key={t.id} toast={t} onDismiss={() => dismiss(t.id)} />
        ))}
      </AnimatePresence>
    </div>
  );
}

export { Toaster };
