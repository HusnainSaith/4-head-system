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
import {
  useListDepartmentsQuery,
  useListVehiclesQuery,
  type VehicleOption,
} from "@/features/vehicles/vehiclesApi";
import { InvoiceButton } from "@/features/invoices/components/InvoiceButton";
import { getApiErrorMessage } from "@/lib/api-error";
import { DepartmentCode, Role } from "@/types/enums";
import type { CreateSaleRequest, WastageSale } from "../types";
import {
  useCreateSaleMutation,
  useDeleteSaleMutation,
  useGetStockQuery,
  useListSalesQuery,
  useUpdateSaleMutation,
} from "../wastageApi";

const saleSchema = z
  .object({
    partyId: z.union([
      z.literal(""),
      z.string().uuid("Select a valid factory."),
    ]),
    quantityKg: z.coerce
      .number()
      .positive("Weight must be greater than zero."),
    ratePerKg: z.coerce.number().positive("Rate must be greater than zero."),
    paymentMethod: z.enum(["cash", "bank", "credit"]),
    amountReceived: z.coerce
      .number()
      .min(0, "Amount received cannot be negative."),
    saleDate: z
      .string()
      .min(1, "Sale date is required.")
      .refine(
        (value) => !Number.isNaN(Date.parse(value)),
        "Enter a valid date.",
      ),
    vehicleId: z.union([
      z.literal(""),
      z.string().uuid("Select a valid vehicle."),
    ]),
    notes: z.string(),
  })
  .superRefine((value, context) => {
    const total = value.quantityKg * value.ratePerKg;
    if (value.amountReceived > total)
      context.addIssue({
        code: "custom",
        path: ["amountReceived"],
        message: "Amount received cannot exceed total amount.",
      });
    if (value.amountReceived < total && !value.partyId)
      context.addIssue({
        code: "custom",
        path: ["partyId"],
        message: "Select a factory when a receivable balance remains.",
      });
  });
type SaleInput = z.input<typeof saleSchema>;
type SaleValues = z.output<typeof saleSchema>;
const money = new Intl.NumberFormat("en-PK", {
  style: "currency",
  currency: "PKR",
});
const today = () => new Date().toISOString().slice(0, 10);

export function WastageSalesPage() {
  const salesQuery = useListSalesQuery();
  const stockQuery = useGetStockQuery();
  const factoryPartiesQuery = useListPartiesQuery({
    type: PartyType.FACTORY,
    limit: 100,
  });
  const departmentsQuery = useListDepartmentsQuery();
  const wastageDepartmentId = departmentsQuery.data?.data.find(
    (item) => item.type.toLowerCase() === DepartmentCode.WASTAGE,
  )?.id;
  const customerPartiesQuery = useListPartiesQuery(
    {
      type: PartyType.CUSTOMER,
      departmentId: wastageDepartmentId,
      limit: 100,
    },
    { skip: !wastageDepartmentId },
  );
  const vehiclesQuery = useListVehiclesQuery(
    wastageDepartmentId
      ? { departmentId: wastageDepartmentId, page: 1, limit: 100 }
      : undefined,
    { skip: !wastageDepartmentId },
  );
  const role = useSelector(selectUserRole);
  const department = useSelector(selectUserDepartmentCode);
  const canWrite =
    role === Role.OWNER ||
    role === Role.ACCOUNTANT ||
    (role === Role.DEPARTMENT_STAFF && department === DepartmentCode.WASTAGE);
  const canInvoice = role === Role.OWNER || role === Role.ACCOUNTANT;
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<WastageSale | null>(null);
  const [deleting, setDeleting] = useState<WastageSale | null>(null);
  const [createSale, createState] = useCreateSaleMutation();
  const [updateSale, updateState] = useUpdateSaleMutation();
  const [deleteSale, deleteState] = useDeleteSaleMutation();
  const parties = useMemo(() => {
    const byId = new Map(
      [
        ...(factoryPartiesQuery.data?.data.items ?? []),
        ...(customerPartiesQuery.data?.data.items ?? []),
      ].map((party) => [party.id, party]),
    );
    return [...byId.values()];
  }, [customerPartiesQuery.data, factoryPartiesQuery.data]);
  const vehicles = useMemo<VehicleOption[]>(() => {
    const data = vehiclesQuery.data?.data;
    return Array.isArray(data) ? data : (data?.items ?? []);
  }, [vehiclesQuery.data]);
  const partyNames = useMemo(
    () => new Map(parties.map((party) => [party.id, party.name])),
    [parties],
  );
  const vehicleNames = useMemo(
    () =>
      new Map(
        vehicles.map((vehicle) => [vehicle.id, vehicle.registrationNumber]),
      ),
    [vehicles],
  );
  const columns: DataTableColumn<WastageSale>[] = [
    {
      id: "party",
      header: "Factory",
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
      id: "commission",
      header: "Commission/kg",
      cell: (row) => money.format(Number(row.commissionPerKg)),
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
      id: "received",
      header: "Received / total",
      cell: (row) =>
        `${money.format(Number(row.amountReceived))} / ${money.format(Number(row.totalAmount))}`,
      align: "right",
    },
    {
      id: "outstanding",
      header: "Initial receivable",
      cell: (row) => money.format(Number(row.outstandingAmount)),
      align: "right",
    },
    {
      id: "date",
      header: "Sale date",
      cell: (row) => String(row.saleDate).slice(0, 10),
    },
    {
      id: "vehicle",
      header: "Vehicle",
      cell: (row) =>
        row.vehicleId
          ? (vehicleNames.get(row.vehicleId) ?? row.vehicleId)
          : "—",
    },
    ...(canWrite
      ? [
          {
            id: "actions",
            header: "Actions",
            align: "right" as const,
            cell: (row: WastageSale) => (
              <div className="flex justify-end gap-2">
                {canInvoice ? (
                  <InvoiceButton
                    sourceType="sale"
                    sourceId={row.id}
                    label="Print"
                  />
                ) : null}
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button
                      variant="ghost"
                      size="icon"
                      aria-label="Sale actions"
                    >
                      <MoreHorizontal />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuItem
                      onSelect={() => {
                        setEditing(row);
                        setOpen(true);
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
  if (salesQuery.isLoading) return <PageSkeleton rows={6} />;
  if (salesQuery.isError)
    return (
      <PageContainer>
        <ErrorState
          title="Wastage sales could not be loaded"
          description={getApiErrorMessage(salesQuery.error)}
          onRetry={() => void salesQuery.refetch()}
        />
      </PageContainer>
    );
  const close = () => {
    setOpen(false);
    setEditing(null);
  };
  return (
    <PageContainer>
      <PageHeader
        title="Wastage Sales"
        description="Sales of wastage stock to factories."
        actions={
          canWrite ? (
            <Button onClick={() => setOpen(true)}>
              <Plus />
              Record Sale
            </Button>
          ) : undefined
        }
      />
      <DepartmentBalancesPanel departmentCode={DepartmentCode.WASTAGE} />
      <DataTable
        columns={columns}
        data={salesQuery.data?.data ?? []}
        getRowId={(row) => row.id}
        emptyContent={
          <EmptyState
            title="No wastage sales recorded"
            description="Record a sale when stock is available."
          />
        }
      />
      <SaleDialog
        key={open ? (editing?.id ?? "new") : "closed"}
        open={open}
        sale={editing}
        parties={parties}
        vehicles={vehicles.filter((vehicle) => vehicle.isActive)}
        available={stockQuery.data?.data.quantityKg ?? "—"}
        loading={createState.isLoading || updateState.isLoading}
        onClose={close}
        onSubmit={async (body) => {
          try {
            if (editing) await updateSale({ id: editing.id, body }).unwrap();
            else await createSale(body).unwrap();
            toast.success(editing ? "Sale updated" : "Sale recorded");
            close();
          } catch (error) {
            toast.error(getApiErrorMessage(error));
          }
        }}
      />
      <ConfirmDialog
        open={Boolean(deleting)}
        onOpenChange={(next) => {
          if (!next) setDeleting(null);
        }}
        title="Delete sale?"
        description="This soft-deletes the sale record."
        confirmLabel="Delete"
        destructive
        loading={deleteState.isLoading}
        onConfirm={() => {
          if (!deleting) return;
          void deleteSale(deleting.id)
            .unwrap()
            .then(() => {
              toast.success("Sale deleted");
              setDeleting(null);
            })
            .catch((error) => toast.error(getApiErrorMessage(error)));
        }}
      />
    </PageContainer>
  );
}

function SaleDialog({
  open,
  sale,
  parties,
  vehicles,
  available,
  loading,
  onClose,
  onSubmit,
}: {
  open: boolean;
  sale: WastageSale | null;
  parties: Array<{ id: string; name: string }>;
  vehicles: VehicleOption[];
  available: string;
  loading: boolean;
  onClose: () => void;
  onSubmit: (body: CreateSaleRequest) => Promise<void>;
}) {
  const {
    register,
    handleSubmit,
    reset,
    setValue,
    control,
    formState: { errors },
  } = useForm<SaleInput, unknown, SaleValues>({
    resolver: zodResolver(saleSchema),
    defaultValues: {
      partyId: "",
      quantityKg: 0,
      ratePerKg: 0,
      paymentMethod: "cash",
      amountReceived: 0,
      saleDate: today(),
      vehicleId: "",
      notes: "",
    },
  });
  const [accountSelection, setAccountSelection] =
    useState<PaymentAccountSelection>({});
  useEffect(() => {
    if (open) {
      reset({
        partyId: sale?.partyId ?? "",
        quantityKg: sale ? Number(sale.quantityKg) : 0,
        ratePerKg: sale ? Number(sale.ratePerKg) : 0,
        paymentMethod: sale?.paymentMethod ?? "cash",
        amountReceived: sale ? Number(sale.amountReceived) : 0,
        saleDate: sale ? String(sale.saleDate).slice(0, 10) : today(),
        vehicleId: sale?.vehicleId ?? "",
        notes: sale?.notes ?? "",
      });
    }
  }, [open, sale, reset]);
  const partyId = useWatch({ control, name: "partyId" });
  const vehicleId = useWatch({ control, name: "vehicleId" });
  const payment = useWatch({ control, name: "paymentMethod" });
  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        if (!next) onClose();
      }}
    >
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>{sale ? "Edit Sale" : "Record Sale"}</DialogTitle>
          <DialogDescription>
            The backend validates stock and calculates commission per kg.
          </DialogDescription>
        </DialogHeader>
        <form
          className="grid gap-4 sm:grid-cols-2"
          onSubmit={handleSubmit((values) =>
            onSubmit({
              partyId: values.partyId || undefined,
              quantityKg: values.quantityKg,
              ratePerKg: values.ratePerKg,
              paymentMethod: values.paymentMethod,
              ...accountSelection,
              amountReceived: values.amountReceived,
              saleDate: values.saleDate,
              vehicleId: values.vehicleId || undefined,
              notes: values.notes || undefined,
            }),
          )}
        >
          <Field label="Factory" error={errors.partyId?.message}>
            <Select
              value={partyId || "none"}
              onValueChange={(value) =>
                setValue("partyId", value === "none" ? "" : value, {
                  shouldValidate: true,
                })
              }
            >
              <SelectTrigger>
                <SelectValue placeholder="Select factory" />
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
          <Field
            label={`Weight (kg) — available: ${available}kg`}
            error={errors.quantityKg?.message}
          >
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
              value={payment}
              onValueChange={(value) => (
                setAccountSelection({}),
                setValue(
                  "paymentMethod",
                  value as SaleValues["paymentMethod"],
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
              paymentMethod={payment}
              value={accountSelection}
              onChange={setAccountSelection}
            />
          </div>
          <Field label="Amount received" error={errors.amountReceived?.message}>
            <Input
              type="number"
              min="0"
              step="0.01"
              {...register("amountReceived")}
            />
          </Field>
          <Field label="Sale date" error={errors.saleDate?.message}>
            <Input type="date" {...register("saleDate")} />
          </Field>
          <Field label="Vehicle" error={errors.vehicleId?.message}>
            <Select
              value={vehicleId || "none"}
              onValueChange={(value) =>
                setValue("vehicleId", value === "none" ? "" : value, {
                  shouldValidate: true,
                })
              }
            >
              <SelectTrigger>
                <SelectValue placeholder="Select vehicle" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="none">None</SelectItem>
                {vehicles.map((vehicle) => (
                  <SelectItem key={vehicle.id} value={vehicle.id}>
                    {vehicle.registrationNumber} — {vehicle.model}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </Field>
          <Field label="Notes" error={errors.notes?.message}>
            <Input {...register("notes")} />
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
