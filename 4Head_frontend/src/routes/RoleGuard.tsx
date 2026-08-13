import type { ReactNode } from "react";
import { useSelector } from "react-redux";
import { ErrorState } from "@/components/common/ErrorState";
import { selectUserRole } from "@/features/auth/authSlice";
import type { Role } from "@/types/enums";

export function RoleGuard({
  allowedRoles,
  children,
}: {
  allowedRoles: readonly Role[];
  children: ReactNode;
}) {
  const role = useSelector(selectUserRole);
  if (!role || !allowedRoles.includes(role)) {
    return (
      <ErrorState
        title="Not authorized"
        description="Your account does not have access to this page."
      />
    );
  }
  return <>{children}</>;
}
