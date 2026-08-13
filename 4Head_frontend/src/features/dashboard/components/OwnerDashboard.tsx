import {
  Banknote,
  Bird,
  Boxes,
  PackageOpen,
  Scale,
  Store,
  TrendingDown,
  TrendingUp,
  Warehouse,
} from "lucide-react";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
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
import {
  useGetConsolidatedProfitLossQuery,
  useGetDepartmentProfitLossQuery,
  useGetOutstandingBalancesQuery,
  useGetStockSummaryQuery,
} from "@/features/dashboard/dashboardApi";
import { useListDepartmentsQuery } from "@/features/vehicles/vehiclesApi";

const money = new Intl.NumberFormat("en-PK", {
  style: "currency",
  currency: "PKR",
  maximumFractionDigits: 0,
});

function total(values: readonly string[]): number {
  return values.reduce((sum, value) => sum + Number(value || 0), 0);
}

export function OwnerDashboard() {
  const profit = useGetConsolidatedProfitLossQuery();
  const balances = useGetOutstandingBalancesQuery();
  const departmentProfit = useGetDepartmentProfitLossQuery();
  const stock = useGetStockSummaryQuery();
  const departments = useListDepartmentsQuery();

  if (
    profit.isLoading ||
    balances.isLoading ||
    departmentProfit.isLoading ||
    stock.isLoading ||
    departments.isLoading
  ) {
    return <PageSkeleton rows={5} />;
  }

  if (
    profit.isError ||
    balances.isError ||
    departmentProfit.isError ||
    stock.isError ||
    departments.isError
  ) {
    return (
      <ErrorState
        title="Dashboard data is unavailable"
        error={
          profit.error ??
          balances.error ??
          departmentProfit.error ??
          stock.error ??
          departments.error
        }
        onRetry={() => {
          void profit.refetch();
          void balances.refetch();
          void departmentProfit.refetch();
          void stock.refetch();
          void departments.refetch();
        }}
      />
    );
  }

  const profitData = profit.data?.data;
  const departmentProfitData = departmentProfit.data?.data ?? [];
  const balanceData = balances.data?.data ?? [];
  const stockData = stock.data?.data.summary ?? [];
  const stockTotal = total(stockData.map((item) => item.quantityKg));
  const departmentNames = new Map(
    (departments.data?.data ?? []).map((department) => [
      department.id,
      department.name,
    ]),
  );
  const totalReceivable = total(
    balanceData
      .filter((item) => Number(item.balance) > 0)
      .map((item) => item.balance),
  );
  const totalPayable = total(
    balanceData
      .filter((item) => Number(item.balance) < 0)
      .map((item) => String(Math.abs(Number(item.balance)))),
  );
  const departmentStock = Object.values(
    stockData.reduce<Record<string, { name: string; quantity: number }>>(
      (summary, item) => {
        const current = summary[item.departmentId] ?? {
          name:
            item.departmentName ||
            departmentNames.get(item.departmentId) ||
            "Unknown department",
          quantity: 0,
        };
        current.quantity += Number(item.quantityKg || 0);
        summary[item.departmentId] = current;
        return summary;
      },
      {},
    ),
  );
  const netProfit = Number(profitData?.netProfit ?? 0);

  return (
    <PageContainer>
      <PageHeader
        title="Business dashboard"
        description="Consolidated operational overview across all recorded activity."
      />
      <StatCardGrid>
        <StatCard
          label="External revenue"
          value={money.format(Number(profitData?.externalRevenue ?? 0))}
          icon={TrendingUp}
          tone="success"
        />
        <StatCard
          label="Net profit"
          value={money.format(netProfit)}
          icon={Banknote}
          tone={netProfit >= 0 ? "success" : "danger"}
        />
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
      <DashboardSection
        title="Stock by department"
        description="Live values from GET /reports/stock-summary."
      >
        {departmentStock.length ? (
          <StatCardGrid>
            {departmentStock.map(({ name, quantity }) => (
              <StatCard
                key={name}
                label={name}
                value={`${quantity.toFixed(2)} kg`}
                icon={Boxes}
              />
            ))}
          </StatCardGrid>
        ) : (
          <EmptyState
            title="No stock balances"
            description="No stock summary rows were returned."
          />
        )}
      </DashboardSection>
      <DashboardSection title="Per-department revenue and gross profit">
        <p className="mb-4 text-sm text-muted-foreground">
          All recorded external sales. Internal Supply transfers are excluded so
          these figures reconcile with consolidated revenue.
        </p>
        {departmentProfitData.length ? (
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
            {departmentProfitData.map((item) => {
              const grossProfit = Number(item.grossProfit);
              const route =
                item.departmentType === "FRESH_CHICKEN_SHOP"
                  ? "/shop/reports/profit-loss"
                  : `/${item.departmentType.toLowerCase()}/reports/profit-loss`;
              const Icon =
                item.departmentType === "BROKERAGE"
                  ? Bird
                  : item.departmentType === "SUPPLY"
                    ? Warehouse
                    : item.departmentType === "WASTAGE"
                      ? PackageOpen
                      : Store;
              return (
                <Card
                  key={item.departmentId}
                  className="overflow-hidden transition-shadow hover:shadow-md"
                >
                  <CardHeader className="flex-row items-center justify-between space-y-0 bg-[#14213D] py-4 text-white">
                    <CardTitle
                      className="min-w-0 truncate text-base"
                      style={{ color: "#ffffff" }}
                      title={item.departmentName}
                    >
                      {item.departmentName}
                    </CardTitle>
                    <Icon className="h-5 w-5 text-[#FCA311]" aria-hidden />
                  </CardHeader>
                  <CardContent className="space-y-4 pt-5">
                    <div>
                      <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                        Revenue
                      </p>
                      <p className="mt-1 text-xl font-bold text-emerald-700 dark:text-emerald-400">
                        {money.format(Number(item.revenue))}
                      </p>
                    </div>
                    <div
                      className={`rounded-lg border p-3 ${
                        grossProfit >= 0
                          ? "border-emerald-200 bg-emerald-50/80 dark:border-emerald-900 dark:bg-emerald-950/20"
                          : "border-red-200 bg-red-50/80 dark:border-red-900 dark:bg-red-950/20"
                      }`}
                    >
                      <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                        Gross profit
                      </p>
                      <p
                        className={`mt-1 text-lg font-bold ${
                          grossProfit >= 0
                            ? "text-emerald-700 dark:text-emerald-400"
                            : "text-red-700 dark:text-red-400"
                        }`}
                      >
                        {money.format(grossProfit)}
                      </p>
                    </div>
                    <Button asChild variant="outline" className="w-full">
                      <Link to={route}>View report</Link>
                    </Button>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        ) : (
          <EmptyState
            title="No department sales found"
            description="Revenue and gross profit will appear after sales are recorded."
          />
        )}
      </DashboardSection>
      <DashboardSection title="Quick links">
        <QuickLinkGrid>
          <Button
            asChild
            className="h-12 justify-start border-l-4 border-[#FCA311] bg-[#14213D] text-white hover:bg-[#1c2e52] hover:text-[#FCA311]"
          >
            <Link to="/brokerage">
              <Bird /> Brokerage entry
            </Link>
          </Button>
          <Button
            asChild
            className="h-12 justify-start border-l-4 border-[#FCA311] bg-[#14213D] text-white hover:bg-[#1c2e52] hover:text-[#FCA311]"
          >
            <Link to="/supply">
              <Warehouse /> Supply entry
            </Link>
          </Button>
          <Button
            asChild
            className="h-12 justify-start border-l-4 border-[#FCA311] bg-[#14213D] text-white hover:bg-[#1c2e52] hover:text-[#FCA311]"
          >
            <Link to="/wastage">
              <PackageOpen /> Wastage entry
            </Link>
          </Button>
          <Button
            asChild
            className="h-12 justify-start border-l-4 border-[#FCA311] bg-[#14213D] text-white hover:bg-[#1c2e52] hover:text-[#FCA311]"
          >
            <Link to="/fresh-chicken-shop">
              <Store /> Shop entry
            </Link>
          </Button>
        </QuickLinkGrid>
      </DashboardSection>
    </PageContainer>
  );
}
