import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { PageHeader } from "@/components/common/PageHeader";
import { PageContainer } from "@/components/layout/PageContainer";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { getApiErrorMessage } from "@/lib/api-error";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  useListAdvancesQuery,
  useListBonusesQuery,
  useListEmployeesQuery,
  useRunPayrollMutation,
} from "../employeesApi";

export function RunPayrollPage() {
  const navigate = useNavigate();
  const [employeeId, setEmployeeId] = useState("");
  const now = new Date();
  const [month, setMonth] = useState(now.getMonth() + 1);
  const [year, setYear] = useState(now.getFullYear());
  const [recoverAdvances, setRecoverAdvances] = useState(false);
  const [deduction, setDeduction] = useState("0");
  const [deductionReason, setDeductionReason] = useState("");
  const employees = useListEmployeesQuery();
  const advances = useListAdvancesQuery(employeeId, { skip: !employeeId });
  const bonuses = useListBonusesQuery(employeeId, { skip: !employeeId });
  const [run, state] = useRunPayrollMutation();
  const employee = employees.data?.data.find((item) => item.id === employeeId);
  const periodBonuses = (bonuses.data?.data ?? []).filter((bonus) => {
    const date = new Date(bonus.bonusDate);
    return date.getMonth() + 1 === month && date.getFullYear() === year;
  });
  const recoverableAdvances = (advances.data?.data ?? []).filter(
    (advance) =>
      advance.disbursementStatus === "confirmed" &&
      advance.recoveryStatus !== "fully_recovered",
  );

  return (
    <PageContainer>
      <PageHeader
        title="Run Payroll"
        description="Calculate monthly salary, including bonuses, leave charges, fines, and optional advance recovery."
      />
      <Card>
        <CardContent className="space-y-4 pt-6">
          <div>
            <Label>Employee</Label>
            <Select
              value={employeeId}
              onValueChange={(value) => {
                setEmployeeId(value);
                setDeduction("0");
                setDeductionReason("");
                setRecoverAdvances(false);
              }}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select employee" />
              </SelectTrigger>
              <SelectContent>
                {(employees.data?.data ?? [])
                  .filter((item) => item.isActive)
                  .map((item) => (
                    <SelectItem key={item.id} value={item.id}>
                      {item.fullName}
                    </SelectItem>
                  ))}
              </SelectContent>
            </Select>
          </div>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div>
              <Label htmlFor="payroll-month">Period month</Label>
              <Input
                id="payroll-month"
                type="number"
                min={1}
                max={12}
                value={month}
                onChange={(event) => setMonth(Number(event.target.value))}
              />
            </div>
            <div>
              <Label htmlFor="payroll-year">Period year</Label>
              <Input
                id="payroll-year"
                type="number"
                min={2000}
                value={year}
                onChange={(event) => setYear(Number(event.target.value))}
              />
            </div>
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <Label htmlFor="payroll-deduction">
                Leave charges / fine amount
              </Label>
              <Input
                id="payroll-deduction"
                type="number"
                min="0"
                step="0.01"
                value={deduction}
                onChange={(event) => setDeduction(event.target.value)}
              />
              <p className="text-sm text-muted-foreground">
                This amount is subtracted from this month's salary.
              </p>
            </div>
            <div>
              <Label htmlFor="payroll-deduction-reason">
                Deduction reason (optional)
              </Label>
              <Input
                id="payroll-deduction-reason"
                maxLength={255}
                value={deductionReason}
                onChange={(event) => setDeductionReason(event.target.value)}
              />
            </div>
          </div>
          {employee ? (
            <div className="rounded border p-4 text-sm">
              <p className="font-medium">Known inputs before processing</p>
              <p>Base salary: {employee.baseSalary}</p>
              <p>Leave charges / fine: {Number(deduction || 0).toFixed(2)}</p>
              <p>
                Bonuses in period:{" "}
                {periodBonuses.map((b) => b.amount).join(", ") || "None"}
              </p>
              <p>
                Recoverable advances:{" "}
                {recoverableAdvances
                  .map((a) => `${a.amount} (${a.amountRecovered} recovered)`)
                  .join(", ") || "None"}
              </p>
              <div className="mt-3 flex items-start gap-2 rounded bg-muted/50 p-3">
                <Checkbox
                  id="recover-advances"
                  checked={recoverAdvances}
                  disabled={recoverableAdvances.length === 0}
                  onCheckedChange={(checked) =>
                    setRecoverAdvances(checked === true)
                  }
                />
                <Label htmlFor="recover-advances" className="leading-5">
                  Receive outstanding advance from this salary
                </Label>
              </div>
              <p className="mt-2 text-muted-foreground">
                When selected, the backend deducts confirmed advances oldest
                first. The backend remains authoritative for the final net pay.
              </p>
            </div>
          ) : null}
          <Button
            disabled={!employeeId}
            isLoading={state.isLoading}
            onClick={async () => {
              const value = Number(deduction || "0");
              const gross =
                Number(employee?.baseSalary ?? 0) +
                periodBonuses.reduce(
                  (sum, bonus) => sum + Number(bonus.amount),
                  0,
                );
              if (
                !Number.isInteger(month) ||
                month < 1 ||
                month > 12 ||
                !Number.isInteger(year) ||
                year < 2000 ||
                year > 9999
              )
                return toast.error("Enter a valid payroll month and year");
              if (
                !Number.isFinite(value) ||
                value < 0 ||
                value > gross ||
                Math.abs(value * 100 - Math.round(value * 100)) > 0.000001
              )
                return toast.error(
                  "Enter a deduction between zero and the salary plus bonuses, with at most two decimal places",
                );
              try {
                const result = await run({
                  employeeId,
                  periodMonth: month,
                  periodYear: year,
                  recoverAdvances,
                  manualDeduction: value,
                  deductionReason: deductionReason.trim() || undefined,
                }).unwrap();
                toast.success("Payroll run completed");
                navigate(`/payroll/runs/${result.data.id}`);
              } catch (error) {
                const apiError = error as { status?: number };
                if (apiError.status === 409)
                  toast.error(
                    `A salary run for ${employee?.fullName ?? "this employee"} for ${month}/${year} already exists`,
                  );
                else toast.error(getApiErrorMessage(error));
              }
            }}
          >
            Run Payroll
          </Button>
        </CardContent>
      </Card>
    </PageContainer>
  );
}
