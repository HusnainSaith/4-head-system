import { useEffect, useMemo, useState } from "react";
import { zodResolver } from "@hookform/resolvers/zod";
import {
  ArrowLeft,
  Pencil,
  Printer,
  ReceiptText,
  Trash2,
  TrendingDown,
  TrendingUp,
} from "lucide-react";
import { useForm, useWatch } from "react-hook-form";
import { Link, useNavigate, useParams } from "react-router-dom";
import { toast } from "sonner";
import { z } from "zod";
import { FormField } from "@/components/common/FormField";
import { DataTable, type DataTableColumn } from "@/components/common/DataTable";
import { EmptyState } from "@/components/common/EmptyState";
import { ErrorState } from "@/components/common/ErrorState";
import { PageHeader } from "@/components/common/PageHeader";
import { PageSkeleton } from "@/components/common/Skeletons";
import { PageContainer } from "@/components/layout/PageContainer";
import { PaymentAccountFields } from "@/features/accounts/components";
import type { PaymentAccountSelection } from "@/features/accounts/types";
import { StatCard } from "@/components/common/StatCard";
import { StatCardGrid } from "@/components/common/DashboardBlocks";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Form } from "@/components/ui/form";
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
  useGetPartyQuery,
  useGetPartyStatementQuery,
  useDeletePartyMutation,
  useRecordPartyPaymentMutation,
  useUpdatePartyPaymentMutation,
} from "@/features/parties/partiesApi";
import {
  useUpdateSupplyPurchaseMutation,
  useUpdateSupplySaleMutation,
} from "@/features/supply/supplyApi";
import { PartyFormDialog } from "@/features/parties/components/PartyFormDialog";
import { PartyType, type PartyStatementEntry } from "@/features/parties/types";
import { getApiErrorMessage } from "@/lib/api-error";

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const partyTypeLabels: Record<PartyType, string> = {
  [PartyType.FARM]: "Farm",
  [PartyType.BROKER]: "Broker",
  [PartyType.SHOP_OWNER]: "Shop owner",
  [PartyType.CUSTOMER]: "Customer",
  [PartyType.FACTORY]: "Factory",
  [PartyType.INTERNAL_DEPARTMENT]: "Internal department",
  [PartyType.RANDOM_USER]: "Random user",
  [PartyType.INVESTOR]: "Investor",
  [PartyType.PARTNER]: "Partner",
  [PartyType.EMPLOYEE]: "Employee",
};

const money = new Intl.NumberFormat("en-PK", {
  style: "currency",
  currency: "PKR",
  minimumFractionDigits: 2,
});

function printStatement(startDate: string, endDate: string) {
  const statement = document.querySelector<HTMLElement>(".statement-print");
  const printWindow = window.open("", "_blank");

  if (!statement || !printWindow) {
    window.print();
    return;
  }

  const styles = Array.from(
    document.querySelectorAll<HTMLStyleElement | HTMLLinkElement>(
      'style, link[rel="stylesheet"]',
    ),
  )
    .map((style) => style.outerHTML)
    .join("\n");

  printWindow.document.open();
  printWindow.document.write(`
    <!doctype html>
    <html>
      <head>
        <title>4Head ERP</title>
        ${styles}
      </head>
      <body>
        <header class="statement-print-header">
          <h1>Account History</h1>
          <p>For the Period From, <strong>${startDate}</strong> to <strong>${endDate}</strong></p>
        </header>
        ${statement.outerHTML}
      </body>
    </html>
  `);
  printWindow.document.close();
  printWindow.addEventListener("afterprint", () => printWindow.close(), {
    once: true,
  });
  printWindow.focus();
  printWindow.print();
}

// ---------------------------------------------------------------------------
// Balance badge — sign convention:
//   LedgerService.getPartyStatement: debit subtracts from balance, credit adds.
//   A negative closing balance means net debits > net credits for this party,
//   i.e. the department receives from the party (receivable).
//   A positive closing balance means the department pays to the party (payable).
// ---------------------------------------------------------------------------

function BalanceBadge({ balance }: { balance: string }) {
  const value = Number(balance);
  if (value < 0)
    return <Badge variant="success">Department receives {money.format(Math.abs(value))}</Badge>;
  if (value > 0)
    return (
      <Badge variant="destructive">
        Department pays {money.format(value)}
      </Badge>
    );
  return <Badge variant="secondary">Settled</Badge>;
}

// ---------------------------------------------------------------------------
// Record-payment dialog
const paymentSchema = z.object({
  amount: z
    .string()
    .min(1, "Amount is required")
    .refine(
      (v) => Number.isFinite(Number(v)) && Number(v) > 0,
      "Must be a positive number",
    ),
  paymentDate: z.string().min(1, "Date is required"),
  paymentMethod: z.enum(["cash", "bank"], {
    error: "Payment method is required",
  }),
  direction: z.enum(["received", "paid"]),
  notes: z.string(),
});

type PaymentFormValues = z.infer<typeof paymentSchema>;

function RecordPaymentDialog({
  partyId,
  editingEntry,
  open,
  onOpenChange,
}: {
  partyId: string;
  editingEntry?: PartyStatementEntry | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const [recordPayment, recordState] = useRecordPartyPaymentMutation();
  const [updatePayment, updateState] = useUpdatePartyPaymentMutation();
  const [accountSelection, setAccountSelection] =
    useState<PaymentAccountSelection>({});
  const form = useForm<PaymentFormValues>({
    resolver: zodResolver(paymentSchema),
    defaultValues: {
      amount: editingEntry?.amount ?? "",
      paymentDate: editingEntry?.entryDate ?? new Date().toISOString().slice(0, 10),
      paymentMethod: "cash",
      direction: editingEntry?.entryType === "credit" ? "received" : "paid",
      notes: editingEntry?.description ?? "",
    },
  });
  const paymentMethod = useWatch({
    control: form.control,
    name: "paymentMethod",
  });

  useEffect(() => {
    if (open) {
      form.reset({
        amount: editingEntry?.amount ?? "",
        paymentDate: editingEntry?.entryDate ?? new Date().toISOString().slice(0, 10),
        paymentMethod: "cash",
        direction: editingEntry?.entryType === "credit" ? "received" : "paid",
        notes: editingEntry?.description ?? "",
      });
    }
  }, [editingEntry, form, open]);

  const onSubmit = async (values: PaymentFormValues) => {
    form.clearErrors("root");
    try {
      const body = {
          amount: Number(values.amount),
          paymentDate: values.paymentDate,
          paymentMethod: values.paymentMethod,
          ...accountSelection,
          direction: values.direction,
          notes: values.notes || undefined,
        };
      if (editingEntry) {
        await updatePayment({ id: partyId, paymentId: editingEntry.sourceId, body }).unwrap();
        toast.success("Payment updated");
      } else {
        await recordPayment({ id: partyId, body }).unwrap();
        toast.success("Payment recorded");
      }
      form.reset();
      onOpenChange(false);
    } catch (error) {
      const message = getApiErrorMessage(error);
      form.setError("root.server", { type: "server", message });
      toast.error(message);
    }
  };

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        if (!next) form.reset();
        onOpenChange(next);
      }}
    >
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
              <DialogTitle>{editingEntry ? "Edit payment" : "Record payment"}</DialogTitle>
          <DialogDescription>
            Record a cash or bank payment to or from this party.
          </DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form
            className="space-y-4"
            onSubmit={form.handleSubmit(onSubmit)}
            noValidate
          >
            {form.formState.errors.root?.server?.message ? (
              <Alert variant="destructive">
                <AlertDescription>
                  {form.formState.errors.root.server.message}
                </AlertDescription>
              </Alert>
            ) : null}
            <FormField
              control={form.control}
              name="direction"
              label="Direction"
              required
            >
              {(field) => (
                <Select
                  value={field.value}
                  onValueChange={(value) => {
                    field.onChange(value);
                    setAccountSelection({});
                  }}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="received">
                      Received from party
                    </SelectItem>
                    <SelectItem value="paid">Paid to party</SelectItem>
                  </SelectContent>
                </Select>
              )}
            </FormField>
            <PaymentAccountFields
              paymentMethod={paymentMethod}
              value={accountSelection}
              onChange={setAccountSelection}
              adminOnly
            />
            <FormField
              control={form.control}
              name="amount"
              label="Amount (PKR)"
              required
            >
              {(field) => (
                <Input
                  {...field}
                  type="number"
                  min="0.01"
                  step="0.01"
                  placeholder="0.00"
                />
              )}
            </FormField>
            <FormField
              control={form.control}
              name="paymentDate"
              label="Date"
              required
            >
              {(field) => <Input {...field} type="date" />}
            </FormField>
            <FormField
              control={form.control}
              name="paymentMethod"
              label="Payment method"
              required
            >
              {(field) => (
                <Select value={field.value} onValueChange={field.onChange}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select method" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="cash">Cash</SelectItem>
                    <SelectItem value="bank">Bank</SelectItem>
                  </SelectContent>
                </Select>
              )}
            </FormField>
            <FormField control={form.control} name="notes" label="Notes">
              {(field) => <Input {...field} placeholder="Optional note" />}
            </FormField>
            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => onOpenChange(false)}
              >
                Cancel
              </Button>
              <Button type="submit" isLoading={recordState.isLoading || updateState.isLoading}>
                {editingEntry ? "Update payment" : "Record payment"}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}

function TransactionEditDialog({
  entry,
  open,
  onOpenChange,
}: {
  entry: PartyStatementEntry | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const [date, setDate] = useState(entry?.entryDate ?? "");
  const [quantity, setQuantity] = useState(entry?.quantityKg ?? "");
  const [rate, setRate] = useState(entry?.ratePerKg ?? "");
  const [amount, setAmount] = useState(entry?.amount ?? "");
  const [paymentMethod, setPaymentMethod] = useState<"cash" | "bank">("cash");
  const [direction, setDirection] = useState<"received" | "paid">(
    entry?.entryType === "credit" ? "received" : "paid",
  );
  const [notes, setNotes] = useState(entry?.description ?? "");
  const [updateSale, saleState] = useUpdateSupplySaleMutation();
  const [updatePurchase, purchaseState] = useUpdateSupplyPurchaseMutation();
  const [updatePayment, paymentState] = useUpdatePartyPaymentMutation();

  useEffect(() => {
    if (open) {
      setDate(entry?.entryDate ?? "");
      setQuantity(entry?.quantityKg ?? "");
      setRate(entry?.ratePerKg ?? "");
      setAmount(entry?.amount ?? "");
      setDirection(entry?.entryType === "credit" ? "received" : "paid");
      setNotes(entry?.description ?? "");
    }
  }, [entry, open]);

  const save = async () => {
    if (!entry || !date) return;
    try {
      if (entry.sourceType === "sale") {
        const body = { saleDate: date, ...(quantity !== entry.quantityKg ? { quantityKg: Number(quantity) } : {}), ...(rate !== entry.ratePerKg ? { ratePerKg: Number(rate) } : {}), ...(notes !== (entry.description ?? "") ? { notes } : {}) };
        await updateSale({ id: entry.sourceId, body }).unwrap();
      } else if (entry.sourceType === "purchase") {
        const body = { purchaseDate: date, ...(quantity !== entry.quantityKg ? { quantityKg: Number(quantity) } : {}), ...(rate !== entry.ratePerKg ? { ratePerKg: Number(rate) } : {}), ...(notes !== (entry.description ?? "") ? { notes } : {}) };
        await updatePurchase({ id: entry.sourceId, body }).unwrap();
      } else if (entry.sourceType === "payment") {
        const body = {
          amount: Number(amount), direction, paymentDate: date, paymentMethod,
          ...(notes ? { notes } : {}),
        };
        await updatePayment({
          id: entry.partyId ?? "",
          paymentId: entry.sourceId,
          body,
        }).unwrap();
      }
      toast.success("Transaction date updated");
      onOpenChange(false);
    } catch (error) {
      toast.error(getApiErrorMessage(error));
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-sm">
        <DialogHeader>
          <DialogTitle>Edit transaction</DialogTitle>
          <DialogDescription>If you change only the date, the existing accounting entries are moved without a cancellation reversal.</DialogDescription>
        </DialogHeader>
        <Label htmlFor="transaction-date">Date</Label>
        <Input id="transaction-date" type="date" value={date} onChange={(event) => setDate(event.target.value)} />
        {entry?.sourceType === "payment" ? (
          <>
            <Label htmlFor="transaction-amount">Amount</Label>
            <Input id="transaction-amount" type="number" min="0.01" step="0.01" value={amount} onChange={(event) => setAmount(event.target.value)} />
            <Label htmlFor="transaction-direction">Direction</Label>
            <Select value={direction} onValueChange={(value) => setDirection(value as "received" | "paid")}>
              <SelectTrigger id="transaction-direction"><SelectValue /></SelectTrigger>
              <SelectContent><SelectItem value="received">Received</SelectItem><SelectItem value="paid">Paid</SelectItem></SelectContent>
            </Select>
            <Label htmlFor="transaction-payment-method">Payment method</Label>
            <Select value={paymentMethod} onValueChange={(value) => setPaymentMethod(value as "cash" | "bank")}>
              <SelectTrigger id="transaction-payment-method"><SelectValue /></SelectTrigger>
              <SelectContent><SelectItem value="cash">Cash</SelectItem><SelectItem value="bank">Bank</SelectItem></SelectContent>
            </Select>
          </>
        ) : (
          <>
            <Label htmlFor="transaction-quantity">Quantity (kg)</Label>
            <Input id="transaction-quantity" type="number" min="0.001" step="0.001" value={quantity} onChange={(event) => setQuantity(event.target.value)} />
            <Label htmlFor="transaction-rate">Rate/kg</Label>
            <Input id="transaction-rate" type="number" min="0.01" step="0.01" value={rate} onChange={(event) => setRate(event.target.value)} />
          </>
        )}
        <Label htmlFor="transaction-notes">Notes</Label>
        <Input id="transaction-notes" value={notes} onChange={(event) => setNotes(event.target.value)} />
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button onClick={() => void save()} isLoading={saleState.isLoading || purchaseState.isLoading || paymentState.isLoading}>Save changes</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ---------------------------------------------------------------------------
// Main page
// ---------------------------------------------------------------------------

export function PartyStatementPage() {
  const navigate = useNavigate();
  const { id } = useParams<{ id: string }>();
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [paymentDialogOpen, setPaymentDialogOpen] = useState(false);
  const [editingPayment, setEditingPayment] = useState<PartyStatementEntry | null>(null);
  const [editingTransaction, setEditingTransaction] = useState<PartyStatementEntry | null>(null);
  const [partyDialogOpen, setPartyDialogOpen] = useState(false);
  const [deleteParty, deletePartyState] = useDeletePartyMutation();

  const partyQuery = useGetPartyQuery(id ?? "", { skip: !id });

  // Unfiltered query drives the balance badge in the header — always shows
  // the full closing balance regardless of the date filter applied to the table.
  const fullStatementQuery = useGetPartyStatementQuery(
    { id: id ?? "" },
    { skip: !id },
  );

  // Filtered query drives the table rows.
  const filteredStatementQuery = useGetPartyStatementQuery(
    {
      id: id ?? "",
      startDate: startDate || undefined,
      endDate: endDate || undefined,
    },
    { skip: !id },
  );

  const entries = useMemo(
    () => filteredStatementQuery.data?.data.entries ?? [],
    [filteredStatementQuery.data],
  );
  const isInvestorParty =
    partyQuery.data?.data.partyType === PartyType.INVESTOR;

  const columns = useMemo<DataTableColumn<PartyStatementEntry>[]>(
    () => [
      {
        id: "entryDate",
        header: "Date",
        cell: (entry) => entry.entryDate,
      },
      {
        id: "description",
        header: "Description",
        cell: (entry) => (
          <span>
            <span className="capitalize">
              {entry.sourceType.replaceAll("_", " ")}
            </span>
            {entry.description ? ` - ${entry.description}` : ""}
          </span>
        ),
      },
      {
        id: "quantityKg",
        header: "Weight",
        cell: (entry) =>
          entry.quantityKg ? `${entry.quantityKg} kg` : "—",
      },
      {
        id: "ratePerKg",
        header: "Rate/kg",
        align: "right",
        cell: (entry) =>
          entry.ratePerKg ? money.format(Number(entry.ratePerKg)) : "—",
      },
      {
        id: "debit",
        header: "Debit",
        align: "right",
        cell: (entry) =>
          entry.entryType === "debit"
            ? money.format(Number(entry.amount))
            : "—",
      },
      {
        id: "credit",
        header: "Credit",
        align: "right",
        cell: (entry) =>
          entry.entryType === "credit"
            ? money.format(Number(entry.amount))
            : "—",
      },
      {
        id: "runningBalance",
        header: isInvestorParty ? "Investor balance" : "Running balance",
        align: "right",
        cell: (entry) => {
          const val = Number(entry.runningBalance);
          if (isInvestorParty) {
            if (val > 0)
              return (
                <span className="text-destructive">
                  {money.format(val)} Payable
                </span>
              );
            if (val < 0)
              return (
                <span className="text-emerald-700">
                  {money.format(Math.abs(val))} Receivable
                </span>
              );
            return <span>Settled</span>;
          }
          return (
            <span className={val > 0 ? "text-destructive" : undefined}>
              {money.format(val)}
            </span>
          );
        },
      },
      {
        id: "actions",
        header: "Actions",
        align: "right",
        cell: (entry) => (
          <div className="flex justify-end gap-2 print:hidden">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => {
                if (entry.sourceType === "sale") {
                  setEditingTransaction(entry);
                } else if (entry.sourceType === "purchase") {
                  setEditingTransaction(entry);
                } else if (entry.sourceType === "payment") {
                  setEditingTransaction(entry);
                } else {
                  toast.info("This transaction cannot be edited from the statement");
                }
              }}
            >
              <Pencil className="h-3.5 w-3.5" aria-hidden />
              Edit
            </Button>
            <Button
              type="button"
              variant="destructive"
              size="sm"
              onClick={() => {
                if (entry.sourceType === "sale") {
                  navigate(`/supply/sales?transactionId=${entry.sourceId}`);
                } else if (entry.sourceType === "purchase") {
                  navigate(`/supply/purchases?transactionId=${entry.sourceId}`);
                } else if (entry.sourceType === "payment") {
                  toast.info("Payment reversal is not available yet");
                } else {
                  toast.info("This transaction cannot be cancelled from the statement");
                }
              }}
            >
              <Trash2 className="h-3.5 w-3.5" aria-hidden />
              Delete
            </Button>
          </div>
        ),
      },
    ],
    [isInvestorParty],
  );

  // --- Guard: missing id ---
  if (!id) {
    return (
      <PageContainer>
        <ErrorState title="Party ID is missing" />
      </PageContainer>
    );
  }

  // --- Loading ---
  if (
    partyQuery.isLoading ||
    fullStatementQuery.isLoading ||
    filteredStatementQuery.isLoading
  ) {
    return <PageSkeleton rows={7} />;
  }

  // --- Error ---
  if (
    partyQuery.isError ||
    fullStatementQuery.isError ||
    filteredStatementQuery.isError
  ) {
    return (
      <PageContainer>
        <ErrorState
          title="Statement could not be loaded"
          error={partyQuery.error ?? fullStatementQuery.error}
          onRetry={() => {
            void partyQuery.refetch();
            void fullStatementQuery.refetch();
            void filteredStatementQuery.refetch();
          }}
        />
      </PageContainer>
    );
  }

  const partyData = partyQuery.data?.data;
  if (!partyData) {
    return (
      <PageContainer>
        <EmptyState title="Party not found" />
      </PageContainer>
    );
  }

  const closingBalance = fullStatementQuery.data?.data.closingBalance ?? "0.00";
  const isInternal = partyData.partyType === PartyType.INTERNAL_DEPARTMENT;
  const isInvestor = partyData.partyType === PartyType.INVESTOR;
  const departmentOptions = [
    ...partyData.departments,
    ...(partyData.primaryDepartment ? [partyData.primaryDepartment] : []),
    ...(partyData.linkedDepartment ? [partyData.linkedDepartment] : []),
  ].filter(
    (department, index, options) =>
      options.findIndex(({ id: departmentId }) => departmentId === department.id) === index,
  );
  const hasStatementPeriod = Boolean(startDate && endDate);
  const totalDebit = entries.reduce(
    (sum, entry) =>
      entry.entryType === "debit" ? sum + Number(entry.amount) : sum,
    0,
  );
  const totalCredit = entries.reduce(
    (sum, entry) =>
      entry.entryType === "credit" ? sum + Number(entry.amount) : sum,
    0,
  );
  const periodClosingBalance = entries.at(-1)?.runningBalance ?? "0.00";

  return (
    <PageContainer className="statement-print">
      <PageHeader
        title={partyData.name}
        description={
          <span className="print:hidden">
            {partyTypeLabels[partyData.partyType]}
          </span>
        }
        breadcrumb={
          <Link
            to="/parties"
            className="print:hidden inline-flex items-center gap-1 hover:underline"
          >
            <ArrowLeft className="h-3 w-3" aria-hidden />
            Parties
          </Link>
        }
        actions={
          <div className="flex flex-wrap items-center gap-2 print:hidden">
            <BalanceBadge balance={closingBalance} />
            {!isInternal ? (
              <>
                <Button
                  variant="outline"
                  onClick={() => setPartyDialogOpen(true)}
                  title="Edit party"
                >
                  <Pencil className="h-4 w-4" aria-hidden />
                  Edit
                </Button>
                <Button
                  variant="destructive"
                  disabled={deletePartyState.isLoading}
                  onClick={async () => {
                    if (!window.confirm(`Delete ${partyData.name}?`)) return;
                    try {
                      await deleteParty(partyData.id).unwrap();
                      toast.success("Party deleted");
                      navigate("/parties");
                    } catch (error) {
                      toast.error(getApiErrorMessage(error));
                    }
                  }}
                  title="Delete party"
                >
                  <Trash2 className="h-4 w-4" aria-hidden />
                  Delete
                </Button>
              </>
            ) : null}
            {!isInternal && !isInvestor ? (
              <Button onClick={() => setPaymentDialogOpen(true)}>
                <ReceiptText className="h-4 w-4" aria-hidden />
                Record payment
              </Button>
            ) : null}
          </div>
        }
      />

      <StatCardGrid>
        <StatCard
          label="Payable to party"
          value={money.format(Math.max(Number(closingBalance), 0))}
          icon={TrendingUp}
          tone="danger"
        />
        <StatCard
          label="Receivable from party"
          value={money.format(Math.max(-Number(closingBalance), 0))}
          icon={TrendingDown}
          tone="success"
        />
      </StatCardGrid>

      {/* Date range filter */}
      <div className="grid gap-4 sm:grid-cols-2 print:hidden">
        <div className="space-y-2">
          <Label htmlFor="statement-start-date">From</Label>
          <Input
            id="statement-start-date"
            type="date"
            value={startDate}
            max={endDate || undefined}
            onChange={(e) => setStartDate(e.target.value)}
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="statement-end-date">To</Label>
          <Input
            id="statement-end-date"
            type="date"
            value={endDate}
            min={startDate || undefined}
            onChange={(e) => setEndDate(e.target.value)}
          />
        </div>
      </div>

      <div className="flex justify-end print:hidden">
        <Button
          variant="outline"
          disabled={!hasStatementPeriod}
          onClick={() => printStatement(startDate, endDate)}
          title={
            hasStatementPeriod
              ? "Print statement for the selected dates"
              : "Select both dates before printing"
          }
        >
          <Printer className="h-4 w-4" aria-hidden />
          Print statement
        </Button>
      </div>

      {/* Statement table */}
      <DataTable
        columns={columns}
        data={entries}
        getRowId={(entry) => entry.id}
        footerContent={
          entries.length ? (
            <>
              <tr className="statement-total-row">
                <td colSpan={4} className="text-right">Total</td>
                <td className="text-right">{money.format(totalDebit)}</td>
                <td className="text-right">{money.format(totalCredit)}</td>
                <td className="text-right">{money.format(Number(periodClosingBalance))}</td>
              </tr>
              <tr className="statement-closing-row">
                <td colSpan={7} className="text-right">Closing Balance</td>
                <td className="text-right">{money.format(Number(periodClosingBalance))}</td>
              </tr>
            </>
          ) : null
        }
        emptyContent={
          <EmptyState
            icon={ReceiptText}
            title="No statement entries"
            description={
              startDate || endDate
                ? "No ledger entries exist for the selected date range."
                : "No ledger entries have been posted for this party yet."
            }
          />
        }
      />

      {/* Record payment dialog */}
      <RecordPaymentDialog
        partyId={id}
        editingEntry={editingPayment}
        open={paymentDialogOpen}
        onOpenChange={(open) => {
          setPaymentDialogOpen(open);
          if (!open) setEditingPayment(null);
        }}
      />
      <TransactionEditDialog
        entry={editingTransaction}
        open={Boolean(editingTransaction)}
        onOpenChange={(open) => {
          if (!open) setEditingTransaction(null);
        }}
      />
      {partyDialogOpen ? (
        <PartyFormDialog
          open
          onOpenChange={setPartyDialogOpen}
          party={partyData}
          departmentOptions={departmentOptions}
        />
      ) : null}
    </PageContainer>
  );
}
