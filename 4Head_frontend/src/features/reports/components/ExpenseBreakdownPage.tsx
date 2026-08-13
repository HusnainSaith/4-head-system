import { useState } from "react";
import { DataTable, type DataTableColumn } from "@/components/common/DataTable";
import { ErrorState } from "@/components/common/ErrorState";
import { PageHeader } from "@/components/common/PageHeader";
import { PageSkeleton } from "@/components/common/Skeletons";
import { PageContainer } from "@/components/layout/PageContainer";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useListExpenseCategoriesQuery } from "@/features/expenses/expensesApi";
import { useListDepartmentsQuery } from "@/features/vehicles/vehiclesApi";
import { useGetExpenseBreakdownQuery } from "../reportsApi";
import type { ExpenseBreakdownItem } from "../types";
import { DateRange, DepartmentFilter } from "./ReportControls";
const money = new Intl.NumberFormat("en-PK", {
  style: "currency",
  currency: "PKR",
});
export function ExpenseBreakdownPage() {
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [department, setDepartment] = useState("");
  const [category, setCategory] = useState("");
  const deps = useListDepartmentsQuery();
  const cats = useListExpenseCategoriesQuery();
  const q = useGetExpenseBreakdownQuery({
    startDate: from || undefined,
    endDate: to || undefined,
    departmentId: department || undefined,
    categoryId: category || undefined,
  });
  const columns: DataTableColumn<ExpenseBreakdownItem>[] = [
    { id: "category", header: "Category", cell: (r) => r.category },
    { id: "department", header: "Department ID", cell: (r) => r.departmentId },
    {
      id: "total",
      header: "Total",
      cell: (r) => money.format(Number(r.total)),
    },
  ];
  if (q.isLoading) return <PageSkeleton rows={5} />;
  return (
    <PageContainer>
      <PageHeader title="Expense Breakdown" />
      <DateRange from={from} to={to} onFrom={setFrom} onTo={setTo} />
      <div className="grid gap-4 sm:grid-cols-2">
        <DepartmentFilter
          value={department}
          onChange={setDepartment}
          departments={deps.data?.data ?? []}
        />
        <div>
          <Label>Category</Label>
          <Select
            value={category || "all"}
            onValueChange={(v) => setCategory(v === "all" ? "" : v)}
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All categories</SelectItem>
              {(cats.data?.data ?? []).map((c) => (
                <SelectItem key={c.id} value={c.id}>
                  {c.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>
      {q.isError ? (
        <ErrorState
          title="Expense breakdown could not be loaded"
          error={q.error}
          onRetry={() => void q.refetch()}
        />
      ) : (
        <DataTable
          columns={columns}
          data={q.data?.data ?? []}
          getRowId={(r) => `${r.departmentId}-${r.categoryId}`}
        />
      )}
    </PageContainer>
  );
}
