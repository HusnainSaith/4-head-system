import { Link, useParams } from "react-router-dom";
import { ErrorState } from "@/components/common/ErrorState";
import { PageHeader } from "@/components/common/PageHeader";
import { PageSkeleton } from "@/components/common/Skeletons";
import { PageContainer } from "@/components/layout/PageContainer";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { useGetVehicleQuery } from "../vehiclesApi";

export function VehicleDetailPage() {
  const { id = "" } = useParams();
  const query = useGetVehicleQuery(id, { skip: !id });
  if (query.isLoading) return <PageSkeleton rows={4} />;
  if (query.isError || !query.data?.data)
    return (
      <PageContainer>
        <ErrorState
          title="Vehicle details could not be loaded"
          error={query.error}
          onRetry={() => void query.refetch()}
        />
      </PageContainer>
    );
  const vehicle = query.data.data;
  return (
    <PageContainer>
      <PageHeader
        title={vehicle.registrationNumber}
        description={`${vehicle.vehicleType} · ${vehicle.department?.name ?? vehicle.departmentId}`}
        actions={
          <div className="flex flex-wrap gap-2">
            <Button asChild variant="outline">
              <Link to={`/vehicles/${vehicle.id}/fuel-logs`}>Fuel logs</Link>
            </Button>
            <Button asChild variant="outline">
              <Link to={`/vehicles/${vehicle.id}/maintenance-logs`}>
                Maintenance logs
              </Link>
            </Button>
          </div>
        }
      />
      <Card>
        <CardContent className="grid gap-5 pt-5 sm:grid-cols-2 lg:grid-cols-3">
          <Detail label="Registration" value={vehicle.registrationNumber} />
          <Detail label="Vehicle type" value={vehicle.vehicleType} />
          <Detail label="Driver" value={vehicle.driverName ?? "—"} />
          <Detail
            label="Department"
            value={vehicle.department?.name ?? vehicle.departmentId}
          />
          <div>
            <p className="text-xs uppercase tracking-wide text-muted-foreground">
              Status
            </p>
            <Badge
              className="mt-1"
              variant={vehicle.isActive ? "success" : "warning"}
            >
              {vehicle.isActive ? "Active" : "Inactive"}
            </Badge>
          </div>
          <Detail label="Notes" value={vehicle.notes ?? "—"} />
        </CardContent>
      </Card>
    </PageContainer>
  );
}

function Detail({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-xs uppercase tracking-wide text-muted-foreground">
        {label}
      </p>
      <p className="mt-1 font-medium">{value}</p>
    </div>
  );
}
