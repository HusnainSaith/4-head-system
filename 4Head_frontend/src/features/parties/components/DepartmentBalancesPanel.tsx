import { useMemo, useState } from "react";
import { ArrowDownToLine, ArrowUpFromLine } from "lucide-react";
import { toast } from "sonner";
import { StatCard } from "@/components/common/StatCard";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
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
import { getApiErrorMessage } from "@/lib/api-error";
import { DepartmentCode } from "@/types/enums";
import { PaymentAccountFields } from "@/features/accounts/components";
import type { PaymentAccountSelection } from "@/features/accounts/types";
import {
  useGetDepartmentBalancesQuery,
  useRecordPartyPaymentMutation,
} from "../partiesApi";
import type { DepartmentPartyBalance } from "../types";

const money = new Intl.NumberFormat("en-PK", {
  style: "currency",
  currency: "PKR",
  maximumFractionDigits: 2,
});

type Direction = "paid" | "received";

export function DepartmentBalancesPanel({
  departmentCode,
}: {
  departmentCode: DepartmentCode;
}) {
  const query = useGetDepartmentBalancesQuery(departmentCode);
  const [direction, setDirection] = useState<Direction | null>(null);
  const data = query.data?.data;

  return (
    <section className="space-y-3" aria-label="Department party balances">
      <div className="grid gap-4 md:grid-cols-2">
        <StatCard
          label="Total receivable"
          tone="success"
          value={
            query.isLoading
              ? "…"
              : money.format(Number(data?.totalReceivable ?? 0))
          }
          delta="Department receives from parties"
          trend={Number(data?.totalReceivable ?? 0) > 0 ? "up" : "neutral"}
        />
        <StatCard
          label="Total payable"
          tone="danger"
          value={
            query.isLoading
              ? "…"
              : money.format(Number(data?.totalPayable ?? 0))
          }
          delta="Department owes parties"
          trend={Number(data?.totalPayable ?? 0) > 0 ? "down" : "neutral"}
        />
      </div>
      {query.isError ? (
        <Alert variant="destructive">
          <AlertDescription className="flex items-center justify-between gap-3">
            Party balances could not be loaded.
            <Button
              variant="outline"
              size="sm"
              onClick={() => void query.refetch()}
            >
              Retry
            </Button>
          </AlertDescription>
        </Alert>
      ) : null}
      <div className="flex flex-wrap gap-2">
        <Button
          variant="outline"
          onClick={() => setDirection("paid")}
          disabled={!data?.parties.length}
        >
          <ArrowUpFromLine /> Record payment
        </Button>
        <Button
          variant="outline"
          onClick={() => setDirection("received")}
          disabled={!data?.parties.some((p) => Number(p.balance) !== 0)}
        >
          <ArrowDownToLine /> Record receipt
        </Button>
      </div>
      <DepartmentPaymentDialog
        direction={direction}
        departmentId={data?.departmentId}
        parties={data?.parties ?? []}
        onClose={() => setDirection(null)}
      />
    </section>
  );
}

function DepartmentPaymentDialog({
  direction,
  departmentId,
  parties,
  onClose,
}: {
  direction: Direction | null;
  departmentId?: string;
  parties: DepartmentPartyBalance[];
  onClose: () => void;
}) {
  const eligibleParties = useMemo(
    () => parties,
    [parties],
  );
  const [partyId, setPartyId] = useState("");
  const [partySearch, setPartySearch] = useState("");
  const [amount, setAmount] = useState("");
  const [paymentMethod, setPaymentMethod] = useState<"cash" | "bank">("cash");
  const [accountSelection, setAccountSelection] = useState<PaymentAccountSelection>({});
  const [paymentDate, setPaymentDate] = useState(
    new Date().toISOString().slice(0, 10),
  );
  const [notes, setNotes] = useState("");
  const [error, setError] = useState("");
  const [recordPayment, paymentState] = useRecordPartyPaymentMutation();
  const visibleParties = useMemo(() => {
    const normalizedSearch = partySearch.trim().toLowerCase();
    if (!normalizedSearch) return eligibleParties;
    return eligibleParties.filter((party) =>
      party.partyName.toLowerCase().includes(normalizedSearch),
    );
  }, [eligibleParties, partySearch]);
  const selected = eligibleParties.find((party) => party.partyId === partyId);
  const available = Math.abs(Number(selected?.balance ?? 0));
  const isAdvancePayment =
    direction === "paid" && Number(selected?.balance ?? 0) <= 0;
  const isReceiptBalanceHint =
    direction === "received" && Number(amount) > 0 &&
    (Number(selected?.balance ?? 0) > 0 || Number(amount) > available);

  const resetAndClose = () => {
    setPartyId("");
    setPartySearch("");
    setAmount("");
    setError("");
    setPaymentMethod("cash");
    setAccountSelection({});
    onClose();
  };

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    const value = Number(amount);
    if (!partyId || !departmentId) {
      setError("Select a party.");
      return;
    }
    if (!Number.isFinite(value) || value <= 0) {
      setError("Enter a positive amount.");
      return;
    }
    if (direction === "paid" && !isAdvancePayment && value > available) {
      setError("Amount cannot exceed the outstanding party balance.");
      return;
    }
    try {
      await recordPayment({
        id: partyId,
        body: {
          departmentId,
          amount: value,
          direction: direction!,
          paymentDate,
          paymentMethod,
          ...accountSelection,
          notes: notes || undefined,
        },
      }).unwrap();
      toast.success(
        direction === "paid" ? "Payment recorded" : "Receipt recorded",
      );
      resetAndClose();
    } catch (requestError) {
      const message = getApiErrorMessage(requestError);
      setError(message);
      toast.error(message);
    }
  };

  return (
    <Dialog
      open={direction !== null}
      onOpenChange={(open) => !open && resetAndClose()}
    >
      <DialogContent>
        <DialogHeader>
          <DialogTitle>
            {direction === "paid" ? "Record payment" : "Record receipt"}
          </DialogTitle>
          <DialogDescription>
            {direction === "paid"
              ? "Record money paid by the business to a party."
              : "Record money received by the business from a party."}
          </DialogDescription>
        </DialogHeader>
        <form className="space-y-4" onSubmit={submit}>
          {error ? (
            <Alert variant="destructive">
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          ) : null}
          <div className="space-y-1.5">
            <Label htmlFor="department-party-search">Search party</Label>
            <Input
              id="department-party-search"
              value={partySearch}
              onChange={(event) => setPartySearch(event.target.value)}
              placeholder="Search by party name"
            />
          </div>
          <div className="space-y-1.5">
            <Label>Party</Label>
            <Select value={partyId} onValueChange={setPartyId}>
              <SelectTrigger>
                <SelectValue placeholder="Select party" />
              </SelectTrigger>
              <SelectContent>
                {visibleParties.length ? (
                  visibleParties.map((party) => (
                    <SelectItem key={party.partyId} value={party.partyId}>
                      {party.partyName} — {Number(party.balance) >= 0 ? "+" : "-"}
                      {money.format(Math.abs(Number(party.balance)))}
                    </SelectItem>
                  ))
                ) : (
                  <div className="px-2 py-1.5 text-sm text-muted-foreground">
                    No matching parties
                  </div>
                )}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="department-payment-amount">Amount</Label>
            <Input
              id="department-payment-amount"
              type="number"
              min="0.01"
              max={direction === "paid" && !isAdvancePayment && available ? available : undefined}
              step="0.01"
              value={amount}
              onChange={(event) => setAmount(event.target.value)}
            />
            {selected ? (
              <p className="text-xs text-muted-foreground">
                Current balance: {Number(selected.balance) >= 0 ? "+" : "-"}
                {money.format(available)}
              </p>
            ) : null}
            {isAdvancePayment ? (
              <p className="text-xs text-amber-700">
                This is an additional payment/advance. Cash or bank decreases and
                the party's receivable balance increases.
              </p>
            ) : null}
            {isReceiptBalanceHint ? (
              <p className="text-xs text-amber-700">
                {Number(selected?.balance ?? 0) > 0
                  ? `The payable balance will increase from ${money.format(available)} to ${money.format(available + Number(amount))} after this receipt.`
                  : `The full ${money.format(Number(amount))} will be added as advance credit to the party's account.`}
              </p>
            ) : null}
          </div>
          <div className="space-y-1.5">
            <Label>Payment method</Label>
            <Select
              value={paymentMethod}
              onValueChange={(value) =>
                (setPaymentMethod(value as "cash" | "bank"), setAccountSelection({}))
              }
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="cash">Cash</SelectItem>
                <SelectItem value="bank">Bank</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <PaymentAccountFields paymentMethod={paymentMethod} value={accountSelection} onChange={setAccountSelection} departmentId={departmentId} adminOnly />
          <div className="space-y-1.5">
            <Label htmlFor="department-payment-date">Date</Label>
            <Input
              id="department-payment-date"
              type="date"
              value={paymentDate}
              onChange={(event) => setPaymentDate(event.target.value)}
              required
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="department-payment-notes">Notes</Label>
            <Input
              id="department-payment-notes"
              value={notes}
              onChange={(event) => setNotes(event.target.value)}
              placeholder="Optional note"
            />
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={resetAndClose}>
              Cancel
            </Button>
            <Button type="submit" isLoading={paymentState.isLoading}>
              Save
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
