import { useDeferredValue, useEffect, useState } from "react";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm, useWatch } from "react-hook-form";
import { useSelector } from "react-redux";
import { toast } from "sonner";
import { z } from "zod";
import { ConfirmDialog } from "@/components/common/ConfirmDialog";
import { DataTable, type DataTableColumn } from "@/components/common/DataTable";
import { EmptyState } from "@/components/common/EmptyState";
import { ErrorState } from "@/components/common/ErrorState";
import { FormField } from "@/components/common/FormField";
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
import { Form } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { selectCurrentUser } from "@/features/auth/authSlice";
import { useListDepartmentsQuery } from "@/features/vehicles/vehiclesApi";
import { getApiErrorMessage } from "@/lib/api-error";
import { Role } from "@/types/enums";
import {
  useCreateUserMutation,
  useActivateUserMutation,
  useDeactivateUserMutation,
  useListUserRolesQuery,
  useListUsersQuery,
  useUpdateUserMutation,
} from "../usersApi";
import type {
  CreateUserRequest,
  UpdateUserRequest,
  User,
  UserRole,
} from "../types";

const passwordRule = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/;
const formSchema = z.object({
  fullName: z
    .string()
    .trim()
    .min(2, "Full name must be at least 2 characters")
    .max(100)
    .regex(
      /^[\p{L}\p{M}\p{N}]+(?:[ '\u2019.-][\p{L}\p{M}\p{N}]+)*$/u,
      "Full name contains unsupported characters",
    ),
  email: z.string().trim().email().max(255),
  password: z
    .string()
    .max(128)
    .refine(
      (value) =>
        value === "" || (value.length >= 8 && passwordRule.test(value)),
      "Use 8+ characters with uppercase, lowercase, and a number",
    ),
  roleId: z.string().uuid("Select a role"),
  departmentId: z.string(),
  phone: z.string(),
});

type UserFormValues = z.infer<typeof formSchema>;

const roleLabels: Record<Role, string> = {
  [Role.OWNER]: "Owner",
  [Role.ACCOUNTANT]: "Accountant",
  [Role.DEPARTMENT_STAFF]: "Department staff",
  [Role.EMPLOYEE]: "Employee",
};

function roleLabel(role: string): string {
  return roleLabels[role as Role] ?? role.replaceAll("_", " ");
}

function RoleBadge({ role }: { role: string | undefined }) {
  const variant =
    role === Role.OWNER
      ? "default"
      : role === Role.ACCOUNTANT
        ? "secondary"
        : "warning";
  return (
    <Badge variant={variant}>{role ? roleLabel(role) : "Unassigned"}</Badge>
  );
}

export function UsersListPage() {
  const currentUser = useSelector(selectCurrentUser);
  const [search, setSearch] = useState("");
  const deferredSearch = useDeferredValue(search);
  const [roleId, setRoleId] = useState("all");
  const [departmentId, setDepartmentId] = useState("all");
  const users = useListUsersQuery({
    search: deferredSearch.trim() || undefined,
    roleId: roleId === "all" ? undefined : roleId,
    departmentId: departmentId === "all" ? undefined : departmentId,
  });
  const roles = useListUserRolesQuery();
  const departments = useListDepartmentsQuery();
  const [selected, setSelected] = useState<User | null>(null);
  const [formOpen, setFormOpen] = useState(false);
  const [pendingDeactivation, setPendingDeactivation] = useState<User | null>(
    null,
  );
  const [deactivate, deactivateState] = useDeactivateUserMutation();
  const [activate, activateState] = useActivateUserMutation();

  const columns: DataTableColumn<User>[] = [
    { id: "name", header: "Full name", cell: (user) => user.fullName },
    { id: "email", header: "Email", cell: (user) => user.email },
    {
      id: "role",
      header: "Role",
      cell: (user) => <RoleBadge role={user.role?.name} />,
    },
    {
      id: "department",
      header: "Department",
      cell: (user) => user.department?.name ?? "—",
    },
    { id: "phone", header: "Phone", cell: (user) => user.phone || "—" },
    {
      id: "status",
      header: "Status",
      cell: (user) => (
        <Badge variant={user.isActive ? "success" : "warning"}>
          {user.isActive ? "Active" : "Inactive"}
        </Badge>
      ),
    },
    {
      id: "actions",
      header: "Actions",
      cell: (user) => (
        <div className="flex gap-2">
          <Button
            size="sm"
            variant="outline"
            onClick={(event) => {
              event.stopPropagation();
              setSelected(user);
              setFormOpen(true);
            }}
          >
            Edit
          </Button>
          {user.isActive && user.id !== currentUser?.id ? (
            <Button
              size="sm"
              variant="outline"
              onClick={(event) => {
                event.stopPropagation();
                setPendingDeactivation(user);
              }}
            >
              Deactivate
            </Button>
          ) : !user.isActive ? (
            <Button
              size="sm"
              variant="outline"
              isLoading={activateState.isLoading}
              onClick={(event) => {
                event.stopPropagation();
                void activate(user.id)
                  .unwrap()
                  .then(() => toast.success("User activated"))
                  .catch((error) => toast.error(getApiErrorMessage(error)));
              }}
            >
              Activate
            </Button>
          ) : null}
        </div>
      ),
    },
  ];

  if (users.isLoading) return <PageSkeleton rows={6} />;
  if (users.isError)
    return (
      <PageContainer>
        <ErrorState
          title="Users could not be loaded"
          description={getApiErrorMessage(users.error)}
          onRetry={() => void users.refetch()}
        />
      </PageContainer>
    );

  return (
    <PageContainer>
      <PageHeader
        title="Users"
        description="Manage application access, roles, and department assignments."
        actions={
          <Button
            onClick={() => {
              setSelected(null);
              setFormOpen(true);
            }}
          >
            Add User
          </Button>
        }
      />
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <div className="space-y-2">
          <Label htmlFor="user-search">Search by name or email</Label>
          <Input
            id="user-search"
            type="search"
            placeholder="Search users"
            value={search}
            onChange={(event) => setSearch(event.target.value)}
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="user-role-filter">Role</Label>
          <Select value={roleId} onValueChange={setRoleId}>
            <SelectTrigger id="user-role-filter">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All roles</SelectItem>
              {(roles.data?.data ?? []).map((role) => (
                <SelectItem key={role.id} value={role.id}>
                  {roleLabel(role.name)}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-2">
          <Label htmlFor="user-department-filter">Department</Label>
          <Select value={departmentId} onValueChange={setDepartmentId}>
            <SelectTrigger id="user-department-filter">
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
      </div>
      <DataTable
        columns={columns}
        data={users.data?.data ?? []}
        getRowId={(user) => user.id}
        onRowClick={(user) => {
          setSelected(user);
          setFormOpen(true);
        }}
        emptyContent={<EmptyState title="No users found" />}
      />
      <UserFormDialog
        open={formOpen}
        user={selected}
        roles={roles.data?.data ?? []}
        departments={departments.data?.data ?? []}
        referenceDataError={roles.isError || departments.isError}
        onOpenChange={setFormOpen}
      />
      <ConfirmDialog
        open={Boolean(pendingDeactivation)}
        onOpenChange={(open) => {
          if (!open) setPendingDeactivation(null);
        }}
        title="Deactivate user?"
        description={
          (pendingDeactivation?.fullName ?? "This user") +
          " will no longer be able to sign in."
        }
        confirmLabel="Deactivate"
        destructive
        loading={deactivateState.isLoading}
        onConfirm={() => {
          if (!pendingDeactivation) return;
          void deactivate(pendingDeactivation.id)
            .unwrap()
            .then(() => {
              toast.success("User deactivated");
              setPendingDeactivation(null);
            })
            .catch((error) => toast.error(getApiErrorMessage(error)));
        }}
      />
    </PageContainer>
  );
}

function UserFormDialog({
  open,
  user,
  roles,
  departments,
  referenceDataError,
  onOpenChange,
}: {
  open: boolean;
  user: User | null;
  roles: UserRole[];
  departments: Array<{ id: string; name: string }>;
  referenceDataError: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const [createUser, createState] = useCreateUserMutation();
  const [updateUser, updateState] = useUpdateUserMutation();
  const form = useForm<UserFormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      fullName: "",
      email: "",
      password: "",
      roleId: "",
      departmentId: "",
      phone: "",
    },
  });

  useEffect(() => {
    if (!open) return;
    form.reset({
      fullName: user?.fullName ?? "",
      email: user?.email ?? "",
      password: "",
      roleId: user?.roleId ?? "",
      departmentId: user?.departmentId ?? "",
      phone: user?.phone ?? "",
    });
  }, [form, open, user]);

  const selectedRoleId = useWatch({ control: form.control, name: "roleId" });
  const selectedRole = roles.find((role) => role.id === selectedRoleId)?.name;
  const selectedRoleKey = selectedRole?.toLowerCase();
  const departmentApplicable =
    Boolean(selectedRoleKey) &&
    selectedRoleKey !== Role.OWNER &&
    selectedRoleKey !== Role.ACCOUNTANT;
  const departmentRequired =
    selectedRoleKey === Role.DEPARTMENT_STAFF || selectedRoleKey === "driver";
  const isLoading = createState.isLoading || updateState.isLoading;

  const submit = form.handleSubmit(async (values) => {
    if (!user && !values.password) {
      form.setError("password", { message: "Password is required" });
      return;
    }
    if (departmentRequired && !values.departmentId) {
      form.setError("departmentId", { message: "Department is required" });
      return;
    }
    try {
      if (user) {
        const body: UpdateUserRequest = {
          fullName: values.fullName,
          email: values.email,
          roleId: values.roleId,
          departmentId: departmentApplicable
            ? values.departmentId || null
            : null,
          phone: values.phone || undefined,
          ...(values.password ? { password: values.password } : {}),
        };
        await updateUser({ id: user.id, body }).unwrap();
        toast.success("User updated");
      } else {
        const body: CreateUserRequest = {
          fullName: values.fullName,
          email: values.email,
          password: values.password,
          roleId: values.roleId,
          departmentId: departmentApplicable
            ? values.departmentId || undefined
            : undefined,
          phone: values.phone || undefined,
        };
        await createUser(body).unwrap();
        toast.success("User created");
      }
      onOpenChange(false);
    } catch (error) {
      toast.error(getApiErrorMessage(error));
    }
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-xl">
        <DialogHeader>
          <DialogTitle>{user ? "Edit User" : "Add User"}</DialogTitle>
          <DialogDescription>
            {user
              ? "Update account details and access assignment. Leave password blank to keep it unchanged."
              : "Set the user's initial password; the backend does not send invitations."}
          </DialogDescription>
        </DialogHeader>
        {referenceDataError ? (
          <ErrorState
            title="Role or department options could not be loaded"
            description="Close this form and retry after reference data is available."
          />
        ) : (
          <Form {...form}>
            <form className="grid gap-4 sm:grid-cols-2" onSubmit={submit}>
              <FormField
                control={form.control}
                name="fullName"
                label="Full name"
                required
              >
                {(field) => <Input {...field} autoComplete="name" />}
              </FormField>
              <FormField
                control={form.control}
                name="email"
                label="Email"
                required
              >
                {(field) => (
                  <Input {...field} type="email" autoComplete="email" />
                )}
              </FormField>
              <FormField
                control={form.control}
                name="password"
                label={user ? "New password" : "Initial password"}
                required={!user}
              >
                {(field) => (
                  <Input
                    {...field}
                    type="password"
                    autoComplete="new-password"
                  />
                )}
              </FormField>
              <FormField control={form.control} name="phone" label="Phone">
                {(field) => <Input {...field} type="tel" autoComplete="tel" />}
              </FormField>
              <FormField
                control={form.control}
                name="roleId"
                label="Role"
                required
              >
                {(field) => (
                  <Select value={field.value} onValueChange={field.onChange}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select role" />
                    </SelectTrigger>
                    <SelectContent>
                      {roles.map((role) => (
                        <SelectItem key={role.id} value={role.id}>
                          {roleLabel(role.name)}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
              </FormField>
              {departmentApplicable ? (
                <FormField
                  control={form.control}
                  name="departmentId"
                  label="Department"
                  required={departmentRequired}
                >
                  {(field) => (
                    <Select value={field.value} onValueChange={field.onChange}>
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
                </FormField>
              ) : null}
              <DialogFooter className="sm:col-span-2">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => onOpenChange(false)}
                >
                  Cancel
                </Button>
                <Button type="submit" isLoading={isLoading}>
                  {user ? "Save changes" : "Create user"}
                </Button>
              </DialogFooter>
            </form>
          </Form>
        )}
      </DialogContent>
    </Dialog>
  );
}
