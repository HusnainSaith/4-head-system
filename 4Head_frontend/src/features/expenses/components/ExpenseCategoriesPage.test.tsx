import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { ExpenseCategoriesPage } from "./ExpenseCategoriesPage";
const create = vi.fn(),
  update = vi.fn(),
  remove = vi.fn();
vi.mock("sonner", () => ({ toast: { success: vi.fn(), error: vi.fn() } }));
vi.mock("../expensesApi", () => ({
  useListExpenseCategoriesQuery: () => ({
    data: {
      data: [
        {
          id: "manual",
          name: "Rent",
          description: "Monthly",
          categoryType: "administrative",
          isActive: true,
          isSystemGenerated: false,
        },
        {
          id: "system",
          name: "Vehicle Fuel",
          categoryType: "transport",
          isActive: true,
          isSystemGenerated: true,
        },
      ],
    },
  }),
  useCreateExpenseCategoryMutation: () => [create, { isLoading: false }],
  useUpdateExpenseCategoryMutation: () => [update, { isLoading: false }],
  useDeleteExpenseCategoryMutation: () => [remove, { isLoading: false }],
}));
describe("Expense category CRUD", () => {
  beforeEach(() => {
    for (const mutation of [create, update, remove]) {
      mutation.mockReset();
      mutation.mockReturnValue({ unwrap: () => Promise.resolve({}) });
    }
  });
  const renderPage = () =>
    render(
      <MemoryRouter>
        <ExpenseCategoriesPage />
      </MemoryRouter>,
    );
  it("creates a category with description and type", async () => {
    renderPage();
    fireEvent.click(screen.getByRole("button", { name: "Add Category" }));
    fireEvent.change(screen.getByLabelText("Name"), {
      target: { value: " Transport " },
    });
    fireEvent.change(screen.getByLabelText("Description"), {
      target: { value: "Deliveries" },
    });
    fireEvent.change(screen.getByLabelText("Type"), {
      target: { value: "transport" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Save Category" }));
    await waitFor(() =>
      expect(create).toHaveBeenCalledWith({
        name: "Transport",
        description: "Deliveries",
        categoryType: "transport",
      }),
    );
  });
  it("loads existing values and edits a category", async () => {
    renderPage();
    fireEvent.click(screen.getByRole("button", { name: "Edit Rent" }));
    expect(screen.getByLabelText("Name")).toHaveValue("Rent");
    fireEvent.change(screen.getByLabelText("Name"), {
      target: { value: "Lease" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Save Category" }));
    await waitFor(() =>
      expect(update).toHaveBeenCalledWith({
        id: "manual",
        body: {
          name: "Lease",
          description: "Monthly",
          categoryType: "administrative",
        },
      }),
    );
  });
  it("confirms deletion and protects system categories", async () => {
    renderPage();
    expect(
      screen.queryByRole("button", { name: "Delete Vehicle Fuel" }),
    ).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Delete Rent" }));
    expect(remove).not.toHaveBeenCalled();
    fireEvent.click(screen.getByRole("button", { name: "Confirm Delete" }));
    await waitFor(() => expect(remove).toHaveBeenCalledWith("manual"));
  });
  it("keeps the dialog open with a server deletion error", async () => {
    remove.mockReturnValue({
      unwrap: () =>
        Promise.reject({
          data: { message: "Category is used; deactivate it instead" },
        }),
    });
    renderPage();
    fireEvent.click(screen.getByRole("button", { name: "Delete Rent" }));
    fireEvent.click(screen.getByRole("button", { name: "Confirm Delete" }));
    expect(await screen.findByRole("alert")).toHaveTextContent(
      "deactivate it instead",
    );
  });
});
