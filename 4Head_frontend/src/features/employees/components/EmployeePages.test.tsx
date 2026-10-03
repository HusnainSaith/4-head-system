import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { EmployeeDetailPage } from "./EmployeeDetailPage";
import { RunPayrollPage } from "./RunPayrollPage";
import { SalaryRunDetailPage } from "./SalaryRunDetailPage";
vi.mock("@/features/accounts/components", () => ({
  PaymentAccountFields: () => null,
}));
vi.mock("@/features/invoices/components/InvoiceButton", () => ({
  InvoiceButton: () => <button type="button">Print Invoice</button>,
}));
vi.mock("react-redux", () => ({
  useSelector: (selector: (state: unknown) => unknown) =>
    selector({
      auth: { user: { role: { name: "owner" }, departmentId: null } },
    }),
}));
const createAdvance = vi.fn(),
  createBonus = vi.fn(),
  runPayroll = vi.fn(),
  pay = vi.fn(),
  confirmAdvance = vi.fn(),
  updateAdvance = vi.fn(),
  deleteAdvance = vi.fn(),
  updateBonus = vi.fn(),
  deleteBonus = vi.fn();
vi.mock("sonner", () => ({ toast: { success: vi.fn(), error: vi.fn() } }));
vi.mock("../employeesApi", () => ({
  useGetEmployeeQuery: () => ({
    data: {
      data: {
        id: "e1",
        fullName: "Test Employee",
        designation: "Worker",
        department: { name: "Supply" },
      },
    },
    isLoading: false,
  }),
  useListAdvancesQuery: () => ({
    data: {
      data: [
        {
          id: "a1",
          employeeId: "e1",
          amount: "300",
          amountRecovered: "100",
          advanceDate: "2026-07-01",
          recoveryStatus: "partially_recovered",
          disbursementStatus: "confirmed",
        },
        {
          id: "a2",
          employeeId: "e1",
          amount: "250",
          amountRecovered: "0",
          advanceDate: "2026-07-02",
          recoveryStatus: "outstanding",
          disbursementStatus: "pending",
        },
      ],
    },
    isLoading: false,
  }),
  useCreateAdvanceMutation: () => [createAdvance, { isLoading: false }],
  useUpdateAdvanceMutation: () => [updateAdvance, { isLoading: false }],
  useDeleteAdvanceMutation: () => [deleteAdvance, { isLoading: false }],
  useConfirmAdvanceMutation: () => [confirmAdvance, { isLoading: false }],
  useListBonusesQuery: () => ({
    data: {
      data: [
        {
          id: "b1",
          employeeId: "e1",
          amount: "500",
          bonusDate: "2026-07-05",
          reason: "Performance",
        },
      ],
    },
    isLoading: false,
  }),
  useCreateBonusMutation: () => [createBonus, { isLoading: false }],
  useUpdateBonusMutation: () => [updateBonus, { isLoading: false }],
  useDeleteBonusMutation: () => [deleteBonus, { isLoading: false }],
  useListEmployeesQuery: () => ({
    data: {
      data: [
        {
          id: "e1",
          fullName: "Test Employee",
          baseSalary: "10000",
          isActive: true,
        },
      ],
    },
  }),
  useRunPayrollMutation: () => [runPayroll, { isLoading: false }],
  useGetSalaryRunQuery: () => ({
    data: {
      data: {
        id: "r1",
        employeeId: "e1",
        employee: { fullName: "Test Employee" },
        periodMonth: 7,
        periodYear: 2026,
        baseSalary: "10000",
        totalBonuses: "500",
        totalAdvancesDeducted: "300",
        netPayable: "10200",
        paymentStatus: "pending",
        bonuses: [{ id: "b1", amount: "500", reason: "Performance" }],
      },
    },
    isLoading: false,
  }),
  useMarkSalaryRunPaidMutation: () => [pay, { isLoading: false }],
  useCancelPayrollMutation: () => [
    vi.fn(() => ({ unwrap: () => Promise.resolve({}) })),
    { isLoading: false },
  ],
  useGetSalaryAccountQuery: () => ({
    data: {
      data: {
        employeeId: "e1",
        totalAccrued: "10200.00",
        totalWithdrawn: "0.00",
        availableBalance: "10200.00",
        runs: [],
        withdrawals: [],
      },
    },
  }),
  useUpdateSalaryWithdrawalMutation: () => [vi.fn(), { isLoading: false }],
  useDeleteSalaryWithdrawalMutation: () => [vi.fn(), { isLoading: false }],
  useWithdrawSalaryMutation: () => [vi.fn(), { isLoading: false }],
}));
const route = (path: string, node: React.ReactNode) =>
  render(
    <MemoryRouter initialEntries={[path]}>
      <Routes>
        <Route path="/employees/:id" element={node} />
        <Route path="/payroll/runs/:id" element={node} />
        <Route path="/payroll/runs/new" element={node} />
      </Routes>
    </MemoryRouter>,
  );
describe("employee payroll pages", () => {
  beforeAll(() => {
    Object.defineProperties(HTMLElement.prototype, {
      hasPointerCapture: { value: () => false, configurable: true },
      setPointerCapture: { value: () => undefined, configurable: true },
      releasePointerCapture: { value: () => undefined, configurable: true },
      scrollIntoView: { value: () => undefined, configurable: true },
    });
  });
  beforeEach(() => {
    createAdvance.mockReset();
    createBonus.mockReset();
    runPayroll.mockReset();
    pay.mockReset();
    confirmAdvance.mockReset();
    updateAdvance.mockReset();
    deleteAdvance.mockReset();
    updateBonus.mockReset();
    deleteBonus.mockReset();
  });
  it("edits a bonus with its saved amount, date and reason", async () => {
    updateBonus.mockReturnValue({ unwrap: () => Promise.resolve({}) });
    route("/employees/e1", <EmployeeDetailPage mode="bonuses" />);
    fireEvent.click(screen.getByRole("button", { name: "Edit" }));
    expect(screen.getByLabelText("Amount")).toHaveValue(500);
    expect(screen.getByLabelText("Date")).toHaveValue("2026-07-05");
    expect(screen.getByLabelText("Reason")).toHaveValue("Performance");
    fireEvent.change(screen.getByLabelText("Amount"), {
      target: { value: "300" },
    });
    fireEvent.change(screen.getByLabelText("Reason"), {
      target: { value: "Corrected" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Save" }));
    await waitFor(() =>
      expect(updateBonus).toHaveBeenCalledWith({
        employeeId: "e1",
        bonusId: "b1",
        body: { amount: 300, bonusDate: "2026-07-05", reason: "Corrected" },
      }),
    );
    expect(createBonus).not.toHaveBeenCalled();
  });
  it("confirms bonus deletion and allows cancelling without deleting", async () => {
    deleteBonus.mockReturnValue({ unwrap: () => Promise.resolve({}) });
    route("/employees/e1", <EmployeeDetailPage mode="bonuses" />);
    fireEvent.click(screen.getByRole("button", { name: "Delete" }));
    expect(deleteBonus).not.toHaveBeenCalled();
    fireEvent.click(screen.getByRole("button", { name: "Cancel" }));
    expect(deleteBonus).not.toHaveBeenCalled();
    fireEvent.click(screen.getByRole("button", { name: "Delete" }));
    fireEvent.click(screen.getByRole("button", { name: "Delete bonus" }));
    await waitFor(() =>
      expect(deleteBonus).toHaveBeenCalledWith({
        employeeId: "e1",
        bonusId: "b1",
      }),
    );
  });
  it("keeps a failed bonus edit open with its entered values", async () => {
    updateBonus.mockReturnValue({
      unwrap: () =>
        Promise.reject({ data: { message: "Correct the withdrawal first" } }),
    });
    route("/employees/e1", <EmployeeDetailPage mode="bonuses" />);
    fireEvent.click(screen.getByRole("button", { name: "Edit" }));
    fireEvent.change(screen.getByLabelText("Amount"), {
      target: { value: "100" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Save" }));
    await waitFor(() => expect(updateBonus).toHaveBeenCalled());
    expect(screen.getByLabelText("Amount")).toHaveValue(100);
  });
  it("renders recovery and creates advance and bonus", async () => {
    createAdvance.mockReturnValue({ unwrap: () => Promise.resolve({}) });
    createBonus.mockReturnValue({ unwrap: () => Promise.resolve({}) });
    route("/employees/e1", <EmployeeDetailPage />);
    expect(screen.getByText(/200.*remaining/)).toBeInTheDocument();
    for (const name of ["Record Advance", "Record Bonus"]) {
      fireEvent.click(screen.getByRole("button", { name }));
      fireEvent.change(screen.getByLabelText("Amount"), {
        target: { value: "100" },
      });
      fireEvent.submit(
        screen.getByRole("button", { name: "Save" }).closest("form")!,
      );
      await waitFor(() =>
        expect(
          name.includes("Advance") ? createAdvance : createBonus,
        ).toHaveBeenCalled(),
      );
    }
  });
  it("edits an outstanding advance with prefilled values", async () => {
    updateAdvance.mockReturnValue({ unwrap: () => Promise.resolve({}) });
    render(
      <MemoryRouter initialEntries={["/employees/e1"]}>
        <Routes>
          <Route
            path="/employees/:id"
            element={<EmployeeDetailPage mode="advances" />}
          />
        </Routes>
      </MemoryRouter>,
    );
    const buttons = screen.getAllByRole("button", { name: "Edit" });
    expect(buttons[0]).toBeDisabled();
    fireEvent.click(buttons[1]);
    expect(screen.getByLabelText("Amount")).toHaveValue(250);
    fireEvent.change(screen.getByLabelText("Amount"), {
      target: { value: "200" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Save" }));
    await waitFor(() =>
      expect(updateAdvance).toHaveBeenCalledWith({
        employeeId: "e1",
        advanceId: "a2",
        body: { amount: 200, advanceDate: "2026-07-02", reason: "" },
      }),
    );
  });
  it("deletes only after the delete dialog is confirmed", async () => {
    deleteAdvance.mockReturnValue({ unwrap: () => Promise.resolve({}) });
    render(
      <MemoryRouter initialEntries={["/employees/e1"]}>
        <Routes>
          <Route
            path="/employees/:id"
            element={<EmployeeDetailPage mode="advances" />}
          />
        </Routes>
      </MemoryRouter>,
    );
    const buttons = screen.getAllByRole("button", { name: "Delete" });
    expect(buttons[0]).toBeDisabled();
    fireEvent.click(buttons[1]);
    expect(deleteAdvance).not.toHaveBeenCalled();
    fireEvent.click(screen.getByRole("button", { name: "Delete advance" }));
    await waitFor(() =>
      expect(deleteAdvance).toHaveBeenCalledWith({
        employeeId: "e1",
        advanceId: "a2",
      }),
    );
  });
  it("confirms and pays a pending advance", async () => {
    confirmAdvance.mockReturnValue({ unwrap: () => Promise.resolve({}) });
    route("/employees/e1", <EmployeeDetailPage />);
    fireEvent.click(screen.getByRole("button", { name: /confirm advance/i }));
    fireEvent.click(screen.getByRole("button", { name: /confirm and pay/i }));
    await waitFor(() =>
      expect(confirmAdvance).toHaveBeenCalledWith(
        expect.objectContaining({
          employeeId: "e1",
          advanceId: "a2",
          paymentMethod: "cash",
        }),
      ),
    );
  });
  it("runs only single employee payroll", async () => {
    const user = userEvent.setup();
    runPayroll.mockReturnValue({
      unwrap: () => Promise.resolve({ data: { id: "r1" } }),
    });
    route("/payroll/runs/new", <RunPayrollPage />);
    expect(screen.getByText(/Calculate monthly salary/i)).toBeInTheDocument();
    await user.click(screen.getByRole("combobox"));
    await user.click(
      await screen.findByRole("option", { name: "Test Employee" }),
    );
    await user.click(
      screen.getByRole("checkbox", {
        name: /receive outstanding advance from this salary/i,
      }),
    );
    fireEvent.change(screen.getByLabelText("Leave charges / fine amount"), {
      target: { value: "5000" },
    });
    fireEvent.change(screen.getByLabelText("Deduction reason (optional)"), {
      target: { value: "Leave charges" },
    });
    await user.click(screen.getByRole("button", { name: "Run Payroll" }));
    await waitFor(() =>
      expect(runPayroll).toHaveBeenCalledWith(
        expect.objectContaining({
          employeeId: "e1",
          recoverAdvances: true,
          manualDeduction: 5000,
          deductionReason: "Leave charges",
        }),
      ),
    );
  });
  it("renders payslip and marks paid", async () => {
    pay.mockReturnValue({ unwrap: () => Promise.resolve({}) });
    route("/payroll/runs/r1", <SalaryRunDetailPage />);
    expect(screen.getByText(/10,200/)).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: /mark as paid/i }));
    fireEvent.click(screen.getByRole("button", { name: /confirm payment/i }));
    await waitFor(() => expect(pay).toHaveBeenCalled());
  });
});
