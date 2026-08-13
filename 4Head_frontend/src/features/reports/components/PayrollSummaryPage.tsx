import { useState } from "react";
import { DataTable, type DataTableColumn } from "@/components/common/DataTable";
import { ErrorState } from "@/components/common/ErrorState";
import { PageHeader } from "@/components/common/PageHeader";
import { PageSkeleton } from "@/components/common/Skeletons";
import { PageContainer } from "@/components/layout/PageContainer";
import { useListDepartmentsQuery } from "@/features/vehicles/vehiclesApi";
import { useGetPayrollSummaryQuery } from "../reportsApi";
import type { PayrollSummaryItem } from "../types";
import { DateRange, DepartmentFilter } from "./ReportControls";
const money = new Intl.NumberFormat("en-PK", {
  style: "currency",
  currency: "PKR",
});
export function PayrollSummaryPage() {
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [department, setDepartment] = useState("");
  const deps = useListDepartmentsQuery();
  const q = useGetPayrollSummaryQuery({
    startDate: from || undefined,
    endDate: to || undefined,
    departmentId: department || undefined,
  });
  const columns: DataTableColumn<PayrollSummaryItem>[] = [
    { id: "department", header: "Department", cell: (r) => r.departmentName },
    { id: "employee", header: "Employee", cell: (r) => r.employeeName },
    {
      id: "bonuses",
      header: "Bonuses",
      cell: (r) => money.format(Number(r.totalBonuses)),
    },
    {
      id: "advances",
      header: "Advances deducted",
      cell: (r) => money.format(Number(r.totalAdvancesDeducted)),
    },
    {
      id: "cost",
      header: "Total payroll cost",
      cell: (r) => money.format(Number(r.totalNetPayable)),
    },
  ];
  if (q.isLoading) return <PageSkeleton rows={5} />;
  return (
    <PageContainer>
      <PageHeader title="Payroll Summary" />
      <DateRange from={from} to={to} onFrom={setFrom} onTo={setTo} />
      <DepartmentFilter
        value={department}
        onChange={setDepartment}
        departments={deps.data?.data ?? []}
      />
      {q.isError ? (
        <ErrorState
          title="Payroll summary could not be loaded"
          error={q.error}
          onRetry={() => void q.refetch()}
        />
      ) : (
        <DataTable
          columns={columns}
          data={q.data?.data ?? []}
          getRowId={(r) => `${r.departmentId}-${r.employeeId}`}
        />
      )}
    </PageContainer>
  );
}
