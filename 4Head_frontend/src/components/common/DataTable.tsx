import * as React from "react";
import { ArrowDown, ArrowUp, ChevronsUpDown } from "lucide-react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { EmptyState } from "@/components/common/EmptyState";
import { ErrorState } from "@/components/common/ErrorState";
import { TableSkeleton } from "@/components/common/Skeletons";

export interface DataTableColumn<T> {
  /** Stable key used by sort handlers. */
  id: string;
  /** Column header label. */
  header: React.ReactNode;
  /** Render a cell's contents from its row. */
  cell: (row: T) => React.ReactNode;
  /** Column can be sorted when true. */
  enableSorting?: boolean;
  /** Right-align numeric columns / left-align text. */
  align?: "left" | "right" | "center";
  className?: string;
  /** Optional header className override. */
  headClassName?: string;
}

export type SortDirection = "asc" | "desc" | null;

export interface DataTableSortState {
  /** The id of the sorted column, if any. */
  columnId: string | null;
  direction: SortDirection;
}

export interface DataTablePagination {
  page: number;
  pageSize: number;
  total: number;
}

export interface DataTableProps<T> {
  columns: DataTableColumn<T>[];
  data: T[];
  /** Stable row key extractor. */
  getRowId: (row: T, index: number) => string;
  /** Current sort state + handler (controlled). */
  sort?: DataTableSortState;
  onSortChange?: (sort: DataTableSortState) => void;
  /** Load-state hook: render provided children instead of rows. */
  isLoading?: boolean;
  loadingContent?: React.ReactNode;
  isError?: boolean;
  errorMessage?: string;
  onRetry?: () => void;
  /** Empty-state node shown when data is empty (not loading). */
  emptyContent?: React.ReactNode;
  /** Optional pagination footer (controlled by caller). */
  pagination?: DataTablePagination;
  onPageChange?: (page: number) => void;
  /** Optional accessible row activation used for detail navigation. */
  onRowClick?: (row: T) => void;
  className?: string;
}

const alignMap = {
  left: "text-left",
  right: "text-right",
  center: "text-center",
} as const;

/**
 * Generic, typed table used by every list module — sorting + pagination and
 * loading/empty states. Sorting is intentionally controlled by the caller so
 * server-side sort params map cleanly to API query params.
 */
export function DataTable<T>({
  columns,
  data,
  getRowId,
  sort = { columnId: null, direction: null },
  onSortChange,
  isLoading = false,
  loadingContent,
  isError = false,
  errorMessage,
  onRetry,
  emptyContent,
  pagination,
  onPageChange,
  onRowClick,
  className,
}: DataTableProps<T>) {
  if (isError) {
    return <ErrorState description={errorMessage} onRetry={onRetry} />;
  }

  if (isLoading && !loadingContent) {
    return <TableSkeleton columns={columns.length} />;
  }

  const handleSort = (column: DataTableColumn<T>) => {
    if (!column.enableSorting || !onSortChange) return;
    const next: SortDirection =
      sort.columnId === column.id
        ? sort.direction === "asc"
          ? "desc"
          : sort.direction === "desc"
            ? null
            : "asc"
        : "asc";
    onSortChange(
      next === null
        ? { columnId: null, direction: null }
        : { columnId: column.id, direction: next },
    );
  };

  const SortIcon: React.FC<{ column: DataTableColumn<T> }> = ({ column }) => {
    const Icon =
      sort.columnId === column.id && sort.direction === "asc"
        ? ArrowUp
        : sort.columnId === column.id && sort.direction === "desc"
          ? ArrowDown
          : ChevronsUpDown;
    return <Icon className="ml-1 inline h-3.5 w-3.5" aria-hidden />;
  };

  return (
    <div className={cn("space-y-3", className)}>
      <div className="rounded-xl border bg-card shadow-sm overflow-hidden">
        <Table>
          <TableHeader className="bg-muted/50">
            <TableRow>
              {columns.map((column) => (
                <TableHead
                  key={column.id}
                  aria-sort={
                    column.enableSorting && sort.columnId === column.id
                      ? sort.direction === "asc"
                        ? "ascending"
                        : sort.direction === "desc"
                          ? "descending"
                          : "none"
                      : undefined
                  }
                  className={cn(
                    alignMap[column.align ?? "left"],
                    column.headClassName,
                  )}
                >
                  {column.enableSorting && onSortChange ? (
                    <Button
                      variant="ghost"
                      size="sm"
                      className="-ml-2 h-8 px-2 font-semibold"
                      onClick={() => handleSort(column)}
                    >
                      {column.header}
                      <SortIcon column={column} />
                    </Button>
                  ) : (
                    column.header
                  )}
                </TableHead>
              ))}
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading && loadingContent ? (
              <TableRow>
                <TableCell colSpan={columns.length}>{loadingContent}</TableCell>
              </TableRow>
            ) : data.length === 0 ? (
              <TableRow>
                <TableCell colSpan={columns.length}>
                  {emptyContent ?? (
                    <EmptyState
                      title="No records"
                      description="There is nothing to display yet."
                    />
                  )}
                </TableCell>
              </TableRow>
            ) : (
              data.map((row, index) => (
                <TableRow
                  key={getRowId(row, index)}
                  tabIndex={onRowClick ? 0 : undefined}
                  className={cn(
                    onRowClick ? "cursor-pointer" : undefined,
                    "transition-colors hover:bg-muted/30",
                  )}
                  onClick={() => onRowClick?.(row)}
                  onKeyDown={(event) => {
                    if (
                      onRowClick &&
                      (event.key === "Enter" || event.key === " ")
                    ) {
                      event.preventDefault();
                      onRowClick(row);
                    }
                  }}
                >
                  {columns.map((column) => (
                    <TableCell
                      key={column.id}
                      className={cn(
                        alignMap[column.align ?? "left"],
                        column.className,
                      )}
                    >
                      {column.cell(row)}
                    </TableCell>
                  ))}
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      {pagination ? (
        <DataTablePagination
          pagination={pagination}
          onPageChange={onPageChange}
        />
      ) : null}
    </div>
  );
}

function DataTablePagination({
  pagination,
  onPageChange,
}: {
  pagination: DataTablePagination;
  onPageChange?: (page: number) => void;
}) {
  const { page, pageSize, total } = pagination;
  const totalPages = Math.max(1, Math.ceil(total / pageSize));
  const start = total === 0 ? 0 : (page - 1) * pageSize + 1;
  const end = Math.min(page * pageSize, total);

  return (
    <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
      <p className="text-sm text-muted-foreground">
        Showing <span className="font-medium">{start}</span>–
        <span className="font-medium">{end}</span> of{" "}
        <span className="font-medium">{total}</span>
      </p>
      <div className="flex items-center gap-2">
        <Button
          variant="outline"
          size="sm"
          disabled={page <= 1 || !onPageChange}
          onClick={() => onPageChange?.(page - 1)}
        >
          Previous
        </Button>
        <span className="text-sm text-muted-foreground">
          Page {page} of {totalPages}
        </span>
        <Button
          variant="outline"
          size="sm"
          disabled={page >= totalPages || !onPageChange}
          onClick={() => onPageChange?.(page + 1)}
        >
          Next
        </Button>
      </div>
    </div>
  );
}