import type { AuthState } from "@/features/auth/authSlice";
import type { SessionUser } from "@/features/auth/types";
import { DepartmentCode, Role } from "@/types/enums";

export const ownerUser: SessionUser = {
  id: "user-1",
  fullName: "Test Owner",
  email: "owner@example.com",
  phone: null,
  roleId: "role-1",
  role: { id: "role-1", name: Role.OWNER, description: null },
  departmentId: null,
  departmentCode: null,
  isActive: true,
  createdAt: "2026-07-11T00:00:00.000Z",
  updatedAt: "2026-07-11T00:00:00.000Z",
  deletedAt: null,
  createdBy: null,
  updatedBy: null,
};

export const departmentUser: SessionUser = {
  ...ownerUser,
  id: "user-2",
  fullName: "Supply Staff",
  email: "staff@example.com",
  roleId: "role-2",
  role: { id: "role-2", name: Role.DEPARTMENT_STAFF, description: null },
  departmentId: "department-1",
  departmentCode: DepartmentCode.SUPPLY,
};

export const loggedOutState: AuthState = {
  user: null,
  isAuthenticated: false,
  isCheckingAuth: false,
};

export function authenticatedState(user: SessionUser): AuthState {
  return { user, isAuthenticated: true, isCheckingAuth: false };
}
