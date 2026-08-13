import type { LucideIcon } from "lucide-react";
import { Inbox } from "lucide-react";
import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

export interface EmptyStateProps {
  /** Icon to display; defaults to an inbox glyph. */
  icon?: LucideIcon;
  /** Headline message, e.g. "No records found". */
  title: string;
  /** Supporting copy explaining the empty state and what to do next. */
  description?: string;
  /** Optional call-to-action, typically an "Add new" Button. */
  action?: ReactNode;
  className?: string;
}

/**
 * Empty-data state for list/table screens. Used everywhere a fetch succeeds
 * but yields no rows — never render a bare "no data" string (Task 0: every
 * screen handles loading/empty/error explicitly).
 */
export function EmptyState({
  icon: Icon = Inbox,
  title,
  description,
  action,
  className,
}: EmptyStateProps) {
  return (
    <div
      className={cn(
        "flex flex-col items-center justify-center gap-3 rounded-lg border border-dashed py-16 text-center",
        className,
      )}
    >
      <div className="flex h-12 w-12 items-center justify-center rounded-full bg-muted text-muted-foreground">
        <Icon className="h-6 w-6" aria-hidden />
      </div>
      <div className="space-y-1">
        <p className="text-sm font-medium text-foreground">{title}</p>
        {description ? (
          <p className="mx-auto max-w-sm text-sm text-muted-foreground">
            {description}
          </p>
        ) : null}
      </div>
      {action ? <div className="mt-2">{action}</div> : null}
    </div>
  );
}
