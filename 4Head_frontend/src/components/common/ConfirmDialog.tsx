import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { cn } from "@/lib/utils";

export interface ConfirmDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** Headline, e.g. "Delete user?". */
  title: string;
  /** Supporting copy explaining the consequence. */
  description: string;
  /** Confirm button label. */
  confirmLabel?: string;
  /** Cancel button label. */
  cancelLabel?: string;
  /** Confirms the destructive action. */
  onConfirm: () => void;
  /** Render the confirm button with the destructive style for delete/remove. */
  destructive?: boolean;
  /** Disable the confirm button (e.g. while a mutation is pending). */
  loading?: boolean;
  className?: string;
}

/**
 * Wrapper around AlertDialog for delete / destructive confirmations across
 * every module — ensures every confirm looks and behaves identically.
 */
export function ConfirmDialog({
  open,
  onOpenChange,
  title,
  description,
  confirmLabel = "Confirm",
  cancelLabel = "Cancel",
  onConfirm,
  destructive = false,
  loading = false,
  className,
}: ConfirmDialogProps) {
  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent className={cn(className)}>
        <AlertDialogHeader>
          <AlertDialogTitle>{title}</AlertDialogTitle>
          <AlertDialogDescription>{description}</AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel disabled={loading}>
            {cancelLabel}
          </AlertDialogCancel>
          <AlertDialogAction
            onClick={(event) => {
              // Prevent the dialog from auto-closing before the mutation runs;
              // the caller controls `open` and closes it on success/abort.
              event.preventDefault();
              onConfirm();
            }}
            disabled={loading}
            className={cn(
              destructive && "bg-destructive hover:bg-destructive/90",
            )}
          >
            {loading ? "Working…" : confirmLabel}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
