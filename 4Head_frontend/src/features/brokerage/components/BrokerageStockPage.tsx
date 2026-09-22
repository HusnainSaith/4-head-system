import { useState } from "react";
import { useSelector } from "react-redux";
import { toast } from "sonner";
import { PageContainer } from "@/components/layout/PageContainer";
import { PageHeader } from "@/components/common/PageHeader";
import { PageSkeleton } from "@/components/common/Skeletons";
import { ErrorState } from "@/components/common/ErrorState";
import { StatCard } from "@/components/common/StatCard";
import { StockWriteoffDialog } from "@/components/common/StockWriteoffDialog";
import { ShrinkageRecords } from "@/components/common/ShrinkageRecords";
import { Button } from "@/components/ui/button";
import { selectUserDepartmentCode, selectUserRole } from "@/features/auth/authSlice";
import { getApiErrorMessage } from "@/lib/api-error";
import { DepartmentCode, Role } from "@/types/enums";
import { useCreateBrokerageStockWriteoffMutation, useGetBrokerageStockQuery, useListBrokerageStockWriteoffsQuery, useUpdateBrokerageStockWriteoffMutation, useDeleteBrokerageStockWriteoffMutation } from "../brokerageApi";

const money = new Intl.NumberFormat("en-PK", { style: "currency", currency: "PKR" });
export function BrokerageStockPage() {
  const query = useGetBrokerageStockQuery(); const role = useSelector(selectUserRole);
  const department = useSelector(selectUserDepartmentCode); const [open, setOpen] = useState(false);
  const [writeoff, state] = useCreateBrokerageStockWriteoffMutation();
  const records = useListBrokerageStockWriteoffsQuery(); const [updateWriteoff] = useUpdateBrokerageStockWriteoffMutation(); const [deleteWriteoff] = useDeleteBrokerageStockWriteoffMutation();
  const canWrite = role === Role.OWNER || role === Role.ACCOUNTANT || (role === Role.DEPARTMENT_STAFF && department === DepartmentCode.BROKERAGE);
  if (query.isLoading) return <PageSkeleton rows={3} />;
  if (query.isError || !query.data?.data) return <PageContainer><ErrorState title="Brokerage stock could not be loaded" error={query.error} onRetry={() => void query.refetch()} /></PageContainer>;
  const stock = query.data.data;
  return <PageContainer><PageHeader title="Brokerage Stock" actions={canWrite ? <Button onClick={()=>setOpen(true)}>+ Add Shrinkage</Button> : undefined} />
    <div className="grid gap-4 sm:grid-cols-2"><StatCard label="Weight" value={`${stock.quantityKg} kg`} /><StatCard label="Weighted average cost" value={money.format(Number(stock.wac))} /></div>
    <p className="text-sm text-muted-foreground">Wastage Loss amount is calculated from the entered sale rate per kg.</p>
    <ShrinkageRecords records={records.data?.data ?? []} loading={records.isLoading} error={records.isError} retry={() => void records.refetch()} canWrite={canWrite} availableKg={stock.quantityKg} onUpdate={(id, body) => updateWriteoff({ id, body }).unwrap()} onDelete={(id) => deleteWriteoff(id).unwrap()} />
    <StockWriteoffDialog open={open} availableKg={stock.quantityKg} loading={state.isLoading} onClose={()=>setOpen(false)} onSubmit={async (body) => { try { const result=await writeoff(body).unwrap(); toast.success(`Shrinkage recorded: ${money.format(Number(result.data.valuationAmount))}`); setOpen(false); } catch(error){ toast.error(getApiErrorMessage(error)); } }} />
  </PageContainer>;
}
