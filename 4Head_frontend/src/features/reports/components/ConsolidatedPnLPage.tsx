import { useState } from "react";
import { ErrorState } from "@/components/common/ErrorState";
import { PageHeader } from "@/components/common/PageHeader";
import { PageSkeleton } from "@/components/common/Skeletons";
import { StatCard } from "@/components/common/StatCard";
import { PageContainer } from "@/components/layout/PageContainer";
import { useGetConsolidatedProfitLossQuery } from "../reportsApi";
import { DateRange } from "./ReportControls";
const money = new Intl.NumberFormat("en-PK", {
  style: "currency",
  currency: "PKR",
});
export function ConsolidatedPnLPage() {
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const q = useGetConsolidatedProfitLossQuery({
    startDate: from || undefined,
    endDate: to || undefined,
  });
  if (q.isLoading) return <PageSkeleton rows={5} />;
  return (
    <PageContainer>
      <PageHeader title="Consolidated Profit & Loss" />
      <DateRange from={from} to={to} onFrom={setFrom} onTo={setTo} />
      {q.isError || !q.data ? (
        <ErrorState
          title="Consolidated report could not be loaded"
          error={q.error}
          onRetry={() => void q.refetch()}
        />
      ) : (
        <div className="grid gap-4 md:grid-cols-5">
          <StatCard
            label="Total Revenue"
            value={money.format(Number(q.data.data.externalRevenue))}
          />
          <StatCard
            label="Total COGS"
            value={money.format(Number(q.data.data.totalCogs))}
          />
          <StatCard
            label="Total Operating Expenses"
            value={money.format(Number(q.data.data.totalExpenses))}
          />
          <StatCard
            label="Total Payroll"
            value={money.format(Number(q.data.data.totalPayroll))}
          />
          <StatCard
            label="Net Profit"
            value={money.format(Number(q.data.data.netProfit))}
          />
        </div>
      )}
      <p className="text-sm text-muted-foreground">
        Total Revenue excludes internal Supply → Fresh Chicken Shop transfers.
        Supply’s own total including transfers is intentionally higher.
      </p>
    </PageContainer>
  );
}
