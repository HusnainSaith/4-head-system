import { useState } from "react";
import { useSelector } from "react-redux";
import { RotateCw, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { ConfirmDialog } from "@/components/common/ConfirmDialog";
import { DataTable, type DataTableColumn } from "@/components/common/DataTable";
import { PageHeader } from "@/components/common/PageHeader";
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { selectUserRole } from "@/features/auth/authSlice";
import { getApiErrorMessage } from "@/lib/api-error";
import { Role } from "@/types/enums";
import {
  useDeleteNotificationMutation,
  useGetNotificationsQuery,
  useResendNotificationMutation,
} from "../notificationsApi";
import type { Notification, NotificationStatus } from "../types";

function statusVariant(
  status: NotificationStatus,
): "default" | "secondary" | "destructive" {
  return status === "failed"
    ? "destructive"
    : status === "pending"
      ? "secondary"
      : "default";
}

function dateTime(value?: string) {
  return value ? new Date(value).toLocaleString("en-PK") : "—";
}

export function NotificationsListPage() {
  const role = useSelector(selectUserRole);
  const [page, setPage] = useState(1);
  const [status, setStatus] = useState<NotificationStatus | "all">("all");
  const [sourceType, setSourceType] = useState("");
  const [selected, setSelected] = useState<Notification | null>(null);
  const [deleting, setDeleting] = useState<Notification | null>(null);
  const query = useGetNotificationsQuery({
    page,
    limit: 20,
    status: status === "all" ? undefined : status,
    sourceType: sourceType || undefined,
  });
  const [resend, resendState] = useResendNotificationMutation();
  const [remove, removeState] = useDeleteNotificationMutation();
  const canDelete = role === Role.OWNER;

  const resendOne = async (notification: Notification) => {
    try {
      await resend(notification.id).unwrap();
      toast.success(`“${notification.title}” was resent`);
    } catch (error) {
      toast.error(getApiErrorMessage(error));
    }
  };

  const columns: DataTableColumn<Notification>[] = [
    {
      id: "title",
      header: "Title",
      cell: (row) => (
        <div>
          <div className="font-medium">{row.title}</div>
          {row.errorMessage ? (
            <div className="max-w-xs truncate text-xs text-destructive">
              {row.errorMessage}
            </div>
          ) : null}
        </div>
      ),
    },
    { id: "type", header: "Type", cell: (row) => row.type },
    {
      id: "recipient",
      header: "Recipient",
      cell: (row) => row.recipientEmail ?? row.recipientUser?.email ?? "—",
    },
    {
      id: "source",
      header: "Source",
      cell: (row) => row.sourceType.replaceAll("_", " "),
    },
    {
      id: "status",
      header: "Status",
      cell: (row) => (
        <Badge variant={statusVariant(row.status)}>{row.status}</Badge>
      ),
    },
    {
      id: "sent",
      header: "Sent At",
      cell: (row) => dateTime(row.sentAt),
    },
    {
      id: "actions",
      header: "Actions",
      cell: (row) => (
        <div className="flex flex-wrap gap-2">
          <Button
            size="sm"
            variant="outline"
            disabled={resendState.isLoading}
            onClick={(event) => {
              event.stopPropagation();
              void resendOne(row);
            }}
          >
            <RotateCw className="h-4 w-4" />
            Resend
          </Button>
          {canDelete ? (
            <Button
              size="sm"
              variant="destructive"
              onClick={(event) => {
                event.stopPropagation();
                setDeleting(row);
              }}
            >
              <Trash2 className="h-4 w-4" />
              Delete
            </Button>
          ) : null}
        </div>
      ),
    },
  ];

  return (
    <PageContainer>
      <PageHeader
        title="Email Notifications"
        description="Delivery history for transaction emails. Select any row to view its full contents."
      />
      <div className="mb-4 grid gap-3 md:grid-cols-2">
        <Select
          value={status}
          onValueChange={(value) => {
            setStatus(value as NotificationStatus | "all");
            setPage(1);
          }}
        >
          <SelectTrigger aria-label="Notification status">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All statuses</SelectItem>
            <SelectItem value="sent">Sent</SelectItem>
            <SelectItem value="pending">Pending</SelectItem>
            <SelectItem value="failed">Failed</SelectItem>
          </SelectContent>
        </Select>
        <Input
          aria-label="Source type"
          placeholder="Filter source type"
          value={sourceType}
          onChange={(event) => {
            setSourceType(event.target.value);
            setPage(1);
          }}
        />
      </div>
      <DataTable
        columns={columns}
        data={query.data?.data.items ?? []}
        getRowId={(row) => row.id}
        isLoading={query.isLoading}
        isError={query.isError}
        onRetry={() => void query.refetch()}
        onRowClick={setSelected}
        pagination={{
          page,
          pageSize: 20,
          total: query.data?.data.pagination.total ?? 0,
        }}
        onPageChange={setPage}
      />

      <NotificationDetailsDialog
        notification={selected}
        resending={resendState.isLoading}
        canDelete={canDelete}
        onClose={() => setSelected(null)}
        onResend={(notification) => void resendOne(notification)}
        onDelete={(notification) => {
          setSelected(null);
          setDeleting(notification);
        }}
      />

      <ConfirmDialog
        open={Boolean(deleting)}
        onOpenChange={(open) => !open && setDeleting(null)}
        title="Delete notification?"
        description="This removes the notification from delivery history without deleting its related transaction."
        confirmLabel="Delete"
        destructive
        loading={removeState.isLoading}
        onConfirm={() => {
          if (!deleting) return;
          void remove(deleting.id)
            .unwrap()
            .then(() => {
              toast.success("Notification deleted");
              setDeleting(null);
            })
            .catch((error) => toast.error(getApiErrorMessage(error)));
        }}
      />
    </PageContainer>
  );
}

function NotificationDetailsDialog({
  notification,
  resending,
  canDelete,
  onClose,
  onResend,
  onDelete,
}: {
  notification: Notification | null;
  resending: boolean;
  canDelete: boolean;
  onClose: () => void;
  onResend: (notification: Notification) => void;
  onDelete: (notification: Notification) => void;
}) {
  const context = Object.entries(notification?.context ?? {});
  return (
    <Dialog
      open={Boolean(notification)}
      onOpenChange={(open) => !open && onClose()}
    >
      <DialogContent className="max-h-[85vh] overflow-y-auto sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>{notification?.title ?? "Notification"}</DialogTitle>
        </DialogHeader>
        {notification ? (
          <div className="space-y-5">
            <div className="rounded-lg border bg-muted/30 p-4 text-sm leading-6">
              {notification.message}
            </div>
            <dl className="grid gap-4 text-sm sm:grid-cols-2">
              <Detail label="Status">
                <Badge variant={statusVariant(notification.status)}>
                  {notification.status}
                </Badge>
              </Detail>
              <Detail label="Recipient">
                {notification.recipientEmail ??
                  notification.recipientUser?.email ??
                  "—"}
              </Detail>
              <Detail label="Type">{notification.type}</Detail>
              <Detail label="Source">
                {notification.sourceType.replaceAll("_", " ")}
              </Detail>
              <Detail label="Created">
                {dateTime(notification.createdAt)}
              </Detail>
              <Detail label="Sent">{dateTime(notification.sentAt)}</Detail>
            </dl>
            {notification.errorMessage ? (
              <div className="rounded-lg border border-destructive/30 bg-destructive/5 p-3 text-sm text-destructive">
                <p className="font-medium">Delivery error</p>
                <p className="mt-1">{notification.errorMessage}</p>
              </div>
            ) : null}
            {context.length ? (
              <div>
                <h3 className="mb-2 text-sm font-semibold">Details</h3>
                <dl className="grid gap-2 rounded-lg border p-4 text-sm sm:grid-cols-2">
                  {context.map(([key, value]) => (
                    <Detail key={key} label={key.replaceAll("_", " ")}>
                      {typeof value === "object"
                        ? JSON.stringify(value)
                        : String(value ?? "—")}
                    </Detail>
                  ))}
                </dl>
              </div>
            ) : null}
          </div>
        ) : null}
        <DialogFooter>
          {notification && canDelete ? (
            <Button
              variant="destructive"
              onClick={() => onDelete(notification)}
            >
              <Trash2 className="h-4 w-4" /> Delete
            </Button>
          ) : null}
          {notification ? (
            <Button
              variant="outline"
              isLoading={resending}
              onClick={() => onResend(notification)}
            >
              <RotateCw className="h-4 w-4" /> Resend
            </Button>
          ) : null}
          <Button onClick={onClose}>Close</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function Detail({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div>
      <dt className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
        {label}
      </dt>
      <dd className="mt-1 break-words">{children}</dd>
    </div>
  );
}
