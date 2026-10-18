import { renderHook } from "@testing-library/react";
import { DepartmentCode } from "@/types/enums";
import { useDepartmentParties } from "./useDepartmentParties";

const mocks = vi.hoisted(() => ({ departments: vi.fn(), parties: vi.fn() }));
vi.mock("@/features/departments/departmentsApi", () => ({
  useListDepartmentsQuery: mocks.departments,
}));
vi.mock("./partiesApi", () => ({ useListPartiesQuery: mocks.parties }));

beforeEach(() => {
  mocks.departments.mockReturnValue({
    data: {
      data: [
        { id: "supply", type: "SUPPLY" },
        { id: "brokerage", type: "BROKERAGE" },
      ],
    },
  });
  mocks.parties.mockReturnValue({ currentData: { data: { items: [] } } });
});

it("scopes searched options to the page department, overriding a foreign ID", () => {
  renderHook(() =>
    useDepartmentParties(DepartmentCode.BROKERAGE, {
      departmentId: "supply",
      search: "Farm",
      limit: 100,
    }),
  );
  expect(mocks.parties).toHaveBeenLastCalledWith(
    { departmentId: "brokerage", search: "Farm", limit: 100 },
    { skip: false },
  );
});

it("skips unresolved departments and hides stale global results", () => {
  mocks.departments.mockReturnValue({ isLoading: true });
  mocks.parties.mockReturnValue({
    data: { data: { items: [{ id: "foreign" }] } },
  });
  const { result } = renderHook(() =>
    useDepartmentParties(DepartmentCode.WASTAGE, {}),
  );
  expect(mocks.parties).toHaveBeenLastCalledWith(
    { departmentId: undefined },
    { skip: true },
  );
  expect(result.current.data).toBeUndefined();
  expect(result.current.isLoading).toBe(true);
});

it("hides prior data when a scoped request fails", () => {
  mocks.parties.mockReturnValue({
    data: { data: { items: [{ id: "foreign" }] } },
    isError: true,
  });
  const { result } = renderHook(() =>
    useDepartmentParties(DepartmentCode.SUPPLY, {}),
  );
  expect(result.current.data).toBeUndefined();
  expect(result.current.isError).toBe(true);
});
