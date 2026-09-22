import { useEffect, useMemo, useState } from "react";
import { zodResolver } from "@hookform/resolvers/zod";
import { MoreHorizontal, Plus } from "lucide-react";
import { useForm, useWatch } from "react-hook-form";
import { useSelector } from "react-redux";
import { toast } from "sonner";
import { z } from "zod";
import { ConfirmDialog } from "@/components/common/ConfirmDialog";
import { DataTable, type DataTableColumn } from "@/components/common/DataTable";
import { EmptyState } from "@/components/common/EmptyState";
import { ErrorState } from "@/components/common/ErrorState";
import { PageHeader } from "@/components/common/PageHeader";
import { PageSkeleton } from "@/components/common/Skeletons";
import { PageContainer } from "@/components/layout/PageContainer";
import { PaymentAccountFields } from "@/features/accounts/components";
import type { PaymentAccountSelection } from "@/features/accounts/types";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
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
  selectUserDepartmentCode,
  selectUserRole,
} from "@/features/auth/authSlice";
import { useListPartiesQuery } from "@/features/parties/partiesApi";
import { PartyType } from "@/features/parties/types";
import { DepartmentBalancesPanel } from "@/features/parties/components/DepartmentBalancesPanel";
import { DepartmentVehicleSelect } from "@/features/vehicles/components/DepartmentVehicleSelect";
import { InvoiceButton } from "@/features/invoices/components/InvoiceButton";
import { getApiErrorMessage } from "@/lib/api-error";
import { DepartmentCode, Role } from "@/types/enums";
import {
  useCreatePurchaseMutation,
  useDeletePurchaseMutation,
  useListPurchasesQuery,
  useUpdatePurchaseMutation,
} from "../wastageApi";
import type { CreatePurchaseRequest, WastagePurchase } from "../types";

const purchaseSchema = z
  .object({
    partyId: z.union([
      z.literal(""),
      z.string().uuid("Select a valid shop owner."),
    ]),
    quantityKg: z.coerce
      .number()
      .positive("Weight must be greater than zero."),
    ratePerKg: z.coerce.number().positive("Rate must be greater than zero."),
    amountPaid: z.coerce.number().min(0, "Amount paid cannot be negative."),
    paymentMethod: z.enum(["cash", "bank", "credit"]),
    purchaseDate: z
      .string()
      .min(1, "Purchase date is required.")
      .refine(
        (value) => !Number.isNaN(Date.parse(value)),
        "Enter a valid date.",
      ),
    vehicleId: z.union([z.literal(""), z.string().uuid()]),
    notes: z.string(),
  })
  .superRefine((value, context) => {
    const total = value.quantityKg * value.ratePerKg;
    if (value.amountPaid > total)
      context.addIssue({
        code: "custom",
        path: ["amountPaid"],
        message: "Amount paid cannot exceed total amount.",
      });
    if (value.amountPaid < total && !value.partyId)
      context.addIssue({
        code: "custom",
        path: ["partyId"],
        message: "Select a shop owner when a payable balance remains.",
      });
  });
type PurchaseFormValues = z.output<typeof purchaseSchema>;
type PurchaseFormInput = z.input<typeof purchaseSchema>;

const money = new Intl.NumberFormat("en-PK", {
  style: "currency",
  currency: "PKR",
});
const today = () => new Date().toISOString().slice(0, 10);

export function WastagePurchasesPage() {
  const purchasesQuery = useListPurchasesQuery();
  const partiesQuery = useListPartiesQuery({
    type: PartyType.SHOP_OWNER,
    limit: 100,
  });
  const role = useSelector(selectUserRole);
  const departmentCode = useSelector(selectUserDepartmentCode);
  const canWrite =
    role === Role.OWNER ||
    role === Role.ACCOUNTANT ||
    (role === Role.DEPARTMENT_STAFF &&
      departmentCode === DepartmentCode.WASTAGE);
  const canInvoice = role === Role.OWNER || role === Role.ACCOUNTANT;
  const [editing, setEditing] = useState<WastagePurchase | null>(null);
  const [formOpen, setFormOpen] = useState(false);
  const [deleting, setDeleting] = useState<WastagePurchase | null>(null);
  const [createPurchase, createState] = useCreatePurchaseMutation();
  const [updatePurchase, updateState] = useUpdatePurchaseMutation();
  const [deletePurchase, deleteState] = useDeletePurchaseMutation();
  const parties = useMemo(
    () => partiesQuery.data?.data.items ?? [],
    [partiesQuery.data?.data.items],
  );
  const partyNames = useMemo(
    () => new Map(parties.map((party) => [party.id, party.name])),
    [parties],
  );

  const columns: DataTableColumn<WastagePurchase>[] = [
    {
      id: "party",
      header: "Shop owner",
      cell: (row) =>
        row.partyId ? (
          <a
            className="font-medium text-primary hover:underline"
            href={`/parties/${row.partyId}`}
          >
            {partyNames.get(row.partyId) ?? "View statement"}
          </a>
        ) : (
          "—"
        ),
    },
    {
      id: "quantity",
      header: "Weight",
      cell: (row) => `${row.quantityKg} kg`,
      align: "right",
    },
    {
      id: "rate",
      header: "Rate/kg",
      cell: (row) => money.format(Number(row.ratePerKg)),
      align: "right",
    },
    {
      id: "total",
      header: "Total",
      cell: (row) => money.format(Number(row.totalAmount)),
      align: "right",
    },
    {
      id: "method",
      header: "Payment method",
      cell: (row) => row.paymentMethod,
    },
    {
      id: "paid",
      header: "Paid / total",
      cell: (row) =>
        `${money.format(Number(row.amountPaid))} / ${money.format(Number(row.totalAmount))}`,
      align: "right",
    },
    {
      id: "outstanding",
      header: "Initial payable",
      cell: (row) => money.format(Number(row.outstandingAmount)),
      align: "right",
    },
    { id: "date", header: "Purchase date", cell: (row) => row.purchaseDate },
    { id: "vehicle", header: "Vehicle", cell: (row) => row.vehicleId ?? "—" },
    ...(canWrite
      ? [
          {
            id: "actions",
            header: "Actions",
            align: "right" as const,
            cell: (row: WastagePurchase) => (
              <div className="flex justify-end gap-2">
                {canInvoice ? (
                  <InvoiceButton
                    sourceType="purchase"
                    sourceId={row.id}
                    label="Print"
                  />
                ) : null}
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button
                      variant="ghost"
                      size="icon"
                      aria-label="Purchase actions"
                    >
                      <MoreHorizontal />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuItem
                      onSelect={() => {
                        setEditing(row);
                        setFormOpen(true);
                      }}
                    >
                      Edit
                    </DropdownMenuItem>
                    <DropdownMenuItem
                      className="text-destructive"
                      onSelect={() => setDeleting(row)}
                    >
                      Delete
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
            ),
          },
        ]
      : []),
  ];

  if (purchasesQuery.isLoading) return <PageSkeleton rows={6} />;
  if (purchasesQuery.isError)
    return (
      <PageContainer>
        <ErrorState
          title="Wastage purchases could not be loaded"
          description={getApiErrorMessage(purchasesQuery.error)}
          onRetry={() => void purchasesQuery.refetch()}
        />
      </PageContainer>
    );

  const closeForm = () => {
    setFormOpen(false);
    setEditing(null);
  };
  return (
    <PageContainer>
      <PageHeader
        title="Wastage Purchases"
        description="Purchases of wastage stock from shop owners."
        actions={
          canWrite ? (
            <Button onClick={() => setFormOpen(true)}>
              <Plus />
              Record Purchase
            </Button>
          ) : undefined
        }
      />
      <DepartmentBalancesPanel departmentCode={DepartmentCode.WASTAGE} />
      <DataTable
        columns={columns}
        data={purchasesQuery.data?.data ?? []}
        getRowId={(row) => row.id}
        emptyContent={
          <EmptyState
            title="No wastage purchases recorded"
            description="Record a purchase to add wastage stock."
          />
        }
      />
      <PurchaseDialog
        key={formOpen ? (editing?.id ?? "new") : "closed"}
        open={formOpen}
        purchase={editing}
        parties={parties}
        loading={createState.isLoading || updateState.isLoading}
        onClose={closeForm}
        onSubmit={async (body) => {
          try {
            if (editing)
              await updatePurchase({ id: editing.id, body }).unwrap();
            else await createPurchase(body).unwrap();
            toast.success(editing ? "Purchase updated" : "Purchase recorded");
            closeForm();
          } catch (error) {
            toast.error(getApiErrorMessage(error));
          }
        }}
      />
      <ConfirmDialog
        open={Boolean(deleting)}
        onOpenChange={(open) => {
          if (!open) setDeleting(null);
        }}
        title="Delete purchase?"
        description="This soft-deletes the purchase record. The backend does not reverse its inventory or ledger entries."
        confirmLabel="Delete"
        destructive
        loading={deleteState.isLoading}
        onConfirm={() => {
          if (!deleting) return;
          void deletePurchase(deleting.id)
            .unwrap()
            .then(() => {
              toast.success("Purchase deleted");
              setDeleting(null);
            })
            .catch((error) => toast.error(getApiErrorMessage(error)));
        }}
      />
    </PageContainer>
  );
}

function PurchaseDialog({
  open,
  purchase,
  parties,
  loading,
  onClose,
  onSubmit,
}: {
  open: boolean;
  purchase: WastagePurchase | null;
  parties: Array<{ id: string; name: string }>;
  loading: boolean;
  onClose: () => void;
  onSubmit: (body: CreatePurchaseRequest) => Promise<void>;
}) {
  const {
    register,
    handleSubmit,
    reset,
    setValue,
    control,
    formState: { errors },
  } = useForm<PurchaseFormInput, unknown, PurchaseFormValues>({
    resolver: zodResolver(purchaseSchema),
    defaultValues: {
      partyId: "",
      quantityKg: 0,
      ratePerKg: 0,
      amountPaid: 0,
      paymentMethod: "cash",
      purchaseDate: today(),
      vehicleId: "",
      notes: "",
    },
  });
  const [accountSelection, setAccountSelection] =
    useState<PaymentAccountSelection>({});
  useEffect(() => {
    if (open) {
      reset({
        partyId: purchase?.partyId ?? "",
        quantityKg: purchase ? Number(purchase.quantityKg) : 0,
        ratePerKg: purchase ? Number(purchase.ratePerKg) : 0,
        amountPaid: purchase ? Number(purchase.amountPaid) : 0,
        paymentMethod: purchase?.paymentMethod ?? "cash",
        purchaseDate: purchase?.purchaseDate ?? today(),
        vehicleId: purchase?.vehicleId ?? "",
        notes: purchase?.notes ?? "",
      });
    }
  }, [open, purchase, reset]);
  const paymentMethod = useWatch({ control, name: "paymentMethod" });
  const partyId = useWatch({ control, name: "partyId" });
  const vehicleId = useWatch({ control, name: "vehicleId" });
  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        if (!next) onClose();
      }}
    >
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>
            {purchase ? "Edit Purchase" : "Record Purchase"}
          </DialogTitle>
          <DialogDescription>
            Use the existing shop-owner party record; shop owners shared with
            Supply must not be duplicated.
          </DialogDescription>
        </DialogHeader>
        <form
          className="grid gap-4 sm:grid-cols-2"
          onSubmit={handleSubmit((values) =>
            onSubmit({
              partyId: values.partyId || undefined,
              quantityKg: values.quantityKg,
              ratePerKg: values.ratePerKg,
              amountPaid: values.amountPaid,
              paymentMethod: values.paymentMethod,
              ...accountSelection,
              purchaseDate: values.purchaseDate,
              vehicleId: values.vehicleId || undefined,
              notes: values.notes || undefined,
            }),
          )}
        >
          <Field label="Shop owner" error={errors.partyId?.message}>
            <Select
              value={partyId || "none"}
              onValueChange={(value) =>
                setValue("partyId", value === "none" ? "" : value, {
                  shouldValidate: true,
                })
              }
            >
              <SelectTrigger>
                <SelectValue placeholder="Select shop owner" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="none">None</SelectItem>
                {parties.map((party) => (
                  <SelectItem key={party.id} value={party.id}>
                    {party.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </Field>
          <Field label="Weight (kg)" error={errors.quantityKg?.message}>
            <Input
              type="number"
              min="0.001"
              step="0.001"
              {...register("quantityKg")}
            />
          </Field>
          <Field label="Rate per kg" error={errors.ratePerKg?.message}>
            <Input
              type="number"
              min="0.01"
              step="0.01"
              {...register("ratePerKg")}
            />
          </Field>
          <Field label="Payment method" error={errors.paymentMethod?.message}>
            <Select
              value={paymentMethod}
              onValueChange={(value) => (
                setAccountSelection({}),
                setValue(
                  "paymentMethod",
                  value as PurchaseFormValues["paymentMethod"],
                  { shouldValidate: true },
                )
              )}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="cash">Cash</SelectItem>
                <SelectItem value="bank">Bank</SelectItem>
                <SelectItem value="credit">Credit</SelectItem>
              </SelectContent>
            </Select>
          </Field>
          <div className="sm:col-span-2">
            <PaymentAccountFields
              paymentMethod={paymentMethod}
              value={accountSelection}
              onChange={setAccountSelection}
            />
          </div>
          <Field label="Amount paid" error={errors.amountPaid?.message}>
            <Input
              type="number"
              min="0"
              step="0.01"
              disabled={Boolean(purchase)}
              {...register("amountPaid")}
            />
            <p className="text-xs text-muted-foreground">
              Any unpaid amount becomes payable to the selected shop owner.
            </p>
          </Field>
          <Field label="Purchase date" error={errors.purchaseDate?.message}>
            <Input type="date" {...register("purchaseDate")} />
          </Field>
          <Field label="Vehicle" error={errors.vehicleId?.message}>
            <DepartmentVehicleSelect
              departmentCode={DepartmentCode.WASTAGE}
              value={vehicleId}
              onChange={(value) =>
                setValue("vehicleId", value, { shouldValidate: true })
              }
            />
          </Field>
          <Field label="Notes" error={errors.notes?.message}>
            <Input placeholder="Optional note" {...register("notes")} />
          </Field>
          <DialogFooter className="sm:col-span-2">
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

function Field({
  label,
  error,
  children,
}: {
  label: string;
  error?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="space-y-1.5">
      <Label>{label}</Label>
      {children}
      {error ? <p className="text-sm text-destructive">{error}</p> : null}
    </div>
  );
}
