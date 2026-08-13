import { useState } from "react";
import { useSelector } from "react-redux";
import { toast } from "sonner";
import { StockWriteoffDialog } from "@/components/common/StockWriteoffDialog";
import { ErrorState } from "@/components/common/ErrorState";
import { PageHeader } from "@/components/common/PageHeader";
import { PageSkeleton } from "@/components/common/Skeletons";
import { StatCard } from "@/components/common/StatCard";
import { PageContainer } from "@/components/layout/PageContainer";
import { Button } from "@/components/ui/button";
import {
  selectUserDepartmentCode,
  selectUserRole,
} from "@/features/auth/authSlice";
import { getApiErrorMessage } from "@/lib/api-error";
import { DepartmentCode, Role } from "@/types/enums";
import {
  useCreateSupplyStockWriteoffMutation,
  useGetSupplyStockQuery,
} from "../supplyApi";

const money = new Intl.NumberFormat("en-PK", {
  style: "currency",
  currency: "PKR",
});

export function SupplyStockPage() {
  const query = useGetSupplyStockQuery();
  const role = useSelector(selectUserRole);
  const department = useSelector(selectUserDepartmentCode);
  const canWrite =
    role === Role.OWNER ||
    role === Role.ACCOUNTANT ||
    (role === Role.DEPARTMENT_STAFF && department === DepartmentCode.SUPPLY);
  const [open, setOpen] = useState(false);
  const [createWriteoff, writeoffState] =
    useCreateSupplyStockWriteoffMutation();

  if (query.isLoading) return <PageSkeleton rows={2} />;
  if (query.isError || !query.data?.data)
    return (
      <PageContainer>
        <ErrorState
          title="Supply stock could not be loaded"
          description={getApiErrorMessage(query.error)}
          onRetry={() => void query.refetch()}
        />
      </PageContainer>
    );
  const stock = query.data.data;

  return (
    <PageContainer>
      <PageHeader
        title="Supply Stock"
        actions={
          canWrite ? (
            <Button onClick={() => setOpen(true)}>+ Add Shrinkage</Button>
          ) : undefined
        }
      />
      <div className="grid gap-4 sm:grid-cols-2">
        <StatCard label="Quantity" value={`${stock.quantityKg} kg`} />
        <StatCard
          label="Weighted average cost"
          value={money.format(Number(stock.wac))}
        />
      </div>
      <p className="text-sm text-muted-foreground">
        This stock reflects purchases, external sales, internal transfers sent
        to the Fresh Chicken Shop, and manual shrinkage.
      </p>
      <StockWriteoffDialog
        open={open}
        availableKg={stock.quantityKg}
        loading={writeoffState.isLoading}
        onClose={() => setOpen(false)}
        onSubmit={async (body) => {
          try {
            const result = await createWriteoff(body).unwrap();
            toast.success(
              `Shrinkage recorded: ${money.format(Number(result.data.valuationAmount))}`,
            );
            setOpen(false);
          } catch (error) {
            toast.error(getApiErrorMessage(error));
          }
        }}
      />
    </PageContainer>
  );
}
