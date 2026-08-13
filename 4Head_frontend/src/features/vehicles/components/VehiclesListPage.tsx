import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
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
import { getApiErrorMessage } from "@/lib/api-error";
import { Role } from "@/types/enums";
import { useListDriversQuery } from "@/features/users/usersApi";
import {
  useCreateVehicleMutation,
  useDeleteVehicleMutation,
  useListDepartmentsQuery,
  useListVehiclesQuery,
  useUpdateVehicleMutation,
} from "../vehiclesApi";
import type { CreateVehicleRequest, Vehicle, VehicleType } from "../types";

const schema = z.object({
  registrationNumber: z.string().trim().min(1, "Registration is required"),
  vehicleType: z.enum(["truck", "van", "car", "motorcycle", "other"]),
  driverUserId: z.string().uuid("Select a driver"),
  departmentId: z.string().uuid("Select a department"),
  notes: z.string(),
});

export function VehiclesListPage() {
  const navigate = useNavigate();
  const role = useSelector(selectUserRole);
  const ownDepartment = useSelector(selectUserDepartmentId);
  const management = role === Role.OWNER || role === Role.ACCOUNTANT;
  const [filter, setFilter] = useState(management ? "" : (ownDepartment ?? ""));
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<Vehicle | null>(null);
  const [deleting, setDeleting] = useState<Vehicle | null>(null);
  const query = useListVehiclesQuery({
    departmentId: filter || undefined,
    page: 1,
    limit: 100,
  });
  const departments = useListDepartmentsQuery();
  const [create, createState] = useCreateVehicleMutation();
  const [update, updateState] = useUpdateVehicleMutation();
  const [deactivate, deleteState] = useDeleteVehicleMutation();

  const columns: DataTableColumn<Vehicle>[] = [
    {
      id: "registration",
      header: "Registration",
      cell: (vehicle) => vehicle.registrationNumber,
    },
    { id: "type", header: "Type", cell: (vehicle) => vehicle.vehicleType },
    {
      id: "driver",
      header: "Driver",
      cell: (vehicle) => vehicle.driverName ?? "—",
    },
    {
      id: "department",
      header: "Department",
      cell: (vehicle) => (
        <Badge variant="secondary">
          {vehicle.department?.name ?? vehicle.departmentId}
        </Badge>
      ),
    },
    {
      id: "active",
      header: "Status",
      cell: (vehicle) => (
        <Badge variant={vehicle.isActive ? "success" : "warning"}>
          {vehicle.isActive ? "Active" : "Inactive"}
        </Badge>
      ),
    },
    {
      id: "actions",
      header: "Actions",
      cell: (vehicle) => (
        <div className="flex flex-wrap gap-2">
          <Button
            size="sm"
            variant="outline"
            onClick={(event) => {
              event.stopPropagation();
              navigate(`/vehicles/${vehicle.id}`);
            }}
          >
            Read
          </Button>
          <Button
            size="sm"
            variant="outline"
            onClick={(event) => {
              event.stopPropagation();
              setEditing(vehicle);
            }}
          >
            Update
          </Button>
          <Button asChild size="sm" variant="outline">
            <Link
              to={`/vehicles/${vehicle.id}/fuel-logs`}
              onClick={(event) => event.stopPropagation()}
            >
              Fuel
            </Link>
          </Button>
          <Button asChild size="sm" variant="outline">
            <Link
              to={`/vehicles/${vehicle.id}/maintenance-logs`}
              onClick={(event) => event.stopPropagation()}
            >
              Maintenance
            </Link>
          </Button>
          {vehicle.isActive ? (
            <Button
              size="sm"
              variant="destructive"
              onClick={(event) => {
                event.stopPropagation();
                setDeleting(vehicle);
              }}
            >
              Delete
            </Button>
          ) : null}
        </div>
      ),
    },
  ];

  if (query.isLoading) return <PageSkeleton rows={6} />;
  if (query.isError)
    return (
      <PageContainer>
        <ErrorState
          title="Vehicles could not be loaded"
          description={getApiErrorMessage(query.error)}
          onRetry={() => void query.refetch()}
        />
      </PageContainer>
    );

  const closeForm = () => {
    setOpen(false);
    setEditing(null);
  };
  return (
    <PageContainer>
      <PageHeader
        title="Vehicles"
        actions={
          <Button onClick={() => setOpen(true)}>Register Vehicle</Button>
        }
      />
      {management ? (
        <div className="max-w-sm">
          <Label>Department filter</Label>
          <Select
            value={filter || "all"}
            onValueChange={(value) => setFilter(value === "all" ? "" : value)}
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
        data={query.data?.data.items ?? []}
        getRowId={(vehicle) => vehicle.id}
        onRowClick={(vehicle) => navigate(`/vehicles/${vehicle.id}`)}
        emptyContent={<EmptyState title="No vehicles found" />}
      />
      <VehicleDialog
        key={editing?.id ?? (open ? "create-open" : "closed")}
        open={open || Boolean(editing)}
        vehicle={editing}
        fixedDepartmentId={
          management ? undefined : (ownDepartment ?? undefined)
        }
        fixedDepartmentName={
          management
            ? undefined
            : (departments.data?.data.find((item) => item.id === ownDepartment)
                ?.name ?? "Assigned department")
        }
        departments={departments.data?.data ?? []}
        loading={createState.isLoading || updateState.isLoading}
        onClose={closeForm}
        onSubmit={async (body) => {
          try {
            if (editing) {
              await update({ id: editing.id, body }).unwrap();
              toast.success("Vehicle updated");
            } else {
              await create(body).unwrap();
              toast.success("Vehicle registered");
            }
            closeForm();
          } catch (error) {
            toast.error(getApiErrorMessage(error));
          }
        }}
      />
      <ConfirmDialog
        open={Boolean(deleting)}
        onOpenChange={(next) => !next && setDeleting(null)}
        title="Delete vehicle?"
        description="The vehicle is soft-deactivated. Its fuel and maintenance history remains intact."
        confirmLabel="Delete"
        destructive
        loading={deleteState.isLoading}
        onConfirm={() => {
          if (!deleting) return;
          void deactivate(deleting.id)
            .unwrap()
            .then(() => {
              toast.success("Vehicle deactivated");
              setDeleting(null);
            })
            .catch((error) => toast.error(getApiErrorMessage(error)));
        }}
      />
    </PageContainer>
  );
}

function VehicleDialog({
  open,
  vehicle,
  fixedDepartmentId,
  fixedDepartmentName,
  departments,
  loading,
  onClose,
  onSubmit,
}: {
  open: boolean;
  vehicle: Vehicle | null;
  fixedDepartmentId?: string;
  fixedDepartmentName?: string;
  departments: Array<{ id: string; name: string }>;
  loading: boolean;
  onClose: () => void;
  onSubmit: (body: CreateVehicleRequest) => Promise<void>;
}) {
  const [registration, setRegistration] = useState(
    vehicle?.registrationNumber ?? "",
  );
  const [type, setType] = useState<VehicleType>(
    vehicle?.vehicleType ?? "truck",
  );
  const [driverUserId, setDriverUserId] = useState(vehicle?.driverUserId ?? "");
  const [department, setDepartment] = useState(
    fixedDepartmentId ?? vehicle?.departmentId ?? "",
  );
  const [notes, setNotes] = useState(vehicle?.notes ?? "");
  const [error, setError] = useState("");
  const selectedDepartment = fixedDepartmentId ?? department;
  const drivers = useListDriversQuery(
    { departmentId: selectedDepartment || undefined },
    { skip: !selectedDepartment },
  );
  return (
    <Dialog open={open} onOpenChange={(next) => !next && onClose()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>
            {vehicle ? "Update Vehicle" : "Register Vehicle"}
          </DialogTitle>
        </DialogHeader>
        <form
          className="space-y-4"
          onSubmit={(event) => {
            event.preventDefault();
            const parsed = schema.safeParse({
              registrationNumber: registration,
              vehicleType: type,
              driverUserId,
              departmentId: fixedDepartmentId ?? department,
              notes,
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
              driverUserId,
              notes: notes || undefined,
            });
          }}
        >
          {error ? <p className="text-sm text-destructive">{error}</p> : null}
          <div>
            <Label htmlFor="vehicle-registration">Registration number</Label>
            <Input
              id="vehicle-registration"
              value={registration}
              onChange={(event) => setRegistration(event.target.value)}
            />
          </div>
          <div>
            <Label>Vehicle type</Label>
            <Select
              value={type}
              onValueChange={(value) => setType(value as VehicleType)}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {["truck", "van", "car", "motorcycle", "other"].map((value) => (
                  <SelectItem key={value} value={value}>
                    {value}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label htmlFor="vehicle-driver">Driver</Label>
            <Select value={driverUserId} onValueChange={setDriverUserId}>
              <SelectTrigger id="vehicle-driver">
                <SelectValue placeholder="Select a department driver" />
              </SelectTrigger>
              <SelectContent>
                {(drivers.data?.data ?? []).map((driver) => (
                  <SelectItem key={driver.id} value={driver.id}>
                    {driver.fullName}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {drivers.isError ? (
              <p className="text-sm text-destructive">
                Drivers could not be loaded.
              </p>
            ) : null}
          </div>
          <div>
            <Label>Owning department</Label>
            {fixedDepartmentId ? (
              <Input
                value={fixedDepartmentName ?? "Assigned department"}
                disabled
              />
            ) : (
              <Select value={department} onValueChange={setDepartment}>
                <SelectTrigger>
                  <SelectValue placeholder="Select department" />
                </SelectTrigger>
                <SelectContent>
                  {departments.map((item) => (
                    <SelectItem key={item.id} value={item.id}>
                      {item.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
          </div>
          <div>
            <Label htmlFor="vehicle-notes">Notes</Label>
            <Input
              id="vehicle-notes"
              value={notes}
              onChange={(event) => setNotes(event.target.value)}
            />
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={onClose}>
              Cancel
            </Button>
            <Button type="submit" isLoading={loading}>
              {vehicle ? "Update" : "Register"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
