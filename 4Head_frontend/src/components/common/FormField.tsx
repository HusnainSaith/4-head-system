import type { ReactNode } from "react";
import type {
  Control,
  ControllerRenderProps,
  FieldPath,
  FieldValues,
} from "react-hook-form";
import {
  FormControl,
  FormDescription,
  FormField as ControlledField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";

export interface FormFieldProps<
  TFieldValues extends FieldValues,
  TName extends FieldPath<TFieldValues>,
> {
  control: Control<TFieldValues>;
  name: TName;
  label: string;
  description?: string;
  required?: boolean;
  children: (field: ControllerRenderProps<TFieldValues, TName>) => ReactNode;
}

/** Consistent react-hook-form label, control, help text, and error layout. */
export function FormField<
  TFieldValues extends FieldValues,
  TName extends FieldPath<TFieldValues>,
>({
  control,
  name,
  label,
  description,
  required = false,
  children,
}: FormFieldProps<TFieldValues, TName>) {
  return (
    <ControlledField
      control={control}
      name={name}
      render={({ field }) => (
        <FormItem>
          <FormLabel>
            {label}
            {required ? (
              <>
                <span aria-hidden="true"> *</span>
                <span className="sr-only"> (required)</span>
              </>
            ) : null}
          </FormLabel>
          <FormControl>{children(field)}</FormControl>
          {description ? (
            <FormDescription>{description}</FormDescription>
          ) : null}
          <FormMessage />
        </FormItem>
      )}
    />
  );
}
