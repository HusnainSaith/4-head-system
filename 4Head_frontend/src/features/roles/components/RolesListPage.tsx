import { useState } from "react";
import { Pencil, Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { z } from "zod";
import { ConfirmDialog } from "@/components/common/ConfirmDialog";
import { DataTable, type DataTableColumn } from "@/components/common/DataTable";
import { EmptyState } from "@/components/common/EmptyState";
import { ErrorState } from "@/components/common/ErrorState";
import { PageHeader } from "@/components/common/PageHeader";
import { PageSkeleton } from "@/components/common/Skeletons";
import { PageContainer } from "@/components/layout/PageContainer";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { getApiErrorMessage } from "@/lib/api-error";
import {
  useCreateRoleMutation,
  useDeleteRoleMutation,
  useListRolesQuery,
  useUpdateRoleMutation,
} from "../rolesApi";
import type { ManagedRole } from "../types";

const roleSchema = z.object({
  name: z
    .string()
    .trim()
    .min(1, "Role name is required")
    .max(60)
    .regex(
      /^[A-Za-z][A-Za-z0-9_]*$/,
      "Use letters, numbers, and underscores only",
    ),
  description: z.string().max(255),
});

const protectedRoles = new Set(["owner", "accountant", "department_staff"]);

export function RolesListPage() {
  const query = useListRolesQuery();
  const [editing, setEditing] = useState<ManagedRole | null>(null);
  const [formOpen, setFormOpen] = useState(false);
  const [deleting, setDeleting] = useState<ManagedRole | null>(null);
  const [createRole, createState] = useCreateRoleMutation();
  const [updateRole, updateState] = useUpdateRoleMutation();
  const [deleteRole, deleteState] = useDeleteRoleMutation();

  const columns: DataTableColumn<ManagedRole>[] = [
    { id: "name", header: "Role", cell: (role) => <Badge>{role.name}</Badge> },
    {
      id: "description",
      header: "Description",
      cell: (role) => role.description ?? "—",
    },
    {
      id: "actions",
      header: "Actions",
      cell: (role) => {
        const isProtected = protectedRoles.has(role.name.toLowerCase());
        return (
          <div className="flex flex-wrap gap-2">
            <Button
              size="sm"
              variant="outline"
              onClick={() => {
                setEditing(role);
                setFormOpen(true);
              }}
            >
              <Pencil aria-hidden /> Edit
            </Button>
            {!isProtected ? (
              <Button
                size="sm"
                variant="destructive"
                onClick={() => setDeleting(role)}
              >
                <Trash2 aria-hidden /> Delete
              </Button>
            ) : null}
          </div>
        );
      },
    },
  ];

  if (query.isLoading) return <PageSkeleton rows={6} />;
  if (query.isError)
    return (
      <PageContainer>
        <ErrorState
          title="Roles could not be loaded"
          description={getApiErrorMessage(query.error)}
          onRetry={() => void query.refetch()}
        />
      </PageContainer>
    );

  return (
    <PageContainer>
      <PageHeader
        title="Roles"
        description="Create reusable user roles. Core access roles cannot be deleted."
        actions={
          <Button
            onClick={() => {
              setEditing(null);
              setFormOpen(true);
            }}
          >
            <Plus aria-hidden /> Add role
          </Button>
        }
      />
      <DataTable
        columns={columns}
        data={query.data?.data ?? []}
        getRowId={(role) => role.id}
        emptyContent={<EmptyState title="No roles found" />}
      />
      <RoleDialog
        key={editing?.id ?? String(formOpen)}
        open={formOpen}
        role={editing}
        loading={createState.isLoading || updateState.isLoading}
        onClose={() => setFormOpen(false)}
        onSave={async (body) => {
          try {
            if (editing) await updateRole({ id: editing.id, body }).unwrap();
            else await createRole(body).unwrap();
            toast.success(editing ? "Role updated" : "Role created");
            setFormOpen(false);
          } catch (error) {
            toast.error(getApiErrorMessage(error));
          }
        }}
      />
      <ConfirmDialog
        open={Boolean(deleting)}
        onOpenChange={(open) => !open && setDeleting(null)}
        title="Delete role?"
        description="The role can only be deleted when no active users are assigned to it."
        confirmLabel="Delete"
        destructive
        loading={deleteState.isLoading}
        onConfirm={() => {
          if (!deleting) return;
          void deleteRole(deleting.id)
            .unwrap()
            .then(() => {
              toast.success("Role deleted");
              setDeleting(null);
            })
            .catch((error) => toast.error(getApiErrorMessage(error)));
        }}
      />
    </PageContainer>
  );
}

function RoleDialog({
  open,
  role,
  loading,
  onClose,
  onSave,
}: {
  open: boolean;
  role: ManagedRole | null;
  loading: boolean;
  onClose: () => void;
  onSave: (body: { name?: string; description?: string }) => Promise<void>;
}) {
  const core = role ? protectedRoles.has(role.name.toLowerCase()) : false;
  const [name, setName] = useState(role?.name ?? "");
  const [description, setDescription] = useState(role?.description ?? "");
  const [error, setError] = useState("");
  return (
    <Dialog open={open} onOpenChange={(next) => !next && onClose()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{role ? "Edit role" : "Add role"}</DialogTitle>
        </DialogHeader>
        <form
          className="space-y-4"
          onSubmit={(event) => {
            event.preventDefault();
            const parsed = roleSchema.safeParse({ name, description });
            if (!parsed.success) {
              setError(parsed.error.issues[0]?.message ?? "Invalid role");
              return;
            }
            setError("");
            void onSave({
              ...(core ? {} : { name: parsed.data.name }),
              description: parsed.data.description || undefined,
            });
          }}
        >
          {error ? <p className="text-sm text-destructive">{error}</p> : null}
          <div className="space-y-2">
            <Label htmlFor="role-name">Name</Label>
            <Input
              id="role-name"
              value={name}
              disabled={core}
              onChange={(event) => setName(event.target.value)}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="role-description">Description</Label>
            <Textarea
              id="role-description"
              value={description}
              onChange={(event) => setDescription(event.target.value)}
            />
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={onClose}>
              Cancel
            </Button>
            <Button type="submit" isLoading={loading}>
              Save
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
