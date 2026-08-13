import { Bell, CheckCircle2, Clock3, XCircle } from "lucide-react";
import { Link } from "react-router-dom";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { getApiErrorMessage } from "@/lib/api-error";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { useGetNotificationsQuery, useRetryNotificationMutation } from "../notificationsApi";
import type { Notification } from "../types";

function StatusIcon({ notification }: { notification: Notification }) {
  if (notification.status === "sent") return <CheckCircle2 className="h-4 w-4 text-emerald-600" />;
  if (notification.status === "failed") return <XCircle className="h-4 w-4 text-destructive" />;
  return <Clock3 className="h-4 w-4 text-amber-600" />;
}

export function NotificationBell() {
  const failed = useGetNotificationsQuery({ status: "failed", page: 1, limit: 5 }, { pollingInterval: 60_000 });
  const recent = useGetNotificationsQuery({ page: 1, limit: 5 }, { pollingInterval: 60_000 });
  const [retry, retryState] = useRetryNotificationMutation();
  const failedCount = failed.data?.data.pagination.total ?? 0;
  return <DropdownMenu><DropdownMenuTrigger asChild><Button variant="ghost" size="icon" className="relative" aria-label={`Notifications${failedCount ? `, ${failedCount} failed` : ""}`}>
    <Bell className="h-5 w-5" />{failedCount > 0 ? <span className="absolute right-0 top-0 min-w-4 rounded-full bg-destructive px-1 text-[10px] leading-4 text-white">{Math.min(failedCount, 99)}</span> : null}
  </Button></DropdownMenuTrigger><DropdownMenuContent align="end" className="w-96"><DropdownMenuLabel>Recent notifications</DropdownMenuLabel><DropdownMenuSeparator />
    {recent.isError ? <DropdownMenuItem disabled>{getApiErrorMessage(recent.error)}</DropdownMenuItem> : (recent.data?.data.items ?? []).length === 0 ? <DropdownMenuItem disabled>No notifications yet</DropdownMenuItem> : (recent.data?.data.items ?? []).map((notification) => <DropdownMenuItem key={notification.id} className="items-start py-2" onSelect={(event) => event.preventDefault()}><StatusIcon notification={notification} /><span className="min-w-0 flex-1"><span className="block truncate font-medium">{notification.title}</span><span className="text-xs text-muted-foreground">{notification.sourceType.replaceAll("_", " ")}</span></span>{notification.status === "failed" ? <Button size="sm" variant="outline" disabled={retryState.isLoading} onClick={() => void retry(notification.id).unwrap().then(() => toast.success("Notification retried")).catch((error: unknown) => toast.error(getApiErrorMessage(error)))}>Retry</Button> : null}</DropdownMenuItem>)}
    <DropdownMenuSeparator /><DropdownMenuItem asChild><Link to="/notifications" className="justify-center">View all</Link></DropdownMenuItem>
  </DropdownMenuContent></DropdownMenu>;
}
