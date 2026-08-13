import { useState } from "react";
import { Outlet } from "react-router-dom";
import { ErrorState } from "@/components/common/ErrorState";
import { useAuth } from "@/features/auth/hooks/useAuth";
import { Sidebar } from "@/components/layout/Sidebar";
import { Topbar } from "@/components/layout/Topbar";
import {
  getSidebarCollapsed,
  setSidebarCollapsed,
} from "@/lib/ui-preferences";

export function AppShell() {
  const [collapsed, setCollapsed] = useState(getSidebarCollapsed);
  const { user, role, logout, isLoggingOut } = useAuth();

  if (!user) {
    return (
      <ErrorState
        title="Session profile unavailable"
        description="Sign in again to restore your role and department context."
        onRetry={logout}
      />
    );
  }

  return (
    <div className="flex min-h-screen bg-muted/30">
      <Sidebar
        collapsed={collapsed}
        onCollapsedChange={(nextCollapsed) => {
          setCollapsed(nextCollapsed);
          setSidebarCollapsed(nextCollapsed);
        }}
        role={role}
        departmentCode={user.departmentCode}
      />
      <div className="min-w-0 flex-1">
        <Topbar user={user} onLogout={logout} isLoggingOut={isLoggingOut} />
        <Outlet />
      </div>
    </div>
  );
}
