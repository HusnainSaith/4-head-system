import { useState } from "react";
import { toast } from "sonner";
import { DataTable, type DataTableColumn } from "./DataTable";
import { StockWriteoffDialog, type StockWriteoffInput } from "./StockWriteoffDialog";
import { Button } from "@/components/ui/button";
import { getApiErrorMessage } from "@/lib/api-error";

export interface ShrinkageRecord {
  id: string;
  quantityKg: string;
  ratePerKg: string;
  reason: string;
  note?: string | null;
  writeoffDate: string;
  valuationAmount: string;
  stockType?: "standard" | "live" | "dressed";
}

const money = new Intl.NumberFormat("en-PK", { style: "currency", currency: "PKR" });

export function ShrinkageRecords({ records, loading, error, retry, canWrite, availableKg, stockOptions, onUpdate, onDelete }: {
  records: ShrinkageRecord[];
  loading: boolean;
  error: boolean;
  retry: () => void;
  canWrite: boolean;
  availableKg: string;
  stockOptions?: Array<{ value: "live" | "dressed"; label: string; availableKg: string }>;
  onUpdate: (id: string, body: StockWriteoffInput) => Promise<unknown>;
  onDelete: (id: string) => Promise<unknown>;
}) {
  const [editing, setEditing] = useState<ShrinkageRecord | null>(null);
  const [saving, setSaving] = useState(false);
  const adjustedOptions = stockOptions?.map((option) => ({ ...option, availableKg: (Number(option.availableKg) + (editing?.stockType === option.value ? Number(editing.quantityKg) : 0)).toFixed(3) }));
  const columns: DataTableColumn<ShrinkageRecord>[] = [
    { id: "date", header: "Date", cell: (row) => row.writeoffDate.slice(0, 10) },
    { id: "stockType", header: "Stock", cell: (row) => row.stockType && row.stockType !== "standard" ? row.stockType : "Standard" },
    { id: "quantity", header: "Weight", cell: (row) => `${row.quantityKg} kg`, align: "right" },
    { id: "rate", header: "Sale rate/kg", cell: (row) => money.format(Number(row.ratePerKg)), align: "right" },
    { id: "reason", header: "Reason", cell: (row) => row.reason.replaceAll("_", " ") },
    { id: "value", header: "Value", cell: (row) => money.format(Number(row.valuationAmount)), align: "right" },
    { id: "note", header: "Note", cell: (row) => row.note || "—" },
    { id: "actions", header: "Actions", cell: (row) => canWrite ? <div className="flex gap-2"><Button size="sm" variant="outline" onClick={() => setEditing(row)}>Edit</Button><Button size="sm" variant="destructive" onClick={async () => { if (!window.confirm("Delete this shrinkage record and restore its stock?")) return; try { await onDelete(row.id); toast.success("Shrinkage record deleted"); } catch (e) { toast.error(getApiErrorMessage(e)); } }}>Delete</Button></div> : null },
  ];
  return <section className="space-y-3"><h2 className="text-lg font-semibold">Shrinkage records</h2><DataTable columns={columns} data={records} getRowId={(row) => row.id} isLoading={loading} isError={error} onRetry={retry} /><StockWriteoffDialog open={Boolean(editing)} availableKg={(Number(availableKg) + Number(editing?.quantityKg ?? 0)).toFixed(3)} stockOptions={adjustedOptions} loading={saving} initialValue={editing ? { quantityKg: Number(editing.quantityKg), ratePerKg: Number(editing.ratePerKg), reason: editing.reason as StockWriteoffInput["reason"], note: editing.note ?? undefined, writeoffDate: editing.writeoffDate, stockType: editing.stockType === "live" || editing.stockType === "dressed" ? editing.stockType : undefined } : undefined} onClose={() => setEditing(null)} onSubmit={async (body) => { if (!editing) return; setSaving(true); try { await onUpdate(editing.id, body); toast.success("Shrinkage record updated"); setEditing(null); } catch (e) { toast.error(getApiErrorMessage(e)); } finally { setSaving(false); } }} /></section>;
}
