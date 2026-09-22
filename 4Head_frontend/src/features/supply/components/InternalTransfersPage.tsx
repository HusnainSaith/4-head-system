import { useState } from "react";
import { PaymentAccountFields } from "@/features/accounts/components";
import type { PaymentAccountSelection } from "@/features/accounts/types";
import { Plus } from "lucide-react";
import { useSelector } from "react-redux";
import { toast } from "sonner";
import { DataTable, type DataTableColumn } from "@/components/common/DataTable";
import { InvoiceButton } from "@/features/invoices/components/InvoiceButton";
import { EmptyState } from "@/components/common/EmptyState";
import { ErrorState } from "@/components/common/ErrorState";
import { PageHeader } from "@/components/common/PageHeader";
import { PageSkeleton } from "@/components/common/Skeletons";
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
import {
  selectUserDepartmentCode,
  selectUserRole,
} from "@/features/auth/authSlice";
import { DepartmentVehicleSelect } from "@/features/vehicles/components/DepartmentVehicleSelect";
import { getApiErrorMessage } from "@/lib/api-error";
import { DepartmentCode, Role } from "@/types/enums";
import {
  useCreateInternalTransferMutation,
  useGetSupplyStockQuery,
  useListInternalTransfersQuery,
  useSettleInternalTransferMutation,
} from "../supplyApi";
import type { InternalTransfer } from "../types";
const money = new Intl.NumberFormat("en-PK", {
  style: "currency",
  currency: "PKR",
});
export function InternalTransfersPage() {
  const [page, setPage] = useState(1);
  const [open, setOpen] = useState(false);
  const [settling, setSettling] = useState<InternalTransfer | null>(null);
  const query = useListInternalTransfersQuery({ page, limit: 10 });
  const stock = useGetSupplyStockQuery();
  const role = useSelector(selectUserRole);
  const department = useSelector(selectUserDepartmentCode);
  const canWrite =
    role === Role.OWNER ||
    role === Role.ACCOUNTANT ||
    (role === Role.DEPARTMENT_STAFF && department === DepartmentCode.SUPPLY);
  const canInvoice = role === Role.OWNER || role === Role.ACCOUNTANT;
  const [create, state] = useCreateInternalTransferMutation();
  const [settle, settleState] = useSettleInternalTransferMutation();
  const columns: DataTableColumn<InternalTransfer>[] = [
    {
      id: "date",
      header: "Transfer date",
      cell: (r) => String(r.transferDate).slice(0, 10),
    },
    {
      id: "route",
      header: "Route",
      cell: (r) =>
        `${r.fromDepartment?.name ?? "Supply"} → ${r.toDepartment?.name ?? "Fresh Chicken Shop"}`,
    },
    {
      id: "quantity",
      header: "Weight",
      cell: (r) => `${r.quantityKg} kg`,
      align: "right",
    },
    {
      id: "rate",
      header: "Internal rate/kg",
      cell: (r) => money.format(Number(r.internalRatePerKg)),
      align: "right",
    },
    {
      id: "total",
      header: "Total",
      cell: (r) => money.format(Number(r.totalAmount)),
      align: "right",
    },
    {
      id: "settled",
      header: "Settled",
      cell: (r) => money.format(Number(r.amountSettled)),
      align: "right",
    },
    {
      id: "remaining",
      header: "Remaining",
      cell: (r) => money.format(Number(r.remainingBalance)),
      align: "right",
    },
    {
      id: "status",
      header: "Status",
      cell: (r) => (
        <Badge
          variant={
            r.settlementStatus === "settled"
              ? "success"
              : r.settlementStatus === "unsettled"
                ? "warning"
                : "secondary"
          }
        >
          {r.settlementStatus.replaceAll("_", " ")}
        </Badge>
      ),
    },
    {
      id: "action",
      header: "Actions",
      cell: (r) => <div className="flex gap-2">
        {canInvoice ? <InvoiceButton sourceType="internal_transfer" sourceId={r.id} label="Print" /> : null}
        {r.settlementStatus !== "settled" && canWrite ? (
          <Button size="sm" variant="outline" onClick={() => setSettling(r)}>
            Settle
          </Button>
        ) : null}</div>,
    },
  ];
  if (query.isLoading) return <PageSkeleton rows={6} />;
  if (query.isError)
    return (
      <PageContainer>
        <ErrorState
          title="Internal transfers could not be loaded"
          description={getApiErrorMessage(query.error)}
          onRetry={() => void query.refetch()}
        />
      </PageContainer>
    );
  return (
    <PageContainer>
      <PageHeader
        title="Internal Transfers"
        description="Transfers from Supply to the business’s Fresh Chicken Shop. These are separate from external sales."
        actions={
          canWrite ? (
            <Button onClick={() => setOpen(true)}>
              <Plus />
              New Transfer
            </Button>
          ) : undefined
        }
      />
      <DataTable
        columns={columns}
        data={query.data?.data.items ?? []}
        getRowId={(r) => r.id}
        emptyContent={<EmptyState title="No internal transfers found" />}
      />
      <div className="flex justify-end gap-2">
        <Button
          variant="outline"
          disabled={page === 1}
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
      <TransferDialog
        open={open}
        available={stock.data?.data.quantityKg}
        loading={state.isLoading}
        onClose={() => setOpen(false)}
        onSubmit={async (body) => {
          try {
            await create(body).unwrap();
            toast.success("Internal transfer recorded");
            setOpen(false);
          } catch (e) {
            toast.error(getApiErrorMessage(e));
          }
        }}
      />
      <SettlementDialog
        transfer={settling}
        loading={settleState.isLoading}
        onClose={() => setSettling(null)}
        onSubmit={async (body) => {
          if (!settling) return;
          try {
            await settle({ id: settling.id, body }).unwrap();
            toast.success("Settlement recorded");
            setSettling(null);
          } catch (e) {
            toast.error(getApiErrorMessage(e));
          }
        }}
      />
    </PageContainer>
  );
}
function TransferDialog({
  open,
  available,
  loading,
  onClose,
  onSubmit,
}: {
  open: boolean;
  available?: string;
  loading: boolean;
  onClose: () => void;
  onSubmit: (body: {
    quantityKg: number;
    internalRatePerKg: number;
    transferDate: string;
    vehicleId?: string;
    notes?: string;
  }) => Promise<void>;
}) {
  const [q, setQ] = useState("");
  const [r, setR] = useState("");
  const [d, setD] = useState(new Date().toISOString().slice(0, 10));
  const [v, setV] = useState("");
  const [n, setN] = useState("");
  const preview = Number(q) * Number(r);
  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        if (!next) onClose();
      }}
    >
      <DialogContent>
        <DialogHeader>
          <DialogTitle>New Internal Transfer</DialogTitle>
          <DialogDescription>
            Available: {available ?? "—"} kg. Supply and Fresh Chicken Shop are
            resolved authoritatively by the backend.
          </DialogDescription>
        </DialogHeader>
        <form
          className="space-y-4"
          onSubmit={(e) => {
            e.preventDefault();
            if (Number(q) > 0 && Number(r) > 0)
              void onSubmit({
                quantityKg: Number(q),
                internalRatePerKg: Number(r),
                transferDate: d,
                vehicleId: v || undefined,
                notes: n || undefined,
              });
          }}
        >
          <div>
            <Label htmlFor="transfer-quantity">Weight (kg)</Label>
            <Input
              id="transfer-quantity"
              type="number"
              min="0.001"
              step="0.001"
              value={q}
              onChange={(e) => setQ(e.target.value)}
            />
          </div>
          <div>
            <Label htmlFor="transfer-rate">Internal rate per kg</Label>
            <Input
              id="transfer-rate"
              type="number"
              min="0.01"
              step="0.01"
              value={r}
              onChange={(e) => setR(e.target.value)}
            />
          </div>
          <div>
            <Label htmlFor="transfer-date">Transfer date</Label>
            <Input
              id="transfer-date"
              type="date"
              value={d}
              onChange={(e) => setD(e.target.value)}
            />
          </div>
          <div>
            <Label htmlFor="transfer-vehicle">Vehicle</Label>
            <DepartmentVehicleSelect
              id="transfer-vehicle"
              departmentCode={DepartmentCode.SUPPLY}
              value={v}
              onChange={setV}
            />
          </div>
          <div>
            <Label htmlFor="transfer-notes">Notes</Label>
            <Input
              id="transfer-notes"
              value={n}
              onChange={(e) => setN(e.target.value)}
            />
          </div>
          <p className="text-sm text-muted-foreground">
            Preview total:{" "}
            {money.format(Number.isFinite(preview) ? preview : 0)}
          </p>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={onClose}>
              Cancel
            </Button>
            <Button type="submit" isLoading={loading}>
              Create
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
function SettlementDialog({
  transfer,
  loading,
  onClose,
  onSubmit,
}: {
  transfer: InternalTransfer | null;
  loading: boolean;
  onClose: () => void;
  onSubmit: (body: {
    amount: number;
    settlementDate: string;
    paymentMethod: "cash" | "bank";
    cashAccountId?: string;
    bankAccountId?: string;
    bankTransactionMethod?: "cheque" | "app";
    chequeNumber?: string;
    appReference?: string;
  }) => Promise<void>;
}) {
  const [amount, setAmount] = useState("");
  const [date, setDate] = useState(new Date().toISOString().slice(0, 10));
  const [method, setMethod] = useState<"cash" | "bank">("cash");
  const [accountSelection, setAccountSelection] = useState<PaymentAccountSelection>({});
  return (
    <Dialog
      open={Boolean(transfer)}
      onOpenChange={(next) => {
        if (!next) onClose();
      }}
    >
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Settle Internal Transfer</DialogTitle>
          <DialogDescription>
            Total {money.format(Number(transfer?.totalAmount ?? 0))}; settled{" "}
            {money.format(Number(transfer?.amountSettled ?? 0))}; remaining{" "}
            {money.format(Number(transfer?.remainingBalance ?? 0))}.
          </DialogDescription>
        </DialogHeader>
        <form
          className="space-y-4"
          onSubmit={(e) => {
            e.preventDefault();
            const value = Number(amount);
            if (value > 0 && value <= Number(transfer?.remainingBalance ?? 0))
              void onSubmit({
                amount: value,
                settlementDate: date,
                paymentMethod: method,
                ...accountSelection,
              });
          }}
        >
          <div>
            <Label htmlFor="settlement-amount">Amount</Label>
            <Input
              id="settlement-amount"
              type="number"
              min="0.01"
              step="0.01"
              max={transfer?.remainingBalance}
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
            />
          </div>
          <div>
            <Label htmlFor="settlement-date">Settlement date</Label>
            <Input
              id="settlement-date"
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
            />
          </div>
          <div>
            <Label htmlFor="settlement-payment-method">Payment method</Label>
            <Select
              value={method}
              onValueChange={(v) => { setMethod(v as "cash" | "bank"); setAccountSelection({}); }}
            >
              <SelectTrigger id="settlement-payment-method">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="cash">Cash</SelectItem>
                <SelectItem value="bank">Bank</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <PaymentAccountFields paymentMethod={method} value={accountSelection} onChange={setAccountSelection} />
          <DialogFooter>
            <Button type="button" variant="outline" onClick={onClose}>
              Cancel
            </Button>
            <Button type="submit" isLoading={loading}>
              Settle
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
