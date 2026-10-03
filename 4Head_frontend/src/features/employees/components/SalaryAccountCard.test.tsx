import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { SalaryAccountCard } from "./SalaryAccountCard";
const { withdraw, update, remove, success, error } = vi.hoisted(() => ({
  withdraw: vi.fn(),
  update: vi.fn(),
  remove: vi.fn(),
  success: vi.fn(),
  error: vi.fn(),
}));
vi.mock("sonner", () => ({ toast: { success, error } }));
vi.mock("@/features/accounts/components", () => ({
  PaymentAccountFields: () => null,
}));
vi.mock("../employeesApi", () => ({
  useCancelPayrollMutation: () => [
    vi.fn(() => ({ unwrap: () => Promise.resolve({}) })),
    { isLoading: false },
  ],
  useGetSalaryAccountQuery: () => ({
    data: {
      data: {
        availableBalance: "23000.00",
        totalAccrued: "35000.00",
        totalWithdrawn: "12000.00",
        runs: [
          {
            id: "r",
            periodMonth: 9,
            periodYear: 2026,
            netPayable: "35000.00",
            amountPaid: "12000.00",
          },
        ],
        withdrawals: [
          {
            id: "w",
            amount: "12000.00",
            withdrawalDate: "2026-10-01",
            paymentMethod: "cash",
            cashAccountId: "c",
            notes: "Salary",
            allocations: [],
          },
        ],
      },
    },
  }),
  useWithdrawSalaryMutation: () => [withdraw, { isLoading: false }],
  useUpdateSalaryWithdrawalMutation: () => [update, { isLoading: false }],
  useDeleteSalaryWithdrawalMutation: () => [remove, { isLoading: false }],
}));
describe("salary withdrawal controls", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });
  it("requires confirmation before cancelling a monthly payroll", async () => {
    render(<SalaryAccountCard employeeId="e" />);
    fireEvent.click(screen.getByRole("button", { name: "Cancel payroll" }));
    expect(
      screen.getByText((text) => text.startsWith("Cancel payroll for 9/2026")),
    ).toBeInTheDocument();
    fireEvent.click(
      screen.getByRole("button", { name: "Confirm cancellation" }),
    );
    await waitFor(() =>
      expect(success).toHaveBeenCalledWith("Payroll cancelled"),
    );
  });
  it("shows withdrawal history and edits the selected payment", async () => {
    update.mockReturnValue({ unwrap: () => Promise.resolve({}) });
    render(<SalaryAccountCard employeeId="e" />);
    expect(screen.getByText("Withdrawal history")).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Edit" }));
    expect(screen.getByLabelText("Amount")).toHaveValue(12000);
    fireEvent.change(screen.getByLabelText("Amount"), {
      target: { value: "5000" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Save changes" }));
    await waitFor(() =>
      expect(update).toHaveBeenCalledWith({
        employeeId: "e",
        withdrawalId: "w",
        body: expect.objectContaining({
          amount: 5000,
          cashAccountId: "c",
          withdrawalDate: "2026-10-01",
          notes: "Salary",
        }),
      }),
    );
    expect(withdraw).not.toHaveBeenCalled();
  });
  it("requires confirmation before deleting and refunding", async () => {
    remove.mockReturnValue({ unwrap: () => Promise.resolve({}) });
    render(<SalaryAccountCard employeeId="e" />);
    fireEvent.click(screen.getByRole("button", { name: "Delete" }));
    expect(remove).not.toHaveBeenCalled();
    fireEvent.click(screen.getByRole("button", { name: "Delete withdrawal" }));
    await waitFor(() =>
      expect(remove).toHaveBeenCalledWith({
        employeeId: "e",
        withdrawalId: "w",
      }),
    );
  });
  it("preserves the form and displays insufficient cash errors", async () => {
    withdraw.mockReturnValue({
      unwrap: () =>
        Promise.reject({ data: { message: "Insufficient cash balance" } }),
    });
    render(<SalaryAccountCard employeeId="e" />);
    fireEvent.click(screen.getByRole("button", { name: "Withdraw salary" }));
    fireEvent.change(screen.getByLabelText("Amount"), {
      target: { value: "1000" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Confirm withdrawal" }));
    await waitFor(() =>
      expect(error).toHaveBeenCalledWith("Insufficient cash balance"),
    );
    expect(screen.getByLabelText("Amount")).toHaveValue(1000);
    expect(success).not.toHaveBeenCalled();
  });
  it("rejects amounts greater than accrued salary before calling the API", async () => {
    render(<SalaryAccountCard employeeId="e" />);
    fireEvent.click(screen.getByRole("button", { name: "Withdraw salary" }));
    fireEvent.change(screen.getByLabelText("Amount"), {
      target: { value: "24000" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Confirm withdrawal" }));
    expect(withdraw).not.toHaveBeenCalled();
    expect(error).toHaveBeenCalled();
  });
});
