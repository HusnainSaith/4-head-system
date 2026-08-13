import { useState } from "react";
import { PageContainer } from "@/components/layout/PageContainer";
import { PageHeader } from "@/components/common/PageHeader";
import { PageSkeleton } from "@/components/common/Skeletons";
import { ErrorState } from "@/components/common/ErrorState";
import { StatCard } from "@/components/common/StatCard";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useGetBrokerageProfitLossQuery } from "../brokerageApi";
import { DepartmentBalancesPanel } from "@/features/parties/components/DepartmentBalancesPanel";
import { DepartmentCode } from "@/types/enums";

const money = new Intl.NumberFormat("en-PK", {
  style: "currency",
  currency: "PKR",
});
export function BrokerageReportPage() {
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const invalid = Boolean(from && to && from > to);
  const query = useGetBrokerageProfitLossQuery(
    invalid ? undefined : { from: from || undefined, to: to || undefined },
    { skip: invalid },
  );
  return (
    <PageContainer>
      <PageHeader title="Brokerage Profit and Loss" />
      <DepartmentBalancesPanel departmentCode={DepartmentCode.BROKERAGE} />
      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <Label htmlFor="report-from">From</Label>
          <Input
            id="report-from"
            type="date"
            value={from}
            max={to || undefined}
            onChange={(e) => setFrom(e.target.value)}
          />
        </div>
        <div>
          <Label htmlFor="report-to">To</Label>
          <Input
            id="report-to"
            type="date"
            value={to}
            min={from || undefined}
            onChange={(e) => setTo(e.target.value)}
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
      ) : query.isError || !query.data?.data ? (
        <ErrorState
          title="Report could not be loaded"
          error={query.error}
          onRetry={() => void query.refetch()}
        />
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <StatCard
            label="Revenue"
            value={money.format(Number(query.data.data.revenue))}
            tone="success"
          />
          <StatCard
            label="COGS"
            value={money.format(Number(query.data.data.cogs))}
            tone="danger"
          />
          <StatCard
            label="Operating expenses"
            value={money.format(Number(query.data.data.operatingExpenses))}
            tone="danger"
          />
          <StatCard
            label="Payroll"
            value={money.format(Number(query.data.data.payrollExpenses))}
            tone="danger"
          />
          <StatCard
            label="Net profit"
            value={money.format(Number(query.data.data.netProfit))}
            tone={
              Number(query.data.data.netProfit) >= 0 ? "success" : "danger"
            }
          />
        </div>
      )}
    </PageContainer>
  );
}
