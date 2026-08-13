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
  useWithdrawSalaryMutation,
} from "../employeesApi";
import type { SalaryRun } from "../types";
const money = new Intl.NumberFormat("en-PK", {
  style: "currency",
  currency: "PKR",
});

export function SalaryAccountCard({ employeeId }: { employeeId: string }) {
  const query = useGetSalaryAccountQuery(employeeId);
  const [withdraw, state] = useWithdrawSalaryMutation();
  const [open, setOpen] = useState(false);
  const [amount, setAmount] = useState("");
  const [date, setDate] = useState(new Date().toISOString().slice(0, 10));
  const [method, setMethod] = useState<"cash" | "bank">("cash");
  const [accountSelection, setAccountSelection] = useState<PaymentAccountSelection>({});
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
  if (!account) return null;
  const available = Number(account.availableBalance);
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
          <Button disabled={available <= 0} onClick={() => setOpen(true)}>
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
        </CardContent>
      </Card>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Withdraw accrued salary</DialogTitle>
          </DialogHeader>
          <p>Available: {money.format(available)}</p>
          <div>
            <Label>Amount</Label>
            <Input
              type="number"
              min="0.01"
              max={available}
              step="0.01"
              value={amount}
              onChange={(event) => setAmount(event.target.value)}
            />
          </div>
          <div>
            <Label>Date</Label>
            <Input
              type="date"
              value={date}
              onChange={(event) => setDate(event.target.value)}
            />
          </div>
          <div>
            <Label>Method</Label>
            <Select
              value={method}
              onValueChange={(value) => { setMethod(value as "cash" | "bank"); setAccountSelection({}); }}
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
          <PaymentAccountFields paymentMethod={method} value={accountSelection} onChange={setAccountSelection} />
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <Button
              isLoading={state.isLoading}
              onClick={async () => {
                const value = Number(amount);
                if (!Number.isFinite(value) || value <= 0 || value > available)
                  return toast.error(
                    "Enter an amount within the available balance",
                  );
                try {
                  await withdraw({
                    employeeId,
                    body: {
                      amount: value,
                      withdrawalDate: date,
                      paymentMethod: method,
                      ...accountSelection,
                    },
                  }).unwrap();
                  toast.success("Salary withdrawal recorded");
                  setOpen(false);
                  setAmount("");
                } catch (error) {
                  toast.error(getApiErrorMessage(error));
                }
              }}
            >
              Confirm withdrawal
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
