import { useState } from "react";
import { ErrorState } from "@/components/common/ErrorState";
import { PageHeader } from "@/components/common/PageHeader";
import { PageSkeleton } from "@/components/common/Skeletons";
import { StatCard } from "@/components/common/StatCard";
import { PageContainer } from "@/components/layout/PageContainer";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { getApiErrorMessage } from "@/lib/api-error";
import { DepartmentBalancesPanel } from "@/features/parties/components/DepartmentBalancesPanel";
import { DepartmentCode } from "@/types/enums";
import { useGetProfitLossReportQuery } from "../wastageApi";

const money = new Intl.NumberFormat("en-PK", {
  style: "currency",
  currency: "PKR",
});
export function WastageReportPage() {
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const invalid = Boolean(from && to && from > to);
  const query = useGetProfitLossReportQuery(
    { from: from || undefined, to: to || undefined },
    { skip: invalid },
  );
  const data = query.data?.data;
  return (
    <PageContainer>
      <PageHeader title="Wastage Profit and Loss" />
      <DepartmentBalancesPanel departmentCode={DepartmentCode.WASTAGE} />
      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <Label htmlFor="wastage-report-from">From</Label>
          <Input
            id="wastage-report-from"
            type="date"
            value={from}
            max={to || undefined}
            onChange={(event) => setFrom(event.target.value)}
          />
        </div>
        <div>
          <Label htmlFor="wastage-report-to">To</Label>
          <Input
            id="wastage-report-to"
            type="date"
            value={to}
            min={from || undefined}
            onChange={(event) => setTo(event.target.value)}
          />
        </div>
      </div>
      {invalid ? (
        <ErrorState
          title="Invalid date range"
          description="From date must not be after To date."
        />
      ) : query.isLoading ? (
        <PageSkeleton rows={3} />
      ) : query.isError || !data ? (
        <ErrorState
          title="Wastage report could not be loaded"
          description={getApiErrorMessage(query.error)}
          onRetry={() => void query.refetch()}
        />
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <StatCard
            label="Revenue"
            value={money.format(Number(data.revenue))}
            tone="success"
          />
          <StatCard
            label="COGS"
            value={money.format(Number(data.cogs))}
            tone="danger"
          />
          <StatCard
            label="Gross Profit"
            value={money.format(Number(data.grossProfit))}
            tone={Number(data.grossProfit) >= 0 ? "success" : "danger"}
          />
          <StatCard
            label="Operating Expenses"
            value={money.format(Number(data.operatingExpenses))}
            tone="danger"
          />
          <StatCard
            label="Payroll"
            value={money.format(Number(data.payrollExpenses))}
            tone="danger"
          />
          <StatCard
            label="Net Profit"
            value={money.format(Number(data.netProfit))}
            tone={Number(data.netProfit) >= 0 ? "success" : "danger"}
          />
        </div>
      )}
    </PageContainer>
  );
}
