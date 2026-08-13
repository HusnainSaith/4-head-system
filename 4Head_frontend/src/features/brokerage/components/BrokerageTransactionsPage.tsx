import { useState } from "react";
import { toast } from "sonner";
import { Plus } from "lucide-react";
import { useSelector } from "react-redux";
import { DataTable, type DataTableColumn } from "@/components/common/DataTable";
import { EmptyState } from "@/components/common/EmptyState";
import { ErrorState } from "@/components/common/ErrorState";
import { PageHeader } from "@/components/common/PageHeader";
import { PageSkeleton } from "@/components/common/Skeletons";
import { ConfirmDialog } from "@/components/common/ConfirmDialog";
import { PageContainer } from "@/components/layout/PageContainer";
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
import { selectUserRole } from "@/features/auth/authSlice";
import { useListPartiesQuery } from "@/features/parties/partiesApi";
import { PartyType } from "@/features/parties/types";
import { DepartmentBalancesPanel } from "@/features/parties/components/DepartmentBalancesPanel";
import { DepartmentVehicleSelect } from "@/features/vehicles/components/DepartmentVehicleSelect";
import { InvoiceButton } from "@/features/invoices/components/InvoiceButton";
import { DepartmentCode, Role } from "@/types/enums";
import { PaymentAccountFields } from "@/features/accounts/components";
import type { PaymentAccountSelection } from "@/features/accounts/types";
import {
  useCreateBrokeragePurchaseMutation,
  useCreateBrokerageSaleMutation,
  useDeleteBrokeragePurchaseMutation,
  useDeleteBrokerageSaleMutation,
  useListBrokeragePurchasesQuery,
  useListBrokerageSalesQuery,
} from "../brokerageApi";
import type {
  BrokeragePurchase,
  BrokerageSale,
  BrokeragePaymentMethod,
} from "../types";

const money = new Intl.NumberFormat("en-PK", {
  style: "currency",
  currency: "PKR",
});
type Kind = "purchase" | "sale";

export function BrokerageTransactionsPage({ kind }: { kind: Kind }) {
  const purchases = useListBrokeragePurchasesQuery(undefined, {
    skip: kind !== "purchase",
  });
  const sales = useListBrokerageSalesQuery(undefined, {
    skip: kind !== "sale",
  });
  const query = kind === "purchase" ? purchases : sales;
  const role = useSelector(selectUserRole);
  const canWrite =
    role === Role.OWNER ||
    role === Role.ACCOUNTANT ||
    role === Role.DEPARTMENT_STAFF;
  const canInvoice = role === Role.OWNER || role === Role.ACCOUNTANT;
  const [open, setOpen] = useState(false);
  const [pendingDelete, setPendingDelete] = useState<
    BrokeragePurchase | BrokerageSale | null
  >(null);
  const [createPurchase, purchaseState] = useCreateBrokeragePurchaseMutation();
  const [createSale, saleState] = useCreateBrokerageSaleMutation();
  const [deletePurchase, deletePurchaseState = { isLoading: false }] =
    useDeleteBrokeragePurchaseMutation();
  const [deleteSale, deleteSaleState = { isLoading: false }] =
    useDeleteBrokerageSaleMutation();
  const records = (query.data?.data?.items ?? []) as Array<
    BrokeragePurchase | BrokerageSale
  >;

  const columns: DataTableColumn<BrokeragePurchase | BrokerageSale>[] = [
    {
      id: "party",
      header: kind === "purchase" ? "Seller (Farm)" : "Buyer",
      cell: (row) =>
        kind === "sale" &&
        (row as BrokerageSale).destinationType === "supply" ? (
          <span className="font-medium">Supply department</span>
        ) : row.partyId ? (
          <a
            className="font-medium text-primary hover:underline"
            href={`/parties/${row.partyId}`}
          >
            {row.party?.name ?? "View statement"}
          </a>
        ) : (
          (row.party?.name ?? "—")
        ),
    },
    {
      id: "quantity",
      header: "Quantity",
      cell: (row) => `${row.quantityKg} kg`,
      align: "right",
    },
    {
      id: "rate",
      header: "Rate/kg",
      cell: (row) => money.format(Number(row.ratePerKg)),
      align: "right",
    },
    ...(kind === "sale"
      ? [
          {
            id: "commission",
            header: "Commission/kg",
            cell: (row: BrokeragePurchase | BrokerageSale) =>
              money.format(Number((row as BrokerageSale).commissionPerKg)),
            align: "right" as const,
          },
        ]
      : []),
    {
      id: "total",
      header: "Total",
      cell: (row) => money.format(Number(row.totalAmount)),
      align: "right",
    },
    {
      id: "settled",
      header: kind === "purchase" ? "Paid" : "Received",
      cell: (row) =>
        money.format(
          Number(
            kind === "purchase"
              ? (row as BrokeragePurchase).amountPaid
              : (row as BrokerageSale).amountReceived,
          ),
        ),
      align: "right",
    },
    {
      id: "outstanding",
      header: kind === "purchase" ? "Initial payable" : "Initial receivable",
      cell: (row) => money.format(Number(row.outstandingAmount)),
      align: "right",
    },
    { id: "payment", header: "Payment", cell: (row) => row.paymentMethod },
    {
      id: "date",
      header: "Date",
      cell: (row) =>
        kind === "purchase"
          ? (row as BrokeragePurchase).purchaseDate
          : (row as BrokerageSale).saleDate,
    },
    ...(canWrite || canInvoice
      ? [
          {
            id: "actions",
            header: "Actions",
            cell: (row: BrokeragePurchase | BrokerageSale) => (
              <div className="flex justify-end gap-2">
                {canInvoice ? (
                  <InvoiceButton
                    sourceType={kind}
                    sourceId={row.id}
                    label="Print"
                  />
                ) : null}
                {canWrite ? (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setPendingDelete(row)}
                  >
                    Delete
                  </Button>
                ) : null}
              </div>
            ),
            align: "right" as const,
          },
        ]
      : []),
  ];

  if (query.isLoading) return <PageSkeleton rows={6} />;
  if (query.isError)
    return (
      <PageContainer>
        <ErrorState
          title={`${kind === "purchase" ? "Purchases" : "Sales"} could not be loaded`}
          error={query.error}
          onRetry={() => void query.refetch()}
        />
      </PageContainer>
    );

  return (
    <PageContainer>
      <PageHeader
        title={`Brokerage ${kind === "purchase" ? "Purchases" : "Sales"}`}
        actions={
          canWrite ? (
            <Button onClick={() => setOpen(true)}>
              <Plus />
              Record {kind}
            </Button>
          ) : undefined
        }
      />
      <DepartmentBalancesPanel departmentCode={DepartmentCode.BROKERAGE} />
      <DataTable
        columns={columns}
        data={records}
        getRowId={(row) => row.id}
        emptyContent={<EmptyState title={`No ${kind}s recorded`} />}
      />
      <TransactionDialog
        kind={kind}
        open={open}
        loading={purchaseState.isLoading || saleState.isLoading}
        onClose={() => setOpen(false)}
        onSubmit={async (values) => {
          try {
            if (kind === "purchase") {
              await createPurchase({
                partyId: values.partyId || undefined,
                quantityKg: values.quantityKg,
                ratePerKg: values.ratePerKg,
                amountPaid: values.paymentAmount,
                paymentMethod: values.paymentMethod,
                ...values.accountSelection,
                purchaseDate: values.date,
                vehicleId: values.vehicleId || undefined,
                description: values.description || undefined,
              }).unwrap();
            } else {
              await createSale({
                partyId: values.partyId || undefined,
                quantityKg: values.quantityKg,
                ratePerKg: values.ratePerKg,
                amountReceived: values.paymentAmount,
                paymentMethod: values.paymentMethod,
                ...values.accountSelection,
                saleDate: values.date,
                vehicleId: values.vehicleId || undefined,
                description: values.description || undefined,
                destinationType: values.destinationType,
              }).unwrap();
            }
            toast.success(
              `${kind === "purchase" ? "Purchase" : "Sale"} recorded`,
            );
            setOpen(false);
          } catch (error) {
            toast.error(getApiErrorMessage(error));
          }
        }}
      />
      <ConfirmDialog
        open={Boolean(pendingDelete)}
        onOpenChange={(nextOpen) => !nextOpen && setPendingDelete(null)}
        title={`Cancel this ${kind}?`}
        description="Stock and ledger effects will be reversed. This audit-safe cancellation cannot be undone."
        confirmLabel={`Cancel ${kind}`}
        destructive
        loading={deletePurchaseState.isLoading || deleteSaleState.isLoading}
        onConfirm={() => {
          if (!pendingDelete) return;
          const mutation = kind === "purchase"
            ? deletePurchase(pendingDelete.id)
            : deleteSale(pendingDelete.id);
          void mutation.unwrap().then(() => {
            toast.success(`${kind === "purchase" ? "Purchase" : "Sale"} cancelled`);
            setPendingDelete(null);
          }).catch((error) => toast.error(getApiErrorMessage(error)));
        }}
      />
    </PageContainer>
  );
}

type FormValues = {
  destinationType?: "external" | "supply";
  partyId?: string;
  quantityKg: number;
  ratePerKg: number;
  paymentAmount?: number;
  paymentMethod: BrokeragePaymentMethod;
  accountSelection: PaymentAccountSelection;
  date: string;
  vehicleId?: string;
  description?: string;
};

function TransactionDialog({
  kind,
  open,
  loading,
  onClose,
  onSubmit,
}: {
  kind: Kind;
  open: boolean;
  loading: boolean;
  onClose: () => void;
  onSubmit: (values: FormValues) => Promise<void>;
}) {
  const [partyId, setPartyId] = useState("");
  const [destinationType, setDestinationType] = useState<
    "external" | "supply"
  >("external");
  const [quantity, setQuantity] = useState("");
  const [rate, setRate] = useState("");
  const [paymentMethod, setPaymentMethod] =
    useState<BrokeragePaymentMethod>("cash");
  const [paymentAmount, setPaymentAmount] = useState("");
  const [accountSelection, setAccountSelection] = useState<PaymentAccountSelection>({});
  const [date, setDate] = useState(new Date().toISOString().slice(0, 10));
  const [description, setDescription] = useState("");
  const [vehicleId, setVehicleId] = useState("");
  const [formError, setFormError] = useState("");

  const primaryPartyType =
    kind === "purchase" ? PartyType.FARM : PartyType.CUSTOMER;
  const primaryPartiesQuery = useListPartiesQuery(
    { type: primaryPartyType, limit: 100 },
    { skip: !open },
  );
  const brokerPartiesQuery = useListPartiesQuery(
    { type: PartyType.BROKER, limit: 100 },
    { skip: !open },
  );
  const parties = [
    ...(primaryPartiesQuery.data?.data?.items ?? []),
    ...(brokerPartiesQuery.data?.data?.items ?? []),
  ].filter(
    (party, index, allParties) =>
      allParties.findIndex((candidate) => candidate.id === party.id) === index,
  );

  const handleClose = () => {
    setPartyId("");
    setDestinationType("external");
    setQuantity("");
    setRate("");
    setPaymentMethod("cash");
    setAccountSelection({});
    setPaymentAmount("");
    setDate(new Date().toISOString().slice(0, 10));
    setDescription("");
    setVehicleId("");
    setFormError("");
    onClose();
  };

  const handleSubmit = (event: React.FormEvent) => {
    event.preventDefault();
    setFormError("");
    const q = Number(quantity);
    const r = Number(rate);
    if (!Number.isFinite(q) || q <= 0) {
      setFormError("Quantity must be a positive number.");
      return;
    }
    if (!Number.isFinite(r) || r <= 0) {
      setFormError("Rate per kg must be a positive number.");
      return;
    }
    const total = q * r;
    const enteredPayment =
      paymentAmount === "" ? undefined : Number(paymentAmount);
    if (
      enteredPayment !== undefined &&
      (!Number.isFinite(enteredPayment) || enteredPayment < 0)
    ) {
      setFormError(
        `${kind === "purchase" ? "Amount paid" : "Amount received"} cannot be negative.`,
      );
      return;
    }
    if (enteredPayment !== undefined && enteredPayment > total) {
      setFormError(
        `${kind === "purchase" ? "Amount paid" : "Amount received"} cannot exceed the total.`,
      );
      return;
    }
    const effectivePayment =
      enteredPayment ?? (paymentMethod === "cash" ? total : 0);
    if (
      destinationType !== "supply" &&
      effectivePayment < total &&
      !partyId
    ) {
      setFormError("Select a party when an outstanding balance remains.");
      return;
    }
    if (!date) {
      setFormError("Date is required.");
      return;
    }
    void onSubmit({
      partyId: partyId || undefined,
      destinationType: kind === "sale" ? destinationType : undefined,
      quantityKg: q,
      ratePerKg: r,
      paymentAmount: enteredPayment,
      paymentMethod,
      accountSelection,
      date,
      vehicleId: vehicleId || undefined,
      description: description || undefined,
    });
  };

  const partyLabel =
    kind === "purchase" ? "Seller (Farm or Broker)" : "Buyer (Customer or Broker)";

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        if (!next) handleClose();
      }}
    >
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Record {kind}</DialogTitle>
          <DialogDescription>
            {kind === "purchase"
              ? "Record a new brokerage purchase from a farm or broker."
              : "Record a new brokerage sale to a customer or broker."}
          </DialogDescription>
        </DialogHeader>
        <form className="space-y-4" onSubmit={handleSubmit}>
          {formError ? (
            <Alert variant="destructive">
              <AlertDescription>{formError}</AlertDescription>
            </Alert>
          ) : null}

          {kind === "sale" ? (
            <div className="space-y-1.5">
              <Label>Destination</Label>
              <Select
                value={destinationType}
                onValueChange={(value) => {
                  const next = value as "external" | "supply";
                  setDestinationType(next);
                  if (next === "supply") {
                    setPartyId("");
                    setPaymentMethod("credit");
                    setPaymentAmount("");
                  }
                }}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="external">External buyer</SelectItem>
                  <SelectItem value="supply">
                    Supply department (automatic transfer)
                  </SelectItem>
                </SelectContent>
              </Select>
              {destinationType === "supply" ? (
                <p className="text-xs text-muted-foreground">
                  Saving will automatically create the Supply purchase and
                  move the same stock into Supply at this rate.
                </p>
              ) : null}
            </div>
          ) : null}

          {destinationType !== "supply" ? (
          <div className="space-y-1.5">
            <Label htmlFor={`${kind}-party`}>{partyLabel}</Label>
            <Select
              value={partyId || "none"}
              onValueChange={(v) => setPartyId(v === "none" ? "" : v)}
            >
              <SelectTrigger id={`${kind}-party`}>
                <SelectValue
                  placeholder={`Select ${partyLabel.toLowerCase()}`}
                />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="none">— None —</SelectItem>
                {parties.map((p) => (
                  <SelectItem key={p.id} value={p.id}>
                    {p.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          ) : null}

          <>
          <div className="space-y-1.5">
            <Label htmlFor={`${kind}-quantity`}>
              Quantity (kg) <span className="text-destructive">*</span>
            </Label>
            <Input
              id={`${kind}-quantity`}
              value={quantity}
              onChange={(e) => setQuantity(e.target.value)}
              type="number"
              min="0.001"
              step="0.001"
              required
            />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor={`${kind}-rate`}>
              Rate per kg <span className="text-destructive">*</span>
            </Label>
            <Input
              id={`${kind}-rate`}
              value={rate}
              onChange={(e) => setRate(e.target.value)}
              type="number"
              min="0.01"
              step="0.01"
              required
            />
          </div>

          </>

          <>
          <div className="space-y-1.5">
            <Label>Payment method</Label>
            <Select
              value={paymentMethod}
              onValueChange={(v) =>
                (setPaymentMethod(v as BrokeragePaymentMethod), setAccountSelection({}))
              }
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="cash">Cash</SelectItem>
                <SelectItem value="bank">Bank</SelectItem>
                <SelectItem value="credit">Credit</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <PaymentAccountFields paymentMethod={paymentMethod} value={accountSelection} onChange={setAccountSelection} />

          <div className="space-y-1.5">
            <Label htmlFor={`${kind}-payment-amount`}>
              {kind === "purchase" ? "Amount paid" : "Amount received"}
            </Label>
            <Input
              id={`${kind}-payment-amount`}
              value={paymentAmount}
              onChange={(e) => setPaymentAmount(e.target.value)}
              type="number"
              min="0"
              step="0.01"
              placeholder={
                paymentMethod === "cash" ? "Blank = full amount" : "0.00"
              }
            />
            <p className="text-xs text-muted-foreground">
              Total:{" "}
              {money.format((Number(quantity) || 0) * (Number(rate) || 0))}. Any
              balance is posted to the selected party.
            </p>
          </div>
          </>

          <div className="space-y-1.5">
            <Label htmlFor={`${kind}-date`}>
              Date <span className="text-destructive">*</span>
            </Label>
            <Input
              id={`${kind}-date`}
              value={date}
              onChange={(e) => setDate(e.target.value)}
              type="date"
              required
            />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor={`${kind}-description`}>Description</Label>
            <Input
              id={`${kind}-description`}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Optional note"
            />
          </div>

          <div className="space-y-1.5">
            <Label>Vehicle</Label>
            <DepartmentVehicleSelect
              departmentCode={DepartmentCode.BROKERAGE}
              value={vehicleId}
              onChange={setVehicleId}
            />
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={handleClose}>
              Cancel
            </Button>
            <Button type="submit" isLoading={loading}>
              Save
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
