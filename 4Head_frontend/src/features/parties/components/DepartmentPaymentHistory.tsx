import { useState } from "react";
import { DataTable, type DataTableColumn } from "@/components/common/DataTable";
import { notesColumn } from "@/components/common/TransactionNotes";
import { useListDepartmentPaymentsQuery } from "../partiesApi";
import type { DepartmentPayment } from "../types";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";

const money = new Intl.NumberFormat("en-PK", {
  style: "currency",
  currency: "PKR",
  maximumFractionDigits: 2,
});
const columns: DataTableColumn<DepartmentPayment>[] = [
  { id: "date", header: "Date", cell: (row) => row.paymentDate },
  { id: "party", header: "Party", cell: (row) => row.partyName },
  {
    id: "direction",
    header: "Type",
    cell: (row) =>
      row.direction === "received" ? "Payment received" : "Payment paid",
  },
  {
    id: "amount",
    header: "Amount",
    align: "right",
    cell: (row) => money.format(Number(row.amount)),
  },
  { id: "method", header: "Payment method", cell: (row) => row.paymentMethod },
  notesColumn(),
];

export function DepartmentPaymentHistory({
  departmentId,
}: {
  departmentId: string;
}) {
  const [page, setPage] = useState(1);
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const invalidRange = Boolean(from && to && from > to);
  const query = useListDepartmentPaymentsQuery(
    {
      departmentId,
      page,
      limit: 10,
      ...(from ? { from } : {}),
      ...(to ? { to } : {}),
    },
    { skip: invalidRange },
  );
  const data = query.data?.data;
  return (
    <section className="space-y-3" aria-label="Payments and receipts">
      <h3 className="text-lg font-semibold">Payments and receipts</h3>
      <div className="flex flex-wrap items-end gap-3">
        <div className="min-w-40 flex-1">
          <Label htmlFor={`${departmentId}-payments-from`}>From</Label>
          <Input
            id={`${departmentId}-payments-from`}
            type="date"
            value={from}
            max={to || undefined}
            onChange={(event) => {
              setFrom(event.target.value);
              setPage(1);
            }}
          />
        </div>
        <div className="min-w-40 flex-1">
          <Label htmlFor={`${departmentId}-payments-to`}>To</Label>
          <Input
            id={`${departmentId}-payments-to`}
            type="date"
            value={to}
            min={from || undefined}
            onChange={(event) => {
              setTo(event.target.value);
              setPage(1);
            }}
          />
        </div>
        <Button
          variant="outline"
          disabled={!from && !to}
          onClick={() => {
            setFrom("");
            setTo("");
            setPage(1);
          }}
        >
          Clear dates
        </Button>
      </div>
      {invalidRange ? (
        <p role="alert" className="text-sm text-destructive">
          Starting date must be on or before ending date.
        </p>
      ) : null}
      {!invalidRange ? (
        <>
          <DataTable
            columns={columns}
            data={data?.items ?? []}
            getRowId={(row) => row.id}
            isLoading={query.isLoading || query.isFetching}
            isError={query.isError}
            errorMessage="Payments and receipts could not be loaded."
            onRetry={() => void query.refetch()}
            emptyContent={
              <p className="p-4 text-muted-foreground">
                No payments or receipts recorded.
              </p>
            }
            pagination={{
              page,
              pageSize: 10,
              total: data?.pagination.total ?? 0,
            }}
            onPageChange={setPage}
          />
        </>
      ) : null}
    </section>
  );
}
