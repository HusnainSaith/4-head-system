import { DataTable, type DataTableColumn } from "@/components/common/DataTable";
import { EmptyState } from "@/components/common/EmptyState";
import { ErrorState } from "@/components/common/ErrorState";
import { PageHeader } from "@/components/common/PageHeader";
import { PageSkeleton } from "@/components/common/Skeletons";
import { PageContainer } from "@/components/layout/PageContainer";
import { Badge } from "@/components/ui/badge";
import { getApiErrorMessage } from "@/lib/api-error";
import type { InternalTransfer } from "@/features/supply/types";
import { useGetShopIncomingTransfersQuery } from "../shopApi";

const money = new Intl.NumberFormat("en-PK", {
  style: "currency",
  currency: "PKR",
});

const statusVariant = (s: InternalTransfer["settlementStatus"]) =>
  s === "settled" ? "success" : s === "unsettled" ? "warning" : "secondary";

const columns: DataTableColumn<InternalTransfer>[] = [
  {
    id: "date",
    header: "Transfer date",
    cell: (r) => String(r.transferDate).slice(0, 10),
  },
  {
    id: "qty",
    header: "Quantity (kg)",
    cell: (r) => `${r.quantityKg} kg`,
    align: "right",
  },
  {
    id: "rate",
    header: "Internal rate/kg",
    cell: (r) => money.format(Number(r.internalRatePerKg)),
    align: "right",
  },
  {
    id: "total",
    header: "Total",
    cell: (r) => money.format(Number(r.totalAmount)),
    align: "right",
  },
  {
    id: "status",
    header: "Settlement status",
    cell: (r) => (
      <Badge variant={statusVariant(r.settlementStatus)}>
        {r.settlementStatus.replaceAll("_", " ")}
      </Badge>
    ),
  },
  {
    id: "settled",
    header: "Amount settled",
    cell: (r) => money.format(Number(r.amountSettled)),
    align: "right",
  },
];

export function IncomingTransfersPage() {
  const query = useGetShopIncomingTransfersQuery();

  if (query.isLoading) return <PageSkeleton rows={6} />;
  if (query.isError)
    return (
      <PageContainer>
        <ErrorState
          title="Incoming transfers could not be loaded"
          description={getApiErrorMessage(query.error)}
          onRetry={() => void query.refetch()}
        />
      </PageContainer>
    );

  return (
    <PageContainer>
      <PageHeader
        title="Incoming Transfers"
        description="Stock received from Supply via internal transfers. Read-only — transfers and settlements are managed from the Supply side."
      />
      <DataTable
        columns={columns}
        data={query.data?.data ?? []}
        getRowId={(r) => r.id}
        emptyContent={<EmptyState title="No incoming transfers found" />}
      />
      <p className="text-sm text-muted-foreground mt-2">
        To create a transfer or record a settlement, go to{" "}
        <strong>Supply → Internal Transfers</strong> (available to Owner and
        Accountant roles).
      </p>
    </PageContainer>
  );
}
