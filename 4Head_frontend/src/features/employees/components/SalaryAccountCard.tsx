import { useState } from "react";
import { PaymentAccountFields } from "@/features/accounts/components";
import type { PaymentAccountSelection } from "@/features/accounts/types";
import { toast } from "sonner";
import { DataTable, type DataTableColumn } from "@/components/common/DataTable";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
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
import {
  useGetSalaryAccountQuery,
  useCancelPayrollMutation,
  useWithdrawSalaryMutation,
  useUpdateSalaryWithdrawalMutation,
  useDeleteSalaryWithdrawalMutation,
} from "../employeesApi";
import type { SalaryRun, SalaryWithdrawal } from "../types";
const money = new Intl.NumberFormat("en-PK", {
  style: "currency",
  currency: "PKR",
});

export function SalaryAccountCard({ employeeId }: { employeeId: string }) {
  const [cancelPayroll, cancelState] = useCancelPayrollMutation();
  const [cancelling, setCancelling] = useState<SalaryRun | null>(null);
  const query = useGetSalaryAccountQuery(employeeId);
  const [withdraw, state] = useWithdrawSalaryMutation();
  const [updateWithdrawal, updateState] = useUpdateSalaryWithdrawalMutation();
  const [deleteWithdrawal, deleteState] = useDeleteSalaryWithdrawalMutation();
  const [editing, setEditing] = useState<SalaryWithdrawal | null>(null);
  const [deleting, setDeleting] = useState<SalaryWithdrawal | null>(null);
  const [notes, setNotes] = useState("");
  const [open, setOpen] = useState(false);
  const [amount, setAmount] = useState("");
  const [date, setDate] = useState(new Date().toISOString().slice(0, 10));
  const [method, setMethod] = useState<"cash" | "bank">("cash");
  const [accountSelection, setAccountSelection] =
    useState<PaymentAccountSelection>({});
  const account = query.data?.data;
  const columns: DataTableColumn<SalaryRun>[] = [
    {
      id: "period",
      header: "Month",
      cell: (row) => `${row.periodMonth}/${row.periodYear}`,
    },
    {
      id: "credited",
      header: "Credited",
      cell: (row) => money.format(Number(row.netPayable)),
      align: "right",
    },
    {
      id: "withdrawn",
      header: "Withdrawn",
      cell: (row) => money.format(Number(row.amountPaid ?? 0)),
      align: "right",
    },
    {
      id: "remaining",
      header: "Remaining",
      cell: (row) =>
        money.format(Number(row.netPayable) - Number(row.amountPaid ?? 0)),
      align: "right",
    },
  ];
  columns.push({
    id: "actions",
    header: "Actions",
    cell: (row) => (
      <Button
        size="sm"
        variant="destructive"
        onClick={() => setCancelling(row)}
      >
        Cancel payroll
      </Button>
    ),
  });
  const withdrawalColumns: DataTableColumn<SalaryWithdrawal>[] = [
    {
      id: "date",
      header: "Withdrawal date",
      cell: (row) => String(row.withdrawalDate).slice(0, 10),
    },
    {
      id: "amount",
      header: "Amount",
      cell: (row) => money.format(Number(row.amount)),
    },
    { id: "method", header: "Method", cell: (row) => row.paymentMethod },
    { id: "notes", header: "Notes", cell: (row) => row.notes || "—" },
    {
      id: "actions",
      header: "Actions",
      cell: (row) => (
        <div className="flex gap-2">
          <Button
            size="sm"
            variant="outline"
            onClick={() => {
              setEditing(row);
              setAmount(row.amount);
              setDate(String(row.withdrawalDate).slice(0, 10));
              setMethod(row.paymentMethod);
              setNotes(row.notes ?? "");
              setAccountSelection({
                cashAccountId: row.cashAccountId ?? undefined,
                bankAccountId: row.bankAccountId ?? undefined,
                bankTransactionMethod: row.bankTransactionMethod ?? undefined,
                chequeNumber: row.chequeNumber ?? undefined,
                appReference: row.appReference ?? undefined,
              });
              setOpen(true);
            }}
          >
            Edit
          </Button>
          <Button
            size="sm"
            variant="destructive"
            onClick={() => setDeleting(row)}
          >
            Delete
          </Button>
        </div>
      ),
    },
  ];
  if (!account) return null;
  const available = Number(account.availableBalance);
  const editableAvailable = available + Number(editing?.amount ?? 0);
  return (
    <>
      <Card>
        <CardHeader className="flex-row items-start justify-between">
          <div>
            <CardTitle>Salary account book</CardTitle>
            <p className="text-sm text-muted-foreground">
              Unpaid monthly salaries accumulate here. Withdrawals settle the
              oldest month first.
            </p>
          </div>
          <Button
            disabled={available <= 0}
            onClick={() => {
              setEditing(null);
              setAmount("");
              setDate(new Date().toISOString().slice(0, 10));
              setMethod("cash");
              setAccountSelection({});
              setNotes("");
              setOpen(true);
            }}
          >
            Withdraw salary
          </Button>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-3 sm:grid-cols-3">
            <Summary label="Total credited" value={account.totalAccrued} />
            <Summary label="Total withdrawn" value={account.totalWithdrawn} />
            <Summary
              label="Available balance"
              value={account.availableBalance}
            />
          </div>
          <DataTable
            columns={columns}
            data={account.runs}
            getRowId={(row) => row.id}
          />
          <h3 className="font-medium">Withdrawal history</h3>
          <DataTable
            columns={withdrawalColumns}
            data={account.withdrawals ?? []}
            getRowId={(row) => row.id}
          />
        </CardContent>
      </Card>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {editing ? "Edit salary withdrawal" : "Withdraw accrued salary"}
            </DialogTitle>
          </DialogHeader>
          <p>Available: {money.format(editableAvailable)}</p>
          <div>
            <Label htmlFor="withdrawal-amount">Amount</Label>
            <Input
              id="withdrawal-amount"
              type="number"
              min="0.01"
              max={editableAvailable}
              step="0.01"
              value={amount}
              onChange={(event) => setAmount(event.target.value)}
            />
          </div>
          <div>
            <Label htmlFor="withdrawal-date">Date</Label>
            <Input
              id="withdrawal-date"
              type="date"
              value={date}
              onChange={(event) => setDate(event.target.value)}
            />
          </div>
          <div>
            <Label>Method</Label>
            <Select
              value={method}
              onValueChange={(value) => {
                setMethod(value as "cash" | "bank");
                setAccountSelection({});
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
          <PaymentAccountFields
            paymentMethod={method}
            value={accountSelection}
            onChange={setAccountSelection}
          />
          <div>
            <Label htmlFor="withdrawal-notes">Notes (optional)</Label>
            <Input
              id="withdrawal-notes"
              value={notes}
              maxLength={255}
              onChange={(event) => setNotes(event.target.value)}
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <Button
              isLoading={state.isLoading || updateState.isLoading}
              onClick={async () => {
                const value = Number(amount);
                if (
                  !Number.isFinite(value) ||
                  value <= 0 ||
                  value > editableAvailable
                )
                  return toast.error(
                    "Enter an amount within the available balance",
                  );
                try {
                  const body = {
                    amount: value,
                    withdrawalDate: date,
                    paymentMethod: method,
                    ...accountSelection,
                    notes,
                  };
                  if (editing)
                    await updateWithdrawal({
                      employeeId,
                      withdrawalId: editing.id,
                      body,
                    }).unwrap();
                  else await withdraw({ employeeId, body }).unwrap();
                  toast.success(
                    editing
                      ? "Salary withdrawal updated"
                      : "Salary withdrawal recorded",
                  );
                  setOpen(false);
                  setAmount("");
                } catch (error) {
                  toast.error(getApiErrorMessage(error));
                }
              }}
            >
              {editing ? "Save changes" : "Confirm withdrawal"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      <Dialog
        open={Boolean(deleting)}
        onOpenChange={(value) => !value && setDeleting(null)}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete salary withdrawal</DialogTitle>
          </DialogHeader>
          <p>
            This will return the payment to its original cash or bank account
            and restore the employee's available salary balance.
          </p>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleting(null)}>
              Cancel
            </Button>
            <Button
              variant="destructive"
              isLoading={deleteState.isLoading}
              onClick={async () => {
                if (!deleting) return;
                try {
                  await deleteWithdrawal({
                    employeeId,
                    withdrawalId: deleting.id,
                  }).unwrap();
                  toast.success("Salary withdrawal deleted and refunded");
                  setDeleting(null);
                } catch (error) {
                  toast.error(getApiErrorMessage(error));
                }
              }}
            >
              Delete withdrawal
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      <Dialog
        open={Boolean(cancelling)}
        onOpenChange={(open) => !open && setCancelling(null)}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Cancel payroll</DialogTitle>
          </DialogHeader>
          <p>
            Cancel payroll for {cancelling?.periodMonth}/
            {cancelling?.periodYear}? This reverses the salary credit and
            refunds any payment allocated to this month to its original account.
          </p>
          <DialogFooter>
            <Button variant="outline" onClick={() => setCancelling(null)}>
              Keep payroll
            </Button>
            <Button
              variant="destructive"
              isLoading={cancelState.isLoading}
              onClick={async () => {
                if (!cancelling) return;
                try {
                  await cancelPayroll({
                    employeeId,
                    runId: cancelling.id,
                  }).unwrap();
                  toast.success("Payroll cancelled");
                  setCancelling(null);
                } catch (error) {
                  toast.error(getApiErrorMessage(error));
                }
              }}
            >
              Confirm cancellation
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
function Summary({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-md border p-3">
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className="text-lg font-semibold">{money.format(Number(value))}</p>
    </div>
  );
}
