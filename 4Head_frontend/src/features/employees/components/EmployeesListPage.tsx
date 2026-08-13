import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useSelector } from "react-redux";
import { toast } from "sonner";
import { z } from "zod";
import { ConfirmDialog } from "@/components/common/ConfirmDialog";
import { DataTable, type DataTableColumn } from "@/components/common/DataTable";
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
import { useListEmployeeUsersQuery } from "@/features/users/usersApi";
import {
  useActivateEmployeeMutation,
  useCreateEmployeeMutation,
  useDeactivateEmployeeMutation,
  useListEmployeesQuery,
  useUpdateEmployeeMutation,
} from "../employeesApi";
import type { CreateEmployeeRequest, Employee } from "../types";

const schema = z.object({
  userId: z.string().uuid("Select an employee user"),
  fullName: z.string().trim().min(1, "Full name is required"),
  designation: z.string().trim().min(1, "Designation is required"),
  phone: z.string(),
  cnicOrIdNumber: z.string(),
  baseSalary: z.coerce.number().positive("Salary must be positive"),
  joiningDate: z.string().min(1, "Joining date is required"),
  departmentId: z.string().uuid("Select a department"),
});

const money = new Intl.NumberFormat("en-PK", {
  style: "currency",
  currency: "PKR",
});

export function EmployeesListPage() {
  const navigate = useNavigate();
  const role = useSelector(selectUserRole);
  const ownDepartmentId = useSelector(selectUserDepartmentId);
  const management = role === Role.OWNER || role === Role.ACCOUNTANT;
  const [departmentId, setDepartmentId] = useState("");
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<Employee | null>(null);
  const [deleting, setDeleting] = useState<Employee | null>(null);
  const effectiveDepartment = management
    ? departmentId
    : (ownDepartmentId ?? "");
  const query = useListEmployeesQuery(
    { departmentId: effectiveDepartment || undefined },
    { skip: !management && !ownDepartmentId },
  );
  const departments = useListDepartmentsQuery();
  const [createEmployee, createState] = useCreateEmployeeMutation();
  const [updateEmployee, updateState] = useUpdateEmployeeMutation();
  const [deactivateEmployee, deactivateState] = useDeactivateEmployeeMutation();
  const [activateEmployee, activateState] = useActivateEmployeeMutation();

  const columns: DataTableColumn<Employee>[] = [
    { id: "name", header: "Full name", cell: (employee) => employee.fullName },
    {
      id: "designation",
      header: "Designation",
      cell: (employee) => employee.designation,
    },
    {
      id: "department",
      header: "Department",
      cell: (employee) => (
        <Badge variant="secondary">
          {employee.department?.name ?? employee.departmentId}
        </Badge>
      ),
    },
    {
      id: "salary",
      header: "Base salary",
      cell: (employee) => money.format(Number(employee.baseSalary)),
      align: "right",
    },
    {
      id: "joining",
      header: "Joining date",
      cell: (employee) => String(employee.joiningDate).slice(0, 10),
    },
    {
      id: "status",
      header: "Status",
      cell: (employee) => (
        <Badge variant={employee.isActive ? "success" : "warning"}>
          {employee.isActive ? "Active" : "Inactive"}
        </Badge>
      ),
    },
    {
      id: "actions",
      header: "Actions",
      cell: (employee) => (
        <div className="flex flex-wrap gap-2">
          <Button
            size="sm"
            variant="outline"
            onClick={(event) => {
              event.stopPropagation();
              navigate(`/employees/${employee.id}`);
            }}
          >
            Read
          </Button>
          <Button
            size="sm"
            variant="outline"
            onClick={(event) => {
              event.stopPropagation();
              setEditing(employee);
            }}
          >
            Update
          </Button>
          <Button
            size="sm"
            variant="outline"
            onClick={(event) => {
              event.stopPropagation();
              navigate(`/employees/${employee.id}/advances`);
            }}
          >
            Advance
          </Button>
          <Button
            size="sm"
            variant="outline"
            onClick={(event) => {
              event.stopPropagation();
              navigate(`/employees/${employee.id}/bonuses`);
            }}
          >
            Bonus
          </Button>
          {employee.isActive ? (
            <Button
              size="sm"
              variant="destructive"
              onClick={(event) => {
                event.stopPropagation();
                setDeleting(employee);
              }}
            >
              Delete
            </Button>
          ) : (
            <Button
              size="sm"
              onClick={(event) => {
                event.stopPropagation();
                void activateEmployee(employee.id)
                  .unwrap()
                  .then(() => toast.success("Employee activated"))
                  .catch((error) => toast.error(getApiErrorMessage(error)));
              }}
              isLoading={activateState.isLoading}
            >
              Activate
            </Button>
          )}
        </div>
      ),
    },
  ];

  if (query.isLoading) return <PageSkeleton rows={6} />;
  if (query.isError)
    return (
      <PageContainer>
        <ErrorState
          title="Employees could not be loaded"
          description={getApiErrorMessage(query.error)}
          onRetry={() => void query.refetch()}
        />
      </PageContainer>
    );

  const closeForm = () => {
    setFormOpen(false);
    setEditing(null);
  };

  return (
    <PageContainer>
      <PageHeader
        title="Employees"
        actions={
          <Button onClick={() => setFormOpen(true)}>Register Employee</Button>
        }
      />
      {management ? (
        <div className="max-w-sm">
          <Label>Department filter</Label>
          <Select
            value={departmentId || "all"}
            onValueChange={(value) =>
              setDepartmentId(value === "all" ? "" : value)
            }
          >
            <SelectTrigger>
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
        data={query.data?.data ?? []}
        getRowId={(employee) => employee.id}
        onRowClick={(employee) => navigate(`/employees/${employee.id}`)}
        emptyContent={<EmptyState title="No employees found" />}
      />
      <EmployeeDialog
        key={editing?.id ?? (formOpen ? "create-open" : "closed")}
        open={formOpen || Boolean(editing)}
        employee={editing}
        fixedDepartmentId={
          management ? undefined : (ownDepartmentId ?? undefined)
        }
        departments={departments.data?.data ?? []}
        loading={createState.isLoading || updateState.isLoading}
        onClose={closeForm}
        onSubmit={async (body) => {
          try {
            if (editing) {
              await updateEmployee({ id: editing.id, body }).unwrap();
              toast.success("Employee updated");
            } else {
              await createEmployee(body).unwrap();
              toast.success("Employee registered");
            }
            closeForm();
          } catch (error) {
            toast.error(getApiErrorMessage(error));
          }
        }}
      />
      <ConfirmDialog
        open={Boolean(deleting)}
        onOpenChange={(open) => !open && setDeleting(null)}
        title="Delete employee?"
        description="This safely deactivates the employee. Salary, bonus, and advance history is retained, and the employee can be activated again."
        confirmLabel="Delete"
        destructive
        loading={deactivateState.isLoading}
        onConfirm={() => {
          if (!deleting) return;
          void deactivateEmployee(deleting.id)
            .unwrap()
            .then(() => {
              toast.success("Employee deactivated");
              setDeleting(null);
            })
            .catch((error) => toast.error(getApiErrorMessage(error)));
        }}
      />
    </PageContainer>
  );
}

function EmployeeDialog({
  open,
  employee,
  fixedDepartmentId,
  departments,
  loading,
  onClose,
  onSubmit,
}: {
  open: boolean;
  employee: Employee | null;
  fixedDepartmentId?: string;
  departments: Array<{ id: string; name: string }>;
  loading: boolean;
  onClose: () => void;
  onSubmit: (body: CreateEmployeeRequest) => Promise<void>;
}) {
  const [values, setValues] = useState({
    userId: employee?.userId ?? "",
    fullName: employee?.fullName ?? "",
    designation: employee?.designation ?? "",
    phone: employee?.phone ?? "",
    cnicOrIdNumber: employee?.cnicOrIdNumber ?? "",
    baseSalary: employee?.baseSalary ?? "",
    joiningDate: employee
      ? String(employee.joiningDate).slice(0, 10)
      : new Date().toISOString().slice(0, 10),
    departmentId: fixedDepartmentId ?? employee?.departmentId ?? "",
  });
  const employeeUsers = useListEmployeeUsersQuery(
    { departmentId: values.departmentId || fixedDepartmentId },
    { skip: !(values.departmentId || fixedDepartmentId) },
  );
  const [error, setError] = useState("");
  const field =
    (key: keyof typeof values) =>
    (event: React.ChangeEvent<HTMLInputElement>) =>
      setValues((current) => ({ ...current, [key]: event.target.value }));

  return (
    <Dialog open={open} onOpenChange={(next) => !next && onClose()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>
            {employee ? "Update Employee" : "Register Employee"}
          </DialogTitle>
        </DialogHeader>
        <form
          className="space-y-3"
          onSubmit={(event) => {
            event.preventDefault();
            const parsed = schema.safeParse({
              ...values,
              departmentId: fixedDepartmentId ?? values.departmentId,
            });
            if (!parsed.success) {
              setError(
                parsed.error.issues[0]?.message ?? "Check the form values",
              );
              return;
            }
            setError("");
            void onSubmit({
              ...parsed.data,
              phone: parsed.data.phone || undefined,
              cnicOrIdNumber: parsed.data.cnicOrIdNumber || undefined,
            });
          }}
        >
          {error ? <p className="text-sm text-destructive">{error}</p> : null}
          <div>
            <Label>Department</Label>
            {fixedDepartmentId ? (
              <Input
                value={
                  departments.find(
                    (department) => department.id === fixedDepartmentId,
                  )?.name ??
                  employee?.department?.name ??
                  "Assigned department"
                }
                disabled
              />
            ) : (
              <Select
                value={values.departmentId}
                onValueChange={(departmentId) =>
                  setValues((current) => ({
                    ...current,
                    departmentId,
                    userId: "",
                    fullName: "",
                    phone: "",
                  }))
                }
              >
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
            )}
          </div>
          <div>
            <Label>Employee user</Label>
            <Select
              value={values.userId}
              onValueChange={(userId) => {
                const selected = employeeUsers.data?.data.find(
                  (user) => user.id === userId,
                );
                setValues((current) => ({
                  ...current,
                  userId,
                  fullName: selected?.fullName ?? "",
                  phone: selected?.phone ?? "",
                }));
              }}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select employee user" />
              </SelectTrigger>
              <SelectContent>
                {(employeeUsers.data?.data ?? []).map((user) => (
                  <SelectItem key={user.id} value={user.id}>
                    {user.fullName} ({user.email})
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {!values.departmentId && !fixedDepartmentId ? (
              <p className="mt-1 text-xs text-muted-foreground">
                Select a department first to load its employee users.
              </p>
            ) : null}
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            <div>
              <Label>Full name</Label>
              <Input value={values.fullName} disabled />
            </div>
            <div>
              <Label>Phone</Label>
              <Input value={values.phone} disabled />
            </div>
          </div>
          {[
            ["Designation", "designation"],
            ["CNIC or ID number", "cnicOrIdNumber"],
            ["Base salary", "baseSalary"],
            ["Joining date", "joiningDate"],
          ].map(([label, key]) => (
            <div key={key}>
              <Label htmlFor={`employee-${key}`}>{label}</Label>
              <Input
                id={`employee-${key}`}
                type={
                  key === "baseSalary"
                    ? "number"
                    : key === "joiningDate"
                      ? "date"
                      : "text"
                }
                value={values[key as keyof typeof values]}
                onChange={field(key as keyof typeof values)}
              />
            </div>
          ))}
          <DialogFooter>
            <Button type="button" variant="outline" onClick={onClose}>
              Cancel
            </Button>
            <Button type="submit" isLoading={loading}>
              {employee ? "Update" : "Register"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
