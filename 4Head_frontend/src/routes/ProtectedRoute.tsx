import type { ReactNode } from "react";
import { useSelector } from "react-redux";
import { Navigate, useLocation } from "react-router-dom";
import { PageSkeleton } from "@/components/common/Skeletons";
import {
  selectIsAuthenticated,
  selectIsCheckingAuth,
} from "@/features/auth/authSlice";

export function ProtectedRoute({ children }: { children: ReactNode }) {
  const location = useLocation();
  const isAuthenticated = useSelector(selectIsAuthenticated);
  const isCheckingAuth = useSelector(selectIsCheckingAuth);

  if (isCheckingAuth) return <PageSkeleton rows={5} />;
  if (!isAuthenticated) {
    return <Navigate to="/login" replace state={{ from: location }} />;
  }
  return <>{children}</>;
}
