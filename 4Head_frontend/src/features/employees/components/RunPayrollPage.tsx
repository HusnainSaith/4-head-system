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
        description="Payroll is run for one employee at a time; the backend does not support department batches."
      />
      <Card>
        <CardContent className="space-y-4 pt-6">
          <div>
            <Label>Employee</Label>
            <Select value={employeeId} onValueChange={setEmployeeId}>
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
          {employee ? (
            <div className="rounded border p-4 text-sm">
              <p className="font-medium">Known inputs before processing</p>
              <p>Base salary: {employee.baseSalary}</p>
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
              try {
                const result = await run({
                  employeeId,
                  periodMonth: month,
                  periodYear: year,
                  recoverAdvances,
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
