import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { Role } from "@/types/enums";
import { ExpensesPage } from "./ExpensesPage";
vi.mock("@/features/accounts/components", () => ({
  PaymentAccountFields: () => null,
}));
vi.mock("@/features/invoices/components/InvoiceButton", () => ({
  InvoiceButton: () => <button>Print</button>,
}));
const create = vi.fn(),
  updateExpense = vi.fn(),
  update = vi.fn();
let role: Role = Role.OWNER;
vi.mock("react-redux", () => ({
  useSelector: (selector: (s: unknown) => unknown) =>
    selector({ auth: { user: { role: { name: role }, departmentId: "d1" } } }),
}));
vi.mock("sonner", () => ({ toast: { success: vi.fn(), error: vi.fn() } }));
vi.mock("@/features/vehicles/vehiclesApi", () => ({
  useListDepartmentsQuery: () => ({
    data: { data: [{ id: "d1", name: "Brokerage" }] },
  }),
}));
vi.mock("../expensesApi", () => ({
  useListExpensesQuery: () => ({
    data: { data: [{ id: "e1", departmentId: "d1", department: { id: "d1", name: "Brokerage" }, categoryId: "manual", category: { id: "manual", name: "Rent" }, amount: "800.00", expenseDate: "2026-08-22", paymentMethod: "cash", sourceType: "manual" }] },
    isLoading: false,
    isError: false,
  }),
  useCreateExpenseMutation: () => [create, { isLoading: false }],
  useUpdateExpenseMutation: () => [updateExpense, { isLoading: false }],
  useUpdateExpenseCategoryMutation: () => [update],
  useListExpenseCategoriesQuery: () => ({
    data: {
      data: [
        {
          id: "sys",
          name: "Vehicle Fuel",
          isSystemGenerated: true,
          isActive: true,
        },
        {
          id: "manual",
          name: "Rent",
          isSystemGenerated: false,
          isActive: true,
        },
      ],
    },
  }),
}));
describe("ExpensesPage", () => {
  beforeEach(() => {
    create.mockReset();
    updateExpense.mockReset();
    role = Role.OWNER;
  });
  it("edits a manual expense with its existing values", async () => {
    updateExpense.mockReturnValue({ unwrap: () => Promise.resolve({}) });
    render(<MemoryRouter><ExpensesPage /></MemoryRouter>);
    fireEvent.click(screen.getByRole("button", { name: "Edit" }));
    expect(screen.getByRole("heading", { name: "Edit Manual Expense" })).toBeInTheDocument();
    expect(screen.getByLabelText("Amount")).toHaveValue(800);
    fireEvent.change(screen.getByLabelText("Amount"), { target: { value: "900" } });
    fireEvent.submit(screen.getByRole("button", { name: "Save" }).closest("form")!);
    await waitFor(() => expect(updateExpense).toHaveBeenCalledWith(expect.objectContaining({ id: "e1", body: expect.objectContaining({ amount: "900.00" }) })));
  });
  it("does not offer edits for system categories", () => {
    render(
      <MemoryRouter>
        <ExpensesPage />
      </MemoryRouter>,
    );
    expect(screen.getByText("Managed by the system")).toBeInTheDocument();
    expect(screen.getAllByRole("button", { name: /deactivate/i })).toHaveLength(
      1,
    );
  });
  it("hides category management from staff and submits no source field", async () => {
    role = Role.DEPARTMENT_STAFF;
    create.mockReturnValue({ unwrap: () => Promise.resolve({}) });
    render(
      <MemoryRouter>
        <ExpensesPage />
      </MemoryRouter>,
    );
    expect(screen.queryByText("Expense Categories")).not.toBeInTheDocument();
    fireEvent.click(
      screen.getByRole("button", { name: /add manual expense/i }),
    );
    fireEvent.click(screen.getAllByRole("combobox")[0]);
    fireEvent.click(screen.getAllByText("Rent").at(-1)!);
    fireEvent.change(screen.getByLabelText("Amount"), {
      target: { value: "100" },
    });
    fireEvent.submit(
      screen.getByRole("button", { name: "Save" }).closest("form")!,
    );
    await waitFor(() => expect(create).toHaveBeenCalled());
    expect(create.mock.calls[0][0]).not.toHaveProperty("sourceType");
  });
});
