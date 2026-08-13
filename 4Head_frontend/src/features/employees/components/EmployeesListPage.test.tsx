import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router-dom";
import { Role } from "@/types/enums";
import { EmployeesListPage } from "./EmployeesListPage";
const create = vi.fn(),
  deactivate = vi.fn();
vi.mock("react-redux", () => ({
  useSelector: (selector: (state: unknown) => unknown) =>
    selector({
      auth: {
        user: {
          role: { name: Role.DEPARTMENT_STAFF },
          departmentId: "00000000-0000-4000-8000-000000000001",
        },
      },
    }),
}));
vi.mock("sonner", () => ({ toast: { success: vi.fn(), error: vi.fn() } }));
vi.mock("@/features/vehicles/vehiclesApi", () => ({
  useListDepartmentsQuery: () => ({
    data: {
      data: [
        {
          id: "00000000-0000-4000-8000-000000000001",
          name: "Supply",
        },
      ],
    },
  }),
}));
vi.mock("@/features/users/usersApi", () => ({
  useListEmployeeUsersQuery: () => ({
    data: {
      data: [
        {
          id: "00000000-0000-4000-8000-000000000002",
          fullName: "New Employee",
          email: "employee@example.com",
          phone: "03000000000",
        },
      ],
    },
  }),
}));
vi.mock("../employeesApi", () => ({
  useListEmployeesQuery: () => ({
    data: {
      data: [
        {
          id: "e1",
          fullName: "Ali Employee",
          designation: "Operator",
          baseSalary: "10000",
          joiningDate: "2026-07-01",
          isActive: true,
          departmentId: "d1",
          department: { name: "Supply" },
        },
      ],
    },
    isLoading: false,
    isError: false,
  }),
  useCreateEmployeeMutation: () => [create, { isLoading: false }],
  useUpdateEmployeeMutation: () => [vi.fn(), { isLoading: false }],
  useDeactivateEmployeeMutation: () => [deactivate, { isLoading: false }],
  useActivateEmployeeMutation: () => [vi.fn(), { isLoading: false }],
}));
describe("EmployeesListPage", () => {
  beforeAll(() => {
    Object.defineProperties(HTMLElement.prototype, {
      hasPointerCapture: { value: () => false, configurable: true },
      setPointerCapture: { value: () => undefined, configurable: true },
      releasePointerCapture: { value: () => undefined, configurable: true },
      scrollIntoView: { value: () => undefined, configurable: true },
    });
  });
  beforeEach(() => {
    create.mockReset();
    deactivate.mockReset();
  });
  it("renders and registers an employee in the staff department", async () => {
    const user = userEvent.setup();
    create.mockReturnValue({ unwrap: () => Promise.resolve({}) });
    render(
      <MemoryRouter>
        <EmployeesListPage />
      </MemoryRouter>,
    );
    expect(screen.getByText("Ali Employee")).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: /register employee/i }));
    await user.click(screen.getByRole("combobox"));
    await user.click(
      await screen.findByRole("option", { name: /employee@example.com/i }),
    );
    fireEvent.change(screen.getByLabelText("Designation"), {
      target: { value: "Worker" },
    });
    fireEvent.change(screen.getByLabelText("Base salary"), {
      target: { value: "12000" },
    });
    fireEvent.submit(
      screen.getByRole("button", { name: "Register" }).closest("form")!,
    );
    await waitFor(() =>
      expect(create).toHaveBeenCalledWith(
        expect.objectContaining({
          fullName: "New Employee",
          userId: "00000000-0000-4000-8000-000000000002",
          departmentId: "00000000-0000-4000-8000-000000000001",
        }),
      ),
    );
  });
});
