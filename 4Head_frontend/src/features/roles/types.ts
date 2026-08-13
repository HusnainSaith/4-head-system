export interface ManagedRole {
  id: string;
  name: string;
  description: string | null;
  createdAt: string;
  updatedAt: string;
  deletedAt: string | null;
}

export interface SaveRoleRequest {
  name?: string;
  description?: string;
}
