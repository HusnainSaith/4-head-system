import { useState } from "react";
import { ErrorState } from "@/components/common/ErrorState";
import { PageHeader } from "@/components/common/PageHeader";
import { PageSkeleton } from "@/components/common/Skeletons";
import { StatCard } from "@/components/common/StatCard";
import { PageContainer } from "@/components/layout/PageContainer";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { DepartmentBalancesPanel } from "@/features/parties/components/DepartmentBalancesPanel";
import { DepartmentCode } from "@/types/enums";
import { useGetSupplyProfitLossQuery } from "../supplyApi";
import type { ProfitLossView } from "../types";
const money = new Intl.NumberFormat("en-PK", {
  style: "currency",
  currency: "PKR",
});
function reportTone(label: string, value: string | number) {
  if (label === "Revenue") return "success" as const;
  if (label === "Gross Profit" || label === "Net Profit")
    return Number(value) >= 0 ? ("success" as const) : ("danger" as const);
  return "danger" as const;
}
const Report = ({ title, data }: { title: string; data: ProfitLossView }) => (
  <section className="space-y-4">
    <h2 className="text-lg font-semibold">{title}</h2>
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
      {[
        ["Revenue", data.revenue],
        ["COGS", data.cogs],
        ["Gross Profit", data.grossProfit],
        ["Operating Expenses", data.operatingExpenses],
        ["Payroll", data.payroll],
        ["Net Profit", data.netProfit],
      ].map(([label, value]) => (
        <StatCard
          key={label}
          label={label}
          value={money.format(Number(value))}
          tone={reportTone(label, value)}
        />
      ))}
    </div>
  </section>
);
export function SupplyReportPage() {
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const invalid = Boolean(from && to && from > to);
  const query = useGetSupplyProfitLossQuery(
    { from: from || undefined, to: to || undefined },
    { skip: invalid },
  );
  const data = query.data?.data;
  return (
    <PageContainer>
      <PageHeader title="Supply Profit and Loss" />
      <DepartmentBalancesPanel departmentCode={DepartmentCode.SUPPLY} />
      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <Label htmlFor="supply-report-from">From</Label>
          <Input
            id="supply-report-from"
            type="date"
            value={from}
            max={to || undefined}
            onChange={(e) => setFrom(e.target.value)}
          />
        </div>
        <div>
          <Label htmlFor="supply-report-to">To</Label>
          <Input
            id="supply-report-to"
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
        <PageSkeleton rows={6} />
      ) : query.isError || !data ? (
        <ErrorState
          title="Supply report could not be loaded"
          error={query.error}
          onRetry={() => void query.refetch()}
        />
      ) : (
        <div className="space-y-8">
          <Report title="External Sales Only" data={data.externalOnly} />
          <Report
            title="Including Internal Transfers"
            data={data.includingInternalTransfers}
          />
        </div>
      )}
    </PageContainer>
  );
}
