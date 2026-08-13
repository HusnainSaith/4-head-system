import { Link } from "react-router-dom";
import { useSelector } from "react-redux";
import { DataTable, type DataTableColumn } from "@/components/common/DataTable";
import { EmptyState } from "@/components/common/EmptyState";
import { ErrorState } from "@/components/common/ErrorState";
import { PageHeader } from "@/components/common/PageHeader";
import { PageSkeleton } from "@/components/common/Skeletons";
import { PageContainer } from "@/components/layout/PageContainer";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  selectUserDepartmentId,
  selectUserRole,
} from "@/features/auth/authSlice";
import { Role } from "@/types/enums";
import { useListVehiclesQuery } from "../vehiclesApi";
import type { Vehicle } from "../types";

function VehicleLogDirectory({ kind }: { kind: "fuel" | "maintenance" }) {
  const role = useSelector(selectUserRole);
  const departmentId = useSelector(selectUserDepartmentId);
  const management = role === Role.OWNER || role === Role.ACCOUNTANT;
  const query = useListVehiclesQuery({
    departmentId: management ? undefined : (departmentId ?? undefined),
    page: 1,
    limit: 100,
  });
  const path = kind === "fuel" ? "fuel-logs" : "maintenance-logs";
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
      id: "action",
      header: "Actions",
      cell: (vehicle) => (
        <Button asChild size="sm">
          <Link to={`/vehicles/${vehicle.id}/${path}`}>
            Manage {kind === "fuel" ? "fuel" : "maintenance"} logs
          </Link>
        </Button>
      ),
    },
  ];
  if (query.isLoading) return <PageSkeleton rows={6} />;
  if (query.isError)
    return (
      <PageContainer>
        <ErrorState
          title="Vehicles could not be loaded"
          error={query.error}
          onRetry={() => void query.refetch()}
        />
      </PageContainer>
    );
  return (
    <PageContainer>
      <PageHeader
        title={kind === "fuel" ? "Fuel Logs" : "Maintenance Logs"}
        description="Select a vehicle to view, create, update, or delete its records."
      />
      <DataTable
        columns={columns}
        data={query.data?.data.items ?? []}
        getRowId={(vehicle) => vehicle.id}
        emptyContent={<EmptyState title="No vehicles found" />}
      />
    </PageContainer>
  );
}

export function FuelLogsDirectoryPage() {
  return <VehicleLogDirectory kind="fuel" />;
}

export function MaintenanceLogsDirectoryPage() {
  return <VehicleLogDirectory kind="maintenance" />;
}
