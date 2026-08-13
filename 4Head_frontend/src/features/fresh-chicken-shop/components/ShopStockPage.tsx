import { useState } from "react";
import { useSelector } from "react-redux";
import { toast } from "sonner";
import { ErrorState } from "@/components/common/ErrorState";
import { PageHeader } from "@/components/common/PageHeader";
import { PageSkeleton } from "@/components/common/Skeletons";
import { StatCard } from "@/components/common/StatCard";
import { StockWriteoffDialog } from "@/components/common/StockWriteoffDialog";
import { PageContainer } from "@/components/layout/PageContainer";
import { Button } from "@/components/ui/button";
import {
  selectUserDepartmentCode,
  selectUserRole,
} from "@/features/auth/authSlice";
import { getApiErrorMessage } from "@/lib/api-error";
import { DepartmentCode, Role } from "@/types/enums";
import {
  useCreateShopStockWriteoffMutation,
  useGetShopStockQuery,
} from "../shopApi";

const money = new Intl.NumberFormat("en-PK", {
  style: "currency",
  currency: "PKR",
});

export function ShopStockPage() {
  const query = useGetShopStockQuery();
  const role = useSelector(selectUserRole);
  const dept = useSelector(selectUserDepartmentCode);
  const canWrite =
    role === Role.OWNER ||
    role === Role.ACCOUNTANT ||
    (role === Role.DEPARTMENT_STAFF &&
      dept === DepartmentCode.FRESH_CHICKEN_SHOP);

  const [open, setOpen] = useState(false);
  const [writeoff, state] = useCreateShopStockWriteoffMutation();

  if (query.isLoading) return <PageSkeleton rows={2} />;
  if (query.isError || !query.data?.data)
    return (
      <PageContainer>
        <ErrorState
          title="Shop stock could not be loaded"
          description={getApiErrorMessage(query.error)}
          onRetry={() => void query.refetch()}
        />
      </PageContainer>
    );

  const { live, dressed } = query.data.data;

  return (
    <PageContainer>
      <PageHeader
        title="Shop Stock"
        actions={
          canWrite ? (
            <Button onClick={() => setOpen(true)}>+ Add Shrinkage</Button>
          ) : undefined
        }
      />
      <div className="grid gap-4 sm:grid-cols-2">
        <StatCard label="Live stock" value={`${live.quantityKg} kg`} />
        <StatCard label="Live WAC" value={money.format(Number(live.wac))} />
        <StatCard label="Dressed stock" value={`${dressed.quantityKg} kg`} />
        <StatCard
          label="Dressed WAC"
          value={money.format(Number(dressed.wac))}
        />
      </div>
      <p className="text-sm text-muted-foreground mt-2">
        This stock is fed exclusively by internal transfers from Supply. The
        Fresh Chicken Shop has no purchase-creation screen — see{" "}
        <strong>Incoming Transfers</strong> for the source records.
      </p>
      <StockWriteoffDialog
        open={open}
        availableKg={live.quantityKg}
        stockOptions={[
          { value: "live", label: "Live stock", availableKg: live.quantityKg },
          {
            value: "dressed",
            label: "Dressed stock",
            availableKg: dressed.quantityKg,
          },
        ]}
        loading={state.isLoading}
        onClose={() => setOpen(false)}
        onSubmit={async (body) => {
          try {
            if (!body.stockType) throw new Error("Select a stock pool");
            const result = await writeoff({
              ...body,
              stockType: body.stockType,
            }).unwrap();
            toast.success(
              `Write-off recorded: ${money.format(Number(result.data.valuationAmount))}`,
            );
            setOpen(false);
          } catch (e) {
            toast.error(getApiErrorMessage(e));
          }
        }}
      />
    </PageContainer>
  );
}
