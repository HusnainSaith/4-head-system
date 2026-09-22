import React, { useState } from "react";
import { toast } from "sonner";
import { Plus, Handshake } from "lucide-react";
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
import { selectUserRole } from "@/features/auth/authSlice";
import { getApiErrorMessage } from "@/lib/api-error";
import { useListPartiesQuery } from "@/features/parties/partiesApi";
import { PartyType } from "@/features/parties/types";
import { DepartmentBalancesPanel } from "@/features/parties/components/DepartmentBalancesPanel";
import { PartySettlementDialog } from "@/features/parties/components/PartySettlementDialog";
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
  useUpdateBrokeragePurchaseMutation,
  useUpdateBrokerageSaleMutation,
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
  const [filterDate, setFilterDate] = useState<string>("");
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
  const canEdit = role === Role.OWNER || role === Role.ACCOUNTANT;
  const [open, setOpen] = useState(false);
  const [editingRecord, setEditingRecord] = useState<
    (BrokeragePurchase | BrokerageSale) | null
  >(null);
  const [pendingDelete, setPendingDelete] = useState<
    BrokeragePurchase | BrokerageSale | null
  >(null);
  const [showSettlement, setShowSettlement] = useState(false);
  const [createPurchase, purchaseState] = useCreateBrokeragePurchaseMutation();
  const [createSale, saleState] = useCreateBrokerageSaleMutation();
  const [updatePurchase] = useUpdateBrokeragePurchaseMutation();
  const [updateSale] = useUpdateBrokerageSaleMutation();
  const [deletePurchase, deletePurchaseState = { isLoading: false }] =
    useDeleteBrokeragePurchaseMutation();
  const [deleteSale, deleteSaleState = { isLoading: false }] =
    useDeleteBrokerageSaleMutation();

  const allRecords = (query.data?.data?.items ?? []) as Array<
    BrokeragePurchase | BrokerageSale
  >;

  const filteredRecords = filterDate
    ? allRecords.filter((r) => {
        const recordDate =
          kind === "purchase"
            ? (r as BrokeragePurchase).purchaseDate
            : (r as BrokerageSale).saleDate;
        return recordDate === filterDate;
      })
    : allRecords;

  // Calculate totals for filtered date
  const filteredTotals = {
    totalAmount: filteredRecords.reduce(
      (sum, r) => sum + Number(r.totalAmount),
      0
    ),
    settled:
      kind === "purchase"
        ? filteredRecords.reduce(
            (sum, r) => sum + Number((r as BrokeragePurchase).amountPaid),
            0
          )
        : filteredRecords.reduce(
            (sum, r) => sum + Number((r as BrokerageSale).amountReceived),
            0
          ),
    outstanding: filteredRecords.reduce(
      (sum, r) => sum + Number(r.outstandingAmount),
      0
    ),
  };

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
      header: "Weight",
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
    ...(canWrite || canInvoice || canEdit
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
                {canEdit ? (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => {
                      setEditingRecord(row);
                      setOpen(true);
                    }}
                  >
                    Edit
                  </Button>
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
            <div className="flex gap-2">
              <Button
                variant="outline"
                onClick={() => setShowSettlement(true)}
              >
                <Handshake className="h-4 w-4" />
                Settle Payment
              </Button>
              <Button
                onClick={() => {
                  setEditingRecord(null);
                  setOpen(true);
                }}
              >
                <Plus />
                Record {kind}
              </Button>
            </div>
          ) : undefined
        }
      />
      <DepartmentBalancesPanel departmentCode={DepartmentCode.BROKERAGE} />

      {/* Date Filter */}
      <div className="mb-4 flex gap-2">
        <Input
          type="date"
          value={filterDate}
          onChange={(e) => setFilterDate(e.target.value)}
          placeholder="Filter by date"
          className="w-48"
        />
        {filterDate && (
          <Button
            variant="outline"
            size="sm"
            onClick={() => setFilterDate("")}
          >
            Clear filter
          </Button>
        )}
      </div>

      {/* Filtered Totals Display */}
      {filterDate && (
        <div className="mb-4 grid grid-cols-3 gap-4">
          <div className="rounded-lg border bg-blue-50 p-4">
            <div className="text-sm font-medium text-gray-600">TOTAL {kind === "purchase" ? "PAYABLE" : "RECEIVABLE"}</div>
            <div className="mt-2 text-2xl font-bold">
              {money.format(filteredTotals.totalAmount)}
            </div>
            <div className="mt-1 text-xs text-gray-500">
              {kind === "purchase"
                ? "Department owes parties"
                : "Department receives from parties"}
            </div>
          </div>

          <div className="rounded-lg border bg-green-50 p-4">
            <div className="text-sm font-medium text-gray-600">
              {kind === "purchase" ? "PAID" : "RECEIVED"}
            </div>
            <div className="mt-2 text-2xl font-bold">
              {money.format(filteredTotals.settled)}
            </div>
            <div className="mt-1 text-xs text-gray-500">
              {kind === "purchase"
                ? "Amount paid to parties"
                : "Amount received from parties"}
            </div>
          </div>

          <div className="rounded-lg border bg-orange-50 p-4">
            <div className="text-sm font-medium text-gray-600">OUTSTANDING</div>
            <div className="mt-2 text-2xl font-bold">
              {money.format(filteredTotals.outstanding)}
            </div>
            <div className="mt-1 text-xs text-gray-500">
              {kind === "purchase"
                ? "Still owe parties"
                : "Still to receive from parties"}
            </div>
          </div>
        </div>
      )}

      <DataTable
        columns={columns}
        data={filteredRecords}
        getRowId={(row) => row.id}
        emptyContent={<EmptyState title={`No ${kind}s recorded`} />}
      />

      <TransactionDialog
        kind={kind}
        open={open}
        editingRecord={editingRecord}
        loading={purchaseState.isLoading || saleState.isLoading}
        onClose={() => {
          setOpen(false);
          setEditingRecord(null);
        }}
        onSubmit={async (values) => {
          try {
            if (editingRecord) {
              // Edit mode
              if (kind === "purchase") {
                await updatePurchase({
                  id: editingRecord.id,
                  body: {
                    partyId: values.partyId || undefined,
                    quantityKg: values.quantityKg,
                    ratePerKg: values.ratePerKg,
                    amountPaid: values.paymentAmount,
                    paymentMethod: values.paymentMethod,
                    purchaseDate: values.date,
                    vehicleId: values.vehicleId || undefined,
                    description: values.description || undefined,
                  },
                }).unwrap();
              } else {
                await updateSale({
                  id: editingRecord.id,
                  body: {
                    partyId: values.partyId || undefined,
                    quantityKg: values.quantityKg,
                    ratePerKg: values.ratePerKg,
                    amountReceived: values.paymentAmount,
                    paymentMethod: values.paymentMethod,
                    saleDate: values.date,
                    vehicleId: values.vehicleId || undefined,
                    description: values.description || undefined,
                  },
                }).unwrap();
              }
              toast.success(
                `${kind === "purchase" ? "Purchase" : "Sale"} updated`,
              );
            } else {
              // Create mode
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
            }
            setOpen(false);
            setEditingRecord(null);
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

      <PartySettlementDialog
        open={showSettlement}
        onOpenChange={setShowSettlement}
        departmentCode={DepartmentCode.BROKERAGE}
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
  editingRecord,
  loading,
  onClose,
  onSubmit,
}: {
  kind: Kind;
  open: boolean;
  editingRecord: (BrokeragePurchase | BrokerageSale) | null;
  loading: boolean;
  onClose: () => void;
  onSubmit: (values: FormValues) => Promise<void>;
}) {
  const [partyId, setPartyId] = useState("");
  const [destinationType, setDestinationType] = useState<"external" | "supply">(
    "external"
  );
  const [quantity, setQuantity] = useState("");
  const [rate, setRate] = useState("");
  const [paymentMethod, setPaymentMethod] =
    useState<BrokeragePaymentMethod>("cash");
  const [paymentAmount, setPaymentAmount] = useState("");
  const [accountSelection, setAccountSelection] =
    useState<PaymentAccountSelection>({});
  const [date, setDate] = useState("");
  const [description, setDescription] = useState("");
  const [vehicleId, setVehicleId] = useState("");
  const [formError, setFormError] = useState("");

  // Update form when editingRecord changes
  React.useEffect(() => {
    if (editingRecord) {
      setPartyId(editingRecord.partyId || "");
      setQuantity(editingRecord.quantityKg.toString());
      setRate(editingRecord.ratePerKg.toString());
      setPaymentMethod(
        (editingRecord.paymentMethod as BrokeragePaymentMethod) || "cash"
      );
      setDescription(editingRecord.description || "");
      setVehicleId(editingRecord.vehicleId || "");

      if (kind === "purchase") {
        setPaymentAmount(
          (editingRecord as BrokeragePurchase).amountPaid.toString()
        );
        setDate((editingRecord as BrokeragePurchase).purchaseDate);
      } else {
        setPaymentAmount(
          (editingRecord as BrokerageSale).amountReceived.toString()
        );
        setDate((editingRecord as BrokerageSale).saleDate);
        setDestinationType(
          (editingRecord as BrokerageSale).destinationType || "external"
        );
      }
    } else {
      // Reset form for create mode
      setPartyId("");
      setDestinationType("external");
      setQuantity("");
      setRate("");
      setPaymentMethod("cash");
      setPaymentAmount("");
      setAccountSelection({});
      setDate(new Date().toISOString().split("T")[0]);
      setDescription("");
      setVehicleId("");
    }
    setFormError("");
  }, [editingRecord, kind, open]);

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
    setFormError("");
    onClose();
  };

  const handleSubmit = (event: React.FormEvent) => {
    event.preventDefault();
    setFormError("");
    const q = Number(quantity);
    const r = Number(rate);
    if (!Number.isFinite(q) || q <= 0) {
      setFormError("Weight must be a positive number.");
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
          <DialogTitle>
            {editingRecord ? "Edit" : "Record"} {kind}
          </DialogTitle>
          <DialogDescription>
            {editingRecord
              ? `Update this ${kind} record`
              : kind === "purchase"
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

          <div className="space-y-1.5">
            <Label htmlFor={`${kind}-quantity`}>
              Weight (kg) <span className="text-destructive">*</span>
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

          <div className="space-y-1.5">
            <Label>Payment method</Label>
            <Select
              value={paymentMethod}
              onValueChange={(v) => {
                setPaymentMethod(v as BrokeragePaymentMethod);
                setAccountSelection({});
              }}
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
          <PaymentAccountFields
            paymentMethod={paymentMethod}
            value={accountSelection}
            onChange={setAccountSelection}
          />

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
              {editingRecord ? "Update" : "Save"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
