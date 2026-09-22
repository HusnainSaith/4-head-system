import { useEffect, useState } from "react";
import { useSelector } from "react-redux";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { PageHeader } from "@/components/common/PageHeader";
import { ErrorState } from "@/components/common/ErrorState";
import {
  useGetDepartmentBalancesQuery,
  useListPartySettlementsQuery,
} from "@/features/parties/partiesApi";
import { useListDepartmentsQuery } from "@/features/departments/departmentsApi";
import { PartySettlementDialog } from "./PartySettlementDialog";
import { PartySettlementHistory } from "./PartySettlementHistory";
import {
  selectUserDepartmentId,
  selectUserRole,
} from "@/features/auth/authSlice";
import { Role } from "@/types/enums";

const ALL_DEPARTMENTS = "all";

export function PartySettlementPage() {
  const [showDialog, setShowDialog] = useState(false);
  const assignedDepartmentId = useSelector(selectUserDepartmentId);
  const role = useSelector(selectUserRole);
  const management = role === Role.OWNER || role === Role.ACCOUNTANT;
  const [departmentFilter, setDepartmentFilter] = useState(
    assignedDepartmentId ?? ALL_DEPARTMENTS,
  );
  const departments = useListDepartmentsQuery();

  useEffect(() => {
    if (assignedDepartmentId) setDepartmentFilter(assignedDepartmentId);
  }, [assignedDepartmentId]);

  const selectedDepartmentId =
    departmentFilter === ALL_DEPARTMENTS ? undefined : departmentFilter;
  const settlements = useListPartySettlementsQuery(
    selectedDepartmentId ? { departmentId: selectedDepartmentId } : undefined,
  );
  const balances = useGetDepartmentBalancesQuery(selectedDepartmentId ?? "", {
    skip: !selectedDepartmentId,
  });
  const balanceData = balances.data?.data;

  return (
    <div className="space-y-6 p-6">
      <PageHeader
        title="Party Settlements"
        description="View settlements across all departments. Editing adjusts the settlement balance; deleting reverses it before removal."
        actions={
          management ? (
            <Button
              onClick={() => setShowDialog(true)}
            >
              Create Settlement
            </Button>
          ) : undefined
        }
      />

      <div className="max-w-md space-y-2">
        <label className="text-sm font-medium">Department</label>
        <Select
          value={departmentFilter}
          onValueChange={setDepartmentFilter}
          disabled={Boolean(assignedDepartmentId)}
        >
          <SelectTrigger>
            <SelectValue placeholder="Select department" />
          </SelectTrigger>
          <SelectContent>
            {!assignedDepartmentId ? (
              <SelectItem value={ALL_DEPARTMENTS}>All departments</SelectItem>
            ) : null}
            {(departments.data?.data ?? []).map((department) => (
              <SelectItem key={department.id} value={department.id}>
                {department.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {selectedDepartmentId ? (
        <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
          <SummaryCard
            title="Total Payable"
            value={Number(balanceData?.totalPayable ?? 0)}
            detail={`${balanceData?.parties.filter((party) => Number(party.balance) > 0).length ?? 0} parties`}
          />
          <SummaryCard
            title="Total Receivable"
            value={Number(balanceData?.totalReceivable ?? 0)}
            detail={`${balanceData?.parties.filter((party) => Number(party.balance) < 0).length ?? 0} parties`}
          />
          <SummaryCard
            title="Net Position"
            value={
              Number(balanceData?.totalPayable ?? 0) -
              Number(balanceData?.totalReceivable ?? 0)
            }
            detail="Payable - Receivable"
          />
        </div>
      ) : null}

      <Card>
        <CardHeader>
          <CardTitle>Settlement History</CardTitle>
        </CardHeader>
        <CardContent>
          {settlements.isError ? (
            <ErrorState
              title="Settlements could not be loaded"
              error={settlements.error}
              onRetry={() => void settlements.refetch()}
            />
          ) : (
            <PartySettlementHistory
              settlements={settlements.data?.data ?? []}
              isLoading={settlements.isLoading}
              canManage={management}
            />
          )}
        </CardContent>
      </Card>

      <PartySettlementDialog
        open={showDialog}
        onOpenChange={setShowDialog}
        departmentId={selectedDepartmentId}
      />
    </div>
  );
}

function SummaryCard({
  title,
  value,
  detail,
}: {
  title: string;
  value: number;
  detail: string;
}) {
  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-medium text-muted-foreground">
          {title}
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="text-2xl font-bold">Rs. {value.toFixed(2)}</div>
        <p className="mt-1 text-xs text-muted-foreground">{detail}</p>
      </CardContent>
    </Card>
  );
}
