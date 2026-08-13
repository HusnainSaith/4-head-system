import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { EmployeeDetailPage } from "./EmployeeDetailPage";
import { RunPayrollPage } from "./RunPayrollPage";
import { SalaryRunDetailPage } from "./SalaryRunDetailPage";
vi.mock("@/features/accounts/components", () => ({ PaymentAccountFields: () => null }));
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
  confirmAdvance = vi.fn();
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
    expect(screen.getByText(/one employee at a time/i)).toBeInTheDocument();
    await user.click(screen.getByRole("combobox"));
    await user.click(
      await screen.findByRole("option", { name: "Test Employee" }),
    );
    await user.click(
      screen.getByRole("checkbox", {
        name: /receive outstanding advance from this salary/i,
      }),
    );
    await user.click(screen.getByRole("button", { name: "Run Payroll" }));
    await waitFor(() =>
      expect(runPayroll).toHaveBeenCalledWith(
        expect.objectContaining({ employeeId: "e1", recoverAdvances: true }),
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
