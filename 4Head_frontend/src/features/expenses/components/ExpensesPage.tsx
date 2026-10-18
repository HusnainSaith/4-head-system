import { Link } from "react-router-dom";
import { useState } from "react";
import { useSelector } from "react-redux";
import { toast } from "sonner";
import { DataTable, type DataTableColumn } from "@/components/common/DataTable";
import { ErrorState } from "@/components/common/ErrorState";
import { PageHeader } from "@/components/common/PageHeader";
import { PageSkeleton } from "@/components/common/Skeletons";
import { PageContainer } from "@/components/layout/PageContainer";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  selectUserDepartmentId,
  selectUserRole,
} from "@/features/auth/authSlice";
import { useListDepartmentsQuery } from "@/features/vehicles/vehiclesApi";
import { InvoiceButton } from "@/features/invoices/components/InvoiceButton";
import { getApiErrorMessage } from "@/lib/api-error";
import { Role } from "@/types/enums";
import { PaymentAccountFields } from "@/features/accounts/components";
import type { PaymentAccountSelection } from "@/features/accounts/types";
import {
  useCreateExpenseMutation,
  useListExpenseCategoriesQuery,
  useListExpensesQuery,
  useUpdateExpenseMutation,
  useUpdateExpenseCategoryMutation,
} from "../expensesApi";
import type { CreateExpenseRequest, Expense, ExpenseCategory } from "../types";
const money = new Intl.NumberFormat("en-PK", {
  style: "currency",
  currency: "PKR",
});
export function ExpensesPage() {
  const role = useSelector(selectUserRole);
  const own = useSelector(selectUserDepartmentId);
  const management = role === Role.OWNER || role === Role.ACCOUNTANT;
  const [department, setDepartment] = useState("");
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<Expense | null>(null);
  const effectiveDepartment = management ? department : (own ?? "");
  const query = useListExpensesQuery(
    { departmentId: effectiveDepartment || undefined },
    { skip: !management && !own },
  );
  const categories = useListExpenseCategoriesQuery();
  const departments = useListDepartmentsQuery(undefined, { skip: !management });
  const [create, state] = useCreateExpenseMutation();
  const [updateExpense, updateState] = useUpdateExpenseMutation();
  const [updateCategory] = useUpdateExpenseCategoryMutation();
  const columns: DataTableColumn<Expense>[] = [
    {
      id: "date",
      header: "Date",
      cell: (e) => String(e.expenseDate).slice(0, 10),
    },
    {
      id: "category",
      header: "Category",
      cell: (e) => e.category?.name ?? e.categoryId,
    },
    {
      id: "amount",
      header: "Amount",
      cell: (e) => money.format(Number(e.amount)),
    },
    {
      id: "department",
      header: "Department",
      cell: (e) => (
        <Badge variant="secondary">
          {e.department?.name ?? e.departmentId}
        </Badge>
      ),
    },
    {
      id: "source",
      header: "Source",
      cell: (e) => <Badge>{e.sourceType.replaceAll("_", " ")}</Badge>,
    },
    {
      id: "description",
      header: "Description",
      cell: (e) => e.description ?? "—",
    },
    ...(management
      ? [
          {
            id: "actions",
            header: "Actions",
            cell: (expense: Expense) => (
              <div className="flex gap-2">
                <InvoiceButton
                  sourceType="expense"
                  sourceId={expense.id}
                  label="Print"
                />
                {expense.sourceType === "manual" ? (
                  <Button
                    variant="outline"
                    onClick={() => {
                      setEditing(expense);
                      setOpen(true);
                    }}
                  >
                    Edit
                  </Button>
                ) : null}
              </div>
            ),
          },
        ]
      : []),
  ];
  if (query.isLoading) return <PageSkeleton rows={6} />;
  if (query.isError)
    return (
      <PageContainer>
        <ErrorState
          title="Expenses could not be loaded"
          error={query.error}
          onRetry={() => void query.refetch()}
        />
      </PageContainer>
    );
  return (
    <PageContainer>
      <PageHeader
        title="Expenses"
        actions={
          <Button onClick={() => setOpen(true)}>Add Manual Expense</Button>
        }
      />
      {management ? (
        <div className="max-w-sm">
          <Label htmlFor="expense-department-filter">Department filter</Label>
          <Select
            value={department || "all"}
            onValueChange={(v) => setDepartment(v === "all" ? "" : v)}
          >
            <SelectTrigger id="expense-department-filter">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All departments</SelectItem>
              {(departments.data?.data ?? []).map((d) => (
                <SelectItem key={d.id} value={d.id}>
                  {d.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      ) : null}
      <DataTable
        columns={columns}
        data={query.data?.data ?? []}
        getRowId={(e) => e.id}
      />
      {management ? (
        <Card>
          <CardHeader>
            <CardTitle>Expense Categories</CardTitle>
            <Button asChild variant="outline">
              <Link to="/expenses/categories">Manage categories</Link>
            </Button>
          </CardHeader>
          <CardContent className="space-y-2">
            {(categories.data?.data ?? []).map((c) => (
              <CategoryRow
                key={c.id}
                category={c}
                onToggle={async () => {
                  try {
                    await updateCategory({
                      id: c.id,
                      body: { isActive: !c.isActive },
                    }).unwrap();
                    toast.success("Category updated");
                  } catch (error) {
                    toast.error(getApiErrorMessage(error));
                  }
                }}
              />
            ))}
          </CardContent>
        </Card>
      ) : null}
      {open ? (
        <ExpenseDialog
          key={editing?.id ?? "new"}
          open={open}
          expense={editing}
          fixedDepartmentId={management ? undefined : (own ?? undefined)}
          departments={departments.data?.data ?? []}
          categories={(categories.data?.data ?? []).filter(
            (c) => c.isActive || c.id === editing?.categoryId,
          )}
          loading={state.isLoading || updateState.isLoading}
          onClose={() => {
            setOpen(false);
            setEditing(null);
          }}
          onSubmit={async (body) => {
            try {
              if (editing)
                await updateExpense({ id: editing.id, body }).unwrap();
              else await create(body).unwrap();
              toast.success(
                editing ? "Expense updated" : "Manual expense created",
              );
              setOpen(false);
              setEditing(null);
            } catch (error) {
              toast.error(getApiErrorMessage(error));
            }
          }}
        />
      ) : null}
    </PageContainer>
  );
}
function CategoryRow({
  category,
  onToggle,
}: {
  category: ExpenseCategory;
  onToggle: () => Promise<void>;
}) {
  return (
    <div className="flex items-center justify-between rounded border p-2">
      <span>
        {category.name}{" "}
        {category.isSystemGenerated ? (
          <Badge variant="secondary">System</Badge>
        ) : null}
      </span>
      {category.isSystemGenerated ? (
        <span className="text-sm text-muted-foreground">
          Managed by the system
        </span>
      ) : (
        <Button size="sm" variant="outline" onClick={() => void onToggle()}>
          {category.isActive ? "Deactivate" : "Activate"}
        </Button>
      )}
    </div>
  );
}
function ExpenseDialog({
  open,
  expense,
  fixedDepartmentId,
  departments,
  categories,
  loading,
  onClose,
  onSubmit,
}: {
  open: boolean;
  expense: Expense | null;
  fixedDepartmentId?: string;
  departments: Array<{ id: string; name: string }>;
  categories: ExpenseCategory[];
  loading: boolean;
  onClose: () => void;
  onSubmit: (body: CreateExpenseRequest) => Promise<void>;
}) {
  const [department, setDepartment] = useState(
    expense?.departmentId ?? fixedDepartmentId ?? "",
  );
  const [category, setCategory] = useState(expense?.categoryId ?? "");
  const [amount, setAmount] = useState(expense?.amount ?? "");
  const [date, setDate] = useState(
    expense?.expenseDate.slice(0, 10) ?? new Date().toISOString().slice(0, 10),
  );
  const [description, setDescription] = useState(expense?.description ?? "");
  const [paymentMethod, setPaymentMethod] = useState<"cash" | "bank">(
    expense?.paymentMethod ?? "cash",
  );
  const [accountSelection, setAccountSelection] =
    useState<PaymentAccountSelection>(
      expense
        ? {
            cashAccountId: expense.cashAccountId,
            bankAccountId: expense.bankAccountId,
            bankTransactionMethod: expense.bankTransactionMethod,
            chequeNumber: expense.chequeNumber,
            appReference: expense.appReference,
          }
        : {},
    );
  return (
    <Dialog
      open={open}
      onOpenChange={(v) => {
        if (!v) onClose();
      }}
    >
      <DialogContent>
        <DialogHeader>
          <DialogTitle>
            {expense ? "Edit Manual Expense" : "Add Manual Expense"}
          </DialogTitle>
        </DialogHeader>
        <form
          className="space-y-3"
          onSubmit={(e) => {
            e.preventDefault();
            if (category && Number(amount) > 0)
              void onSubmit({
                departmentId: fixedDepartmentId ?? department,
                categoryId: category,
                amount: Number(amount).toFixed(2),
                expenseDate: date,
                paymentMethod,
                ...accountSelection,
                description: description || undefined,
              });
          }}
        >
          <p className="text-sm text-muted-foreground">
            Source is fixed to manual. System sources cannot be selected.
          </p>
          <div>
            <Label htmlFor="expense-category">Category</Label>
            <Select value={category} onValueChange={setCategory}>
              <SelectTrigger id="expense-category">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {categories.map((c) => (
                  <SelectItem key={c.id} value={c.id}>
                    {c.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          {fixedDepartmentId ? (
            <div>
              <Label htmlFor="expense-fixed-department">Department</Label>
              <Input
                id="expense-fixed-department"
                value={fixedDepartmentId}
                disabled
              />
            </div>
          ) : (
            <div>
              <Label htmlFor="expense-department">Department</Label>
              <Select value={department} onValueChange={setDepartment}>
                <SelectTrigger id="expense-department">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {departments.map((d) => (
                    <SelectItem key={d.id} value={d.id}>
                      {d.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}
          <div>
            <Label htmlFor="expense-amount">Amount</Label>
            <Input
              required
              min="0.01"
              step="0.01"
              id="expense-amount"
              type="number"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
            />
          </div>
          <div>
            <Label htmlFor="expense-date">Date</Label>
            <Input
              id="expense-date"
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
            />
          </div>
          <div>
            <Label htmlFor="expense-description">Description</Label>
            <Input
              id="expense-description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
            />
          </div>
          <div>
            <Label>Payment method</Label>
            <Select
              value={paymentMethod}
              onValueChange={(value) => {
                setPaymentMethod(value as "cash" | "bank");
                setAccountSelection({});
              }}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="cash">Cash</SelectItem>
                <SelectItem value="bank">Bank</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <PaymentAccountFields
            paymentMethod={paymentMethod}
            value={accountSelection}
            onChange={setAccountSelection}
            departmentId={fixedDepartmentId ?? department}
          />
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
