import { Boxes, Scale, TrendingDown } from "lucide-react";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import {
  DashboardSection,
  QuickLinkGrid,
  StatCardGrid,
} from "@/components/common/DashboardBlocks";
import { EmptyState } from "@/components/common/EmptyState";
import { ErrorState } from "@/components/common/ErrorState";
import { PageHeader } from "@/components/common/PageHeader";
import { PageSkeleton } from "@/components/common/Skeletons";
import { StatCard } from "@/components/common/StatCard";
import { PageContainer } from "@/components/layout/PageContainer";
import { useSelector } from "react-redux";
import {
  selectUserDepartmentCode,
  selectUserDepartmentId,
} from "@/features/auth/authSlice";
import {
  useGetOutstandingBalancesQuery,
  useGetStockSummaryQuery,
} from "@/features/dashboard/dashboardApi";
import { DepartmentCode } from "@/types/enums";

const departmentPath: Record<DepartmentCode, string> = {
  [DepartmentCode.BROKERAGE]: "/brokerage",
  [DepartmentCode.SUPPLY]: "/supply",
  [DepartmentCode.WASTAGE]: "/wastage",
  [DepartmentCode.FRESH_CHICKEN_SHOP]: "/fresh-chicken-shop",
};

const money = new Intl.NumberFormat("en-PK", {
  style: "currency",
  currency: "PKR",
  maximumFractionDigits: 0,
});

export function DepartmentDashboard() {
  const departmentId = useSelector(selectUserDepartmentId);
  const departmentCode = useSelector(selectUserDepartmentCode);
  const stock = useGetStockSummaryQuery(
    { departmentId: departmentId ?? undefined },
    { skip: !departmentId },
  );
  const balances = useGetOutstandingBalancesQuery(
    { departmentId: departmentId ?? undefined },
    { skip: !departmentId },
  );

  if (!departmentId) {
    return (
      <ErrorState
        title="No department assigned"
        description="Ask an owner to assign your account to a department."
      />
    );
  }
  if (stock.isLoading || balances.isLoading) return <PageSkeleton rows={4} />;
  if (stock.isError || balances.isError) {
    return (
      <ErrorState
        title="Department dashboard is unavailable"
        error={stock.error ?? balances.error}
        onRetry={() => {
          void stock.refetch();
          void balances.refetch();
        }}
      />
    );
  }

  const stockRows = stock.data?.data.summary ?? [];
  const balanceRows = balances.data?.data ?? [];
  const stockTotal = stockRows.reduce(
    (sum, item) => sum + Number(item.quantityKg || 0),
    0,
  );
  const totalReceivable = balanceRows.reduce(
    (sum, item) => sum + Math.max(Number(item.balance || 0), 0),
    0,
  );
  const totalPayable = balanceRows.reduce(
    (sum, item) => sum + Math.max(-Number(item.balance || 0), 0),
    0,
  );

  return (
    <PageContainer>
      <PageHeader
        title="Department dashboard"
        description="Only your assigned department is queried."
      />
      <StatCardGrid>
        <StatCard
          label="Current stock"
          value={`${stockTotal.toFixed(2)} kg`}
          icon={Boxes}
        />
        <StatCard
          label="Total receivable"
          value={money.format(totalReceivable)}
          icon={Scale}
          tone="success"
        />
        <StatCard
          label="Total payable"
          value={money.format(totalPayable)}
          icon={TrendingDown}
          tone="danger"
        />
      </StatCardGrid>
      <DashboardSection title="Today's purchases and sales">
        <div className="rounded-2xl border border-dashed border-amber-300 bg-gradient-to-br from-amber-50 to-white px-5 py-10 text-center dark:border-amber-900 dark:from-amber-950/20 dark:to-background">
          <p className="text-lg font-semibold">Coming soon</p>
          <p className="mx-auto mt-2 max-w-lg text-sm text-muted-foreground">
            Today&apos;s purchase and sales comparison will appear when the
            department reporting endpoint is available.
          </p>
        </div>
      </DashboardSection>
      <DashboardSection title="Quick entry">
        {departmentCode ? (
          <QuickLinkGrid>
            <Button
              asChild
              className="h-12 border-l-4 border-[#FCA311] bg-[#14213D] text-white hover:bg-[#1c2e52] hover:text-[#FCA311]"
            >
              <Link to={departmentPath[departmentCode]}>
                Open department entry
              </Link>
            </Button>
          </QuickLinkGrid>
        ) : (
          <EmptyState
            title="Department route unavailable"
            description="The current backend token does not contain a usable departmentCode claim."
          />
        )}
      </DashboardSection>
    </PageContainer>
  );
}
