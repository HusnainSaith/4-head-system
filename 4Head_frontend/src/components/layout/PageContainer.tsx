import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

export function PageContainer({
  children,
  centered = false,
  className,
}: {
  children: ReactNode;
  centered?: boolean;
  className?: string;
}) {
  return (
    <main
      className={cn(
        "mx-auto w-full max-w-7xl space-y-6 p-4 sm:p-6 lg:p-8",
        className,
        centered &&
          "flex min-h-screen max-w-none items-center justify-center",
      )}
    >
      {children}
    </main>
  );
}