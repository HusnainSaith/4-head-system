import { useMemo, useState } from "react";
import { useParams } from "react-router-dom";
import { toast } from "sonner";
import { ConfirmDialog } from "@/components/common/ConfirmDialog";
import { DataTable, type DataTableColumn } from "@/components/common/DataTable";
import { EmptyState } from "@/components/common/EmptyState";
import { ErrorState } from "@/components/common/ErrorState";
import { PageHeader } from "@/components/common/PageHeader";
import { PageSkeleton } from "@/components/common/Skeletons";
import { PageContainer } from "@/components/layout/PageContainer";
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { getApiErrorMessage } from "@/lib/api-error";
import {
  useCreateMaintenanceLogMutation,
  useDeleteMaintenanceLogMutation,
  useGetVehicleQuery,
  useListMaintenanceLogsQuery,
  useUpdateMaintenanceLogMutation,
} from "../vehiclesApi";
import type {
  CreateMaintenanceLogRequest,
  VehicleMaintenanceLog,
  VehiclePaymentMethod,
} from "../types";

const money = new Intl.NumberFormat("en-PK", {
  style: "currency",
  currency: "PKR",
});

export function VehicleMaintenanceLogsPage() {
  const { id = "" } = useParams();
  const vehicle = useGetVehicleQuery(id, { skip: !id });
  const query = useListMaintenanceLogsQuery(id, { skip: !id });
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<VehicleMaintenanceLog | null>(null);
  const [deleting, setDeleting] = useState<VehicleMaintenanceLog | null>(null);
  const [create, createState] = useCreateMaintenanceLogMutation();
  const [update, updateState] = useUpdateMaintenanceLogMutation();
  const [remove, deleteState] = useDeleteMaintenanceLogMutation();
  const rows = useMemo(() => {
    const logs = query.data?.data ?? [];
    return logs.map((log, index) => ({
      ...log,
      runningTotal: logs
        .slice(0, index + 1)
        .reduce((sum, item) => sum + Number(item.cost), 0),
    }));
  }, [query.data?.data]);
  const columns: DataTableColumn<
    VehicleMaintenanceLog & { runningTotal: number }
  >[] = [
    {
      id: "date",
      header: "Maintenance date",
      cell: (log) => String(log.maintenanceDate).slice(0, 10),
    },
    { id: "type", header: "Type", cell: (log) => log.maintenanceType },
    {
      id: "description",
      header: "Description",
      cell: (log) => log.description ?? "—",
    },
    {
      id: "cost",
      header: "Cost",
      cell: (log) => money.format(Number(log.cost)),
      align: "right",
    },
    { id: "vendor", header: "Vendor", cell: (log) => log.vendorName ?? "—" },
    { id: "method", header: "Payment", cell: (log) => log.paymentMethod },
    {
      id: "running",
      header: "Running total",
      cell: (log) => money.format(log.runningTotal),
      align: "right",
    },
    {
      id: "actions",
      header: "Actions",
      cell: (log) => (
        <div className="flex gap-2">
          <Button size="sm" variant="outline" onClick={() => setEditing(log)}>
            Update
          </Button>
          <Button
            size="sm"
            variant="destructive"
            onClick={() => setDeleting(log)}
          >
            Delete
          </Button>
        </div>
      ),
    },
  ];
  if (query.isLoading || vehicle.isLoading) return <PageSkeleton rows={6} />;
  if (query.isError)
    return (
      <PageContainer>
        <ErrorState
          title="Maintenance logs could not be loaded"
          error={query.error}
          onRetry={() => void query.refetch()}
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
        title={`${vehicle.data?.data.registrationNumber ?? "Vehicle"} Maintenance Logs`}
        description={vehicle.data?.data.vehicleType}
        actions={
          <Button onClick={() => setOpen(true)}>Add Maintenance Log</Button>
        }
      />
      <DataTable
        columns={columns}
        data={rows}
        getRowId={(log) => log.id}
        emptyContent={<EmptyState title="No maintenance logs found" />}
      />
      <p className="text-sm text-muted-foreground">
        Each maintenance log automatically posts an Operating Expense under this
        vehicle&apos;s department.
      </p>
      <MaintenanceDialog
        key={editing?.id ?? (open ? "create-open" : "closed")}
        open={open || Boolean(editing)}
        log={editing}
        loading={createState.isLoading || updateState.isLoading}
        onClose={close}
        onSubmit={async (body) => {
          try {
            if (editing) {
              await update({ id: editing.id, vehicleId: id, body }).unwrap();
              toast.success("Maintenance log updated");
            } else {
              await create({ vehicleId: id, body }).unwrap();
              toast.success("Maintenance log added");
            }
            close();
          } catch (error) {
            toast.error(getApiErrorMessage(error));
          }
        }}
      />
      <ConfirmDialog
        open={Boolean(deleting)}
        onOpenChange={(next) => !next && setDeleting(null)}
        title="Delete maintenance log?"
        description="This removes the selected maintenance record."
        confirmLabel="Delete"
        destructive
        loading={deleteState.isLoading}
        onConfirm={() => {
          if (!deleting) return;
          void remove({ id: deleting.id, vehicleId: id })
            .unwrap()
            .then(() => {
              toast.success("Maintenance log deleted");
              setDeleting(null);
            })
            .catch((error) => toast.error(getApiErrorMessage(error)));
        }}
      />
    </PageContainer>
  );
}

function MaintenanceDialog({
  open,
  log,
  loading,
  onClose,
  onSubmit,
}: {
  open: boolean;
  log: VehicleMaintenanceLog | null;
  loading: boolean;
  onClose: () => void;
  onSubmit: (body: CreateMaintenanceLogRequest) => Promise<void>;
}) {
  const [date, setDate] = useState(
    log
      ? String(log.maintenanceDate).slice(0, 10)
      : new Date().toISOString().slice(0, 10),
  );
  const [type, setType] = useState(log?.maintenanceType ?? "");
  const [description, setDescription] = useState(log?.description ?? "");
  const [cost, setCost] = useState(log?.cost ?? "");
  const [vendor, setVendor] = useState(log?.vendorName ?? "");
  const [method, setMethod] = useState<VehiclePaymentMethod>(
    log?.paymentMethod ?? "cash",
  );
  return (
    <Dialog open={open} onOpenChange={(next) => !next && onClose()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>
            {log ? "Update Maintenance Log" : "Add Maintenance Log"}
          </DialogTitle>
        </DialogHeader>
        <form
          className="space-y-4"
          onSubmit={(event) => {
            event.preventDefault();
            if (type && Number(cost) > 0)
              void onSubmit({
                maintenanceDate: date,
                maintenanceType: type,
                description: description || undefined,
                cost: Number(cost),
                vendorName: vendor || undefined,
                paymentMethod: method,
              });
          }}
        >
          <div>
            <Label htmlFor="maintenance-date">Maintenance date</Label>
            <Input
              id="maintenance-date"
              type="date"
              value={date}
              onChange={(event) => setDate(event.target.value)}
            />
          </div>
          <div>
            <Label htmlFor="maintenance-type">Maintenance type</Label>
            <Input
              id="maintenance-type"
              value={type}
              onChange={(event) => setType(event.target.value)}
            />
          </div>
          <div>
            <Label htmlFor="maintenance-description">Description</Label>
            <Input
              id="maintenance-description"
              value={description}
              onChange={(event) => setDescription(event.target.value)}
            />
          </div>
          <div>
            <Label htmlFor="maintenance-cost">Cost</Label>
            <Input
              id="maintenance-cost"
              type="number"
              min="0.01"
              value={cost}
              onChange={(event) => setCost(event.target.value)}
            />
          </div>
          <div>
            <Label htmlFor="maintenance-vendor">Vendor name</Label>
            <Input
              id="maintenance-vendor"
              value={vendor}
              onChange={(event) => setVendor(event.target.value)}
            />
          </div>
          <div>
            <Label>Payment method</Label>
            <Select
              value={method}
              onValueChange={(value) =>
                setMethod(value as VehiclePaymentMethod)
              }
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
