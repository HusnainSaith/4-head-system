import { useMemo, useState } from "react";
import { ArrowUpRight, Landmark, Users } from "lucide-react";
import { toast } from "sonner";
import { DataTable, type DataTableColumn } from "@/components/common/DataTable";
import { ErrorState } from "@/components/common/ErrorState";
import { PageHeader } from "@/components/common/PageHeader";
import { PageSkeleton } from "@/components/common/Skeletons";
import { StatCard } from "@/components/common/StatCard";
import { PageContainer } from "@/components/layout/PageContainer";
import { Badge } from "@/components/ui/badge";
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
import { Textarea } from "@/components/ui/textarea";
import { PaymentAccountFields } from "@/features/accounts/components";
import type { PaymentAccountSelection } from "@/features/accounts/types";
import { useListPartiesQuery } from "@/features/parties/partiesApi";
import { PartyType } from "@/features/parties/types";
import { useListDepartmentsQuery } from "@/features/vehicles/vehiclesApi";
import { getApiErrorMessage } from "@/lib/api-error";
import {
  useCreateInvestorMutation,
  useGetInvestorLedgerQuery,
  useListInvestorsQuery,
  useRecordInvestorTransactionMutation,
} from "../investmentsApi";
import type {
  Investor,
  InvestorAccountAction,
  InvestorAccountTransaction,
  InvestorType,
  RecordInvestorTransaction,
} from "../types";

const money = new Intl.NumberFormat("en-PK", {
  style: "currency",
  currency: "PKR",
  maximumFractionDigits: 2,
});
const today = () => new Date().toISOString().slice(0, 10);
const labels: Record<string, string> = {
  investment: "Deposit",
  additional_investment: "Deposit",
  capital_withdrawal: "Withdrawal",
  capital_refund: "Withdrawal",
  manual_profit: "Profit",
  manual_loss: "Loss",
  farm_transfer: "Farm transfer",
};
const increases = (type: string) =>
  [
    "investment",
    "additional_investment",
    "manual_profit",
    "farm_transfer",
  ].includes(type);

export function InvestmentsPage() {
  const investors = useListInvestorsQuery();
  const [selectedId, setSelectedId] = useState("");
  const [createOpen, setCreateOpen] = useState(false);
  const [transactionOpen, setTransactionOpen] = useState(false);
  const [createInvestor, createState] = useCreateInvestorMutation();
  const [record, recordState] = useRecordInvestorTransactionMutation();
  const items = investors.data?.data.items ?? [];
  const selected =
    items.find((item) => item.id === selectedId) ?? items[0] ?? null;
  const ledger = useGetInvestorLedgerQuery(selected?.id ?? "", {
    skip: !selected,
  });
  const balance = items.reduce(
    (sum, item) => sum + Number(item.accountBalance),
    0,
  );
  const brotherBalance = items
    .filter((item) => item.investorType === "brother")
    .reduce((sum, item) => sum + Number(item.accountBalance), 0);
  const transactions = ledger.data?.data.capital ?? [];

  const columns = useMemo<DataTableColumn<InvestorAccountTransaction>[]>(
    () => [
      {
        id: "date",
        header: "Date",
        cell: (row) =>
          new Date(`${row.transactionDate}T00:00:00`).toLocaleDateString(),
      },
      {
        id: "type",
        header: "Type",
        cell: (row) => (
          <Badge variant="outline">{labels[row.transactionType]}</Badge>
        ),
      },
      {
        id: "department",
        header: "Department",
        cell: (row) => row.department?.name ?? "—",
      },
      {
        id: "source",
        header: "Source",
        cell: (row) => row.farmParty?.name ?? row.paymentMethod ?? "Manual",
      },
      {
        id: "amount",
        header: "Amount",
        cell: (row) => (
          <span
            className={
              increases(row.transactionType)
                ? "text-emerald-700"
                : "text-rose-700"
            }
          >
            {increases(row.transactionType) ? "+" : "−"}
            {money.format(Number(row.amount))}
          </span>
        ),
      },
      {
        id: "balance",
        header: "Balance",
        cell: (row) => money.format(Number(row.balanceAfter)),
      },
      {
        id: "reference",
        header: "Reference",
        cell: (row) => row.reference ?? "—",
      },
    ],
    [],
  );

  if (investors.isLoading) return <PageSkeleton rows={6} />;
  if (investors.isError)
    return (
      <PageContainer>
        <ErrorState
          title="Investor accounts could not be loaded"
          error={investors.error}
          onRetry={() => void investors.refetch()}
        />
      </PageContainer>
    );
  return (
    <PageContainer>
      <PageHeader
        title="Investor Accounts"
        description="Manage deposits, withdrawals, manual profit or loss, and Shafique farm transfers in one audited account."
        actions={
          <Button onClick={() => setCreateOpen(true)}>
            Create investor account
          </Button>
        }
      />
      <div className="mb-6 grid gap-4 sm:grid-cols-3">
        <StatCard
          label="Investor accounts"
          value={String(items.length)}
          icon={Users}
        />
        <StatCard
          label="Total account balance"
          value={money.format(balance)}
          icon={Landmark}
        />
        <StatCard
          label="Shafique balance"
          value={money.format(brotherBalance)}
          icon={ArrowUpRight}
        />
      </div>
      <div className="mb-5 grid gap-3 md:grid-cols-[1fr_auto]">
        <Select value={selected?.id ?? ""} onValueChange={setSelectedId}>
          <SelectTrigger>
            <SelectValue placeholder="Select an investor account" />
          </SelectTrigger>
          <SelectContent>
            {items.map((item) => (
              <SelectItem key={item.id} value={item.id}>
                {item.party.name} ·{" "}
                {item.investorType === "brother"
                  ? "Shafique / Brother"
                  : "Investor"}{" "}
                · {money.format(Number(item.accountBalance))}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Button disabled={!selected} onClick={() => setTransactionOpen(true)}>
          Add transaction
        </Button>
      </div>
      <section className="mb-5 space-y-2">
        <h2 className="text-sm font-semibold">Available investor accounts</h2>
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
          {items.map((item) => (
            <button
              key={item.id}
              type="button"
              className={`rounded-xl border bg-card p-4 text-left transition-colors hover:border-primary ${
                selected?.id === item.id
                  ? "border-primary ring-2 ring-primary/20"
                  : ""
              }`}
              onClick={() => setSelectedId(item.id)}
            >
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="font-semibold">{item.party.name}</p>
                  <p className="text-xs text-muted-foreground">
                    {item.investorType === "brother"
                      ? "Shafique / Brother account"
                      : "Investor account"}
                  </p>
                </div>
                <Badge variant="outline">{item.status}</Badge>
              </div>
              <p className="mt-3 text-lg font-bold">
                {money.format(Number(item.accountBalance))}
              </p>
            </button>
          ))}
        </div>
      </section>
      {selected ? (
        <section className="space-y-4">
          <div className="rounded-xl border bg-card p-5">
            <p className="text-sm text-muted-foreground">
              Current balance for {selected.party.name}
            </p>
            <p className="mt-1 text-2xl font-bold">
              {money.format(
                Number(
                  items.find((item) => item.id === selected.id)
                    ?.accountBalance ?? 0,
                ),
              )}
            </p>
            {Number(ledger.data?.data.openingOrExternalBalance ?? 0) !== 0 ? (
              <p className="mt-2 text-xs text-muted-foreground">
                Party opening/external balance:{" "}
                {money.format(
                  Number(ledger.data?.data.openingOrExternalBalance ?? 0),
                )}
                . This amount is included in the synchronized balance.
              </p>
            ) : null}
          </div>
          {ledger.isError ? (
            <ErrorState
              title="Account history could not be loaded"
              error={ledger.error}
              onRetry={() => void ledger.refetch()}
            />
          ) : (
            <DataTable
              columns={columns}
              data={transactions}
              getRowId={(row) => row.id}
            />
          )}
        </section>
      ) : (
        <div className="rounded-xl border border-dashed p-10 text-center text-muted-foreground">
          Select an investor to view and manage the account.
        </div>
      )}
      <CreateInvestorDialog
        open={createOpen}
        existingPartyIds={new Set(items.map((item) => item.partyId))}
        loading={createState.isLoading}
        onClose={() => setCreateOpen(false)}
        onSubmit={async (body) => {
          try {
            const created = await createInvestor(body).unwrap();
            setSelectedId(created.data.id);
            toast.success("Investor account created");
            setCreateOpen(false);
          } catch (error) {
            toast.error(getApiErrorMessage(error));
          }
        }}
      />
      <TransactionDialog
        key={`${selected?.id}-${transactionOpen}`}
        open={transactionOpen}
        investor={selected}
        currentBalance={Number(
          items.find((item) => item.id === selected?.id)?.accountBalance ?? 0,
        )}
        loading={recordState.isLoading}
        onClose={() => setTransactionOpen(false)}
        onSubmit={async (body) => {
          if (!selected) return;
          try {
            await record({
              id: selected.id,
              partyId: selected.partyId,
              body,
            }).unwrap();
            toast.success("Investor transaction recorded");
            setTransactionOpen(false);
          } catch (error) {
            toast.error(getApiErrorMessage(error));
          }
        }}
      />
    </PageContainer>
  );
}

function CreateInvestorDialog({
  open,
  existingPartyIds,
  loading,
  onClose,
  onSubmit,
}: {
  open: boolean;
  existingPartyIds: Set<string>;
  loading: boolean;
  onClose: () => void;
  onSubmit: (body: {
    partyId: string;
    investorType: InvestorType;
    notes?: string;
  }) => Promise<void>;
}) {
  const [partyId, setPartyId] = useState("");
  const [type, setType] = useState<InvestorType>("standard");
  const [notes, setNotes] = useState("");
  const parties = useListPartiesQuery(
    { page: 1, limit: 100, type: PartyType.INVESTOR },
    { skip: !open },
  );
  const available = (parties.data?.data.items ?? []).filter(
    (party) => !existingPartyIds.has(party.id),
  );
  return (
    <Dialog open={open} onOpenChange={(value) => !value && onClose()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Create investor account</DialogTitle>
          <DialogDescription>
            Select a user-linked party whose party type is Investor.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4">
          <div className="space-y-2">
            <Label>Investor party</Label>
            <Select value={partyId} onValueChange={setPartyId}>
              <SelectTrigger>
                <SelectValue placeholder="Search/select investor party" />
              </SelectTrigger>
              <SelectContent>
                {available.map((party) => (
                  <SelectItem key={party.id} value={party.id}>
                    {party.name}
                    {party.phone ? ` · ${party.phone}` : ""}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label>Account type</Label>
            <Select
              value={type}
              onValueChange={(value) => setType(value as InvestorType)}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="standard">Investor</SelectItem>
                <SelectItem value="brother">Shafique / Brother</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label>Notes</Label>
            <Textarea
              value={notes}
              onChange={(event) => setNotes(event.target.value)}
            />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button
            disabled={loading || !partyId}
            onClick={() =>
              void onSubmit({
                partyId,
                investorType: type,
                notes: notes || undefined,
              })
            }
          >
            {loading ? "Creating..." : "Create account"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function TransactionDialog({
  open,
  investor,
  currentBalance,
  loading,
  onClose,
  onSubmit,
}: {
  open: boolean;
  investor: Investor | null;
  currentBalance: number;
  loading: boolean;
  onClose: () => void;
  onSubmit: (body: RecordInvestorTransaction) => Promise<void>;
}) {
  const [action, setAction] = useState<InvestorAccountAction>("deposit");
  const [departmentId, setDepartmentId] = useState("");
  const [farmPartyId, setFarmPartyId] = useState("");
  const [amount, setAmount] = useState("");
  const [date, setDate] = useState(today());
  const [method, setMethod] = useState<"cash" | "bank">("cash");
  const [account, setAccount] = useState<PaymentAccountSelection>({});
  const [reference, setReference] = useState("");
  const [notes, setNotes] = useState("");
  const departments = useListDepartmentsQuery(undefined, { skip: !open });
  const farms = useListPartiesQuery(
    { page: 1, limit: 100, type: PartyType.FARM },
    { skip: !open || action !== "farm_transfer" },
  );
  const movesCash = action === "deposit" || action === "withdrawal";
  const accountValid =
    !movesCash ||
    (method === "cash"
      ? Boolean(account.cashAccountId)
      : Boolean(
          account.bankAccountId &&
          account.bankTransactionMethod &&
          (account.bankTransactionMethod !== "cheque" ||
            account.chequeNumber?.trim()),
        ));
  const decreases = action === "withdrawal" || action === "loss";
  const amountNumber = Number(amount);
  const valid = Boolean(
    departmentId &&
    date &&
    amountNumber > 0 &&
    accountValid &&
    (!decreases || amountNumber <= currentBalance) &&
    (action !== "farm_transfer" || farmPartyId),
  );
  const actions: Array<{ value: InvestorAccountAction; label: string }> = [
    { value: "deposit", label: "Investor adds amount" },
    { value: "withdrawal", label: "Pay / investor receives amount" },
    { value: "profit", label: "Add manual profit" },
    { value: "loss", label: "Add manual loss" },
  ];
  if (investor?.investorType === "brother")
    actions.push({
      value: "farm_transfer",
      label: "Transfer farm payable to Shafique",
    });
  return (
    <Dialog open={open} onOpenChange={(value) => !value && onClose()}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>New account transaction</DialogTitle>
          <DialogDescription>
            Current balance: {money.format(currentBalance)}. Every entry is
            posted to the general ledger and cannot silently overwrite history.
          </DialogDescription>
        </DialogHeader>
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-2">
            <Label>Action</Label>
            <Select
              value={action}
              onValueChange={(value) => {
                setAction(value as InvestorAccountAction);
                setAccount({});
                setFarmPartyId("");
              }}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {actions.map((item) => (
                  <SelectItem key={item.value} value={item.value}>
                    {item.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label>Department</Label>
            <Select value={departmentId} onValueChange={setDepartmentId}>
              <SelectTrigger>
                <SelectValue placeholder="Select department" />
              </SelectTrigger>
              <SelectContent>
                {(departments.data?.data ?? []).map((item) => (
                  <SelectItem key={item.id} value={item.id}>
                    {item.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          {action === "farm_transfer" ? (
            <div className="space-y-2 sm:col-span-2">
              <Label>Farm whose payable will decrease</Label>
              <Select value={farmPartyId} onValueChange={setFarmPartyId}>
                <SelectTrigger>
                  <SelectValue placeholder="Select farm" />
                </SelectTrigger>
                <SelectContent>
                  {(farms.data?.data.items ?? []).map((farm) => (
                    <SelectItem key={farm.id} value={farm.id}>
                      {farm.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          ) : null}
          <div className="space-y-2">
            <Label>Amount</Label>
            <Input
              type="number"
              min="0.01"
              max={decreases ? currentBalance : undefined}
              step="0.01"
              value={amount}
              onChange={(event) => setAmount(event.target.value)}
            />
            {decreases ? (
              <p className="text-xs text-muted-foreground">
                Maximum: {money.format(currentBalance)}
              </p>
            ) : null}
          </div>
          <div className="space-y-2">
            <Label>Date</Label>
            <Input
              type="date"
              value={date}
              onChange={(event) => setDate(event.target.value)}
            />
          </div>
          {movesCash ? (
            <>
              <div className="space-y-2 sm:col-span-2">
                <Label>Payment method</Label>
                <Select
                  value={method}
                  onValueChange={(value) => {
                    setMethod(value as "cash" | "bank");
                    setAccount({});
                  }}
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
              <div className="sm:col-span-2">
                <PaymentAccountFields
                  paymentMethod={method}
                  value={account}
                  onChange={setAccount}
                  departmentId={departmentId || undefined}
                />
              </div>
            </>
          ) : null}
          <div className="space-y-2">
            <Label>Reference</Label>
            <Input
              maxLength={100}
              value={reference}
              onChange={(event) => setReference(event.target.value)}
            />
          </div>
          <div className="space-y-2">
            <Label>Notes</Label>
            <Input
              maxLength={500}
              value={notes}
              onChange={(event) => setNotes(event.target.value)}
            />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button
            disabled={loading || !valid}
            onClick={() =>
              void onSubmit({
                action,
                departmentId,
                amount,
                transactionDate: date,
                paymentMethod: movesCash ? method : undefined,
                farmPartyId:
                  action === "farm_transfer" ? farmPartyId : undefined,
                reference: reference || undefined,
                notes: notes || undefined,
                ...(movesCash ? account : {}),
              })
            }
          >
            {loading ? "Recording..." : "Record transaction"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
