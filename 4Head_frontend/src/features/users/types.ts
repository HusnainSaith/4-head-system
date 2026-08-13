export interface UserRole {
  id: string;
  name: string;
  description: string | null;
}

export interface UserDepartment {
  id: string;
  name: string;
  type: string;
}

/** Camel-case JSON serialized by the NestJS User entity. */
export interface User {
  id: string;
  fullName: string;
  email: string;
  phone: string | null;
  roleId: string | null;
  role: UserRole | null;
  departmentId: string | null;
  department: UserDepartment | null;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
  deletedAt: string | null;
}

/** Exact POST /users body accepted by CreateUserDto. */
export interface CreateUserRequest {
  fullName: string;
  email: string;
  password: string;
  roleId?: string;
  departmentId?: string;
  phone?: string;
}

/** Exact editable subset used with PATCH /users/:id. */
export interface UpdateUserRequest {
  fullName?: string;
  email?: string;
  password?: string;
  roleId?: string;
  departmentId?: string | null;
  phone?: string;
}
