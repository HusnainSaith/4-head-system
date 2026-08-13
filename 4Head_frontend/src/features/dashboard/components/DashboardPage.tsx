import { useSelector } from "react-redux";
import { ErrorState } from "@/components/common/ErrorState";
import { selectUserRole } from "@/features/auth/authSlice";
import { DepartmentDashboard } from "@/features/dashboard/components/DepartmentDashboard";
import { OwnerDashboard } from "@/features/dashboard/components/OwnerDashboard";
import { Role } from "@/types/enums";

export function DashboardPage() {
  const role = useSelector(selectUserRole);
  if (role === Role.OWNER || role === Role.ACCOUNTANT)
    return <OwnerDashboard />;
  if (role === Role.DEPARTMENT_STAFF) return <DepartmentDashboard />;
  return (
    <ErrorState
      title="Dashboard unavailable"
      description="Your role does not have a configured dashboard."
    />
  );
}
