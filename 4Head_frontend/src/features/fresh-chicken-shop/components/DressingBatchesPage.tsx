import { useState } from "react";
import { toast } from "sonner";
import { z } from "zod";
import { DataTable, type DataTableColumn } from "@/components/common/DataTable";
import { EmptyState } from "@/components/common/EmptyState";
import { ErrorState } from "@/components/common/ErrorState";
import { PageHeader } from "@/components/common/PageHeader";
import { PageSkeleton } from "@/components/common/Skeletons";
import { StatCard } from "@/components/common/StatCard";
import { ConfirmDialog } from "@/components/common/ConfirmDialog";
import { PageContainer } from "@/components/layout/PageContainer";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { getApiErrorMessage } from "@/lib/api-error";
import {
  useCreateDressingBatchMutation,
  useDeleteDressingBatchMutation,
  useGetProcessingYieldQuery,
  useGetShopStockQuery,
  useListDressingBatchesQuery,
} from "../shopApi";
import type { DressingBatch } from "../types";

const money = new Intl.NumberFormat("en-PK", {
  style: "currency",
  currency: "PKR",
});
const schema = z
  .object({
    liveWeightKg: z.number().positive(),
    dressedWeightKg: z.number().positive(),
  })
  .refine((value) => value.dressedWeightKg <= value.liveWeightKg, {
    path: ["dressedWeightKg"],
    message: "Dressed weight cannot exceed live weight",
  });

export function DressingBatchesPage() {
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [open, setOpen] = useState(false);
  const [pendingDelete, setPendingDelete] = useState<DressingBatch | null>(
    null,
  );
  const params = { from: from || undefined, to: to || undefined };
  const list = useListDressingBatchesQuery(params);
  const summary = useGetProcessingYieldQuery(params);
  const stock = useGetShopStockQuery();
  const [createBatch, createState] = useCreateDressingBatchMutation();
  const [deleteBatch, deleteState] = useDeleteDressingBatchMutation();
  const columns: DataTableColumn<DressingBatch>[] = [
    {
      id: "date",
      header: "Date",
      cell: (row) => String(row.batchDate).slice(0, 10),
    },
    {
      id: "live",
      header: "Live input",
      cell: (row) => `${row.liveWeightKg} kg`,
      align: "right",
    },
    {
      id: "dressed",
      header: "Dressed output",
      cell: (row) => `${row.dressedWeightKg} kg`,
      align: "right",
    },
    {
      id: "yield",
      header: "Yield",
      cell: (row) =>
        `${((Number(row.dressedWeightKg) / Number(row.liveWeightKg)) * 100).toFixed(2)}%`,
      align: "right",
    },
    {
      id: "loss",
      header: "Processing loss",
      cell: (row) =>
        `${row.shrinkageKg} kg / ${money.format(Number(row.processingLossAmount))}`,
      align: "right",
    },
    {
      id: "actions",
      header: "Actions",
      cell: (row) => (
        <Button variant="ghost" size="sm" onClick={() => setPendingDelete(row)}>
          Delete
        </Button>
      ),
      align: "right",
    },
  ];
  if (list.isLoading || summary.isLoading || stock.isLoading)
    return <PageSkeleton rows={6} />;
  if (list.isError || summary.isError || stock.isError)
    return (
      <PageContainer>
        <ErrorState
          title="Dressing batches could not be loaded"
          error={list.error ?? summary.error ?? stock.error}
          onRetry={() => {
            void list.refetch();
            void summary.refetch();
            void stock.refetch();
          }}
        />
      </PageContainer>
    );
  return (
    <PageContainer>
      <PageHeader
        title="Dressing Batches"
        description="Convert live stock into dressed stock before retail sale."
        actions={
          <Button onClick={() => setOpen(true)}>New Dressing Batch</Button>
        }
      />
      <div className="grid gap-3 sm:grid-cols-3">
        <StatCard
          label="Overall yield"
          value={`${summary.data?.data.yieldPercentage ?? "0.00"}%`}
        />
        <StatCard
          label="Total shrinkage"
          value={`${summary.data?.data.shrinkageKg ?? "0.000"} kg`}
        />
        <StatCard
          label="Processing loss"
          value={money.format(
            Number(summary.data?.data.processingLossAmount ?? 0),
          )}
        />
      </div>
      <div className="grid gap-3 sm:grid-cols-2">
        <div>
          <Label>From</Label>
          <Input
            type="date"
            value={from}
            onChange={(event) => setFrom(event.target.value)}
          />
        </div>
        <div>
          <Label>To</Label>
          <Input
            type="date"
            value={to}
            onChange={(event) => setTo(event.target.value)}
          />
        </div>
      </div>
      <DataTable
        columns={columns}
        data={list.data?.data ?? []}
        getRowId={(row) => row.id}
        emptyContent={<EmptyState title="No dressing batches" />}
      />
      <BatchDialog
        open={open}
        available={stock.data?.data.live.quantityKg ?? "0"}
        loading={createState.isLoading}
        onClose={() => setOpen(false)}
        onSubmit={async (body) => {
          try {
            await createBatch(body).unwrap();
            toast.success("Dressing batch recorded");
            setOpen(false);
          } catch (error) {
            toast.error(getApiErrorMessage(error));
          }
        }}
      />
      <ConfirmDialog
        open={Boolean(pendingDelete)}
        onOpenChange={(next) => !next && setPendingDelete(null)}
        title="Delete this dressing batch?"
        description="This is allowed only while all dressed output remains available. Stock and expense effects are reversed."
        confirmLabel="Delete batch"
        destructive
        loading={deleteState.isLoading}
        onConfirm={() => {
          if (!pendingDelete) return;
          void deleteBatch(pendingDelete.id)
            .unwrap()
            .then(() => {
              toast.success("Dressing batch reversed");
              setPendingDelete(null);
            })
            .catch((error) => toast.error(getApiErrorMessage(error)));
        }}
      />
    </PageContainer>
  );
}

function BatchDialog({
  open,
  available,
  loading,
  onClose,
  onSubmit,
}: {
  open: boolean;
  available: string;
  loading: boolean;
  onClose: () => void;
  onSubmit: (body: {
    liveWeightKg: number;
    dressedWeightKg: number;
    batchDate: string;
    notes?: string;
  }) => Promise<void>;
}) {
  const [live, setLive] = useState("");
  const [dressed, setDressed] = useState("");
  const [date, setDate] = useState(new Date().toISOString().slice(0, 10));
  const [notes, setNotes] = useState("");
  const [error, setError] = useState("");
  return (
    <Dialog open={open} onOpenChange={(next) => !next && onClose()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>New Dressing Batch</DialogTitle>
        </DialogHeader>
        <form
          className="space-y-4"
          onSubmit={(event) => {
            event.preventDefault();
            const parsed = schema.safeParse({
              liveWeightKg: Number(live),
              dressedWeightKg: Number(dressed),
            });
            if (!parsed.success)
              return setError(
                parsed.error.issues[0]?.message ?? "Check weights",
              );
            if (parsed.data.liveWeightKg > Number(available))
              return setError(
                `Insufficient live stock. Available: ${available} kg`,
              );
            setError("");
            void onSubmit({
              ...parsed.data,
              batchDate: date,
              notes: notes || undefined,
            });
          }}
        >
          {error ? <p className="text-sm text-destructive">{error}</p> : null}
          <p className="text-sm text-muted-foreground">
            Available live stock: {available} kg
          </p>
          <div>
            <Label>Live weight (kg)</Label>
            <Input
              type="number"
              min="0.001"
              step="0.001"
              value={live}
              onChange={(event) => setLive(event.target.value)}
            />
          </div>
          <div>
            <Label>Dressed weight (kg)</Label>
            <Input
              type="number"
              min="0.001"
              step="0.001"
              value={dressed}
              onChange={(event) => setDressed(event.target.value)}
            />
          </div>
          <div>
            <Label>Batch date</Label>
            <Input
              type="date"
              value={date}
              onChange={(event) => setDate(event.target.value)}
            />
          </div>
          <div>
            <Label>Notes</Label>
            <Input
              maxLength={255}
              value={notes}
              onChange={(event) => setNotes(event.target.value)}
            />
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={onClose}>
              Cancel
            </Button>
            <Button type="submit" isLoading={loading}>
              Process batch
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
