import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { DataTable, type DataTableColumn } from "@/components/common/DataTable";
import { ErrorState } from "@/components/common/ErrorState";
import { PageHeader } from "@/components/common/PageHeader";
import { PageSkeleton } from "@/components/common/Skeletons";
import { PageContainer } from "@/components/layout/PageContainer";
import { Badge } from "@/components/ui/badge";
import { useListDepartmentsQuery } from "@/features/vehicles/vehiclesApi";
import { useGetOutstandingBalancesQuery } from "../reportsApi";
import type { OutstandingBalance } from "../types";
import { DepartmentFilter } from "./ReportControls";
const money = new Intl.NumberFormat("en-PK", {
  style: "currency",
  currency: "PKR",
});
export function OutstandingBalancesPage() {
  const navigate = useNavigate();
  const [department, setDepartment] = useState("");
  const deps = useListDepartmentsQuery();
  const q = useGetOutstandingBalancesQuery({
    departmentId: department || undefined,
  });
  const columns: DataTableColumn<OutstandingBalance>[] = [
    { id: "party", header: "Party", cell: (r) => r.partyName },
    {
      id: "type",
      header: "Party type",
      cell: (r) => <Badge>{r.partyType}</Badge>,
    },
    { id: "department", header: "Department", cell: (r) => r.departmentName },
    {
      id: "balance",
      header: "Balance",
      cell: (r) => (
        <span
          className={
            Number(r.balance) >= 0 ? "text-emerald-600" : "text-red-600"
          }
        >
          {money.format(Math.abs(Number(r.balance)))}{" "}
          {Number(r.balance) >= 0 ? "receivable" : "payable"}
        </span>
      ),
    },
  ];
  if (q.isLoading) return <PageSkeleton rows={5} />;
  return (
    <PageContainer>
      <PageHeader title="Outstanding Balances" />
      <DepartmentFilter
        value={department}
        onChange={setDepartment}
        departments={deps.data?.data ?? []}
      />
      {q.isError ? (
        <ErrorState
          title="Balances could not be loaded"
          error={q.error}
          onRetry={() => void q.refetch()}
        />
      ) : (
        <DataTable
          columns={columns}
          data={q.data?.data ?? []}
          getRowId={(r) => `${r.partyId}-${r.departmentId}`}
          onRowClick={(r) => navigate(`/parties/${r.partyId}`)}
        />
      )}
    </PageContainer>
  );
}
