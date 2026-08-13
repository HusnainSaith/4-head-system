import type { ReactNode } from "react";
import { useSelector } from "react-redux";
import { useParams } from "react-router-dom";
import { ErrorState } from "@/components/common/ErrorState";
import { PageSkeleton } from "@/components/common/Skeletons";
import { PageContainer } from "@/components/layout/PageContainer";
import {
  selectUserDepartmentId,
  selectUserRole,
} from "@/features/auth/authSlice";
import { useGetEmployeeQuery } from "@/features/employees/employeesApi";
import { useGetPartyQuery } from "@/features/parties/partiesApi";
import { useGetVehicleQuery } from "@/features/vehicles/vehiclesApi";
import { Role } from "@/types/enums";

interface EntityAccessProps {
  children: ReactNode;
  departmentId?: string | null;
  isLoading: boolean;
  isError: boolean;
  error?: unknown;
  onRetry: () => void;
}

function EntityAccess({
  children,
  departmentId,
  isLoading,
  isError,
  error,
  onRetry,
}: EntityAccessProps) {
  const role = useSelector(selectUserRole);
  const assignedDepartmentId = useSelector(selectUserDepartmentId);

  if (isLoading) return <PageSkeleton rows={5} />;
  if (isError)
    return (
      <PageContainer>
        <ErrorState
          title="Record could not be loaded"
          error={error}
          onRetry={onRetry}
        />
      </PageContainer>
    );

  if (
    role === Role.DEPARTMENT_STAFF &&
    (!assignedDepartmentId || departmentId !== assignedDepartmentId)
  ) {
    return (
      <PageContainer>
        <ErrorState
          title="Not authorized"
          description="Department staff can only view records in their assigned department."
        />
      </PageContainer>
    );
  }

  return <>{children}</>;
}

export function VehicleEntityRoute({ children }: { children: ReactNode }) {
  const { id = "" } = useParams();
  const query = useGetVehicleQuery(id, { skip: !id });
  return (
    <EntityAccess
      departmentId={query.data?.data.departmentId}
      isLoading={query.isLoading}
      isError={!id || query.isError || (!query.isLoading && !query.data)}
      error={query.error}
      onRetry={() => void query.refetch()}
    >
      {children}
    </EntityAccess>
  );
}

export function EmployeeEntityRoute({ children }: { children: ReactNode }) {
  const { id = "" } = useParams();
  const query = useGetEmployeeQuery(id, { skip: !id });
  return (
    <EntityAccess
      departmentId={query.data?.data.departmentId}
      isLoading={query.isLoading}
      isError={!id || query.isError || (!query.isLoading && !query.data)}
      error={query.error}
      onRetry={() => void query.refetch()}
    >
      {children}
    </EntityAccess>
  );
}

export function PartyEntityRoute({ children }: { children: ReactNode }) {
  const { id = "" } = useParams();
  const query = useGetPartyQuery(id, { skip: !id });
  return (
    <EntityAccess
      departmentId={query.data?.data.primaryDepartmentId}
      isLoading={query.isLoading}
      isError={!id || query.isError || (!query.isLoading && !query.data)}
      error={query.error}
      onRetry={() => void query.refetch()}
    >
      {children}
    </EntityAccess>
  );
}
