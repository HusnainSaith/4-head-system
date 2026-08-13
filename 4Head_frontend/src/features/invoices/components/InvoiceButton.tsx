import type { MouseEvent } from "react";
import { Loader2, Printer } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { getApiErrorMessage } from "@/lib/api-error";
import {
  useEnsureInvoiceBySourceMutation,
  useLazyGetInvoiceBySourceQuery,
} from "../invoicesApi";
import { usePrintInvoice } from "./usePrintInvoice";

export function InvoiceButton({
  sourceType,
  sourceId,
  label = "Print Invoice",
}: {
  sourceType: string;
  sourceId: string;
  label?: string;
}) {
  const [getBySource, state] = useLazyGetInvoiceBySourceQuery();
  const [ensureBySource, ensureState] = useEnsureInvoiceBySourceMutation();
  const { printInvoice, isPrinting } = usePrintInvoice();
  const loading = state.isFetching || ensureState.isLoading || isPrinting;
  const onClick = async (event: MouseEvent) => {
    event.stopPropagation();
    // Open synchronously from the user gesture so browser popup protection
    // does not block printing while the invoice is fetched or backfilled.
    const printWindow = window.open("", "_blank", "width=900,height=1100");
    if (!printWindow) {
      toast.error("Allow pop-ups to print invoices");
      return;
    }
    printWindow.opener = null;
    try {
      const response = await getBySource({ sourceType, sourceId }).unwrap();
      const invoice =
        response.data ??
        (await ensureBySource({ sourceType, sourceId }).unwrap()).data;
      await printInvoice(invoice.id, printWindow);
    } catch (error) {
      printWindow.close();
      toast.error(getApiErrorMessage(error));
    }
  };
  return (
    <Button
      type="button"
      variant="outline"
      size="sm"
      disabled={loading}
      onClick={(event) => void onClick(event)}
    >
      {loading ? (
        <Loader2 className="h-4 w-4 animate-spin" />
      ) : (
        <Printer className="h-4 w-4" />
      )}
      {label}
    </Button>
  );
}
