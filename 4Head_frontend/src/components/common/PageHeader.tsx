import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

export interface PageHeaderProps {
  /** Screen title. */
  title: string;
  /** One-line description shown beneath the title. */
  description?: string;
  /** Right-aligned actions row (buttons, filters, etc.). */
  actions?: ReactNode;
  /** Optional shared breadcrumb content rendered above the title. */
  breadcrumb?: ReactNode;
  className?: string;
}

/**
 * Standard page header used at the top of every screen. Keeps title,
 * description, and the actions row consistent across all modules.
 */
export function PageHeader({
  title,
  description,
  actions,
  breadcrumb,
  className,
}: PageHeaderProps) {
  return (
    <div
      className={cn(
        "flex flex-col gap-2 pb-5 sm:flex-row sm:items-end sm:justify-between",
        className,
      )}
    >
      <div className="space-y-1">
        {breadcrumb ? (
          <div className="text-xs font-medium text-muted-foreground/70 uppercase tracking-wider">
            {breadcrumb}
          </div>
        ) : null}
        <h1 className="text-2xl font-semibold tracking-tight text-foreground">
          {title}
        </h1>
        {description ? (
          <p className="text-sm leading-relaxed text-muted-foreground">
            {description}
          </p>
        ) : null}
      </div>
      {actions ? (
        <div className="flex flex-wrap items-center gap-2">{actions}</div>
      ) : null}
    </div>
  );
}