import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

const badgeVariants = cva(
  "inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-medium transition-colors focus:outline-none",
  {
    variants: {
      variant: {
        default:
          "border-transparent bg-primary/10 text-primary font-semibold",
        secondary:
          "border-transparent bg-secondary/10 text-secondary font-semibold",
        destructive:
          "border-transparent bg-destructive/10 text-destructive font-semibold",
        outline: "border-border text-foreground",
        success:
          "border-transparent bg-success/10 text-success font-semibold",
        warning:
          "border-transparent bg-warning/10 text-warning font-semibold",
      },
    },
    defaultVariants: { variant: "default" },
  },
);

export interface BadgeProps
  extends
    React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof badgeVariants> {}

function Badge({ className, variant, ...props }: BadgeProps) {
  return (
    <div className={cn(badgeVariants({ variant }), className)} {...props} />
  );
}

export { Badge, badgeVariants };