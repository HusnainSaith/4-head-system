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
import { selectUserDepartmentCode, selectUserRole } from "@/features/auth/authSlice";
import { getApiErrorMessage } from "@/lib/api-error";
import { DepartmentCode, Role } from "@/types/enums";
import { useCreateWastageStockWriteoffMutation, useGetStockQuery } from "../wastageApi";

const money = new Intl.NumberFormat("en-PK", { style: "currency", currency: "PKR" });

export function WastageStockPage() {
  const query = useGetStockQuery();
  const role = useSelector(selectUserRole);
  const department = useSelector(selectUserDepartmentCode);
  const canWrite = role === Role.OWNER || role === Role.ACCOUNTANT ||
    (role === Role.DEPARTMENT_STAFF && department === DepartmentCode.WASTAGE);
  const [open, setOpen] = useState(false);
  const [createWriteoff, writeoffState] = useCreateWastageStockWriteoffMutation();
  if (query.isLoading) return <PageSkeleton rows={2} />;
  if (query.isError || !query.data?.data) return <PageContainer><ErrorState title="Wastage stock could not be loaded" description={getApiErrorMessage(query.error)} onRetry={() => void query.refetch()} /></PageContainer>;
  const stock = query.data.data;
  return <PageContainer><PageHeader title="Wastage Stock" description="Current stock balance and server-calculated weighted average cost." actions={canWrite ? <Button onClick={() => setOpen(true)}>+ Add Shrinkage</Button> : undefined} /><div className="grid gap-4 sm:grid-cols-2"><StatCard label="Quantity" value={`${stock.quantityKg} kg`} /><StatCard label="Weighted average cost" value={money.format(Number(stock.wac))} /></div><StockWriteoffDialog open={open} availableKg={stock.quantityKg} loading={writeoffState.isLoading} onClose={() => setOpen(false)} onSubmit={async (body) => { try { const result = await createWriteoff(body).unwrap(); toast.success(`Shrinkage recorded: ${money.format(Number(result.data.valuationAmount))}`); setOpen(false); } catch (error) { toast.error(getApiErrorMessage(error)); } }} /></PageContainer>;
}
