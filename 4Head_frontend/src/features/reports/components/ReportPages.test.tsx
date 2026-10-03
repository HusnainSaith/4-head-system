import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import {
  ConsolidatedPnLPage,
  ExpenseBreakdownPage,
  OutstandingBalancesPage,
  PartnerProfitSharePage,
  PayrollSummaryPage,
  StockSummaryPage,
} from ".";

const hooks = vi.hoisted(() => ({
  consolidated: vi.fn(),
  partner: vi.fn(),
  saveShares: vi.fn(),
  postProfit: vi.fn(),
  outstanding: vi.fn(),
  stock: vi.fn(),
  expenses: vi.fn(),
  payroll: vi.fn(),
}));

vi.mock("@/features/vehicles/vehiclesApi", () => ({
  useListDepartmentsQuery: () => ({
    data: { data: [{ id: "d1", name: "Supply" }] },
  }),
}));
vi.mock("@/features/expenses/expensesApi", () => ({
  useListExpenseCategoriesQuery: () => ({
    data: { data: [{ id: "c1", name: "Fuel" }] },
  }),
}));
vi.mock("../reportsApi", () => ({
  usePostPartnerProfitMutation: () => [hooks.postProfit, { isLoading: false }],
  useSavePartnerSharesMutation: () => [hooks.saveShares, { isLoading: false }],
  useGetConsolidatedProfitLossQuery: (args: unknown) =>
    hooks.consolidated(args),
  useGetPartnerProfitShareQuery: (args: unknown) => hooks.partner(args),
  useGetOutstandingBalancesQuery: (args: unknown) => hooks.outstanding(args),
  useGetStockSummaryQuery: (args: unknown) => hooks.stock(args),
  useGetExpenseBreakdownQuery: (args: unknown) => hooks.expenses(args),
  useGetPayrollSummaryQuery: (args: unknown) => hooks.payroll(args),
}));

vi.mock("react-redux", () => ({
  useSelector: () => ({ role: { name: "owner" } }),
}));

const show = (node: React.ReactNode) =>
  render(<MemoryRouter>{node}</MemoryRouter>);

describe("report pages", () => {
  it("posts profit to accounts only after confirming the displayed allocation", async () => {
    hooks.postProfit.mockReturnValue({
      unwrap: () => Promise.resolve({ data: { message: "Posted" } }),
    });
    show(<PartnerProfitSharePage />);
    fireEvent.click(
      screen.getByRole("button", { name: "Post profit / loss to accounts" }),
    );
    expect(hooks.postProfit).not.toHaveBeenCalled();
    fireEvent.click(screen.getByRole("button", { name: "Cancel" }));
    expect(hooks.postProfit).not.toHaveBeenCalled();
    fireEvent.click(
      screen.getByRole("button", { name: "Post profit / loss to accounts" }),
    );
    fireEvent.click(screen.getByRole("button", { name: "Confirm posting" }));
    await waitFor(() =>
      expect(hooks.postProfit).toHaveBeenCalledWith({
        departmentId: "supply",
        startDate: undefined,
        endDate: undefined,
        expectedNetProfit: "41000",
      }),
    );
  });
  it("displays a posting error and retains confirmation for review", async () => {
    hooks.postProfit.mockReturnValue({
      unwrap: () =>
        Promise.reject({ data: { message: "This period overlaps" } }),
    });
    show(<PartnerProfitSharePage />);
    fireEvent.click(
      screen.getByRole("button", { name: "Post profit / loss to accounts" }),
    );
    fireEvent.click(screen.getByRole("button", { name: "Confirm posting" }));
    await waitFor(() => expect(hooks.postProfit).toHaveBeenCalled());
    expect(
      screen.getByRole("button", { name: "Confirm posting" }),
    ).toBeInTheDocument();
  });
  it("saves equal partners without entering rounded percentages", () => {
    hooks.saveShares.mockReturnValue({ unwrap: () => Promise.resolve({}) });
    show(<PartnerProfitSharePage />);
    fireEvent.click(screen.getByLabelText("Equal partners"));
    expect(
      screen.queryByLabelText("Ali ownership (%)"),
    ).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Save equal shares" }));
    expect(hooks.saveShares).toHaveBeenCalledWith({
      departmentId: "supply",
      allocationMode: "equal",
      shares: [{ userId: "a" }, { userId: "b" }],
    });
  });
  beforeEach(() => {
    vi.clearAllMocks();
    hooks.consolidated.mockReturnValue({
      data: {
        data: {
          externalRevenue: "629000",
          totalCogs: "588000",
          totalExpenses: "0",
          totalPayroll: "0",
          netProfit: "41000",
        },
      },
      isLoading: false,
    });
    hooks.partner.mockReturnValue({
      data: {
        data: {
          netProfit: "41000",
          allocatedProfit: "41000",
          unallocatedProfit: "0.00",
          departments: [
            {
              departmentId: "supply",
              departmentName: "Supply",
              netProfit: "41000",
              configured: true,
              unallocatedProfit: "0.00",
              partners: [
                { userId: "a", partnerName: "Ali", profitShare: "20500.00" },
                { userId: "b", partnerName: "Sara", profitShare: "20500.00" },
              ],
            },
            {
              departmentId: "shop",
              departmentName: "Shop",
              netProfit: "0.00",
              unallocatedProfit: "0.00",
              partners: [],
            },
          ],
        },
      },
      isLoading: false,
    });
    hooks.outstanding.mockReturnValue({
      data: {
        data: [
          {
            partyId: "p1",
            partyName: "Farm",
            partyType: "farm",
            departmentId: "d1",
            departmentName: "Supply",
            balance: "100",
          },
        ],
      },
      isLoading: false,
    });
    hooks.stock.mockReturnValue({
      data: {
        data: {
          summary: [
            {
              departmentId: "d1",
              departmentName: "Supply",
              quantityKg: "0",
              wac: "390",
            },
          ],
          movements: [
            {
              id: "m1",
              departmentName: "Supply",
              movementDate: "2026-01-01",
              movementType: "sale_out",
              quantityKg: "1",
              ratePerKg: "390",
              resultingWac: "390",
            },
          ],
        },
      },
      isLoading: false,
    });
    hooks.expenses.mockReturnValue({
      data: {
        data: [
          {
            category: "Fuel",
            categoryId: "c1",
            departmentId: "d1",
            total: "1000",
          },
        ],
      },
      isLoading: false,
    });
    hooks.payroll.mockReturnValue({
      data: {
        data: [
          {
            departmentId: "d1",
            departmentName: "Supply",
            employeeId: "e1",
            employeeName: "Ali",
            totalBonuses: "100",
            totalAdvancesDeducted: "50",
            totalNetPayable: "10000",
          },
        ],
      },
      isLoading: false,
    });
  });

  it("renders consolidated values and exclusion caption", () => {
    show(<ConsolidatedPnLPage />);
    expect(screen.getByText(/629,000/)).toBeInTheDocument();
    expect(screen.getByText(/excludes internal/i)).toBeInTheDocument();
  });

  it("passes changed date filters to the query", () => {
    show(<ConsolidatedPnLPage />);
    fireEvent.change(screen.getByLabelText("From"), {
      target: { value: "2026-08-01" },
    });
    expect(hooks.consolidated).toHaveBeenLastCalledWith({
      startDate: "2026-08-01",
      endDate: undefined,
    });
  });

  it("passes an exact single-day range to the query", () => {
    show(<ConsolidatedPnLPage />);
    fireEvent.change(screen.getByLabelText("From"), {
      target: { value: "2026-07-02" },
    });
    fireEvent.change(screen.getByLabelText("To"), {
      target: { value: "2026-07-02" },
    });
    expect(hooks.consolidated).toHaveBeenLastCalledWith({
      startDate: "2026-07-02",
      endDate: "2026-07-02",
    });
  });

  it("renders actual department partners and flags departments without partners", () => {
    show(<PartnerProfitSharePage />);
    expect(screen.getByText("Supply")).toBeInTheDocument();
    expect(screen.getByText("Ali")).toBeInTheDocument();
    expect(screen.getByText("Sara")).toBeInTheDocument();
    expect(screen.getAllByText(/20,500/)).toHaveLength(2);
    expect(screen.getByText(/No partners assigned/)).toBeInTheDocument();
    expect(screen.queryByText("Partner 1")).not.toBeInTheDocument();
  });

  it("renders outstanding balance", () => {
    show(<OutstandingBalancesPage />);
    expect(screen.getByText("Farm")).toBeInTheDocument();
    expect(screen.getByText(/payable/)).toBeInTheDocument();
  });

  it("renders stock summary and movements", () => {
    show(<StockSummaryPage />);
    expect(screen.getAllByText("Supply").length).toBeGreaterThan(0);
    expect(screen.getByText("sale_out")).toBeInTheDocument();
  });

  it("renders expense breakdown", () => {
    show(<ExpenseBreakdownPage />);
    expect(screen.getByText("Fuel")).toBeInTheDocument();
  });

  it("renders payroll grouped by employee", () => {
    show(<PayrollSummaryPage />);
    expect(screen.getByText("Ali")).toBeInTheDocument();
    expect(screen.getByText(/10,000/)).toBeInTheDocument();
  });

  it("renders loading, error, and empty states", () => {
    hooks.consolidated.mockReturnValueOnce({ isLoading: true });
    const loading = show(<ConsolidatedPnLPage />);
    expect(
      loading.container.querySelector(".animate-pulse"),
    ).toBeInTheDocument();
    loading.unmount();

    hooks.consolidated.mockReturnValueOnce({ isLoading: false, isError: true });
    show(<ConsolidatedPnLPage />);
    expect(
      screen.getByText("Consolidated report could not be loaded"),
    ).toBeInTheDocument();

    hooks.outstanding.mockReturnValueOnce({
      data: { data: [] },
      isLoading: false,
    });
    show(<OutstandingBalancesPage />);
    expect(screen.getByText("No records")).toBeInTheDocument();
  });

  it("keeps partner and payroll routes behind the management RoleGuard", () => {
    const routes = readFileSync(
      resolve(process.cwd(), "src/routes/AppRoutes.tsx"),
      "utf8",
    );
    expect(routes).toMatch(
      /path="reports\/partner-profit-share"[\s\S]*?<RoleGuard allowedRoles=\{managementRoles\}>[\s\S]*?<PartnerProfitSharePage \/>/,
    );
    expect(routes).toMatch(
      /path="reports\/payroll-summary"[\s\S]*?<RoleGuard allowedRoles=\{managementRoles\}>[\s\S]*?<PayrollSummaryPage \/>/,
    );
  });
});
