import { useState } from "react";
import { useSelector } from "react-redux";
import { toast } from "sonner";
import { PageContainer } from "@/components/layout/PageContainer";
import { PageHeader } from "@/components/common/PageHeader";
import { PageSkeleton } from "@/components/common/Skeletons";
import { ErrorState } from "@/components/common/ErrorState";
import { StatCard } from "@/components/common/StatCard";
import { StockWriteoffDialog } from "@/components/common/StockWriteoffDialog";
import { Button } from "@/components/ui/button";
import { selectUserDepartmentCode, selectUserRole } from "@/features/auth/authSlice";
import { getApiErrorMessage } from "@/lib/api-error";
import { DepartmentCode, Role } from "@/types/enums";
import { useCreateBrokerageStockWriteoffMutation, useGetBrokerageStockQuery } from "../brokerageApi";

const money = new Intl.NumberFormat("en-PK", { style: "currency", currency: "PKR" });
export function BrokerageStockPage() {
  const query = useGetBrokerageStockQuery(); const role = useSelector(selectUserRole);
  const department = useSelector(selectUserDepartmentCode); const [open, setOpen] = useState(false);
  const [writeoff, state] = useCreateBrokerageStockWriteoffMutation();
  const canWrite = role === Role.OWNER || role === Role.ACCOUNTANT || (role === Role.DEPARTMENT_STAFF && department === DepartmentCode.BROKERAGE);
  if (query.isLoading) return <PageSkeleton rows={3} />;
  if (query.isError || !query.data?.data) return <PageContainer><ErrorState title="Brokerage stock could not be loaded" error={query.error} onRetry={() => void query.refetch()} /></PageContainer>;
  const stock = query.data.data;
  return <PageContainer><PageHeader title="Brokerage Stock" actions={canWrite ? <Button onClick={()=>setOpen(true)}>+ Add Shrinkage</Button> : undefined} />
    <div className="grid gap-4 sm:grid-cols-2"><StatCard label="Quantity" value={`${stock.quantityKg} kg`} /><StatCard label="Weighted average cost" value={money.format(Number(stock.wac))} /></div>
    <p className="text-sm text-muted-foreground">Wastage Loss valuation will be calculated by the server using the current weighted average cost when the write-off is submitted.</p>
    <StockWriteoffDialog open={open} availableKg={stock.quantityKg} loading={state.isLoading} onClose={()=>setOpen(false)} onSubmit={async (body) => { try { const result=await writeoff(body).unwrap(); toast.success(`Shrinkage recorded: ${money.format(Number(result.data.valuationAmount))}`); setOpen(false); } catch(error){ toast.error(getApiErrorMessage(error)); } }} />
  </PageContainer>;
}
