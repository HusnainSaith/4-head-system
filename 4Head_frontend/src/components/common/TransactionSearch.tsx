import { Input } from "@/components/ui/input";

export function TransactionSearch({
  value,
  onChange,
}: {
  value: string;
  onChange: (value: string) => void;
}) {
  return (
    <Input
      aria-label="Search transactions"
      placeholder="Search by party, vehicle, date or notes…"
      value={value}
      onChange={(event) => onChange(event.target.value)}
      className="max-w-lg"
    />
  );
}

export function matchesTransactionSearch(
  record: unknown,
  search: string,
): boolean {
  const terms = search.toLocaleLowerCase().trim().split(/\s+/).filter(Boolean);
  if (!terms.length) return true;
  const text = JSON.stringify(record).toLocaleLowerCase();
  return terms.every((term) => text.includes(term));
}
