import { useListDepartmentsQuery } from "@/features/departments/departmentsApi";
import { useListPartiesQuery } from "./partiesApi";
import type { ListPartiesParams } from "./types";
import { DepartmentCode } from "@/types/enums";

/** Never request global parties while the department is still being resolved. */
export function useDepartmentParties(
  departmentCode: DepartmentCode,
  params: ListPartiesParams,
  options: { skip?: boolean } = {},
) {
  const departments = useListDepartmentsQuery(undefined, options);
  const departmentId = departments.data?.data.find(
    (department) => department.type.toLowerCase() === departmentCode,
  )?.id;
  const result = useListPartiesQuery(
    { ...params, departmentId },
    { skip: options.skip || !departmentId },
  );

  // currentData excludes cached results belonging to a previous query scope.
  return {
    ...result,
    data: departmentId && !options.skip ? result.currentData : undefined,
    isLoading: !options.skip && (departments.isLoading || result.isLoading),
    isError: departments.isError || result.isError,
    error: departments.error ?? result.error,
  };
}
