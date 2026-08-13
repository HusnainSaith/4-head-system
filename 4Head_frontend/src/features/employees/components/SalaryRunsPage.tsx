import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useSelector } from "react-redux";
import { DataTable, type DataTableColumn } from "@/components/common/DataTable";
import { EmptyState } from "@/components/common/EmptyState";
import { ErrorState } from "@/components/common/ErrorState";
import { PageHeader } from "@/components/common/PageHeader";
import { PageSkeleton } from "@/components/common/Skeletons";
import { PageContainer } from "@/components/layout/PageContainer";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { selectUserRole } from "@/features/auth/authSlice";
import { useListDepartmentsQuery } from "@/features/vehicles/vehiclesApi";
import { Role } from "@/types/enums";
import { useListSalaryRunsQuery } from "../employeesApi";
import type { SalaryRun } from "../types";
const money = new Intl.NumberFormat("en-PK", {
  style: "currency",
  currency: "PKR",
});
export function SalaryRunsPage() {
  const navigate = useNavigate();
  const role = useSelector(selectUserRole);
  const [department, setDepartment] = useState("");
  const [period, setPeriod] = useState("");
  const departments = useListDepartmentsQuery();
  const [year, month] = period
    ? period.split("-").map(Number)
    : [undefined, undefined];
  const query = useListSalaryRunsQuery({
    departmentId: department || undefined,
    periodMonth: month,
    periodYear: year,
  });
  const columns: DataTableColumn<SalaryRun>[] = [
    {
      id: "employee",
      header: "Employee",
      cell: (r) => r.employee?.fullName ?? r.employeeId,
    },
    {
      id: "period",
      header: "Period",
      cell: (r) => `${r.periodMonth}/${r.periodYear}`,
    },
    {
      id: "base",
      header: "Base salary",
      cell: (r) => money.format(Number(r.baseSalary)),
    },
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
      id: "net",
      header: "Net payable",
      cell: (r) => money.format(Number(r.netPayable)),
    },
    {
      id: "status",
      header: "Status",
      cell: (r) => (
        <Badge variant={r.paymentStatus === "paid" ? "success" : "warning"}>
          {r.paymentStatus}
        </Badge>
      ),
    },
  ];
  if (role !== Role.OWNER && role !== Role.ACCOUNTANT)
    return (
      <PageContainer>
        <ErrorState title="Payroll access denied" />
      </PageContainer>
    );
  if (query.isLoading) return <PageSkeleton rows={6} />;
  if (query.isError)
    return (
      <PageContainer>
        <ErrorState
          title="Salary runs could not be loaded"
          error={query.error}
          onRetry={() => void query.refetch()}
        />
      </PageContainer>
    );
  return (
    <PageContainer>
      <PageHeader
        title="Salary Runs"
        actions={
          <Button onClick={() => navigate("/payroll/runs/new")}>
            Run Payroll
          </Button>
        }
      />
      <div className="grid max-w-2xl grid-cols-2 gap-4">
        <div>
          <Label htmlFor="salary-period">Period</Label>
          <Input
            id="salary-period"
            type="month"
            value={period}
            onChange={(e) => setPeriod(e.target.value)}
          />
        </div>
        <div>
          <Label htmlFor="salary-department">Department</Label>
          <Select
            value={department || "all"}
            onValueChange={(v) => setDepartment(v === "all" ? "" : v)}
          >
            <SelectTrigger id="salary-department">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All departments</SelectItem>
              {(departments.data?.data ?? []).map((d) => (
                <SelectItem key={d.id} value={d.id}>
                  {d.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>
      <DataTable
        columns={columns}
        data={query.data?.data ?? []}
        getRowId={(r) => r.id}
        onRowClick={(r) => navigate(`/payroll/runs/${r.id}`)}
        emptyContent={<EmptyState title="No salary runs found" />}
      />
    </PageContainer>
  );
}
