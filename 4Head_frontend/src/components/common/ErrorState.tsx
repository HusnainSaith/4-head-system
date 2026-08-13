import { AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { getApiErrorMessage } from "@/lib/api-error";
import { cn } from "@/lib/utils";

export interface ErrorStateProps {
  /** Headline error message. */
  title?: string;
  /** Optional detail (e.g. server message or a generic hint). */
  description?: string;
  /** Raw RTK Query/backend error. Used when no explicit description is given. */
  error?: unknown;
  /** Retry handler — when provided, renders a Retry button. */
  onRetry?: () => void;
  className?: string;
}

/**
 * Error/failure state with a retry affordance. Used when a fetch fails (or an
 * unexpected error is thrown) — always paired with a way to recover, never a
 * bare red string (Task 0 three-states rule).
 */
export function ErrorState({
  title = "Request failed",
  description,
  error,
  onRetry,
  className,
}: ErrorStateProps) {
  const resolvedDescription =
    description ??
    (error !== undefined
      ? getApiErrorMessage(error)
      : "The request could not be completed. Please try again.");
  return (
    <div
      role="alert"
      className={cn(
        "flex flex-col items-center justify-center gap-3 rounded-lg border border-destructive/30 bg-destructive/5 py-16 text-center",
        className,
      )}
    >
      <div className="flex h-12 w-12 items-center justify-center rounded-full bg-destructive/10 text-destructive">
        <AlertCircle className="h-6 w-6" aria-hidden />
      </div>
      <div className="space-y-1">
        <p className="text-sm font-medium text-foreground">{title}</p>
        {resolvedDescription ? (
          <p className="mx-auto max-w-sm text-sm text-muted-foreground">
            {resolvedDescription}
          </p>
        ) : null}
      </div>
      {onRetry ? (
        <Button variant="outline" size="sm" onClick={onRetry} className="mt-2">
          Retry
        </Button>
      ) : null}
    </div>
  );
}
