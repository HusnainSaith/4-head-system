import { useEffect, useState } from "react";
import { toast } from "sonner";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  useDeletePartySettlementMutation,
  useReversePartySettlementMutation,
  useUpdatePartySettlementMutation,
} from "@/features/parties/partiesApi";
import type { PartySettlement } from "@/features/parties/types";
import { Badge } from "@/components/ui/badge";
import { getApiErrorMessage } from "@/lib/api-error";

interface PartySettlementHistoryProps {
  settlements: PartySettlement[];
  isLoading?: boolean;
  canManage?: boolean;
}

export function PartySettlementHistory({
  settlements,
  isLoading,
  canManage = false,
}: PartySettlementHistoryProps) {
  const [reverseId, setReverseId] = useState<string | null>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [editSettlement, setEditSettlement] = useState<PartySettlement | null>(null);
  const [reason, setReason] = useState("");
  const [error, setError] = useState("");
  const [reverseSettlement, reverseState] = useReversePartySettlementMutation();
  const [deleteSettlement, deleteState] = useDeletePartySettlementMutation();

  const confirmReverse = async () => {
    if (!reverseId || !reason.trim()) return;
    try {
      await reverseSettlement({ id: reverseId, reversalReason: reason.trim() }).unwrap();
      toast.success("Settlement reversed");
      closeConfirmation();
    } catch (requestError) {
      const message = getApiErrorMessage(requestError);
      setError(message);
      toast.error(message);
    }
  };

  const confirmDelete = async () => {
    if (!deleteId || !reason.trim()) return;
    try {
      await deleteSettlement({ id: deleteId, reason: reason.trim() }).unwrap();
      toast.success("Settlement deleted and balances reversed");
      closeConfirmation();
    } catch (requestError) {
      const message = getApiErrorMessage(requestError);
      setError(message);
      toast.error(message);
    }
  };

  const closeConfirmation = () => {
    setReverseId(null);
    setDeleteId(null);
    setReason("");
    setError("");
  };

  if (isLoading) return <div className="py-4 text-center">Loading settlements...</div>;
  if (!settlements.length) {
    return <div className="py-4 text-center text-muted-foreground">No settlements found</div>;
  }

  const confirmationOpen = Boolean(reverseId || deleteId);
  const deleting = Boolean(deleteId);

  return (
    <>
      <div className="overflow-hidden rounded-lg border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Date</TableHead>
              <TableHead>Department</TableHead>
              <TableHead>Payable Party</TableHead>
              <TableHead>Receivable Party</TableHead>
              <TableHead className="text-right">Amount</TableHead>
              <TableHead>Reference</TableHead>
              <TableHead>Status</TableHead>
              {canManage ? <TableHead className="text-right">Actions</TableHead> : null}
            </TableRow>
          </TableHeader>
          <TableBody>
            {settlements.map((settlement) => (
              <TableRow key={settlement.id}>
                <TableCell>
                  {new Date(
                    `${settlement.settlementDate.slice(0, 10)}T00:00:00`,
                  ).toLocaleDateString()}
                </TableCell>
                <TableCell>{settlement.department?.name ?? "-"}</TableCell>
                <TableCell>{settlement.payableParty?.name}</TableCell>
                <TableCell>{settlement.receivableParty?.name}</TableCell>
                <TableCell className="text-right">Rs. {Number(settlement.settlementAmount).toFixed(2)}</TableCell>
                <TableCell>{settlement.reference || "-"}</TableCell>
                <TableCell>
                  <Badge variant={settlement.status === "active" ? "default" : "secondary"}>
                    {settlement.status}
                  </Badge>
                </TableCell>
                {canManage ? (
                  <TableCell className="text-right">
                    {settlement.status === "active" ? (
                      <div className="flex justify-end gap-1">
                        <Button variant="ghost" size="sm" onClick={() => setEditSettlement(settlement)}>Edit</Button>
                        <Button variant="ghost" size="sm" onClick={() => (setReverseId(settlement.id), setError(""))}>Reverse</Button>
                        <Button variant="ghost" size="sm" className="text-destructive" onClick={() => (setDeleteId(settlement.id), setError(""))}>Delete</Button>
                      </div>
                    ) : null}
                  </TableCell>
                ) : null}
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      <SettlementEditDialog
        settlement={editSettlement}
        onClose={() => setEditSettlement(null)}
      />

      <AlertDialog open={confirmationOpen} onOpenChange={(open) => !open && closeConfirmation()}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{deleting ? "Delete Settlement" : "Reverse Settlement"}</AlertDialogTitle>
            <AlertDialogDescription>
              {deleting
                ? "This first reverses the ledger entries and restores both party balances, then removes the settlement from this list."
                : "This restores both party balances and keeps the reversed settlement in history."}
            </AlertDialogDescription>
          </AlertDialogHeader>
          {error ? <div className="rounded border border-red-200 bg-red-50 p-3 text-sm text-red-700">{error}</div> : null}
          <div className="space-y-2">
            <Label htmlFor="settlement-action-reason">Reason</Label>
            <Input id="settlement-action-reason" value={reason} onChange={(event) => setReason(event.target.value)} placeholder="Enter an audit reason" />
          </div>
          <div className="flex justify-end gap-2">
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={deleting ? confirmDelete : confirmReverse}
              disabled={!reason.trim() || deleteState.isLoading || reverseState.isLoading}
            >
              {deleteState.isLoading || reverseState.isLoading
                ? "Processing..."
                : deleting
                  ? "Delete and reverse"
                  : "Reverse"}
            </AlertDialogAction>
          </div>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}

function SettlementEditDialog({
  settlement,
  onClose,
}: {
  settlement: PartySettlement | null;
  onClose: () => void;
}) {
  const [amount, setAmount] = useState("");
  const [date, setDate] = useState("");
  const [reference, setReference] = useState("");
  const [notes, setNotes] = useState("");
  const [error, setError] = useState("");
  const [updateSettlement, updateState] = useUpdatePartySettlementMutation();

  useEffect(() => {
    if (!settlement) return;
    setAmount(String(settlement.settlementAmount));
    setDate(settlement.settlementDate.slice(0, 10));
    setReference(settlement.reference ?? "");
    setNotes(settlement.notes ?? "");
    setError("");
  }, [settlement]);

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!settlement) return;
    const numericAmount = Number(amount);
    if (!Number.isFinite(numericAmount) || numericAmount <= 0) {
      setError("Settlement amount must be greater than 0");
      return;
    }
    try {
      await updateSettlement({
        id: settlement.id,
        body: {
          settlementAmount: numericAmount,
          settlementDate: date,
          reference: reference.trim(),
          notes: notes.trim(),
        },
      }).unwrap();
      toast.success("Settlement updated");
      onClose();
    } catch (requestError) {
      const message = getApiErrorMessage(requestError);
      setError(message);
      toast.error(message);
    }
  };

  return (
    <Dialog open={Boolean(settlement)} onOpenChange={(open) => !open && onClose()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Edit Settlement</DialogTitle>
          <DialogDescription>
            Parties and department remain fixed. Changing the amount posts only the audited difference.
          </DialogDescription>
        </DialogHeader>
        <form className="space-y-4" onSubmit={submit}>
          {error ? <div className="rounded border border-red-200 bg-red-50 p-3 text-sm text-red-700">{error}</div> : null}
          <div className="space-y-2">
            <Label>Parties</Label>
            <p className="text-sm text-muted-foreground">{settlement?.payableParty?.name} / {settlement?.receivableParty?.name}</p>
          </div>
          <div className="space-y-2">
            <Label htmlFor="edit-settlement-amount">Amount</Label>
            <Input id="edit-settlement-amount" type="number" min="0.01" step="0.01" value={amount} onChange={(event) => setAmount(event.target.value)} required />
          </div>
          <div className="space-y-2">
            <Label htmlFor="edit-settlement-date">Date</Label>
            <Input id="edit-settlement-date" type="date" value={date} onChange={(event) => setDate(event.target.value)} required />
          </div>
          <div className="space-y-2">
            <Label htmlFor="edit-settlement-reference">Reference</Label>
            <Input id="edit-settlement-reference" value={reference} onChange={(event) => setReference(event.target.value)} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="edit-settlement-notes">Notes</Label>
            <Textarea id="edit-settlement-notes" value={notes} onChange={(event) => setNotes(event.target.value)} />
          </div>
          <div className="flex justify-end gap-2">
            <Button type="button" variant="outline" onClick={onClose}>Cancel</Button>
            <Button type="submit" disabled={updateState.isLoading}>{updateState.isLoading ? "Saving..." : "Save changes"}</Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
