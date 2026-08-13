import type { DepartmentSummary } from "@/features/vehicles/types";
import { DepartmentCode } from "@/types/enums";
import type { DepartmentOption } from "./components/PartyFormDialog";
import type { Party } from "./types";

const departmentCodeLabels: Record<DepartmentCode, string> = {
  [DepartmentCode.BROKERAGE]: "Brokerage",
  [DepartmentCode.SUPPLY]: "Supply",
  [DepartmentCode.WASTAGE]: "Wastage",
  [DepartmentCode.FRESH_CHICKEN_SHOP]: "Fresh Chicken Shop",
};

function fallbackDepartmentName(id: string): string {
  return `Department ${id.slice(0, 8)}`;
}

export function departmentOptionsFrom(
  referenceDepartments: DepartmentSummary[],
  parties: Party[],
  assignedDepartmentId: string | null,
  assignedDepartmentCode: DepartmentCode | null,
): DepartmentOption[] {
  const departments = new Map<string, string>();
  for (const department of referenceDepartments) {
    departments.set(department.id, department.name);
  }
  if (assignedDepartmentId && !departments.has(assignedDepartmentId)) {
    departments.set(
      assignedDepartmentId,
      assignedDepartmentCode
        ? departmentCodeLabels[assignedDepartmentCode]
        : fallbackDepartmentName(assignedDepartmentId),
    );
  }
  for (const party of parties) {
    if (party.primaryDepartmentId) {
      const name = party.primaryDepartment?.name;
      if (name || !departments.has(party.primaryDepartmentId)) {
        departments.set(
          party.primaryDepartmentId,
          name ?? fallbackDepartmentName(party.primaryDepartmentId),
        );
      }
    }
    if (party.linkedDepartmentId) {
      const name = party.linkedDepartment?.name;
      if (name || !departments.has(party.linkedDepartmentId)) {
        departments.set(
          party.linkedDepartmentId,
          name ?? fallbackDepartmentName(party.linkedDepartmentId),
        );
      }
    }
  }
  return [...departments].map(([id, name]) => ({ id, name }));
}
