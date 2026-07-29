import type { LucideIcon } from "lucide-react";
import { PackageOpen } from "lucide-react";
import { Button } from "@/components/ui/button";

interface EmptyStateProps {
  icon?: LucideIcon;
  title: string;
  description?: string;
  actionLabel?: string;
  onAction?: () => void;
  secondaryActionLabel?: string;
  onSecondaryAction?: () => void;
}

/**
 * An empty screen is an invitation to act — always pair the state with
 * a clear next step, not just an illustration and a shrug.
 */
function EmptyState({
  icon: Icon = PackageOpen,
  title,
  description,
  actionLabel,
  onAction,
  secondaryActionLabel,
  onSecondaryAction,
}: EmptyStateProps) {
  return (
    <div className="flex flex-col items-center justify-center gap-3 rounded-[1.5rem] border border-dashed border-border bg-white/80 px-6 py-16 text-center shadow-[var(--shadow-sm)]">
      <div className="flex h-14 w-14 items-center justify-center rounded-full bg-background-secondary">
        <Icon className="h-6 w-6 text-muted" aria-hidden="true" />
      </div>
      <h3 className="text-base font-bold text-text">{title}</h3>
      {description && <p className="max-w-sm text-sm font-medium text-muted">{description}</p>}
      {(actionLabel || secondaryActionLabel) && (
        <div className="mt-2 flex flex-wrap justify-center gap-3">
          {actionLabel && onAction && (
            <Button variant="accent" size="sm" onClick={onAction}>
              {actionLabel}
            </Button>
          )}
          {secondaryActionLabel && onSecondaryAction && (
            <Button variant="outline" size="sm" onClick={onSecondaryAction}>
              {secondaryActionLabel}
            </Button>
          )}
        </div>
      )}
    </div>
  );
}

export { EmptyState };
