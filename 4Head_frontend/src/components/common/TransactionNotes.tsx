import type { DataTableColumn } from "./DataTable";

export function TransactionNotes({ notes }: { notes?: string | null }) {
  return <div className="min-w-40 max-w-80 whitespace-pre-wrap break-words [overflow-wrap:anywhere]">{notes?.trim() ? notes : "—"}</div>;
}

// The column factory deliberately shares the display renderer with this component.
// eslint-disable-next-line react-refresh/only-export-components
export function notesColumn<T extends { notes?: string | null }>(): DataTableColumn<T> {
  return { id: "notes", header: "Notes", cell: (row) => <TransactionNotes notes={row.notes} /> };
}
