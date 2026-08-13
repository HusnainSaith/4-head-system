import { useState } from "react";
import { toast } from "sonner";
import { DataTable, type DataTableColumn } from "@/components/common/DataTable";
import { ConfirmDialog } from "@/components/common/ConfirmDialog";
import { PageHeader } from "@/components/common/PageHeader";
import { PageContainer } from "@/components/layout/PageContainer";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { getApiErrorMessage } from "@/lib/api-error";
import { useCancelInvoiceMutation, useGetInvoicesQuery } from "../invoicesApi";
import type { Invoice, InvoiceType } from "../types";
import { InvoiceButton } from "./InvoiceButton";

const money = new Intl.NumberFormat("en-PK", { style: "currency", currency: "PKR" });
const invoiceTypes: InvoiceType[] = ["purchase", "sale", "transfer", "payment", "salary", "expense", "writeoff"];

export function InvoicesListPage() {
  const [page, setPage] = useState(1);
  const [type, setType] = useState<InvoiceType | "all">("all");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [selected, setSelected] = useState<Invoice | null>(null);
  const query = useGetInvoicesQuery({ page, limit: 20, invoiceType: type === "all" ? undefined : type, startDate: startDate || undefined, endDate: endDate || undefined });
  const [cancelInvoice, cancelState] = useCancelInvoiceMutation();
  const columns: DataTableColumn<Invoice>[] = [
    { id: "number", header: "Invoice #", cell: (row) => row.invoiceNumber },
    { id: "type", header: "Type", cell: (row) => <Badge variant="secondary">{row.invoiceType}</Badge> },
    { id: "department", header: "Department", cell: (row) => row.department?.name ?? row.departmentId },
    { id: "party", header: "Party", cell: (row) => row.partyName ?? row.party?.name ?? "—" },
    { id: "total", header: "Total Amount", align: "right", cell: (row) => money.format(Number(row.totalAmount)) },
    { id: "status", header: "Status", cell: (row) => <Badge variant={row.status === "cancelled" ? "destructive" : "secondary"}>{row.status}</Badge> },
    { id: "issued", header: "Issued At", cell: (row) => new Date(row.issuedAt).toLocaleDateString("en-PK") },
    { id: "actions", header: "Actions", cell: (row) => <div className="flex gap-2"><InvoiceButton sourceType={row.sourceType} sourceId={row.sourceId} label="Print" />{row.status !== "cancelled" ? <Button size="sm" variant="destructive" onClick={(event) => { event.stopPropagation(); setSelected(row); }}>Cancel</Button> : null}</div> },
  ];
  return <PageContainer><PageHeader title="Invoices" description="Printable business documents generated from posted transactions." />
    <div className="mb-4 grid gap-3 md:grid-cols-3"><Select value={type} onValueChange={(value) => { setType(value as InvoiceType | "all"); setPage(1); }}><SelectTrigger aria-label="Invoice type"><SelectValue /></SelectTrigger><SelectContent><SelectItem value="all">All invoice types</SelectItem>{invoiceTypes.map((item) => <SelectItem key={item} value={item}>{item}</SelectItem>)}</SelectContent></Select><Input aria-label="Start date" type="date" value={startDate} onChange={(event) => { setStartDate(event.target.value); setPage(1); }} /><Input aria-label="End date" type="date" value={endDate} onChange={(event) => { setEndDate(event.target.value); setPage(1); }} /></div>
    <DataTable columns={columns} data={query.data?.data.items ?? []} getRowId={(row) => row.id} isLoading={query.isLoading} isError={query.isError} onRetry={() => void query.refetch()} pagination={{ page, pageSize: 20, total: query.data?.data.pagination.total ?? 0 }} onPageChange={setPage} />
    <ConfirmDialog open={Boolean(selected)} onOpenChange={(open) => !open && setSelected(null)} title="Cancel invoice?" description="The source transaction remains unchanged; this marks only the invoice as cancelled." confirmLabel="Cancel invoice" destructive loading={cancelState.isLoading} onConfirm={() => { if (!selected) return; void cancelInvoice(selected.id).unwrap().then(() => { toast.success("Invoice cancelled"); setSelected(null); }).catch((error) => toast.error(getApiErrorMessage(error))); }} />
  </PageContainer>;
}
