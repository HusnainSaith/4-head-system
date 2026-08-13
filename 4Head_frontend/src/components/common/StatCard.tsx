import type { LucideIcon } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { cn } from "@/lib/utils";

export interface StatCardProps {
  label: string;
  value: string;
  delta?: string;
  trend?: "up" | "down" | "neutral";
  icon?: LucideIcon;
  tone?: "neutral" | "success" | "danger";
}

export function StatCard({
  label,
  value,
  delta,
  trend = "neutral",
  icon: Icon,
  tone = "neutral",
}: StatCardProps) {
  return (
    <Card
      className={cn(
        "overflow-hidden",
        tone === "success" &&
          "border-emerald-200/80 bg-emerald-50/60 shadow-[0_8px_28px_-18px_rgba(16,185,129,0.7)] dark:border-emerald-900/60 dark:bg-emerald-950/20",
        tone === "danger" &&
          "border-rose-200/80 bg-rose-50/60 shadow-[0_8px_28px_-18px_rgba(244,63,94,0.7)] dark:border-rose-900/60 dark:bg-rose-950/20",
      )}
    >
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardDescription className="text-xs font-medium uppercase tracking-wider">
          {label}
        </CardDescription>
        {Icon ? (
          <Icon
            className={cn(
              "h-4 w-4 text-muted-foreground/60",
              tone === "success" && "text-emerald-600/70",
              tone === "danger" && "text-rose-600/70",
            )}
            aria-hidden
          />
        ) : null}
      </CardHeader>
      <CardContent className="space-y-2">
        <CardTitle className="text-2xl font-bold tracking-tight">
          {value}
        </CardTitle>
        {delta ? (
          <Badge
            variant={
              trend === "up"
                ? "success"
                : trend === "down"
                  ? "destructive"
                  : "secondary"
            }
          >
            {delta}
          </Badge>
        ) : null}
      </CardContent>
    </Card>
  );
}
