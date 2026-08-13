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
  useCreateFuelLogMutation,
  useDeleteFuelLogMutation,
  useGetVehicleQuery,
  useListFuelLogsQuery,
  useUpdateFuelLogMutation,
} from "../vehiclesApi";
import type {
  CreateFuelLogRequest,
  VehicleFuelLog,
  VehiclePaymentMethod,
} from "../types";

const money = new Intl.NumberFormat("en-PK", {
  style: "currency",
  currency: "PKR",
});

export function VehicleFuelLogsPage() {
  const { id = "" } = useParams();
  const vehicle = useGetVehicleQuery(id, { skip: !id });
  const query = useListFuelLogsQuery(id, { skip: !id });
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<VehicleFuelLog | null>(null);
  const [deleting, setDeleting] = useState<VehicleFuelLog | null>(null);
  const [create, createState] = useCreateFuelLogMutation();
  const [update, updateState] = useUpdateFuelLogMutation();
  const [remove, deleteState] = useDeleteFuelLogMutation();
  const rows = useMemo(() => {
    const logs = query.data?.data ?? [];
    return logs.map((log, index) => ({
      ...log,
      runningTotal: logs
        .slice(0, index + 1)
        .reduce((sum, item) => sum + Number(item.totalAmount), 0),
    }));
  }, [query.data?.data]);
  const columns: DataTableColumn<VehicleFuelLog & { runningTotal: number }>[] =
    [
      {
        id: "date",
        header: "Fuel date",
        cell: (log) => String(log.fuelDate).slice(0, 10),
      },
      {
        id: "liters",
        header: "Liters",
        cell: (log) => log.liters,
        align: "right",
      },
      {
        id: "rate",
        header: "Rate/liter",
        cell: (log) => money.format(Number(log.ratePerLiter)),
        align: "right",
      },
      {
        id: "total",
        header: "Total",
        cell: (log) => money.format(Number(log.totalAmount)),
        align: "right",
      },
      {
        id: "odometer",
        header: "Odometer",
        cell: (log) => log.odometerReading ?? "—",
        align: "right",
      },
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
          title="Fuel logs could not be loaded"
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
        title={`${vehicle.data?.data.registrationNumber ?? "Vehicle"} Fuel Logs`}
        description={vehicle.data?.data.vehicleType}
        actions={<Button onClick={() => setOpen(true)}>Add Fuel Log</Button>}
      />
      <DataTable
        columns={columns}
        data={rows}
        getRowId={(log) => log.id}
        emptyContent={<EmptyState title="No fuel logs found" />}
      />
      <p className="text-sm text-muted-foreground">
        Each fuel log automatically posts an Operating Expense under this
        vehicle&apos;s department.
      </p>
      <FuelDialog
        key={editing?.id ?? (open ? "create-open" : "closed")}
        open={open || Boolean(editing)}
        log={editing}
        loading={createState.isLoading || updateState.isLoading}
        onClose={close}
        onSubmit={async (body) => {
          try {
            if (editing) {
              await update({ id: editing.id, vehicleId: id, body }).unwrap();
              toast.success("Fuel log updated");
            } else {
              await create({ vehicleId: id, body }).unwrap();
              toast.success("Fuel log added");
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
        title="Delete fuel log?"
        description="This removes the selected fuel record."
        confirmLabel="Delete"
        destructive
        loading={deleteState.isLoading}
        onConfirm={() => {
          if (!deleting) return;
          void remove({ id: deleting.id, vehicleId: id })
            .unwrap()
            .then(() => {
              toast.success("Fuel log deleted");
              setDeleting(null);
            })
            .catch((error) => toast.error(getApiErrorMessage(error)));
        }}
      />
    </PageContainer>
  );
}

function FuelDialog({
  open,
  log,
  loading,
  onClose,
  onSubmit,
}: {
  open: boolean;
  log: VehicleFuelLog | null;
  loading: boolean;
  onClose: () => void;
  onSubmit: (body: CreateFuelLogRequest) => Promise<void>;
}) {
  const [date, setDate] = useState(
    log
      ? String(log.fuelDate).slice(0, 10)
      : new Date().toISOString().slice(0, 10),
  );
  const [liters, setLiters] = useState(log?.liters ?? "");
  const [rate, setRate] = useState(log?.ratePerLiter ?? "");
  const [odometer, setOdometer] = useState(log?.odometerReading ?? "");
  const [method, setMethod] = useState<VehiclePaymentMethod>(
    log?.paymentMethod ?? "cash",
  );
  const [notes, setNotes] = useState(log?.notes ?? "");
  const preview = Number(liters) * Number(rate);
  return (
    <Dialog open={open} onOpenChange={(next) => !next && onClose()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{log ? "Update Fuel Log" : "Add Fuel Log"}</DialogTitle>
        </DialogHeader>
        <form
          className="space-y-4"
          onSubmit={(event) => {
            event.preventDefault();
            if (Number(liters) > 0 && Number(rate) > 0)
              void onSubmit({
                fuelDate: date,
                liters: Number(liters),
                ratePerLiter: Number(rate),
                odometerReading: odometer ? Number(odometer) : undefined,
                paymentMethod: method,
                notes: notes || undefined,
              });
          }}
        >
          <div>
            <Label htmlFor="fuel-date">Fuel date</Label>
            <Input
              id="fuel-date"
              type="date"
              value={date}
              onChange={(event) => setDate(event.target.value)}
            />
          </div>
          <div>
            <Label htmlFor="fuel-liters">Liters</Label>
            <Input
              id="fuel-liters"
              type="number"
              min="0.01"
              value={liters}
              onChange={(event) => setLiters(event.target.value)}
            />
          </div>
          <div>
            <Label htmlFor="fuel-rate">Rate per liter</Label>
            <Input
              id="fuel-rate"
              type="number"
              min="0.01"
              value={rate}
              onChange={(event) => setRate(event.target.value)}
            />
          </div>
          <p className="text-sm text-muted-foreground">
            Preview total:{" "}
            {money.format(Number.isFinite(preview) ? preview : 0)}. The backend
            stores the authoritative total.
          </p>
          <div>
            <Label htmlFor="fuel-odo">Odometer reading</Label>
            <Input
              id="fuel-odo"
              type="number"
              value={odometer}
              onChange={(event) => setOdometer(event.target.value)}
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
          <div>
            <Label htmlFor="fuel-notes">Notes</Label>
            <Input
              id="fuel-notes"
              value={notes}
              onChange={(event) => setNotes(event.target.value)}
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
