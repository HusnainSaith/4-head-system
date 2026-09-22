import { useState } from "react";
import { Plus } from "lucide-react";
import { useSelector } from "react-redux";
import { toast } from "sonner";
import { z } from "zod";
import { DataTable, type DataTableColumn } from "@/components/common/DataTable";
import { EmptyState } from "@/components/common/EmptyState";
import { ErrorState } from "@/components/common/ErrorState";
import { PageHeader } from "@/components/common/PageHeader";
import { PageSkeleton } from "@/components/common/Skeletons";
import { ConfirmDialog } from "@/components/common/ConfirmDialog";
import { PageContainer } from "@/components/layout/PageContainer";
import { PaymentAccountFields } from "@/features/accounts/components";
import type { PaymentAccountSelection } from "@/features/accounts/types";
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
import {
  selectUserDepartmentCode,
  selectUserRole,
} from "@/features/auth/authSlice";
import { useListPartiesQuery } from "@/features/parties/partiesApi";
import { useListDepartmentsQuery } from "@/features/departments/departmentsApi";
import { DepartmentBalancesPanel } from "@/features/parties/components/DepartmentBalancesPanel";
import { DepartmentVehicleSelect } from "@/features/vehicles/components/DepartmentVehicleSelect";
import { InvoiceButton } from "@/features/invoices/components/InvoiceButton";
import { getApiErrorMessage } from "@/lib/api-error";
import { DepartmentCode, Role } from "@/types/enums";
import type {
  CreatePurchaseRequest,
  CreateSaleRequest,
  SupplyPaymentMethod,
  SupplyPurchase,
  SupplySale,
} from "../types";
import {
  useCreateSupplyPurchaseMutation,
  useCreateSupplySaleMutation,
  useDeleteSupplyPurchaseMutation,
  useDeleteSupplySaleMutation,
  useGetSupplyStockQuery,
  useListSupplyPurchasesQuery,
  useListSupplySalesQuery,
} from "../supplyApi";

type Kind = "purchase" | "sale";
const money = new Intl.NumberFormat("en-PK", {
  style: "currency",
  currency: "PKR",
});
const schema = z.object({
  partyId: z.string(),
  quantityKg: z.coerce.number().positive(),
  ratePerKg: z.coerce.number().positive(),
  paymentMethod: z.enum(["cash", "bank", "credit"]),
  paymentAmount: z.coerce.number().min(0),
  date: z.string().min(1),
  vehicleId: z.string(),
  notes: z.string(),
});

export function SupplyTransactionsPage({ kind }: { kind: Kind }) {
  const [page, setPage] = useState(1);
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [paymentMethod, setPaymentMethod] = useState("");
  const [open, setOpen] = useState(false);
  const [pendingCancel, setPendingCancel] = useState<
    SupplyPurchase | SupplySale | null
  >(null);
  const queryArgs = {
    page,
    limit: 10,
    from: from || undefined,
    to: to || undefined,
    paymentMethod: (paymentMethod || undefined) as
      SupplyPaymentMethod | undefined,
  };
  const purchases = useListSupplyPurchasesQuery(queryArgs, {
    skip: kind !== "purchase",
  });
  const sales = useListSupplySalesQuery(queryArgs, { skip: kind !== "sale" });
  const query = kind === "purchase" ? purchases : sales;
  const stock = useGetSupplyStockQuery(undefined, { skip: kind !== "sale" });
  const role = useSelector(selectUserRole);
  const department = useSelector(selectUserDepartmentCode);
  const canWrite =
    role === Role.OWNER ||
    role === Role.ACCOUNTANT ||
    (role === Role.DEPARTMENT_STAFF && department === DepartmentCode.SUPPLY);
  const canInvoice = role === Role.OWNER || role === Role.ACCOUNTANT;
  const [createPurchase, purchaseState] = useCreateSupplyPurchaseMutation();
  const [createSale, saleState] = useCreateSupplySaleMutation();
  const [cancelPurchase, cancelPurchaseState] =
    useDeleteSupplyPurchaseMutation();
  const [cancelSale, cancelSaleState] = useDeleteSupplySaleMutation();
  const records = (query.data?.data.items ?? []) as Array<
    SupplyPurchase | SupplySale
  >;
  const columns: DataTableColumn<SupplyPurchase | SupplySale>[] = [
    {
      id: "party",
      header: kind === "purchase" ? "Broker" : "Shop owner",
      cell: (row) =>
        kind === "purchase" && (row as SupplyPurchase).sourceBrokerageSaleId ? (
          <span className="font-medium">Brokerage department</span>
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
    ...(kind === "purchase"
      ? [
          {
            id: "source",
            header: "Source",
            cell: (row: SupplyPurchase | SupplySale) =>
              (row as SupplyPurchase).sourceBrokerageSaleId
                ? "Automatic Brokerage transfer"
                : "Manual",
          },
        ]
      : []),
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
            cell: (row: SupplyPurchase | SupplySale) =>
              money.format(Number((row as SupplySale).commissionPerKg)),
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
    { id: "payment", header: "Payment", cell: (row) => row.paymentMethod },
    {
      id: "paid",
      header: kind === "purchase" ? "Paid" : "Received",
      cell: (row) =>
        money.format(
          Number(
            kind === "purchase"
              ? (row as SupplyPurchase).amountPaid
              : (row as SupplySale).amountReceived,
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
    {
      id: "date",
      header: "Date",
      cell: (row) =>
        String(
          kind === "purchase"
            ? (row as SupplyPurchase).purchaseDate
            : (row as SupplySale).saleDate,
        ).slice(0, 10),
    },
    {
      id: "vehicle",
      header: "Vehicle",
      cell: (row) => row.vehicle?.registrationNumber ?? "—",
    },
    { id: "status", header: "Status", cell: (row) => row.status },
    ...(canWrite
      ? [
          {
            id: "actions",
            header: "Actions",
            align: "right" as const,
            cell: (row: SupplyPurchase | SupplySale) => (
              <div className="flex justify-end gap-2">
                {canInvoice ? (
                  <InvoiceButton
                    sourceType={kind}
                    sourceId={row.id}
                    label="Print"
                  />
                ) : null}
                {row.status === "posted" &&
                !(
                  kind === "purchase" &&
                  (row as SupplyPurchase).sourceBrokerageSaleId
                ) ? (
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => setPendingCancel(row)}
                  >
                    Cancel
                  </Button>
                ) : kind === "purchase" &&
                  (row as SupplyPurchase).sourceBrokerageSaleId ? (
                  <span className="text-xs text-muted-foreground">
                    Managed by Brokerage
                  </span>
                ) : null}
              </div>
            ),
          },
        ]
      : []),
  ];
  if (query.isLoading) return <PageSkeleton rows={6} />;
  if (query.isError)
    return (
      <PageContainer>
        <ErrorState
          title={`Supply ${kind}s could not be loaded`}
          description={getApiErrorMessage(query.error)}
          onRetry={() => void query.refetch()}
        />
      </PageContainer>
    );
  return (
    <PageContainer>
      <PageHeader
        title={`Supply ${kind === "purchase" ? "Purchases" : "External Sales"}`}
        description={
          kind === "sale"
            ? "This page records external sales to independent shop owners. Transfers to the business’s own Fresh Chicken Shop are recorded separately under Internal Transfers."
            : "Purchases of Supply stock from broker parties."
        }
        actions={
          canWrite ? (
            <Button onClick={() => setOpen(true)}>
              <Plus />
              Record {kind}
            </Button>
          ) : undefined
        }
      />
      <DepartmentBalancesPanel departmentCode={DepartmentCode.SUPPLY} />
      <div className="grid gap-3 sm:grid-cols-3">
        <div>
          <Label htmlFor={`${kind}-from`}>From</Label>
          <Input
            id={`${kind}-from`}
            type="date"
            value={from}
            onChange={(e) => {
              setFrom(e.target.value);
              setPage(1);
            }}
          />
        </div>
        <div>
          <Label htmlFor={`${kind}-to`}>To</Label>
          <Input
            id={`${kind}-to`}
            type="date"
            value={to}
            onChange={(e) => {
              setTo(e.target.value);
              setPage(1);
            }}
          />
        </div>
        <div>
          <Label>Payment method</Label>
          <Select
            value={paymentMethod || "all"}
            onValueChange={(v) => {
              setPaymentMethod(v === "all" ? "" : v);
              setPage(1);
            }}
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All</SelectItem>
              {["cash", "bank", "credit"].map((v) => (
                <SelectItem key={v} value={v}>
                  {v}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>
      <DataTable
        columns={columns}
        data={records}
        getRowId={(row) => row.id}
        emptyContent={<EmptyState title={`No Supply ${kind}s found`} />}
      />
      <div className="flex justify-end gap-2">
        <Button
          variant="outline"
          disabled={page <= 1}
          onClick={() => setPage(page - 1)}
        >
          Previous
        </Button>
        <Button
          variant="outline"
          disabled={!query.data?.data.pagination.hasNextPage}
          onClick={() => setPage(page + 1)}
        >
          Next
        </Button>
      </div>
      <TransactionDialog
        kind={kind}
        open={open}
        available={stock.data?.data.quantityKg}
        loading={purchaseState.isLoading || saleState.isLoading}
        onClose={() => setOpen(false)}
        onSubmit={async (body) => {
          try {
            if (kind === "purchase")
              await createPurchase(body as CreatePurchaseRequest).unwrap();
            else await createSale(body as CreateSaleRequest).unwrap();
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
        open={Boolean(pendingCancel)}
        onOpenChange={(nextOpen) => !nextOpen && setPendingCancel(null)}
        title={`Cancel this Supply ${kind}?`}
        description="Stock and ledger effects will be reversed and the original transaction retained for audit history."
        confirmLabel={`Cancel ${kind}`}
        destructive
        loading={cancelPurchaseState.isLoading || cancelSaleState.isLoading}
        onConfirm={() => {
          if (!pendingCancel) return;
          const mutation =
            kind === "purchase"
              ? cancelPurchase(pendingCancel.id)
              : cancelSale(pendingCancel.id);
          void mutation
            .unwrap()
            .then(() => {
              toast.success(`${kind} cancelled`);
              setPendingCancel(null);
            })
            .catch((error) => toast.error(getApiErrorMessage(error)));
        }}
      />
    </PageContainer>
  );
}

function TransactionDialog({
  kind,
  open,
  available,
  loading,
  onClose,
  onSubmit,
}: {
  kind: Kind;
  open: boolean;
  available?: string;
  loading: boolean;
  onClose: () => void;
  onSubmit: (body: CreatePurchaseRequest | CreateSaleRequest) => Promise<void>;
}) {
  const role = useSelector(selectUserRole);
  const isAdmin = role === Role.OWNER || role === Role.ACCOUNTANT;
  const [partySearch, setPartySearch] = useState("");
  const departments = useListDepartmentsQuery(undefined, { skip: !open });
  const supplyDeptId = departments.data?.data.find((d) => d.type === "SUPPLY")?.id;
  const parties = useListPartiesQuery(
    { departmentId: supplyDeptId, search: isAdmin ? partySearch || undefined : undefined, limit: isAdmin ? 50 : 200 },
    { skip: !open || !supplyDeptId },
  );
  const [partyId, setPartyId] = useState("");
  const [quantity, setQuantity] = useState("");
  const [rate, setRate] = useState("");
  const [method, setMethod] = useState<SupplyPaymentMethod>("cash");
  const [payment, setPayment] = useState("0");
  const [date, setDate] = useState(new Date().toISOString().slice(0, 10));
  const [vehicleId, setVehicleId] = useState("");
  const [notes, setNotes] = useState("");
  const [error, setError] = useState("");
  const [accountSelection, setAccountSelection] = useState<PaymentAccountSelection>({});
  const preview = Number(quantity) * Number(rate);
  const submit = (event: React.FormEvent) => {
    event.preventDefault();
    const parsed = schema.safeParse({
      partyId,
      quantityKg: quantity,
      ratePerKg: rate,
      paymentMethod: method,
      ...accountSelection,
      paymentAmount: payment,
      date,
      vehicleId,
      notes,
    });
    if (!parsed.success) {
      setError(parsed.error.issues[0]?.message ?? "Invalid form");
      return;
    }
    if (parsed.data.paymentAmount > preview) {
      setError(
        `${kind === "purchase" ? "Amount paid" : "Amount received"} cannot exceed total.`,
      );
      return;
    }
    if (parsed.data.paymentAmount < preview && !partyId) {
      setError(
        `Select a ${kind === "purchase" ? "broker" : "shop owner"} when an outstanding balance remains.`,
      );
      return;
    }
    const common = {
      partyId: partyId || undefined,
      quantityKg: parsed.data.quantityKg,
      ratePerKg: parsed.data.ratePerKg,
      paymentMethod: method,
      vehicleId: vehicleId || undefined,
      notes: notes || undefined,
    };
    void onSubmit(
      kind === "purchase"
        ? {
            ...common,
            amountPaid: parsed.data.paymentAmount,
            purchaseDate: date,
          }
        : {
            ...common,
            amountReceived: parsed.data.paymentAmount,
            saleDate: date,
          },
    );
  };
  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        if (!next) onClose();
      }}
    >
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Record {kind}</DialogTitle>
          <DialogDescription>
            {kind === "sale"
              ? `Available: ${available ?? "—"} kg. The backend performs final stock validation.`
              : "The displayed total is a preview; the backend stores the authoritative total."}
          </DialogDescription>
        </DialogHeader>
        <form className="grid gap-4 sm:grid-cols-2" onSubmit={submit}>
          {error ? (
            <p className="text-sm text-destructive sm:col-span-2">{error}</p>
          ) : null}
          <div>
            <Label>{kind === "purchase" ? "Broker" : "Shop owner"}</Label>
            {isAdmin && (
              <Input
                placeholder="Search parties…"
                value={partySearch}
                onChange={(e) => { setPartySearch(e.target.value); setPartyId(""); }}
                className="mb-1"
              />
            )}
            <Select
              value={partyId || "none"}
              onValueChange={(v) => setPartyId(v === "none" ? "" : v)}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="none">None</SelectItem>
                {(parties.data?.data.items ?? []).map((p) => (
                  <SelectItem key={p.id} value={p.id}>
                    {p.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label htmlFor={`${kind}-quantity`}>Weight (kg)</Label>
            <Input
              id={`${kind}-quantity`}
              type="number"
              min="0.001"
              step="0.001"
              value={quantity}
              onChange={(e) => setQuantity(e.target.value)}
            />
          </div>
          <div>
            <Label htmlFor={`${kind}-rate`}>Rate per kg</Label>
            <Input
              id={`${kind}-rate`}
              type="number"
              min="0.01"
              step="0.01"
              value={rate}
              onChange={(e) => setRate(e.target.value)}
            />
          </div>
          <div>
            <Label>Payment method</Label>
            <Select
              value={method}
              onValueChange={(v) => { setMethod(v as SupplyPaymentMethod); setAccountSelection({}); }}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {["cash", "bank", "credit"].map((v) => (
                  <SelectItem key={v} value={v}>
                    {v}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="sm:col-span-2"><PaymentAccountFields paymentMethod={method} value={accountSelection} onChange={setAccountSelection} /></div>
          <div>
            <Label htmlFor={`${kind}-payment`}>
              {kind === "purchase" ? "Amount paid" : "Amount received"}
            </Label>
            <Input
              id={`${kind}-payment`}
              type="number"
              min="0"
              step="0.01"
              value={payment}
              onChange={(e) => setPayment(e.target.value)}
            />
          </div>
          <div>
            <Label htmlFor={`${kind}-date`}>Date</Label>
            <Input
              id={`${kind}-date`}
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
            />
          </div>
          <div>
            <Label>Vehicle</Label>
            <DepartmentVehicleSelect
              departmentCode={DepartmentCode.SUPPLY}
              value={vehicleId}
              onChange={setVehicleId}
            />
          </div>
          <div>
            <Label htmlFor={`${kind}-notes`}>Notes</Label>
            <Input
              id={`${kind}-notes`}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
            />
          </div>
          <p className="text-sm text-muted-foreground sm:col-span-2">
            Preview total:{" "}
            {money.format(Number.isFinite(preview) ? preview : 0)}; outstanding:{" "}
            {money.format(
              Math.max(
                (Number.isFinite(preview) ? preview : 0) -
                  (Number(payment) || 0),
                0,
              ),
            )}
          </p>
          <DialogFooter className="sm:col-span-2">
            <Button type="button" variant="outline" onClick={onClose}>
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
