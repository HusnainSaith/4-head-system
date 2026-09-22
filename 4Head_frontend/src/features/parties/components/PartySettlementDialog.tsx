import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { useCreatePartySettlementMutation } from "@/features/parties/partiesApi";
import { useListPartiesQuery } from "@/features/parties/partiesApi";
import { useListDepartmentsQuery } from "@/features/departments/departmentsApi";
import { getApiErrorMessage } from "@/lib/api-error";
import { toast } from "sonner";

interface PartySettlementDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  departmentId?: string;
  departmentCode?: string;
}

export function PartySettlementDialog({
  open,
  onOpenChange,
  departmentId,
  departmentCode,
}: PartySettlementDialogProps) {
  const [payablePartyId, setPayablePartyId] = useState("");
  const [receivablePartyId, setReceivablePartyId] = useState("");
  const [settlementAmount, setSettlementAmount] = useState("");
  const [settlementDate, setSettlementDate] = useState(
    new Date().toISOString().split("T")[0]
  );
  const [reference, setReference] = useState("");
  const [notes, setNotes] = useState("");
  const [error, setError] = useState("");
  const [selectedDepartmentId, setSelectedDepartmentId] = useState("");

  const { data: departmentsData } = useListDepartmentsQuery();
  
  // Find the department ID from the department code
  const resolvedDepartmentId = React.useMemo(() => {
    if (departmentId) return departmentId;
    if (!departmentCode || !departmentsData?.data) return undefined;
    const dept = departmentsData.data.find(
      (d) => d.type === departmentCode.toUpperCase().replace(/-/g, "_")
    );
    return dept?.id;
  }, [departmentId, departmentCode, departmentsData]);
  
  const effectiveDepartmentId = resolvedDepartmentId || selectedDepartmentId;

  React.useEffect(() => {
    if (resolvedDepartmentId) setSelectedDepartmentId(resolvedDepartmentId);
  }, [resolvedDepartmentId]);
  
  const { data: partiesData, isLoading: isLoadingParties, error: partiesError } = useListPartiesQuery(
    effectiveDepartmentId
      ? {
          limit: 100,
          departmentId: effectiveDepartmentId,
        }
      : undefined,
    {
      skip: !effectiveDepartmentId,
    }
  );

  const [createSettlement, { isLoading: isCreating }] = useCreatePartySettlementMutation();

  const parties = partiesData?.data?.items || [];
  const payableParties = parties.filter((p) => Number(p.currentBalance) > 0);
  const receivableParties = parties.filter((p) => Number(p.currentBalance) < 0);
  
  const payableParty = payableParties.find((p) => p.id === payablePartyId);
  const receivableParty = receivableParties.find((p) => p.id === receivablePartyId);

  const payableBalance = payableParty
    ? Number(payableParty.currentBalance)
    : 0;
  const receivableBalance = receivableParty
    ? Number(receivableParty.currentBalance)
    : 0;

  const maxSettlementAmount = Math.min(
    Math.max(0, payableBalance),
    Math.max(0, Math.abs(receivableBalance))
  );

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    if (!payablePartyId || !receivablePartyId) {
      setError("Please select both payable and receivable parties");
      return;
    }

    if (!effectiveDepartmentId) {
      setError("The settlement department could not be resolved");
      return;
    }

    if (payablePartyId === receivablePartyId) {
      setError("Payable and receivable parties must be different");
      return;
    }

    const amount = Number(settlementAmount);
    if (!amount || amount <= 0) {
      setError("Settlement amount must be greater than 0");
      return;
    }

    if (amount > maxSettlementAmount) {
      setError(`Settlement amount cannot exceed ${maxSettlementAmount.toFixed(2)}`);
      return;
    }

    try {
      await createSettlement({
        payablePartyId,
        receivablePartyId,
        settlementAmount: amount,
        departmentId: effectiveDepartmentId,
        settlementDate,
        reference: reference.trim() || undefined,
        notes: notes.trim() || undefined,
      }).unwrap();

      toast.success("Party settlement created");
      onOpenChange(false);
      resetForm();
    } catch (err: unknown) {
      const message = getApiErrorMessage(err);
      setError(message);
      toast.error(message);
    }
  };

  const resetForm = () => {
    setPayablePartyId("");
    setReceivablePartyId("");
    setSettlementAmount("");
    setSettlementDate(new Date().toISOString().split("T")[0]);
    setReference("");
    setNotes("");
    setError("");
    setSelectedDepartmentId(resolvedDepartmentId ?? "");
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Party-to-Party Settlement</DialogTitle>
          <DialogDescription>
            Settle a payable party and receivable party against each other
            without involving cash or bank accounts.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          {error && (
            <div className="rounded border border-red-200 bg-red-50 p-3 text-sm text-red-700">
              {error}
            </div>
          )}
          {partiesError && (
            <div className="p-3 bg-red-50 border border-red-200 rounded text-red-700 text-sm">
              <div>Failed to load parties</div>
              {typeof partiesError === 'object' && partiesError !== null && (
                <div className="text-xs mt-1">
                  {JSON.stringify(partiesError).substring(0, 100)}
                </div>
              )}
            </div>
          )}
          {isLoadingParties && (
            <div className="p-3 bg-blue-50 border border-blue-200 rounded text-blue-700 text-sm">
              Loading parties...
            </div>
          )}

          {!resolvedDepartmentId ? (
            <div className="space-y-2">
              <Label htmlFor="settlement-department">Department</Label>
              <Select
                value={selectedDepartmentId}
                onValueChange={(value) => {
                  setSelectedDepartmentId(value);
                  setPayablePartyId("");
                  setReceivablePartyId("");
                  setSettlementAmount("");
                  setError("");
                }}
              >
                <SelectTrigger id="settlement-department">
                  <SelectValue placeholder="Select department" />
                </SelectTrigger>
                <SelectContent>
                  {(departmentsData?.data ?? []).map((department) => (
                    <SelectItem key={department.id} value={department.id}>
                      {department.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          ) : null}

          <div className="space-y-2">
            <Label htmlFor="payable-party">Payable Party (we owe them)</Label>
            <Select value={payablePartyId} onValueChange={setPayablePartyId}>
              <SelectTrigger id="payable-party">
                <SelectValue placeholder="Select payable party" />
              </SelectTrigger>
              <SelectContent>
                {payableParties.length > 0 ? (
                  payableParties.map((party) => (
                    <SelectItem key={party.id} value={party.id}>
                      {party.name} (Balance: {Number(party.currentBalance).toFixed(2)})
                    </SelectItem>
                  ))
                ) : (
                  <div className="p-2 text-sm text-muted-foreground">No payable parties</div>
                )}
              </SelectContent>
            </Select>
            {payableParty && (
              <p className="text-sm text-muted-foreground">
                Current balance: Rs. {payableBalance.toFixed(2)}
              </p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="receivable-party">
              Receivable Party (they owe us)
            </Label>
            <Select
              value={receivablePartyId}
              onValueChange={setReceivablePartyId}
            >
              <SelectTrigger id="receivable-party">
                <SelectValue placeholder="Select receivable party" />
              </SelectTrigger>
              <SelectContent>
                {receivableParties.length > 0 ? (
                  receivableParties.map((party) => (
                    <SelectItem key={party.id} value={party.id}>
                      {party.name} (Balance: {Number(party.currentBalance).toFixed(2)})
                    </SelectItem>
                  ))
                ) : (
                  <div className="p-2 text-sm text-muted-foreground">No receivable parties</div>
                )}
              </SelectContent>
            </Select>
            {receivableParty && (
              <p className="text-sm text-muted-foreground">
                Current balance: Rs. {receivableBalance.toFixed(2)}
              </p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="amount">Settlement Amount</Label>
            <Input
              id="amount"
              type="number"
              step="0.01"
              min="0.01"
              max={maxSettlementAmount}
              value={settlementAmount}
              onChange={(e) => setSettlementAmount(e.target.value)}
              placeholder="0.00"
            />
            {maxSettlementAmount > 0 && (
              <p className="text-sm text-muted-foreground">
                Maximum: Rs. {maxSettlementAmount.toFixed(2)}
              </p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="date">Settlement Date</Label>
            <Input
              id="date"
              type="date"
              value={settlementDate}
              onChange={(e) => setSettlementDate(e.target.value)}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="reference">Reference (Optional)</Label>
            <Input
              id="reference"
              value={reference}
              onChange={(e) => setReference(e.target.value)}
              placeholder="Voucher or reference number"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="notes">Notes (Optional)</Label>
            <Textarea
              id="notes"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Additional notes or description"
              rows={3}
            />
          </div>

          <div className="flex gap-2 justify-end pt-4">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={isCreating || !effectiveDepartmentId || isLoadingParties}
            >
              {isCreating ? "Creating..." : "Create Settlement"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
