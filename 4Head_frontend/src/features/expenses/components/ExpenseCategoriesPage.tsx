import { useState } from "react";
import { Link } from "react-router-dom";
import { toast } from "sonner";
import { PageContainer } from "@/components/layout/PageContainer";
import { PageHeader } from "@/components/common/PageHeader";
import { ErrorState } from "@/components/common/ErrorState";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import {
  useListExpenseCategoriesQuery,
  useCreateExpenseCategoryMutation,
  useUpdateExpenseCategoryMutation,
  useDeleteExpenseCategoryMutation,
} from "../expensesApi";
import { getApiErrorMessage } from "@/lib/api-error";
import type { ExpenseCategory } from "../types";

const types = [
  "operational",
  "maintenance",
  "transport",
  "administrative",
  "miscellaneous",
];
export function ExpenseCategoriesPage() {
  const query = useListExpenseCategoriesQuery();
  const [create, createState] = useCreateExpenseCategoryMutation();
  const [update, updateState] = useUpdateExpenseCategoryMutation();
  const [remove, removeState] = useDeleteExpenseCategoryMutation();
  const [editing, setEditing] = useState<ExpenseCategory | null>(null);
  const [open, setOpen] = useState(false);
  const [deleting, setDeleting] = useState<ExpenseCategory | null>(null);
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [categoryType, setType] = useState("miscellaneous");
  const [error, setError] = useState("");
  const busy =
    createState.isLoading || updateState.isLoading || removeState.isLoading;
  const edit = (category: ExpenseCategory | null) => {
    setEditing(category);
    setName(category?.name ?? "");
    setDescription(category?.description ?? "");
    setType(category?.categoryType ?? "miscellaneous");
    setError("");
    setOpen(true);
  };
  const reportError = (err: unknown) => {
    const message = getApiErrorMessage(err);
    setError(message);
    toast.error(message);
  };
  return (
    <PageContainer>
      <PageHeader
        title="Expense Categories"
        actions={
          <div className="flex gap-2">
            <Button asChild variant="outline">
              <Link to="/expenses">Back to expenses</Link>
            </Button>
            <Button onClick={() => edit(null)}>Add Category</Button>
          </div>
        }
      />
      {query.isLoading ? (
        <p>Loading categories...</p>
      ) : query.isError ? (
        <ErrorState
          title="Categories could not be loaded"
          error={query.error}
          onRetry={() => void query.refetch()}
        />
      ) : (
        <div className="space-y-3">
          {(query.data?.data ?? []).map((category) => (
            <div
              key={category.id}
              className="flex flex-wrap items-center justify-between gap-3 rounded border p-3"
            >
              <div>
                <p className="font-medium">
                  {category.name} {category.isSystemGenerated ? "(System)" : ""}
                </p>
                <p className="text-sm text-muted-foreground">
                  {category.description}
                </p>
                <p className="text-sm">
                  {category.categoryType} ·{" "}
                  {category.isActive ? "Active" : "Inactive"}
                </p>
              </div>
              {category.isSystemGenerated ? (
                <p className="text-sm text-muted-foreground">
                  Managed by the system
                </p>
              ) : (
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    aria-label={`Edit ${category.name}`}
                    disabled={busy}
                    onClick={() => edit(category)}
                  >
                    Edit
                  </Button>
                  <Button
                    variant="outline"
                    disabled={busy}
                    onClick={async () => {
                      try {
                        await update({
                          id: category.id,
                          body: { isActive: !category.isActive },
                        }).unwrap();
                        toast.success("Category updated");
                      } catch (err) {
                        reportError(err);
                      }
                    }}
                  >
                    {category.isActive ? "Deactivate" : "Activate"}
                  </Button>
                  <Button
                    variant="destructive"
                    aria-label={`Delete ${category.name}`}
                    disabled={busy}
                    onClick={() => {
                      setError("");
                      setDeleting(category);
                    }}
                  >
                    Delete
                  </Button>
                </div>
              )}
            </div>
          ))}
          {query.data?.data.length === 0 ? (
            <p>No categories found. Add a category to get started.</p>
          ) : null}
        </div>
      )}
      <Dialog open={open} onOpenChange={(value) => !busy && setOpen(value)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {editing ? "Edit Category" : "Add Category"}
            </DialogTitle>
            <DialogDescription>
              Categories organize manual and system expenses.
            </DialogDescription>
          </DialogHeader>
          <form
            className="space-y-4"
            onSubmit={async (event) => {
              event.preventDefault();
              if (busy) return;
              try {
                const body = {
                  name: name.trim(),
                  description: description.trim(),
                  categoryType,
                };
                if (editing) await update({ id: editing.id, body }).unwrap();
                else await create(body).unwrap();
                toast.success("Category saved");
                setOpen(false);
              } catch (err) {
                reportError(err);
              }
            }}
          >
            {error ? (
              <p role="alert" className="text-destructive">
                {error}
              </p>
            ) : null}
            <div>
              <Label htmlFor="category-name">Name</Label>
              <Input
                id="category-name"
                required
                maxLength={100}
                value={name}
                onChange={(event) => setName(event.target.value)}
              />
            </div>
            <div>
              <Label htmlFor="category-description">Description</Label>
              <Input
                id="category-description"
                maxLength={2000}
                value={description}
                onChange={(event) => setDescription(event.target.value)}
              />
            </div>
            <div>
              <Label htmlFor="category-type">Type</Label>
              <select
                id="category-type"
                className="h-9 w-full rounded border bg-background px-2"
                value={categoryType}
                onChange={(event) => setType(event.target.value)}
              >
                {types.map((type) => (
                  <option key={type} value={type}>
                    {type}
                  </option>
                ))}
              </select>
            </div>
            <div className="flex justify-end gap-2">
              <Button
                type="button"
                variant="outline"
                disabled={busy}
                onClick={() => setOpen(false)}
              >
                Cancel
              </Button>
              <Button type="submit" disabled={busy || !name.trim()}>
                Save Category
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
      <Dialog
        open={Boolean(deleting)}
        onOpenChange={(value) => !value && !busy && setDeleting(null)}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete Category</DialogTitle>
            <DialogDescription>
              Delete {deleting?.name}? Categories used by existing expenses must
              be deactivated instead.
            </DialogDescription>
          </DialogHeader>
          {error ? (
            <p role="alert" className="text-destructive">
              {error}
            </p>
          ) : null}
          <div className="flex justify-end gap-2">
            <Button
              variant="outline"
              disabled={busy}
              onClick={() => setDeleting(null)}
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              disabled={busy}
              onClick={async () => {
                if (!deleting || busy) return;
                try {
                  await remove(deleting.id).unwrap();
                  toast.success("Category deleted");
                  setDeleting(null);
                } catch (err) {
                  reportError(err);
                }
              }}
            >
              Confirm Delete
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </PageContainer>
  );
}
