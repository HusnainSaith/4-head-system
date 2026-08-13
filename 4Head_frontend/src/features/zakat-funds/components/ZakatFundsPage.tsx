import { useMemo, useState, type FormEvent, type ReactNode } from "react";
import { toast } from "sonner";
import { PageHeader } from "@/components/common/PageHeader";
import { PageContainer } from "@/components/layout/PageContainer";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
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
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Textarea } from "@/components/ui/textarea";
import {
  useGetBankAccountsQuery,
  useGetCashAccountsQuery,
} from "@/features/accounts/accountsApi";
import { useListPartiesQuery } from "@/features/parties/partiesApi";
import { useListDepartmentsQuery } from "@/features/vehicles/vehiclesApi";
import { getApiErrorMessage } from "@/lib/api-error";
import type { Party } from "@/features/parties/types";
import type {
  AllocationMethod,
  RecordZakatFundPayment,
  SettleZakatFund,
  ZakatFundType,
} from "../types";
import {
  useGetZakatFundDashboardQuery,
  useListZakatFundPaymentsQuery,
  useListZakatFundSettlementsQuery,
  useRecordZakatFundPaymentMutation,
  useReverseZakatFundPaymentMutation,
  useReverseZakatFundSettlementMutation,
  useSettleZakatFundMutation,
} from "../zakatFundsApi";

const money = new Intl.NumberFormat("en-PK", {
  style: "currency",
  currency: "PKR",
  maximumFractionDigits: 2,
});
const today = new Date().toISOString().slice(0, 10);

export function ZakatFundsPage() {
  const [year, setYear] = useState(new Date().getFullYear());
  const [type, setType] = useState<ZakatFundType | "all">("all");
  const [departmentId, setDepartmentId] = useState("");
  const [paymentOpen, setPaymentOpen] = useState(false);
  const [settlementOpen, setSettlementOpen] = useState(false);
  const [reverseTarget, setReverseTarget] = useState<{
    kind: "payment" | "settlement";
    id: string;
    partyIds: string[];
  } | null>(null);

  const filters = useMemo(
    () => ({
      calendarYear: year,
      departmentId: departmentId || undefined,
      accountType: type === "all" ? undefined : type,
    }),
    [departmentId, type, year],
  );
  const dashboard = useGetZakatFundDashboardQuery(filters);
  const payments = useListZakatFundPaymentsQuery(filters);
  const settlements = useListZakatFundSettlementsQuery(filters);
  const departments = useListDepartmentsQuery();
  const parties = useListPartiesQuery({ limit: 100 });
  const [recordPayment, paymentState] = useRecordZakatFundPaymentMutation();
  const [settle, settlementState] = useSettleZakatFundMutation();
  const [reversePayment, reversePaymentState] =
    useReverseZakatFundPaymentMutation();
  const [reverseSettlement, reverseSettlementState] =
    useReverseZakatFundSettlementMutation();
  const summary = dashboard.data?.data;

  return (
    <PageContainer>
      <PageHeader
        title="Zakat & Funds"
        description="Pay from a department during the year, then allocate the exact outstanding balance to selected party accounts at year end."
        actions={
          <div className="flex gap-2">
            <Button
              variant="outline"
              onClick={() => setSettlementOpen(true)}
              disabled={
                !departmentId ||
                type === "all" ||
                Number(summary?.outstanding ?? 0) <= 0
              }
            >
              Year-end allocation
            </Button>
            <Button onClick={() => setPaymentOpen(true)}>Record payment</Button>
          </div>
        }
      />

      <div className="mb-5 grid gap-3 md:grid-cols-3">
        <Filter label="Year">
          <Input
            type="number"
            min={2000}
            max={2100}
            value={year}
            onChange={(event) => setYear(Number(event.target.value))}
          />
        </Filter>
        <Filter label="Account">
          <Select
            value={type}
            onValueChange={(value) => setType(value as ZakatFundType | "all")}
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Zakat and funds</SelectItem>
              <SelectItem value="zakat">Zakat</SelectItem>
              <SelectItem value="fund">Funds</SelectItem>
            </SelectContent>
          </Select>
        </Filter>
        <Filter label="Department">
          <Select
            value={departmentId || "all"}
            onValueChange={(value) =>
              setDepartmentId(value === "all" ? "" : value)
            }
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All departments</SelectItem>
              {(departments.data?.data ?? []).map((department) => (
                <SelectItem key={department.id} value={department.id}>
                  {department.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </Filter>
      </div>

      <div className="mb-6 grid gap-4 md:grid-cols-3">
        <Summary title="Paid during year" value={summary?.paid} />
        <Summary title="Allocated to parties" value={summary?.settled} />
        <Summary
          title="Still to allocate"
          value={summary?.outstanding}
          emphasized
        />
      </div>

      <Card className="mb-6">
        <CardHeader>
          <CardTitle>Payments</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Date</TableHead>
                <TableHead>Type</TableHead>
                <TableHead>Department</TableHead>
                <TableHead>Recipient</TableHead>
                <TableHead>Method</TableHead>
                <TableHead>Amount</TableHead>
                <TableHead>Reference</TableHead>
                <TableHead />
              </TableRow>
            </TableHeader>
            <TableBody>
              {(payments.data?.data ?? []).map((payment) => (
                <TableRow key={payment.id}>
                  <TableCell>{payment.paymentDate}</TableCell>
                  <TableCell className="capitalize">
                    {payment.accountType}
                  </TableCell>
                  <TableCell>{payment.department?.name}</TableCell>
                  <TableCell>{payment.recipientName}</TableCell>
                  <TableCell className="capitalize">
                    {payment.paymentMethod}
                  </TableCell>
                  <TableCell>{money.format(Number(payment.amount))}</TableCell>
                  <TableCell>{payment.reference || "—"}</TableCell>
                  <TableCell>
                    {payment.status === "active" ? (
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() =>
                          setReverseTarget({
                            kind: "payment",
                            id: payment.id,
                            partyIds: [],
                          })
                        }
                      >
                        Reverse
                      </Button>
                    ) : (
                      <Badge variant="secondary">Reversed</Badge>
                    )}
                  </TableCell>
                </TableRow>
              ))}
              {!payments.isLoading && !payments.data?.data.length ? (
                <TableRow>
                  <TableCell
                    colSpan={8}
                    className="py-8 text-center text-muted-foreground"
                  >
                    No payments match these filters.
                  </TableCell>
                </TableRow>
              ) : null}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Year-end party allocations</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Date</TableHead>
                <TableHead>Year / type</TableHead>
                <TableHead>Department</TableHead>
                <TableHead>Parties</TableHead>
                <TableHead>Method</TableHead>
                <TableHead>Total</TableHead>
                <TableHead />
              </TableRow>
            </TableHeader>
            <TableBody>
              {(settlements.data?.data ?? []).map((settlement) => (
                <TableRow key={settlement.id}>
                  <TableCell>{settlement.settlementDate}</TableCell>
                  <TableCell className="capitalize">
                    {settlement.calendarYear} {settlement.accountType}
                  </TableCell>
                  <TableCell>{settlement.department?.name}</TableCell>
                  <TableCell>
                    {settlement.splits
                      .map(
                        (split) =>
                          `${split.party?.name ?? "Party"} (${money.format(Number(split.amount))})`,
                      )
                      .join(", ")}
                  </TableCell>
                  <TableCell className="capitalize">
                    {settlement.allocationMethod}
                  </TableCell>
                  <TableCell>
                    {money.format(Number(settlement.totalAmount))}
                  </TableCell>
                  <TableCell>
                    {settlement.status === "active" ? (
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() =>
                          setReverseTarget({
                            kind: "settlement",
                            id: settlement.id,
                            partyIds: settlement.splits.map(
                              (split) => split.partyId,
                            ),
                          })
                        }
                      >
                        Reverse
                      </Button>
                    ) : (
                      <Badge variant="secondary">Reversed</Badge>
                    )}
                  </TableCell>
                </TableRow>
              ))}
              {!settlements.isLoading && !settlements.data?.data.length ? (
                <TableRow>
                  <TableCell
                    colSpan={7}
                    className="py-8 text-center text-muted-foreground"
                  >
                    No allocations match these filters.
                  </TableCell>
                </TableRow>
              ) : null}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <PaymentDialog
        open={paymentOpen}
        departments={departments.data?.data ?? []}
        loading={paymentState.isLoading}
        onClose={() => setPaymentOpen(false)}
        onSubmit={async (body) => {
          try {
            await recordPayment(body).unwrap();
            toast.success("Zakat/fund payment recorded");
            setPaymentOpen(false);
          } catch (error) {
            toast.error(getApiErrorMessage(error));
          }
        }}
      />
      <SettlementDialog
        open={settlementOpen}
        departmentId={departmentId}
        type={type === "all" ? "zakat" : type}
        year={year}
        outstanding={summary?.outstanding ?? "0"}
        parties={parties.data?.data.items ?? []}
        loading={settlementState.isLoading}
        onClose={() => setSettlementOpen(false)}
        onSubmit={async (body) => {
          try {
            await settle(body).unwrap();
            toast.success("Year-end allocation posted to party accounts");
            setSettlementOpen(false);
          } catch (error) {
            toast.error(getApiErrorMessage(error));
          }
        }}
      />
      <ReverseDialog
        open={!!reverseTarget}
        loading={
          reversePaymentState.isLoading || reverseSettlementState.isLoading
        }
        onClose={() => setReverseTarget(null)}
        onSubmit={async (reason) => {
          if (!reverseTarget) return;
          try {
            if (reverseTarget.kind === "payment")
              await reversePayment({ id: reverseTarget.id, reason }).unwrap();
            else
              await reverseSettlement({
                id: reverseTarget.id,
                reason,
                partyIds: reverseTarget.partyIds,
              }).unwrap();
            toast.success("Record reversed");
            setReverseTarget(null);
          } catch (error) {
            toast.error(getApiErrorMessage(error));
          }
        }}
      />
    </PageContainer>
  );
}

function Filter({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div>
      <Label className="mb-1.5 block">{label}</Label>
      {children}
    </div>
  );
}
function Summary({
  title,
  value = "0",
  emphasized = false,
}: {
  title: string;
  value?: string;
  emphasized?: boolean;
}) {
  return (
    <Card className={emphasized ? "border-amber-300" : ""}>
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-medium text-muted-foreground">
          {title}
        </CardTitle>
      </CardHeader>
      <CardContent className="text-2xl font-semibold">
        {money.format(Number(value))}
      </CardContent>
    </Card>
  );
}

type Department = { id: string; name: string };
function PaymentDialog({
  open,
  departments,
  loading,
  onClose,
  onSubmit,
}: {
  open: boolean;
  departments: Department[];
  loading: boolean;
  onClose: () => void;
  onSubmit: (body: RecordZakatFundPayment) => Promise<void>;
}) {
  const cash = useGetCashAccountsQuery();
  const banks = useGetBankAccountsQuery();
  const [form, setForm] = useState<RecordZakatFundPayment>({
    departmentId: "",
    accountType: "zakat",
    amount: "",
    paymentDate: today,
    paymentMethod: "cash",
    recipientName: "",
  });
  const update = <K extends keyof RecordZakatFundPayment>(
    key: K,
    value: RecordZakatFundPayment[K],
  ) => setForm((current) => ({ ...current, [key]: value }));
  const submit = (event: FormEvent) => {
    event.preventDefault();
    void onSubmit({
      ...form,
      reference: form.reference?.trim() || undefined,
      notes: form.notes?.trim() || undefined,
      appReference: form.appReference?.trim() || undefined,
      chequeNumber: form.chequeNumber?.trim() || undefined,
    });
  };
  return (
    <Dialog open={open} onOpenChange={(value) => !value && onClose()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Record Zakat / Fund payment</DialogTitle>
          <DialogDescription>
            This immediately reduces the selected department cash or bank
            balance.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={submit} className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <Filter label="Account type">
              <Select
                value={form.accountType}
                onValueChange={(value) =>
                  update("accountType", value as ZakatFundType)
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="zakat">Zakat</SelectItem>
                  <SelectItem value="fund">Fund</SelectItem>
                </SelectContent>
              </Select>
            </Filter>
            <Filter label="Department">
              <Select
                value={form.departmentId}
                onValueChange={(value) => update("departmentId", value)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select department" />
                </SelectTrigger>
                <SelectContent>
                  {departments.map((department) => (
                    <SelectItem key={department.id} value={department.id}>
                      {department.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </Filter>
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <Filter label="Amount">
              <Input
                required
                inputMode="decimal"
                value={form.amount}
                onChange={(e) => update("amount", e.target.value)}
              />
            </Filter>
            <Filter label="Payment date">
              <Input
                required
                type="date"
                value={form.paymentDate}
                onChange={(e) => update("paymentDate", e.target.value)}
              />
            </Filter>
          </div>
          <Filter label="Recipient / purpose">
            <Input
              required
              maxLength={150}
              value={form.recipientName}
              onChange={(e) => update("recipientName", e.target.value)}
            />
          </Filter>
          <div className="grid gap-4 sm:grid-cols-2">
            <Filter label="Payment method">
              <Select
                value={form.paymentMethod}
                onValueChange={(value) =>
                  setForm((current) => ({
                    ...current,
                    paymentMethod: value as "cash" | "bank",
                    cashAccountId: undefined,
                    bankAccountId: undefined,
                    bankTransactionMethod: undefined,
                    chequeNumber: undefined,
                  }))
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
            </Filter>
            {form.paymentMethod === "cash" ? (
              <Filter label="Cash account">
                <Select
                  value={form.cashAccountId ?? ""}
                  onValueChange={(value) => update("cashAccountId", value)}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select cash account" />
                  </SelectTrigger>
                  <SelectContent>
                    {(cash.data?.data ?? [])
                      .filter(
                        (item) =>
                          item.account.departmentId === form.departmentId,
                      )
                      .map((item) => (
                        <SelectItem
                          key={item.account.id}
                          value={item.account.id}
                        >
                          {item.account.accountName} ·{" "}
                          {money.format(Number(item.currentBalance))}
                        </SelectItem>
                      ))}
                  </SelectContent>
                </Select>
              </Filter>
            ) : (
              <Filter label="Bank account">
                <Select
                  value={form.bankAccountId ?? ""}
                  onValueChange={(value) => update("bankAccountId", value)}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select bank" />
                  </SelectTrigger>
                  <SelectContent>
                    {(banks.data?.data ?? []).map((item) => (
                      <SelectItem key={item.account.id} value={item.account.id}>
                        {item.account.bankName} ·{" "}
                        {money.format(Number(item.currentBalance))}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </Filter>
            )}
          </div>
          {form.paymentMethod === "bank" ? (
            <div className="grid gap-4 sm:grid-cols-2">
              <Filter label="Bank method">
                <Select
                  value={form.bankTransactionMethod ?? ""}
                  onValueChange={(value) =>
                    update("bankTransactionMethod", value as "cheque" | "app")
                  }
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select method" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="cheque">Cheque</SelectItem>
                    <SelectItem value="app">App / transfer</SelectItem>
                  </SelectContent>
                </Select>
              </Filter>
              <Filter
                label={
                  form.bankTransactionMethod === "cheque"
                    ? "Cheque number"
                    : "App reference"
                }
              >
                <Input
                  value={
                    form.bankTransactionMethod === "cheque"
                      ? (form.chequeNumber ?? "")
                      : (form.appReference ?? "")
                  }
                  onChange={(e) =>
                    update(
                      form.bankTransactionMethod === "cheque"
                        ? "chequeNumber"
                        : "appReference",
                      e.target.value,
                    )
                  }
                />
              </Filter>
            </div>
          ) : null}
          <div className="grid gap-4 sm:grid-cols-2">
            <Filter label="Reference">
              <Input
                maxLength={100}
                value={form.reference ?? ""}
                onChange={(e) => update("reference", e.target.value)}
              />
            </Filter>
            <Filter label="Notes">
              <Textarea
                maxLength={500}
                value={form.notes ?? ""}
                onChange={(e) => update("notes", e.target.value)}
              />
            </Filter>
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={onClose}>
              Cancel
            </Button>
            <Button
              disabled={
                loading ||
                !form.departmentId ||
                !form.amount ||
                !form.recipientName ||
                (form.paymentMethod === "cash"
                  ? !form.cashAccountId
                  : !form.bankAccountId || !form.bankTransactionMethod)
              }
            >
              {loading ? "Saving…" : "Record payment"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function SettlementDialog({
  open,
  departmentId,
  type,
  year,
  outstanding,
  parties,
  loading,
  onClose,
  onSubmit,
}: {
  open: boolean;
  departmentId: string;
  type: ZakatFundType;
  year: number;
  outstanding: string;
  parties: Party[];
  loading: boolean;
  onClose: () => void;
  onSubmit: (body: SettleZakatFund) => Promise<void>;
}) {
  const [method, setMethod] = useState<AllocationMethod>("equal");
  const [selected, setSelected] = useState<
    Record<string, { percentage: string; amount: string }>
  >({});
  const [date, setDate] = useState(today);
  const [reference, setReference] = useState("");
  const ids = Object.keys(selected);
  const submit = (event: FormEvent) => {
    event.preventDefault();
    void onSubmit({
      departmentId,
      accountType: type,
      calendarYear: year,
      settlementDate: date,
      allocationMethod: method,
      reference: reference || undefined,
      splits: ids.map((partyId) => ({
        partyId,
        ...(method === "percentage"
          ? { percentage: selected[partyId].percentage }
          : {}),
        ...(method === "manual" ? { amount: selected[partyId].amount } : {}),
      })),
    });
  };
  return (
    <Dialog open={open} onOpenChange={(value) => !value && onClose()}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Allocate year-end balance to parties</DialogTitle>
          <DialogDescription>
            The full outstanding {type} balance of{" "}
            {money.format(Number(outstanding))} will be charged to the selected
            party accounts.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={submit} className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-3">
            <Filter label="Year">
              <Input value={year} disabled />
            </Filter>
            <Filter label="Settlement date">
              <Input
                type="date"
                required
                value={date}
                onChange={(e) => setDate(e.target.value)}
              />
            </Filter>
            <Filter label="Allocation method">
              <Select
                value={method}
                onValueChange={(value) => setMethod(value as AllocationMethod)}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="equal">Equal</SelectItem>
                  <SelectItem value="percentage">Percentage</SelectItem>
                  <SelectItem value="manual">Manual amounts</SelectItem>
                </SelectContent>
              </Select>
            </Filter>
          </div>
          <div className="max-h-72 space-y-2 overflow-y-auto rounded-lg border p-3">
            {parties.map((party) => {
              const checked = !!selected[party.id];
              return (
                <div
                  key={party.id}
                  className="flex items-center gap-3 rounded-md p-2 hover:bg-muted"
                >
                  <Checkbox
                    checked={checked}
                    onCheckedChange={(value) =>
                      setSelected((current) => {
                        const next = { ...current };
                        if (value)
                          next[party.id] = { percentage: "", amount: "" };
                        else delete next[party.id];
                        return next;
                      })
                    }
                  />
                  <span className="min-w-0 flex-1 truncate">
                    {party.name}{" "}
                    <span className="text-xs text-muted-foreground">
                      ({party.partyType})
                    </span>
                  </span>
                  {checked && method === "percentage" ? (
                    <Input
                      className="w-28"
                      placeholder="%"
                      value={selected[party.id].percentage}
                      onChange={(e) =>
                        setSelected((current) => ({
                          ...current,
                          [party.id]: {
                            ...current[party.id],
                            percentage: e.target.value,
                          },
                        }))
                      }
                    />
                  ) : null}
                  {checked && method === "manual" ? (
                    <Input
                      className="w-36"
                      placeholder="Amount"
                      value={selected[party.id].amount}
                      onChange={(e) =>
                        setSelected((current) => ({
                          ...current,
                          [party.id]: {
                            ...current[party.id],
                            amount: e.target.value,
                          },
                        }))
                      }
                    />
                  ) : null}
                </div>
              );
            })}
            {!parties.length ? (
              <p className="py-4 text-center text-sm text-muted-foreground">
                No parties are available.
              </p>
            ) : null}
          </div>
          <Filter label="Reference">
            <Input
              maxLength={100}
              value={reference}
              onChange={(e) => setReference(e.target.value)}
            />
          </Filter>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={onClose}>
              Cancel
            </Button>
            <Button disabled={loading || !departmentId || !ids.length}>
              {loading
                ? "Allocating…"
                : `Allocate ${money.format(Number(outstanding))}`}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function ReverseDialog({
  open,
  loading,
  onClose,
  onSubmit,
}: {
  open: boolean;
  loading: boolean;
  onClose: () => void;
  onSubmit: (reason: string) => Promise<void>;
}) {
  const [reason, setReason] = useState("");
  return (
    <Dialog open={open} onOpenChange={(value) => !value && onClose()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Reverse record</DialogTitle>
          <DialogDescription>
            A balanced reversal will be added; the original audit record remains
            unchanged.
          </DialogDescription>
        </DialogHeader>
        <Filter label="Reason">
          <Textarea
            minLength={3}
            maxLength={500}
            value={reason}
            onChange={(e) => setReason(e.target.value)}
          />
        </Filter>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button
            variant="destructive"
            disabled={loading || reason.trim().length < 3}
            onClick={() => void onSubmit(reason)}
          >
            {loading ? "Reversing…" : "Reverse"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
