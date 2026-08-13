import { Skeleton } from "@/components/ui/skeleton";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { cn } from "@/lib/utils";

/** A single card-shaped skeleton block. */
export function SkeletonCard({ className }: { className?: string }) {
  return (
    <div className={cn("rounded-xl border bg-card p-6 shadow-sm", className)}>
      <Skeleton className="h-4 w-1/3" />
      <Skeleton className="mt-4 h-8 w-2/3" />
      <Skeleton className="mt-2 h-8 w-1/2" />
    </div>
  );
}

/** A grid of skeleton cards for dashboard/landing loading states. */
export function SkeletonCardGrid({
  count = 3,
  className,
}: {
  count?: number;
  className?: string;
}) {
  return (
    <div className={cn("grid gap-4 sm:grid-cols-2 lg:grid-cols-3", className)}>
      {Array.from({ length: count }).map((_, i) => (
        // The index is stable for this fixed-count, non-data placeholder.
        <SkeletonCard key={i} />
      ))}
    </div>
  );
}

/**
 * Skeleton for the whole DataTable while data is loading. Renders the header
 * and N blank rows so the layout doesn't jump. `columns` matches the real
 * table's column count to keep alignment stable.
 */
export function TableSkeleton({
  rows = 6,
  columns = 4,
}: {
  rows?: number;
  columns?: number;
}) {
  return (
    <div className="rounded-md border">
      <Table>
        <TableHeader>
          <TableRow>
            {Array.from({ length: columns }).map((_, c) => (
              <TableHead key={c}>
                <Skeleton className="h-4 w-full" />
              </TableHead>
            ))}
          </TableRow>
        </TableHeader>
        <TableBody>
          {Array.from({ length: rows }).map((_, r) => (
            <TableRow key={r}>
              {Array.from({ length: columns }).map((_, c) => (
                <TableCell key={c}>
                  <Skeleton className="h-4 w-full" />
                </TableCell>
              ))}
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}

/** Top-of-screen skeleton used by PageHeader while a page is resolving. */
export function PageSkeleton({ rows = 3 }: { rows?: number }) {
  return (
    <div className="space-y-6">
      <div className="space-y-2">
        <Skeleton className="h-7 w-48" />
        <Skeleton className="h-4 w-72" />
      </div>
      <SkeletonCardGrid count={Math.min(rows, 4)} />
      <div className="space-y-3">
        {Array.from({ length: rows }).map((_, index) => (
          <Skeleton key={index} className="h-10 w-full" />
        ))}
      </div>
    </div>
  );
}
