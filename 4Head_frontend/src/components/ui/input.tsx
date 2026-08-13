import * as React from "react";
import { cn } from "@/lib/utils";

export type InputProps = React.InputHTMLAttributes<HTMLInputElement>;

const Input = React.forwardRef<HTMLInputElement, InputProps>(
  ({ className, type, ...props }, ref) => {
    return (
      <input
        type={type}
        className={cn(
          "flex h-9 w-full rounded-lg border border-input bg-background px-3 py-1 text-sm shadow-sm transition-all",
          "file:border-0 file:bg-transparent file:text-sm file:font-medium",
          "placeholder:text-muted-foreground/60",
          "focus-visible:border-ring focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/30",
          "disabled:cursor-not-allowed disabled:opacity-50",
          className,
        )}
        ref={ref}
        {...props}
      />
    );
  },
);
Input.displayName = "Input";

/**
 * ReadOnlyInput - A read-only input field that displays value in a non-editable format
 * Useful for displaying computed values or system-generated fields
 */
export type ReadOnlyInputProps = React.HTMLAttributes<HTMLDivElement> & {
  value: string | number | null | undefined;
  placeholder?: string;
};

const ReadOnlyInput = React.forwardRef<HTMLDivElement, ReadOnlyInputProps>(
  ({ className, value, placeholder, ...props }, ref) => {
    return (
      <div
        ref={ref}
        className={cn(
          "flex h-9 w-full rounded-lg border border-input bg-muted px-3 py-1 text-sm",
          "text-muted-foreground",
          "disabled:cursor-not-allowed disabled:opacity-50",
          className,
        )}
        {...props}
      >
        {value !== null && value !== undefined && value !== "" ? (
          String(value)
        ) : (
          <span className="text-muted-foreground/60">{placeholder || "—"}</span>
        )}
      </div>
    );
  },
);
ReadOnlyInput.displayName = "ReadOnlyInput";

export { Input, ReadOnlyInput };