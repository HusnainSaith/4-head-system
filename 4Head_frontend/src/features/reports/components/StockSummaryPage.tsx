import { useState } from "react";
import { DataTable, type DataTableColumn } from "@/components/common/DataTable";
import { ErrorState } from "@/components/common/ErrorState";
import { PageHeader } from "@/components/common/PageHeader";
import { PageSkeleton } from "@/components/common/Skeletons";
import { PageContainer } from "@/components/layout/PageContainer";
import { useListDepartmentsQuery } from "@/features/vehicles/vehiclesApi";
import { useGetStockSummaryQuery } from "../reportsApi";
import type { StockMovementItem, StockSummaryItem } from "../types";
import { DateRange, DepartmentFilter } from "./ReportControls";
export function StockSummaryPage() {
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [department, setDepartment] = useState("");
  const deps = useListDepartmentsQuery();
  const q = useGetStockSummaryQuery({
    startDate: from || undefined,
    endDate: to || undefined,
    departmentId: department || undefined,
  });
  const summary: DataTableColumn<StockSummaryItem>[] = [
    { id: "department", header: "Department", cell: (r) => r.departmentName },
    { id: "quantity", header: "Quantity (kg)", cell: (r) => r.quantityKg },
    { id: "wac", header: "Weighted avg cost", cell: (r) => r.wac },
  ];
  const movements: DataTableColumn<StockMovementItem>[] = [
    {
      id: "date",
      header: "Date",
      cell: (r) => String(r.movementDate).slice(0, 10),
    },
    { id: "department", header: "Department", cell: (r) => r.departmentName },
    { id: "type", header: "Movement", cell: (r) => r.movementType },
    { id: "quantity", header: "Quantity (kg)", cell: (r) => r.quantityKg },
    { id: "rate", header: "Rate/kg", cell: (r) => r.ratePerKg },
    { id: "wac", header: "Resulting WAC", cell: (r) => r.resultingWac },
  ];
  if (q.isLoading) return <PageSkeleton rows={6} />;
  return (
    <PageContainer>
      <PageHeader title="Stock Summary" />
      <DataTable
        columns={summary}
        data={q.data?.data.summary ?? []}
        getRowId={(r) => r.departmentId}
      />
      <h2 className="text-lg font-semibold">Movement History</h2>
      <div className="grid gap-4 md:grid-cols-3">
        <DateRange from={from} to={to} onFrom={setFrom} onTo={setTo} />
        <DepartmentFilter
          value={department}
          onChange={setDepartment}
          departments={deps.data?.data ?? []}
        />
      </div>
      {q.isError ? (
        <ErrorState
          title="Stock summary could not be loaded"
          error={q.error}
          onRetry={() => void q.refetch()}
        />
      ) : (
        <DataTable
          columns={movements}
          data={q.data?.data.movements ?? []}
          getRowId={(r) => r.id}
        />
      )}
    </PageContainer>
  );
}
