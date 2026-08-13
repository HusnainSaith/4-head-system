import { useMemo, useState } from "react";
import { useSelector } from "react-redux";
import { toast } from "sonner";
import { DataTable, type DataTableColumn } from "@/components/common/DataTable";
import { ErrorState } from "@/components/common/ErrorState";
import { PageHeader } from "@/components/common/PageHeader";
import { PageSkeleton } from "@/components/common/Skeletons";
import { PageContainer } from "@/components/layout/PageContainer";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
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
import { useListDepartmentsQuery } from "@/features/vehicles/vehiclesApi";
import { getApiErrorMessage } from "@/lib/api-error";
import { Role } from "@/types/enums";
import {
  useCreateCommitteeMutation,
  useListCommitteesQuery,
  useRecordInstallmentMutation,
  useRecordPayoutMutation,
} from "../committeesApi";
import type {
  Committee,
  CreateCommitteeRequest,
  CreateInstallmentRequest,
  CreatePayoutRequest,
} from "../types";

const money = new Intl.NumberFormat("en-PK", {
  style: "currency",
  currency: "PKR",
});

export function CommitteesPage() {
  const role = useSelector(selectUserRole);
  const assignedDepartmentId = useSelector(selectUserDepartmentId);
  const management = role === Role.OWNER || role === Role.ACCOUNTANT;
  const [departmentId, setDepartmentId] = useState(assignedDepartmentId ?? "");
  const [open, setOpen] = useState(false);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [installmentOpen, setInstallmentOpen] = useState(false);
  const [payoutOpen, setPayoutOpen] = useState(false);

  const effectiveDepartment = management
    ? departmentId
    : (assignedDepartmentId ?? "");
  const committeesQuery = useListCommitteesQuery(
    { departmentId: effectiveDepartment || undefined },
    { skip: !management && !assignedDepartmentId },
  );
  const departments = useListDepartmentsQuery(undefined, { skip: !management });
  const [createCommittee, createState] = useCreateCommitteeMutation();
  const [recordInstallment, installmentState] = useRecordInstallmentMutation();
  const [recordPayout, payoutState] = useRecordPayoutMutation();

  const columns = useMemo<DataTableColumn<Committee>[]>(
    () => [
      {
        id: "name",
        header: "Name",
        cell: (committee) => committee.name,
      },
      {
        id: "department",
        header: "Department",
        cell: (committee) =>
          committee.department?.name ?? committee.departmentId,
      },
      {
        id: "installmentAmount",
        header: "Installment",
        cell: (committee) => money.format(Number(committee.installmentAmount)),
      },
      {
        id: "members",
        header: "Members",
        cell: (committee) => committee.totalMembers,
      },
      {
        id: "installmentCount",
        header: "Installments",
        cell: (committee) =>
          `${committee.installmentCount} / ${committee.totalMembers}`,
      },
      {
        id: "currentAmount",
        header: "Current amount",
        cell: (committee) => money.format(Number(committee.currentAmount)),
      },
      {
        id: "status",
        header: "Status",
        cell: (committee) => <Badge>{committee.status}</Badge>,
      },
      {
        id: "actions",
        header: "Actions",
        cell: (committee) => (
          <div className="flex gap-2">
            <Button
              size="sm"
              variant="outline"
              onClick={() => {
                setSelectedId(committee.id);
                setInstallmentOpen(true);
              }}
            >
              Add Installment
            </Button>
            <Button
              size="sm"
              variant="outline"
              onClick={() => {
                setSelectedId(committee.id);
                setPayoutOpen(true);
              }}
            >
              Record Payout
            </Button>
          </div>
        ),
      },
    ],
    [],
  );

  if (committeesQuery.isLoading) return <PageSkeleton rows={6} />;
  if (committeesQuery.isError) {
    return (
      <PageContainer>
        <ErrorState
          title="Committees could not be loaded"
          error={committeesQuery.error}
          onRetry={() => void committeesQuery.refetch()}
        />
      </PageContainer>
    );
  }

  return (
    <PageContainer>
      <PageHeader
        title="Committees"
        description="Installments decrease the current amount; payouts increase it. The Installments column shows recorded / total."
        actions={<Button onClick={() => setOpen(true)}>New Committee</Button>}
      />
      {management ? (
        <div className="mb-4 max-w-sm">
          <Label htmlFor="committee-department-filter">Department filter</Label>
          <Select
            value={departmentId || "all"}
            onValueChange={(value) =>
              setDepartmentId(value === "all" ? "" : value)
            }
          >
            <SelectTrigger id="committee-department-filter">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All departments</SelectItem>
              {(departments.data?.data ?? []).map((department) => (
                <SelectItem key={department.id} value={department.id}>
                  {department.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      ) : null}
      <DataTable
        columns={columns}
        data={committeesQuery.data?.data ?? []}
        getRowId={(committee) => committee.id}
      />
      <CommitteeDialog
        open={open}
        departments={departments.data?.data ?? []}
        loading={createState.isLoading}
        onClose={() => setOpen(false)}
        onSubmit={async (body) => {
          try {
            await createCommittee(body).unwrap();
            toast.success("Committee created");
            setOpen(false);
          } catch (error) {
            toast.error(getApiErrorMessage(error));
          }
        }}
      />
      <InstallmentDialog
        open={installmentOpen}
        committeeId={selectedId}
        loading={installmentState.isLoading}
        onClose={() => {
          setInstallmentOpen(false);
          setSelectedId(null);
        }}
        onSubmit={async (body) => {
          if (!selectedId) return;
          try {
            await recordInstallment({ id: selectedId, body }).unwrap();
            toast.success("Installment recorded");
            setInstallmentOpen(false);
            setSelectedId(null);
          } catch (error) {
            toast.error(getApiErrorMessage(error));
          }
        }}
      />
      <PayoutDialog
        open={payoutOpen}
        committeeId={selectedId}
        loading={payoutState.isLoading}
        onClose={() => {
          setPayoutOpen(false);
          setSelectedId(null);
        }}
        onSubmit={async (body) => {
          if (!selectedId) return;
          try {
            await recordPayout({ id: selectedId, body }).unwrap();
            toast.success("Payout recorded");
            setPayoutOpen(false);
            setSelectedId(null);
          } catch (error) {
            toast.error(getApiErrorMessage(error));
          }
        }}
      />
    </PageContainer>
  );
}

function CommitteeDialog({
  open,
  departments,
  loading,
  onClose,
  onSubmit,
}: {
  open: boolean;
  departments: Array<{ id: string; name: string }>;
  loading: boolean;
  onClose: () => void;
  onSubmit: (body: CreateCommitteeRequest) => Promise<void>;
}) {
  const [departmentId, setDepartmentId] = useState("");
  const [name, setName] = useState("");
  const [installmentAmount, setInstallmentAmount] = useState("");
  const [totalMembers, setTotalMembers] = useState("3");
  const [payoutPosition, setPayoutPosition] = useState("1");
  const [startDate, setStartDate] = useState(
    new Date().toISOString().slice(0, 10),
  );

  return (
    <Dialog open={open} onOpenChange={(value) => !value && onClose()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>New Committee</DialogTitle>
        </DialogHeader>
        <div className="space-y-3">
          <div className="space-y-2">
            <Label>Department</Label>
            <Select value={departmentId} onValueChange={setDepartmentId}>
              <SelectTrigger>
                <SelectValue placeholder="Select department" />
              </SelectTrigger>
              <SelectContent>
                {departments.map((department) => (
                  <SelectItem key={department.id} value={department.id}>
                    {department.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label>Name</Label>
            <Input
              value={name}
              onChange={(event) => setName(event.target.value)}
            />
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="space-y-2">
              <Label>Installment amount</Label>
              <Input
                type="number"
                value={installmentAmount}
                onChange={(event) => setInstallmentAmount(event.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label>Total members</Label>
              <Input
                type="number"
                value={totalMembers}
                onChange={(event) => setTotalMembers(event.target.value)}
              />
            </div>
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="space-y-2">
              <Label>Payout position</Label>
              <Input
                type="number"
                value={payoutPosition}
                onChange={(event) => setPayoutPosition(event.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label>Start date</Label>
              <Input
                type="date"
                value={startDate}
                onChange={(event) => setStartDate(event.target.value)}
              />
            </div>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button
            disabled={loading || !departmentId || !name || !installmentAmount}
            onClick={() =>
              void onSubmit({
                departmentId,
                name,
                installmentAmount: Number(installmentAmount),
                totalMembers: Number(totalMembers),
                payoutPosition: Number(payoutPosition),
                startDate,
              })
            }
          >
            {loading ? "Creating..." : "Create Committee"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function InstallmentDialog({
  open,
  committeeId,
  loading,
  onClose,
  onSubmit,
}: {
  open: boolean;
  committeeId: string | null;
  loading: boolean;
  onClose: () => void;
  onSubmit: (body: CreateInstallmentRequest) => Promise<void>;
}) {
  const [amount, setAmount] = useState("");
  const [date, setDate] = useState(new Date().toISOString().slice(0, 10));
  const [paymentMethod, setPaymentMethod] = useState<"cash" | "bank">("cash");
  return (
    <Dialog open={open} onOpenChange={(value) => !value && onClose()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Record Installment</DialogTitle>
        </DialogHeader>
        <div className="space-y-3">
          <div className="space-y-2">
            <Label>Amount</Label>
            <Input
              type="number"
              value={amount}
              onChange={(event) => setAmount(event.target.value)}
            />
          </div>
          <div className="space-y-2">
            <Label>Installment date</Label>
            <Input
              type="date"
              value={date}
              onChange={(event) => setDate(event.target.value)}
            />
          </div>
          <div className="space-y-2">
            <Label>Payment method</Label>
            <Select
              value={paymentMethod}
              onValueChange={(value) =>
                setPaymentMethod(value as "cash" | "bank")
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
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button
            disabled={loading || !committeeId || !amount}
            onClick={() =>
              void onSubmit({
                amount: Number(amount),
                installmentDate: date,
                paymentMethod,
              })
            }
          >
            {loading ? "Saving..." : "Save Installment"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function PayoutDialog({
  open,
  committeeId,
  loading,
  onClose,
  onSubmit,
}: {
  open: boolean;
  committeeId: string | null;
  loading: boolean;
  onClose: () => void;
  onSubmit: (body: CreatePayoutRequest) => Promise<void>;
}) {
  const [amount, setAmount] = useState("");
  const [date, setDate] = useState(new Date().toISOString().slice(0, 10));
  const [paymentMethod, setPaymentMethod] = useState<"cash" | "bank">("cash");
  const [totalContributed, setTotalContributed] = useState("");
  return (
    <Dialog open={open} onOpenChange={(value) => !value && onClose()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Record Payout</DialogTitle>
        </DialogHeader>
        <div className="space-y-3">
          <div className="space-y-2">
            <Label>Payout amount</Label>
            <Input
              type="number"
              value={amount}
              onChange={(event) => setAmount(event.target.value)}
            />
          </div>
          <div className="space-y-2">
            <Label>Total contributed</Label>
            <Input
              type="number"
              value={totalContributed}
              onChange={(event) => setTotalContributed(event.target.value)}
            />
          </div>
          <div className="space-y-2">
            <Label>Payout date</Label>
            <Input
              type="date"
              value={date}
              onChange={(event) => setDate(event.target.value)}
            />
          </div>
          <div className="space-y-2">
            <Label>Payment method</Label>
            <Select
              value={paymentMethod}
              onValueChange={(value) =>
                setPaymentMethod(value as "cash" | "bank")
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
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button
            disabled={loading || !committeeId || !amount}
            onClick={() =>
              void onSubmit({
                payoutAmount: Number(amount),
                payoutDate: date,
                paymentMethod,
                ...(totalContributed
                  ? { totalContributed: Number(totalContributed) }
                  : {}),
              })
            }
          >
            {loading ? "Saving..." : "Save Payout"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
