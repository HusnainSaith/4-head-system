import { useState } from "react";
import { useParams } from "react-router-dom";
import { toast } from "sonner";
import { ErrorState } from "@/components/common/ErrorState";
import { PageHeader } from "@/components/common/PageHeader";
import { PageSkeleton } from "@/components/common/Skeletons";
import { PageContainer } from "@/components/layout/PageContainer";
import { Badge } from "@/components/ui/badge";
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
import { InvoiceButton } from "@/features/invoices/components/InvoiceButton";
import { PaymentAccountFields } from "@/features/accounts/components";
import type { PaymentAccountSelection } from "@/features/accounts/types";
import {
  useGetSalaryRunQuery,
  useMarkSalaryRunPaidMutation,
} from "../employeesApi";
const money = new Intl.NumberFormat("en-PK", {
  style: "currency",
  currency: "PKR",
});
export function SalaryRunDetailPage() {
  const { id = "" } = useParams();
  const query = useGetSalaryRunQuery(id, { skip: !id });
  const [open, setOpen] = useState(false);
  const [pay, state] = useMarkSalaryRunPaidMutation();
  const [date, setDate] = useState(new Date().toISOString().slice(0, 10));
  const [method, setMethod] = useState<"cash" | "bank">("cash");
  const [accountSelection, setAccountSelection] = useState<PaymentAccountSelection>({});
  if (query.isLoading) return <PageSkeleton rows={4} />;
  if (query.isError || !query.data)
    return (
      <PageContainer>
        <ErrorState
          title="Salary run could not be loaded"
          error={query.error}
          onRetry={() => void query.refetch()}
        />
      </PageContainer>
    );
  const run = query.data.data;
  return (
    <PageContainer>
      <PageHeader
        title={`Payslip — ${run.employee.fullName}`}
        description={`${run.periodMonth}/${run.periodYear}`}
        actions={
          <div className="flex items-center gap-2">
            <InvoiceButton sourceType="salary" sourceId={run.id} />
            <Badge
              variant={run.paymentStatus === "paid" ? "success" : "warning"}
            >
              {run.paymentStatus}
            </Badge>
          </div>
        }
      />
      <Card>
        <CardHeader>
          <CardTitle>Salary breakdown</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          <div className="flex justify-between">
            <span>Base salary</span>
            <span>{money.format(Number(run.baseSalary))}</span>
          </div>
          <div>
            <p>Bonuses</p>
            {run.bonuses?.length ? (
              run.bonuses.map((b) => (
                <div className="flex justify-between pl-4" key={b.id}>
                  <span>{b.reason ?? String(b.bonusDate).slice(0, 10)}</span>
                  <span>{money.format(Number(b.amount))}</span>
                </div>
              ))
            ) : (
              <div className="flex justify-between">
                <span>Total bonuses</span>
                <span>{money.format(Number(run.totalBonuses))}</span>
              </div>
            )}
          </div>
          <div className="flex justify-between">
            <span>
              Advances recovered (backend total; itemized linkage is not stored)
            </span>
            <span>-{money.format(Number(run.totalAdvancesDeducted))}</span>
          </div>
          <div className="flex justify-between border-t pt-2 text-lg font-semibold">
            <span>Net payable</span>
            <span>{money.format(Number(run.netPayable))}</span>
          </div>
          {run.paymentStatus === "pending" ? (
            <Button onClick={() => setOpen(true)}>Mark as Paid</Button>
          ) : (
            <p>
              Paid {String(run.paidDate).slice(0, 10)} via {run.paymentMethod}
            </p>
          )}
        </CardContent>
      </Card>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Mark salary as paid</DialogTitle>
          </DialogHeader>
          <div>
            <Label htmlFor="paid-date">Paid date</Label>
            <Input
              id="paid-date"
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
            />
          </div>
          <div>
            <Label>Payment method</Label>
            <Select
              value={method}
              onValueChange={(v) => { setMethod(v as "cash" | "bank"); setAccountSelection({}); }}
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
          <PaymentAccountFields paymentMethod={method} value={accountSelection} onChange={setAccountSelection} departmentId={run.employee.departmentId} />
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <Button
              isLoading={state.isLoading}
              onClick={async () => {
                try {
                  await pay({
                    id,
                    body: { paidDate: date, paymentMethod: method, ...accountSelection },
                  }).unwrap();
                  toast.success("Salary marked as paid");
                  setOpen(false);
                } catch (error) {
                  toast.error(getApiErrorMessage(error));
                }
              }}
            >
              Confirm Payment
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </PageContainer>
  );
}
