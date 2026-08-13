import { useCallback, useState } from "react";
import { createRoot } from "react-dom/client";
import { toast } from "sonner";
import { getApiErrorMessage } from "@/lib/api-error";
import { useLazyGetInvoiceQuery } from "../invoicesApi";
import { InvoicePrintView } from "./InvoicePrintView";

export function usePrintInvoice() {
  const [fetchInvoice] = useLazyGetInvoiceQuery();
  const [isPrinting, setIsPrinting] = useState(false);
  const printInvoice = useCallback(
    async (id: string, preparedWindow?: Window | null) => {
      const printWindow =
        preparedWindow ?? window.open("", "_blank", "width=900,height=1100");
      if (!printWindow) {
        toast.error("Allow pop-ups to print invoices");
        return;
      }
      printWindow.opener = null;
      setIsPrinting(true);
      try {
        const response = await fetchInvoice(id).unwrap();
        printWindow.document.title = response.data.invoiceNumber;
        createRoot(printWindow.document.body).render(
          <InvoicePrintView
            invoice={response.data}
            companyName="4Head Poultry"
            companyAddress=""
            companyPhone=""
          />,
        );
        printWindow.setTimeout(() => {
          printWindow.focus();
          printWindow.print();
          printWindow.close();
        }, 250);
        toast.success("Invoice ready to print");
      } catch (error) {
        printWindow.close();
        toast.error(getApiErrorMessage(error));
      } finally {
        setIsPrinting(false);
      }
    },
    [fetchInvoice],
  );
  return { printInvoice, isPrinting };
}
