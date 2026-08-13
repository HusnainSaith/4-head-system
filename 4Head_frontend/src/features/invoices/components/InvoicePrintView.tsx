import type { Invoice } from "../types";

const money = new Intl.NumberFormat("en-PK", {
  style: "currency",
  currency: "PKR",
});

export function InvoicePrintView({
  invoice,
  companyName,
  companyAddress,
  companyPhone,
}: {
  invoice: Invoice;
  companyName: string;
  companyAddress: string;
  companyPhone: string;
}) {
  return (
    <main className="invoice-print mx-auto max-w-[210mm] bg-white p-10 text-slate-900">
      <style>{`@page{size:A4;margin:12mm}@media print{body>*:not(.invoice-print){display:none!important}.invoice-print{display:block!important;max-width:none;padding:0;box-shadow:none}button{display:none!important}}`}</style>
      <header className="border-b-4 border-amber-500 pb-4 text-center">
        <h1 className="text-3xl font-bold">{companyName}</h1>
        <p>{companyAddress}</p>
        <p>{companyPhone}</p>
      </header>
      <h2 className="my-6 text-center text-2xl font-bold">INVOICE</h2>
      <section className="grid grid-cols-2 gap-2 rounded border p-4 text-sm">
        <p><strong>Invoice #:</strong> {invoice.invoiceNumber}</p>
        <p><strong>Date:</strong> {new Date(invoice.issuedAt).toLocaleDateString("en-PK")}</p>
        <p><strong>Type:</strong> {invoice.invoiceType.replaceAll("_", " ")}</p>
        <p><strong>Department:</strong> {invoice.department?.name ?? invoice.departmentId}</p>
        <p><strong>Status:</strong> {invoice.status}</p>
      </section>
      {invoice.partyName || invoice.party?.name ? (
        <section className="mt-4 rounded border p-4">
          <strong>Party:</strong> {invoice.partyName ?? invoice.party?.name}
        </section>
      ) : null}
      <table className="mt-6 w-full border-collapse text-sm">
        <thead><tr className="bg-slate-100">{["#", "Description", "Qty", "Unit", "Rate", "Amount"].map((heading) => <th key={heading} className="border p-2 text-left">{heading}</th>)}</tr></thead>
        <tbody>{invoice.lineItems.map((item, index) => (
          <tr key={`${item.description}-${index}`}>
            <td className="border p-2">{index + 1}</td><td className="border p-2">{item.description}</td>
            <td className="border p-2">{Number(item.qty).toFixed(3)}</td><td className="border p-2">{item.unit}</td>
            <td className="border p-2">{money.format(Number(item.rate))}</td><td className="border p-2">{money.format(Number(item.amount))}</td>
          </tr>
        ))}</tbody>
      </table>
      <section className="ml-auto mt-6 w-72 space-y-2 text-right">
        <p>Subtotal: {money.format(Number(invoice.subtotal))}</p>
        <p>Tax (0%): {money.format(Number(invoice.taxAmount))}</p>
        <p className="border-t pt-2 text-lg font-bold">Total: {money.format(Number(invoice.totalAmount))}</p>
      </section>
      {invoice.notes ? <p className="mt-6"><strong>Notes:</strong> {invoice.notes}</p> : null}
      <footer className="mt-12 border-t pt-4 text-center text-sm text-slate-500">Thank you for your business | 4Head ERP</footer>
    </main>
  );
}
