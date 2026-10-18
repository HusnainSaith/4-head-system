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

function formatBalance(balance: number) {
  return `${balance > 0 ? "+" : ""}${balance.toFixed(2)}`;
}

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
    new Date().toISOString().split("T")[0],
  );
  const [reference, setReference] = useState("");
  const [notes, setNotes] = useState("");
  const [error, setError] = useState("");
  const [selectedDepartmentId, setSelectedDepartmentId] = useState("");
  const [searchState, setSearchState] = useState({ scope: "", value: "" });

  const { data: departmentsData } = useListDepartmentsQuery();

  // Find the department ID from the department code
  const resolvedDepartmentId = React.useMemo(() => {
    if (departmentId) return departmentId;
    if (!departmentCode || !departmentsData?.data) return undefined;
    const dept = departmentsData.data.find(
      (d) => d.type === departmentCode.toUpperCase().replace(/-/g, "_"),
    );
    return dept?.id;
  }, [departmentId, departmentCode, departmentsData]);

  const effectiveDepartmentId = resolvedDepartmentId || selectedDepartmentId;

  const partySearch =
    searchState.scope === effectiveDepartmentId ? searchState.value : "";
  const setPartySearch = (value: string) =>
    setSearchState({ scope: effectiveDepartmentId ?? "", value });
  const changeOpen = (value: boolean) => {
    if (!value) setPartySearch("");
    onOpenChange(value);
  };

  const {
    data: partiesData,
    isLoading: isLoadingParties,
    error: partiesError,
  } = useListPartiesQuery(
    effectiveDepartmentId
      ? {
          limit: 100,
          departmentId: effectiveDepartmentId,
        }
      : undefined,
    {
      skip: !effectiveDepartmentId,
    },
  );

  const [createSettlement, { isLoading: isCreating }] =
    useCreatePartySettlementMutation();

  const parties = partiesData?.data?.items || [];
  const payableParties = parties;
  const receivableParties = parties;
  const searchTerm = partySearch.trim().toLowerCase();
  const matchingPayableParties = payableParties.filter((party) =>
    party.name.toLowerCase().includes(searchTerm),
  );
  const matchingReceivableParties = receivableParties.filter((party) =>
    party.name.toLowerCase().includes(searchTerm),
  );

  const payableParty = payableParties.find((p) => p.id === payablePartyId);
  const receivableParty = receivableParties.find(
    (p) => p.id === receivablePartyId,
  );

  const payableBalance = payableParty ? Number(payableParty.currentBalance) : 0;
  const receivableBalance = receivableParty
    ? Number(receivableParty.currentBalance)
    : 0;

  const extraReceivable = Math.max(
    0,
    Number(settlementAmount) - payableBalance,
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
    if (!Number.isFinite(amount) || amount <= 0) {
      setError("Settlement amount must be greater than 0");
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
    setPartySearch("");
    setReceivablePartyId("");
    setSettlementAmount("");
    setSettlementDate(new Date().toISOString().split("T")[0]);
    setReference("");
    setNotes("");
    setError("");
    setSelectedDepartmentId(resolvedDepartmentId ?? "");
  };

  return (
    <Dialog open={open} onOpenChange={changeOpen}>
      <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Party-to-Party Settlement</DialogTitle>
          <DialogDescription>
            Transfer a balance from one party to another without involving cash
            or bank accounts. Positive balances are payable to the party;
            negative balances are receivable from the party.
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
              {typeof partiesError === "object" && partiesError !== null && (
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
            <Label htmlFor="party-search">Search Parties</Label>
            <Input
              id="party-search"
              type="search"
              value={partySearch}
              onChange={(event) => setPartySearch(event.target.value)}
              placeholder="Search parties by name..."
              aria-describedby="party-search-help"
            />
            <p id="party-search-help" className="text-sm text-muted-foreground">
              Filters both party lists.
            </p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="payable-party">Payable Party (we owe them)</Label>
            <Select value={payablePartyId} onValueChange={setPayablePartyId}>
              <SelectTrigger id="payable-party">
                <SelectValue placeholder="Select payable party">
                  {payableParty
                    ? `${payableParty.name} (Balance: ${formatBalance(payableBalance)})`
                    : undefined}
                </SelectValue>
              </SelectTrigger>
              <SelectContent>
                {matchingPayableParties.length > 0 ? (
                  matchingPayableParties.map((party) => (
                    <SelectItem key={party.id} value={party.id}>
                      {party.name} (Balance:{" "}
                      {formatBalance(Number(party.currentBalance))})
                    </SelectItem>
                  ))
                ) : (
                  <div className="p-2 text-sm text-muted-foreground">
                    {searchTerm ? "No matching parties" : "No parties"}
                  </div>
                )}
              </SelectContent>
            </Select>
            {payableParty && (
              <p className="text-sm text-muted-foreground">
                Current balance: Rs. {formatBalance(payableBalance)}
              </p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="receivable-party">Receivable Party</Label>
            <Select
              value={receivablePartyId}
              onValueChange={setReceivablePartyId}
            >
              <SelectTrigger id="receivable-party">
                <SelectValue placeholder="Select receivable party">
                  {receivableParty
                    ? `${receivableParty.name} (Balance: ${formatBalance(receivableBalance)})`
                    : undefined}
                </SelectValue>
              </SelectTrigger>
              <SelectContent>
                {matchingReceivableParties.length > 0 ? (
                  matchingReceivableParties.map((party) => (
                    <SelectItem key={party.id} value={party.id}>
                      {party.name} (Balance:{" "}
                      {formatBalance(Number(party.currentBalance))})
                    </SelectItem>
                  ))
                ) : (
                  <div className="p-2 text-sm text-muted-foreground">
                    {searchTerm ? "No matching parties" : "No parties"}
                  </div>
                )}
              </SelectContent>
            </Select>
            {receivableParty && (
              <p className="text-sm text-muted-foreground">
                Current balance: Rs. {formatBalance(receivableBalance)}
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
              value={settlementAmount}
              onChange={(e) => setSettlementAmount(e.target.value)}
              placeholder="0.00"
            />
            <p className="text-sm text-muted-foreground">
              Subtracts the amount from the payable party and adds it to the
              receivable party. If the second balance is negative, this reduces
              its receivable; if positive, this increases its payable.
            </p>
            {payableParty && extraReceivable > 0 && (
              <p className="text-sm text-muted-foreground" role="status">
                {payableParty.name} will owe us Rs. {extraReceivable.toFixed(2)}{" "}
                after this settlement.
              </p>
            )}
          </div>

          {payableParty && receivableParty && Number(settlementAmount) > 0 && (
            <div
              className="rounded border bg-muted/30 p-3 text-sm"
              aria-label="Projected balances"
            >
              <p>
                {payableParty.name}: subtract Rs.{" "}
                {Number(settlementAmount).toFixed(2)} →{" "}
                {formatBalance(
                  (Math.round(payableBalance * 100) -
                    Math.round(Number(settlementAmount) * 100)) /
                    100,
                )}
              </p>
              <p>
                {receivableParty.name}: add Rs.{" "}
                {Number(settlementAmount).toFixed(2)} →{" "}
                {formatBalance(
                  (Math.round(receivableBalance * 100) +
                    Math.round(Number(settlementAmount) * 100)) /
                    100,
                )}
              </p>
            </div>
          )}

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
              onClick={() => changeOpen(false)}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={
                isCreating || !effectiveDepartmentId || isLoadingParties
              }
            >
              {isCreating ? "Creating..." : "Create Settlement"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
