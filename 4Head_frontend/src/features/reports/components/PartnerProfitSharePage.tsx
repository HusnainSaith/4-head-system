import { useState } from "react";
import { ErrorState } from "@/components/common/ErrorState";
import { PageHeader } from "@/components/common/PageHeader";
import { PageSkeleton } from "@/components/common/Skeletons";
import { StatCard } from "@/components/common/StatCard";
import { PageContainer } from "@/components/layout/PageContainer";
import { useGetPartnerProfitShareQuery } from "../reportsApi";
import { DateRange } from "./ReportControls";
const money = new Intl.NumberFormat("en-PK", {
  style: "currency",
  currency: "PKR",
});
export function PartnerProfitSharePage() {
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const q = useGetPartnerProfitShareQuery({
    startDate: from || undefined,
    endDate: to || undefined,
  });
  if (q.isLoading) return <PageSkeleton rows={4} />;
  return (
    <PageContainer>
      <PageHeader title="Partner Profit Share" />
      <DateRange from={from} to={to} onFrom={setFrom} onTo={setTo} />
      {q.isError || !q.data ? (
        <ErrorState
          title="Partner profit share could not be loaded"
          error={q.error}
          onRetry={() => void q.refetch()}
        />
      ) : (
        <>
          <StatCard
            label="Consolidated Net Profit"
            value={money.format(Number(q.data.data.netProfit))}
          />
          <div className="grid gap-4 sm:grid-cols-3">
            {[1, 2, 3].map((p) => (
              <StatCard
                key={p}
                label={`Partner ${p}`}
                value={money.format(Number(q.data.data.partnerShare))}
              />
            ))}
          </div>
        </>
      )}
    </PageContainer>
  );
}
