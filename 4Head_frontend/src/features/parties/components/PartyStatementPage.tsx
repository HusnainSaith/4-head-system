import { useMemo, useState } from "react";
import { zodResolver } from "@hookform/resolvers/zod";
import {
  ArrowLeft,
  Printer,
  ReceiptText,
  TrendingDown,
  TrendingUp,
} from "lucide-react";
import { useForm, useWatch } from "react-hook-form";
import { Link, useParams } from "react-router-dom";
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
  useRecordPartyPaymentMutation,
} from "@/features/parties/partiesApi";
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
};

const money = new Intl.NumberFormat("en-PK", {
  style: "currency",
  currency: "PKR",
  minimumFractionDigits: 2,
});

// ---------------------------------------------------------------------------
// Balance badge — sign convention confirmed against backend:
//   LedgerService.getPartyStatement: debit adds to balance, credit subtracts.
//   A positive closing balance means net debits > net credits for this party,
//   i.e. the party owes the business (receivable / asset).
//   A negative closing balance means the business owes the party (payable).
// ---------------------------------------------------------------------------

function BalanceBadge({ balance }: { balance: string }) {
  const value = Number(balance);
  if (value > 0)
    return <Badge variant="success">Party owes {money.format(value)}</Badge>;
  if (value < 0)
    return (
      <Badge variant="destructive">
        Business owes {money.format(Math.abs(value))}
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
  open,
  onOpenChange,
}: {
  partyId: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const [recordPayment, { isLoading }] = useRecordPartyPaymentMutation();
  const [accountSelection, setAccountSelection] =
    useState<PaymentAccountSelection>({});
  const form = useForm<PaymentFormValues>({
    resolver: zodResolver(paymentSchema),
    defaultValues: {
      amount: "",
      paymentDate: new Date().toISOString().slice(0, 10),
      paymentMethod: "cash",
      direction: "received",
      notes: "",
    },
  });
  const paymentMethod = useWatch({
    control: form.control,
    name: "paymentMethod",
  });

  const onSubmit = async (values: PaymentFormValues) => {
    form.clearErrors("root");
    try {
      await recordPayment({
        id: partyId,
        body: {
          amount: Number(values.amount),
          paymentDate: values.paymentDate,
          paymentMethod: values.paymentMethod,
          ...accountSelection,
          direction: values.direction,
          notes: values.notes || undefined,
        },
      }).unwrap();
      toast.success("Payment recorded");
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
          <DialogTitle>Record payment</DialogTitle>
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
              <Button type="submit" isLoading={isLoading}>
                Record payment
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}

// ---------------------------------------------------------------------------
// Main page
// ---------------------------------------------------------------------------

export function PartyStatementPage() {
  const { id } = useParams<{ id: string }>();
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [paymentDialogOpen, setPaymentDialogOpen] = useState(false);

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
        id: "sourceType",
        header: "Source",
        cell: (entry) => (
          <span className="capitalize">
            {entry.sourceType.replaceAll("_", " ")}
          </span>
        ),
      },
      {
        id: "description",
        header: "Description",
        cell: (entry) => entry.description ?? "—",
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
            if (val < 0)
              return (
                <span className="text-destructive">
                  {money.format(Math.abs(val))} Payable
                </span>
              );
            if (val > 0)
              return (
                <span className="text-emerald-700">
                  {money.format(val)} Receivable
                </span>
              );
            return <span>Settled</span>;
          }
          return (
            <span className={val < 0 ? "text-destructive" : undefined}>
              {money.format(val)}
            </span>
          );
        },
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

  return (
    <PageContainer>
      <PageHeader
        title={partyData.name}
        description={partyTypeLabels[partyData.partyType]}
        breadcrumb={
          <Link
            to="/parties"
            className="inline-flex items-center gap-1 hover:underline"
          >
            <ArrowLeft className="h-3 w-3" aria-hidden />
            Parties
          </Link>
        }
        actions={
          <div className="flex flex-wrap items-center gap-2 print:hidden">
            <BalanceBadge balance={closingBalance} />
            <Button variant="outline" onClick={() => window.print()}>
              <Printer className="h-4 w-4" aria-hidden />
              Print statement
            </Button>
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
          label="Receivable from party"
          value={money.format(Math.max(Number(closingBalance), 0))}
          icon={TrendingUp}
          tone="success"
        />
        <StatCard
          label="Payable to party"
          value={money.format(Math.max(-Number(closingBalance), 0))}
          icon={TrendingDown}
          tone="danger"
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

      {/* Statement table */}
      <DataTable
        columns={columns}
        data={entries}
        getRowId={(entry) => entry.id}
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
        open={paymentDialogOpen}
        onOpenChange={setPaymentDialogOpen}
      />
    </PageContainer>
  );
}
