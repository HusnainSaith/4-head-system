import type { ReactNode } from "react";
import { useSelector } from "react-redux";
import { ErrorState } from "@/components/common/ErrorState";
import {
  selectUserDepartmentId,
  selectUserDepartmentCode,
  selectUserRole,
} from "@/features/auth/authSlice";
import { DepartmentCode, Role } from "@/types/enums";

export function DepartmentScopeGuard({
  departmentId,
  departmentCode,
  children,
}: {
  departmentId?: string;
  departmentCode?: DepartmentCode;
  children: ReactNode;
}) {
  const role = useSelector(selectUserRole);
  const assignedDepartmentId = useSelector(selectUserDepartmentId);
  const assignedDepartmentCode = useSelector(selectUserDepartmentCode);
  const allowed =
    role !== Role.DEPARTMENT_STAFF ||
    (departmentId !== undefined && assignedDepartmentId === departmentId) ||
    (departmentCode !== undefined && assignedDepartmentCode === departmentCode);

  return allowed ? (
    <>{children}</>
  ) : (
    <ErrorState
      title="Not authorized"
      description="Department staff can only view their assigned department."
    />
  );
}
