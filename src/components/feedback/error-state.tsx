import { AlertTriangle } from "lucide-react";
import { Button } from "@/components/ui/button";

interface ErrorStateProps {
  title?: string;
  description?: string;
  onRetry?: () => void;
  retryLabel?: string;
}

/**
 * For a failed section within an otherwise working page (a panel, a
 * card grid, a form submit) — not a full route crash. For route-level
 * failures, see src/app/error.tsx which uses the same voice.
 */
function ErrorState({
  title = "Something went wrong",
  description = "We couldn't load this content. Check your connection and try again.",
  onRetry,
  retryLabel = "Try again",
}: ErrorStateProps) {
  return (
    <div
      role="alert"
      className="flex flex-col items-center justify-center gap-3 rounded-[1.5rem] border border-border bg-white/85 px-6 py-16 text-center shadow-[var(--shadow-sm)]"
    >
      <div className="flex h-14 w-14 items-center justify-center rounded-full bg-danger/10">
        <AlertTriangle className="h-6 w-6 text-danger" aria-hidden="true" />
      </div>
      <h3 className="text-base font-bold text-text">{title}</h3>
      <p className="max-w-sm text-sm font-medium text-muted">{description}</p>
      {onRetry && (
        <Button variant="outline" size="sm" onClick={onRetry} className="mt-2">
          {retryLabel}
        </Button>
      )}
    </div>
  );
}

export { ErrorState };
