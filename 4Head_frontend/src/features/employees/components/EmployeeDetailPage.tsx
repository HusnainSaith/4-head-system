import { useState } from "react";
import { useSelector } from "react-redux";
import { useParams } from "react-router-dom";
import { toast } from "sonner";
import { z } from "zod";
import { DataTable, type DataTableColumn } from "@/components/common/DataTable";
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
import {
  selectUserDepartmentId,
  selectUserRole,
} from "@/features/auth/authSlice";
import { getApiErrorMessage } from "@/lib/api-error";
import { Role } from "@/types/enums";
import { PaymentAccountFields } from "@/features/accounts/components";
import type { PaymentAccountSelection } from "@/features/accounts/types";
import {
  useCreateAdvanceMutation,
  useCreateBonusMutation,
  useConfirmAdvanceMutation,
  useGetEmployeeQuery,
  useListAdvancesQuery,
  useListBonusesQuery,
} from "../employeesApi";
import type { EmployeeAdvance, EmployeeBonus } from "../types";
import { SalaryAccountCard } from "./SalaryAccountCard";

const money = new Intl.NumberFormat("en-PK", {
  style: "currency",
  currency: "PKR",
});
const recordSchema = z.object({
  amount: z.coerce.number().positive(),
  date: z.string().min(1),
  reason: z.string(),
});
export function EmployeeDetailPage({
  mode = "all",
}: {
  mode?: "all" | "advances" | "bonuses";
}) {
  const { id = "" } = useParams();
  const role = useSelector(selectUserRole);
  const assignedDepartmentId = useSelector(selectUserDepartmentId);
  const employee = useGetEmployeeQuery(id, { skip: !id });
  const employeeDepartmentId = employee.data?.data.departmentId;
  const hasDepartmentAccess =
    role !== Role.DEPARTMENT_STAFF ||
    (!!assignedDepartmentId && employeeDepartmentId === assignedDepartmentId);
  const skipEmployeeChildren = !id || !hasDepartmentAccess;
  const skipAdvances = skipEmployeeChildren || mode === "bonuses";
  const skipBonuses = skipEmployeeChildren || mode === "advances";
  const advances = useListAdvancesQuery(id, { skip: skipAdvances });
  const bonuses = useListBonusesQuery(id, { skip: skipBonuses });
  const [dialog, setDialog] = useState<"advance" | "bonus" | null>(null);
  const [confirmingAdvance, setConfirmingAdvance] =
    useState<EmployeeAdvance | null>(null);
  const [advancePaymentMethod, setAdvancePaymentMethod] = useState<
    "cash" | "bank"
  >("cash");
  const [advanceAccount, setAdvanceAccount] = useState<PaymentAccountSelection>({});
  const [createAdvance, advanceState] = useCreateAdvanceMutation();
  const [createBonus, bonusState] = useCreateBonusMutation();
  const [confirmAdvance, confirmState] = useConfirmAdvanceMutation();
  const canConfirmAdvance = role === Role.OWNER || role === Role.ACCOUNTANT;
  if (
    employee.isLoading ||
    (!skipAdvances && advances.isLoading) ||
    (!skipBonuses && bonuses.isLoading)
  )
    return <PageSkeleton rows={6} />;
  if (employee.data && !hasDepartmentAccess)
    return (
      <PageContainer>
        <ErrorState
          title="Not authorized"
          description="Department staff can only view employees in their assigned department."
        />
      </PageContainer>
    );
  if (
    employee.isError ||
    (!skipAdvances && advances.isError) ||
    (!skipBonuses && bonuses.isError)
  )
    return (
      <PageContainer>
        <ErrorState
          title="Employee details could not be loaded"
          error={employee.error ?? advances.error ?? bonuses.error}
          onRetry={() => {
            void employee.refetch();
            if (!skipAdvances) {
              void advances.refetch();
            }
            if (!skipBonuses) {
              void bonuses.refetch();
            }
          }}
        />
      </PageContainer>
    );
  const advanceColumns: DataTableColumn<EmployeeAdvance>[] = [
    {
      id: "date",
      header: "Advance date",
      cell: (a) => String(a.advanceDate).slice(0, 10),
    },
    {
      id: "amount",
      header: "Amount",
      cell: (a) => money.format(Number(a.amount)),
    },
    { id: "reason", header: "Reason", cell: (a) => a.reason ?? "—" },
    {
      id: "status",
      header: "Recovery status",
      cell: (a) => (
        <Badge
          variant={
            a.recoveryStatus === "fully_recovered"
              ? "success"
              : a.recoveryStatus === "partially_recovered"
                ? "warning"
                : "secondary"
          }
        >
          {a.recoveryStatus.replaceAll("_", " ")}
        </Badge>
      ),
    },
    {
      id: "recovery",
      header: "Recovered / total",
      cell: (a) =>
        `${money.format(Number(a.amountRecovered))} / ${money.format(Number(a.amount))} (${money.format(Number(a.amount) - Number(a.amountRecovered))} remaining)`,
    },
    {
      id: "disbursement",
      header: "Disbursement",
      cell: (advance) => (
        <div className="flex items-center gap-2">
          <Badge
            variant={
              advance.disbursementStatus === "confirmed" ? "success" : "warning"
            }
          >
            {advance.disbursementStatus}
          </Badge>
          {canConfirmAdvance && advance.disbursementStatus === "pending" ? (
            <Button size="sm" onClick={() => setConfirmingAdvance(advance)}>
              Confirm advance
            </Button>
          ) : null}
        </div>
      ),
    },
  ];
  const bonusColumns: DataTableColumn<EmployeeBonus>[] = [
    {
      id: "date",
      header: "Bonus date",
      cell: (b) => String(b.bonusDate).slice(0, 10),
    },
    {
      id: "amount",
      header: "Amount",
      cell: (b) => money.format(Number(b.amount)),
    },
    { id: "reason", header: "Reason", cell: (b) => b.reason ?? "—" },
  ];
  return (
    <PageContainer>
      <PageHeader
        title={employee.data?.data.fullName ?? "Employee"}
        description={`${employee.data?.data.designation} · ${employee.data?.data.department?.name ?? ""}`}
      />
      {mode === "all" && (role === Role.OWNER || role === Role.ACCOUNTANT) ? (
        <SalaryAccountCard employeeId={id} />
      ) : null}
      {mode !== "bonuses" ? (
        <Card>
          <CardHeader className="flex-row items-center justify-between">
            <CardTitle>Advances</CardTitle>
            <Button onClick={() => setDialog("advance")}>Record Advance</Button>
          </CardHeader>
          <CardContent>
            <DataTable
              columns={advanceColumns}
              data={advances.data?.data ?? []}
              getRowId={(a) => a.id}
            />
            <p className="text-sm text-muted-foreground">
              Recovery status and amount recovered are updated only by backend
              payroll processing.
            </p>
          </CardContent>
        </Card>
      ) : null}
      {mode !== "advances" ? (
        <Card>
          <CardHeader className="flex-row items-center justify-between">
            <CardTitle>Bonuses</CardTitle>
            <Button onClick={() => setDialog("bonus")}>Record Bonus</Button>
          </CardHeader>
          <CardContent>
            <DataTable
              columns={bonusColumns}
              data={bonuses.data?.data ?? []}
              getRowId={(b) => b.id}
            />
          </CardContent>
        </Card>
      ) : null}
      <RecordDialog
        kind={dialog}
        loading={advanceState.isLoading || bonusState.isLoading}
        onClose={() => setDialog(null)}
        onSubmit={async (amount, date, reason) => {
          try {
            if (dialog === "advance")
              await createAdvance({
                employeeId: id,
                body: {
                  amount,
                  advanceDate: date,
                  reason: reason || undefined,
                },
              }).unwrap();
            else
              await createBonus({
                employeeId: id,
                body: { amount, bonusDate: date, reason: reason || undefined },
              }).unwrap();
            toast.success(
              dialog === "advance" ? "Advance recorded" : "Bonus recorded",
            );
            setDialog(null);
          } catch (error) {
            toast.error(getApiErrorMessage(error));
          }
        }}
      />
      <Dialog
        open={Boolean(confirmingAdvance)}
        onOpenChange={(open) => !open && setConfirmingAdvance(null)}
      >
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Confirm advance payment</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground">
            This posts {money.format(Number(confirmingAdvance?.amount ?? 0))}
            against the employee-advance account and reduces the selected
            department&apos;s cash or bank balance.
          </p>
          <div className="space-y-2">
            <Label>Payment method</Label>
            <Select
              value={advancePaymentMethod}
              onValueChange={(value) =>
                (setAdvancePaymentMethod(value as "cash" | "bank"), setAdvanceAccount({}))
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
          </div>
          <PaymentAccountFields paymentMethod={advancePaymentMethod} value={advanceAccount} onChange={setAdvanceAccount} departmentId={employeeDepartmentId} />
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setConfirmingAdvance(null)}
            >
              Cancel
            </Button>
            <Button
              isLoading={confirmState.isLoading}
              onClick={() => {
                if (!confirmingAdvance) return;
                void confirmAdvance({
                  employeeId: id,
                  advanceId: confirmingAdvance.id,
                  paymentMethod: advancePaymentMethod,
                  ...advanceAccount,
                })
                  .unwrap()
                  .then(() => {
                    toast.success("Advance confirmed and paid");
                    setConfirmingAdvance(null);
                  })
                  .catch((error) => toast.error(getApiErrorMessage(error)));
              }}
            >
              Confirm and pay
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </PageContainer>
  );
}

export function EmployeeAdvancesPage() {
  return <EmployeeDetailPage mode="advances" />;
}

export function EmployeeBonusesPage() {
  return <EmployeeDetailPage mode="bonuses" />;
}
function RecordDialog({
  kind,
  loading,
  onClose,
  onSubmit,
}: {
  kind: "advance" | "bonus" | null;
  loading: boolean;
  onClose: () => void;
  onSubmit: (amount: number, date: string, reason: string) => Promise<void>;
}) {
  const [amount, setAmount] = useState("");
  const [date, setDate] = useState(new Date().toISOString().slice(0, 10));
  const [reason, setReason] = useState("");
  return (
    <Dialog
      open={kind !== null}
      onOpenChange={(v) => {
        if (!v) onClose();
      }}
    >
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Record {kind}</DialogTitle>
        </DialogHeader>
        <form
          className="space-y-3"
          onSubmit={(e) => {
            e.preventDefault();
            const parsed = recordSchema.safeParse({ amount, date, reason });
            if (parsed.success)
              void onSubmit(
                parsed.data.amount,
                parsed.data.date,
                parsed.data.reason,
              );
          }}
        >
          <div>
            <Label htmlFor="record-amount">Amount</Label>
            <Input
              id="record-amount"
              type="number"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
            />
          </div>
          <div>
            <Label htmlFor="record-date">Date</Label>
            <Input
              id="record-date"
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
            />
          </div>
          <div>
            <Label htmlFor="record-reason">Reason</Label>
            <Input
              id="record-reason"
              value={reason}
              onChange={(e) => setReason(e.target.value)}
            />
          </div>
          <DialogFooter>
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
