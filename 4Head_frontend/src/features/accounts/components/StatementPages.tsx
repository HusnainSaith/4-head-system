import { useMemo, useState } from "react";
import { Download, Printer } from "lucide-react";
import { useParams, useSearchParams } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ErrorState } from "@/components/common/ErrorState";
import { PageSkeleton } from "@/components/common/Skeletons";
import { PageHeader } from "@/components/common/PageHeader";
import { PageContainer } from "@/components/layout/PageContainer";
import {
  useGetBankStatementQuery,
  useGetCashStatementQuery,
} from "../accountsApi";
import type {
  AccountStatement,
  BankAccount,
  BankMethod,
  CashAccount,
} from "../types";

const today = new Date().toISOString().slice(0, 10);
const yearStart = `${new Date().getFullYear()}-01-01`;
const money = new Intl.NumberFormat("en-PK", {
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

function Statement({ data, title }: { data: AccountStatement; title: string }) {
  const csv = () => {
    const header = [
      "Date",
      "Description",
      "Source",
      "Method",
      "Reference",
      "In",
      "Out",
      "Balance",
    ];
    const lines = data.transactions.map((row) => [
      row.entry_date,
      row.description ?? "",
      row.source_type,
      row.bank_transaction_method ?? "cash",
      row.cheque_number ?? row.app_reference ?? "",
      row.direction === "IN" ? row.amount : "",
      row.direction === "OUT" ? row.amount : "",
      row.runningBalance,
    ]);
    const content = [header, ...lines]
      .map((line) =>
        line.map((cell) => `"${String(cell).replaceAll('"', '""')}"`).join(","),
      )
      .join("\n");
    const link = document.createElement("a");
    link.href = URL.createObjectURL(new Blob([content], { type: "text/csv" }));
    link.download = `${title.replaceAll(" ", "-").toLowerCase()}-statement.csv`;
    link.click();
    URL.revokeObjectURL(link.href);
  };
  const totals = useMemo(
    () =>
      data.transactions.reduce(
        (result, row) => {
          result[row.direction] += Number(row.amount);
          return result;
        },
        { IN: 0, OUT: 0 },
      ),
    [data.transactions],
  );
  return (
    <>
      <div className="mb-4 flex flex-wrap justify-end gap-2 print:hidden">
        <Button variant="outline" onClick={() => window.print()}>
          <Printer className="h-4 w-4" />
          Print
        </Button>
        <Button variant="outline" onClick={csv}>
          <Download className="h-4 w-4" />
          Export CSV
        </Button>
      </div>
      <div className="overflow-x-auto rounded-xl border bg-card">
        <table className="w-full min-w-[850px] text-sm">
          <thead className="bg-muted/60 text-left">
            <tr>
              {[
                "Date",
                "Description",
                "Source",
                "Method",
                "Ref no.",
                "IN (Rs)",
                "OUT (Rs)",
                "Balance (Rs)",
              ].map((heading) => (
                <th className="px-4 py-3" key={heading}>
                  {heading}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {data.transactions.map((row) => (
              <tr
                key={row.id}
                className={`border-t ${row.direction === "IN" ? "bg-emerald-50/40" : "bg-red-50/40"}`}
              >
                <td className="px-4 py-3">{row.entry_date}</td>
                <td className="px-4 py-3">{row.description ?? "—"}</td>
                <td className="px-4 py-3 capitalize">
                  {row.source_type.replaceAll("_", " ")}
                </td>
                <td className="px-4 py-3 capitalize">
                  {row.bank_transaction_method ?? "Cash"}
                </td>
                <td className="px-4 py-3">
                  {row.cheque_number ?? row.app_reference ?? "—"}
                </td>
                <td className="px-4 py-3 text-emerald-700">
                  {row.direction === "IN"
                    ? money.format(Number(row.amount))
                    : ""}
                </td>
                <td className="px-4 py-3 text-red-600">
                  {row.direction === "OUT"
                    ? money.format(Number(row.amount))
                    : ""}
                </td>
                <td className="px-4 py-3 font-medium">
                  {money.format(Number(row.runningBalance))}
                </td>
              </tr>
            ))}
          </tbody>
          <tfoot className="border-t-2 font-semibold">
            <tr>
              <td className="px-4 py-3" colSpan={5}>
                Totals · Opening {money.format(Number(data.openingBalance))}
              </td>
              <td className="px-4 py-3 text-emerald-700">
                {money.format(totals.IN)}
              </td>
              <td className="px-4 py-3 text-red-600">
                {money.format(totals.OUT)}
              </td>
              <td className="px-4 py-3">
                {money.format(Number(data.closingBalance))}
              </td>
            </tr>
          </tfoot>
        </table>
      </div>
    </>
  );
}

export function BankStatementPage() {
  const { id = "" } = useParams();
  const [params, setParams] = useSearchParams();
  const [from, setFrom] = useState(params.get("from") ?? yearStart);
  const [to, setTo] = useState(params.get("to") ?? today);
  const method = (params.get("method") || undefined) as BankMethod | undefined;
  const q = useGetBankStatementQuery({ id, from, to, method }, { skip: !id });
  if (q.isLoading) return <PageSkeleton rows={6} />;
  if (q.isError || !q.data?.data)
    return (
      <PageContainer>
        <ErrorState title="Statement could not be loaded" error={q.error} />
      </PageContainer>
    );
  const account = q.data.data.account as BankAccount;
  return (
    <PageContainer>
      <PageHeader
        title={`${account.bankName} statement`}
        description={`${account.accountTitle}${account.accountNumber ? ` · ${account.accountNumber}` : ""}`}
      />
      <div className="mb-4 grid gap-3 rounded-xl border bg-card p-4 sm:grid-cols-3">
        <Input
          type="date"
          value={from}
          onChange={(e) => setFrom(e.target.value)}
        />
        <Input type="date" value={to} onChange={(e) => setTo(e.target.value)} />
        <select
          className="h-9 rounded-lg border bg-background px-3 text-sm"
          value={method ?? ""}
          onChange={(e) => {
            const next = new URLSearchParams(params);
            if (e.target.value) next.set("method", e.target.value);
            else next.delete("method");
            setParams(next);
          }}
        >
          <option value="">All methods</option>
          <option value="cheque">Cheque</option>
          <option value="app">App</option>
        </select>
      </div>
      <Statement data={q.data.data} title={account.bankName} />
    </PageContainer>
  );
}

export function CashStatementPage() {
  const { departmentId = "" } = useParams();
  const [from, setFrom] = useState(yearStart);
  const [to, setTo] = useState(today);
  const q = useGetCashStatementQuery(
    { departmentId, from, to },
    { skip: !departmentId },
  );
  if (q.isLoading) return <PageSkeleton rows={6} />;
  if (q.isError || !q.data?.data)
    return (
      <PageContainer>
        <ErrorState title="Statement could not be loaded" error={q.error} />
      </PageContainer>
    );
  const account = q.data.data.account as CashAccount;
  return (
    <PageContainer>
      <PageHeader
        title={`${account.accountName} statement`}
        description="Cash drawer ledger activity"
      />
      <div className="mb-4 grid gap-3 rounded-xl border bg-card p-4 sm:grid-cols-2">
        <Input
          type="date"
          value={from}
          onChange={(e) => setFrom(e.target.value)}
        />
        <Input type="date" value={to} onChange={(e) => setTo(e.target.value)} />
      </div>
      <Statement data={q.data.data} title={account.accountName} />
    </PageContainer>
  );
}
