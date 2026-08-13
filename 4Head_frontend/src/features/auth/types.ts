import type { ApiResponse } from "@/types/api";
import type { DepartmentCode, Role } from "@/types/enums";

/** Exact body accepted by POST /auth/login. */
export interface LoginRequest {
  email: string;
  password: string;
}

/** Role relation loaded by UsersService.findByEmail(). */
export interface AuthRole {
  id: string;
  name: Role;
  description: string | null;
}

/**
 * Serialized backend User returned by login after passwordHash is removed.
 * The backend field is `id`, not `userId`.
 */
export interface AuthUser {
  id: string;
  fullName: string;
  email: string;
  phone: string | null;
  roleId: string | null;
  role: AuthRole | null;
  departmentId: string | null;
  department?: { id: string; name: string; type: DepartmentCode } | null;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
  deletedAt: string | null;
  createdBy: string | null;
  updatedBy: string | null;
}

/** Login user plus the only department-scoping claim emitted by the JWT. */
export interface SessionUser extends AuthUser {
  departmentCode: DepartmentCode | null;
}

export function isSessionUser(value: unknown): value is SessionUser {
  if (typeof value !== "object" || value === null) return false;
  const user = value as Record<string, unknown>;
  return (
    typeof user.id === "string" &&
    typeof user.fullName === "string" &&
    typeof user.email === "string" &&
    (typeof user.departmentId === "string" || user.departmentId === null) &&
    (typeof user.role === "object" || user.role === null) &&
    (typeof user.departmentCode === "string" || user.departmentCode === null)
  );
}

export interface LoginResponseData {
  user: AuthUser;
}

export type LoginResponse = ApiResponse<LoginResponseData>;

export type RefreshRequest = Record<string, never>;
export type RefreshResponse = ApiResponse<null>;
export type LogoutRequest = Record<string, never>;
export type LogoutResponse = ApiResponse<null>;

export interface ForgotPasswordRequest {
  email: string;
}

export interface ResetPasswordRequest {
  token: string;
  password: string;
}

export type AuthMessageResponse = ApiResponse<null>;
