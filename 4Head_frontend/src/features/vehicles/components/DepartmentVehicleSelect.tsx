import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type { DepartmentCode } from "@/types/enums";
import { useListDepartmentsQuery, useListVehiclesQuery } from "../vehiclesApi";

export function DepartmentVehicleSelect({
  departmentCode,
  value,
  onChange,
  disabled = false,
  id,
}: {
  departmentCode: DepartmentCode;
  value: string;
  onChange: (id: string) => void;
  disabled?: boolean;
  id?: string;
}) {
  const departments = useListDepartmentsQuery();
  const department = departments.data?.data.find(
    (item) => item.type.toLowerCase() === departmentCode,
  );
  const vehicles = useListVehiclesQuery(
    department
      ? { departmentId: department.id, page: 1, limit: 100 }
      : undefined,
    { skip: !department },
  );

  return (
    <Select
      disabled={
        disabled || departments.isLoading || vehicles.isLoading || !department
      }
      value={value || "none"}
      onValueChange={(next) => onChange(next === "none" ? "" : next)}
    >
      <SelectTrigger id={id}>
        <SelectValue
          placeholder={
            department ? "Select vehicle" : "Vehicle department unavailable"
          }
        />
      </SelectTrigger>
      <SelectContent>
        <SelectItem value="none">None</SelectItem>
        {(vehicles.data?.data.items ?? [])
          .filter((vehicle) => vehicle.isActive && !vehicle.deletedAt)
          .map((vehicle) => (
            <SelectItem key={vehicle.id} value={vehicle.id}>
              {vehicle.registrationNumber}
            </SelectItem>
          ))}
      </SelectContent>
    </Select>
  );
}
