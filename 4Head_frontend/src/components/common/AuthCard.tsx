import type { FormEventHandler, ReactNode } from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Bird } from "lucide-react";

export function AuthCard({
  title,
  description,
  children,
}: {
  title: string;
  description: string;
  children: ReactNode;
}) {
  return (
    <div className="flex w-full max-w-md flex-col items-center gap-6">
      {/* Logo */}
      <div className="flex flex-col items-center gap-3">
        <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-primary shadow-md">
          <Bird className="h-6 w-6 text-primary-foreground" aria-hidden />
        </div>
        <div className="text-center">
          <h1 className="text-xl font-bold tracking-tight text-foreground">
            Poultry ERP
          </h1>
          <p className="text-sm text-muted-foreground">Business management</p>
        </div>
      </div>
      <Card className="w-full shadow-panel">
        <CardHeader>
          <CardTitle role="heading" aria-level={1} className="text-lg">
            {title}
          </CardTitle>
          <CardDescription>{description}</CardDescription>
        </CardHeader>
        <CardContent>{children}</CardContent>
      </Card>
    </div>
  );
}

export function FormStack({
  children,
  onSubmit,
}: {
  children: ReactNode;
  onSubmit: FormEventHandler<HTMLFormElement>;
}) {
  return (
    <form className="space-y-4" onSubmit={onSubmit} noValidate>
      {children}
    </form>
  );
}