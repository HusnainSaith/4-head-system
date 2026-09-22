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
import { DataTable, type DataTableColumn } from "@/components/common/DataTable";
import {
  selectUserDepartmentCode,
  selectUserRole,
} from "@/features/auth/authSlice";
import { getApiErrorMessage } from "@/lib/api-error";
import { DepartmentCode, Role } from "@/types/enums";
import {
  useCreateSupplyStockWriteoffMutation,
  useGetSupplyStockQuery,
  useListSupplyStockWriteoffsQuery,
  useUpdateSupplyStockWriteoffMutation,
  useDeleteSupplyStockWriteoffMutation,
} from "../supplyApi";
import type { StockWriteoff } from "../types";

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
  const [editing, setEditing] = useState<StockWriteoff | null>(null);
  const writeoffs = useListSupplyStockWriteoffsQuery();
  const [createWriteoff, writeoffState] =
    useCreateSupplyStockWriteoffMutation();
  const [updateWriteoff, updateState] = useUpdateSupplyStockWriteoffMutation();
  const [deleteWriteoff] = useDeleteSupplyStockWriteoffMutation();

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
        <StatCard label="Weight" value={`${stock.quantityKg} kg`} />
        <StatCard
          label="Weighted average cost"
          value={money.format(Number(stock.wac))}
        />
      </div>
      <p className="text-sm text-muted-foreground">
        This stock reflects purchases, external sales, internal transfers sent
        to the Fresh Chicken Shop, and manual shrinkage.
      </p>
      <section className="space-y-3">
        <h2 className="text-lg font-semibold">Shrinkage records</h2>
        <DataTable
          data={writeoffs.data?.data ?? []}
          getRowId={(row) => row.id}
          isLoading={writeoffs.isLoading}
          isError={writeoffs.isError}
          onRetry={() => void writeoffs.refetch()}
          columns={[
            { id: "date", header: "Date", cell: (row) => row.writeoffDate.slice(0, 10) },
            { id: "quantity", header: "Weight", cell: (row) => `${row.quantityKg} kg`, align: "right" },
            { id: "rate", header: "Sale rate/kg", cell: (row) => money.format(Number(row.ratePerKg)), align: "right" },
            { id: "reason", header: "Reason", cell: (row) => row.reason.replaceAll("_", " ") },
            { id: "value", header: "Value", cell: (row) => money.format(Number(row.valuationAmount)), align: "right" },
            { id: "note", header: "Note", cell: (row) => row.note || "—" },
            { id: "actions", header: "Actions", cell: (row) => canWrite ? <div className="flex gap-2"><Button variant="outline" size="sm" onClick={() => { setEditing(row); setOpen(true); }}>Edit</Button><Button variant="destructive" size="sm" onClick={async () => { if (!window.confirm("Delete this shrinkage record and restore its stock?")) return; try { await deleteWriteoff(row.id).unwrap(); toast.success("Shrinkage record deleted"); } catch (error) { toast.error(getApiErrorMessage(error)); } }}>Delete</Button></div> : null },
          ] satisfies DataTableColumn<StockWriteoff>[]}
        />
      </section>
      <StockWriteoffDialog
        open={open}
        availableKg={(Number(stock.quantityKg) + Number(editing?.quantityKg ?? 0)).toFixed(3)}
        loading={writeoffState.isLoading || updateState.isLoading}
        initialValue={editing ? { quantityKg: Number(editing.quantityKg), ratePerKg: Number(editing.ratePerKg), reason: editing.reason, note: editing.note, writeoffDate: editing.writeoffDate } : undefined}
        onClose={() => { setOpen(false); setEditing(null); }}
        onSubmit={async (body) => {
          try {
            const result = editing
              ? await updateWriteoff({ id: editing.id, body }).unwrap()
              : await createWriteoff(body).unwrap();
            toast.success(
              `Shrinkage ${editing ? "updated" : "recorded"}: ${money.format(Number(result.data.valuationAmount))}`,
            );
            setOpen(false);
            setEditing(null);
          } catch (error) {
            toast.error(getApiErrorMessage(error));
          }
        }}
      />
    </PageContainer>
  );
}
