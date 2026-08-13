import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
export function DateRange({
  from,
  to,
  onFrom,
  onTo,
}: {
  from: string;
  to: string;
  onFrom: (v: string) => void;
  onTo: (v: string) => void;
}) {
  return (
    <div className="grid gap-4 sm:grid-cols-2">
      <div>
        <Label htmlFor="report-from">From</Label>
        <Input
          id="report-from"
          type="date"
          value={from}
          onChange={(e) => onFrom(e.target.value)}
        />
      </div>
      <div>
        <Label htmlFor="report-to">To</Label>
        <Input
          id="report-to"
          type="date"
          value={to}
          onChange={(e) => onTo(e.target.value)}
        />
      </div>
    </div>
  );
}
export function DepartmentFilter({
  value,
  onChange,
  departments,
}: {
  value: string;
  onChange: (v: string) => void;
  departments: Array<{ id: string; name: string }>;
}) {
  return (
    <div>
      <Label>Department</Label>
      <Select
        value={value || "all"}
        onValueChange={(v) => onChange(v === "all" ? "" : v)}
      >
        <SelectTrigger>
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">All departments</SelectItem>
          {departments.map((d) => (
            <SelectItem key={d.id} value={d.id}>
              {d.name}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}
