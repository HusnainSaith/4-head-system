import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { Role, DepartmentCode } from "@/types/enums";
import { WastagePurchasesPage } from "./WastagePurchasesPage";
import { WastageReportPage } from "./WastageReportPage";
import { WastageSalesPage } from "./WastageSalesPage";
import { WastageStockPage } from "./WastageStockPage";
vi.mock("@/features/accounts/components", () => ({ PaymentAccountFields: () => null }));

vi.mock("@/features/parties/components/DepartmentBalancesPanel", () => ({
  DepartmentBalancesPanel: () => null,
}));

const createSale = vi.fn();
const createPurchase = vi.fn();
const toastError = vi.fn();
vi.mock("@/features/vehicles/components/DepartmentVehicleSelect", () => ({
  DepartmentVehicleSelect: () => null,
}));
vi.mock("react-redux", () => ({
  useSelector: (selector: (state: unknown) => unknown) =>
    selector({
      auth: {
        user: {
          role: { name: Role.OWNER },
          departmentCode: DepartmentCode.WASTAGE,
        },
      },
    }),
}));
vi.mock("sonner", () => ({
  toast: {
    success: vi.fn(),
    error: (...args: unknown[]) => toastError(...args),
  },
}));
vi.mock("@/features/parties/partiesApi", () => ({
  useListPartiesQuery: () => ({ data: { data: { items: [] } } }),
}));
vi.mock("@/features/vehicles/vehiclesApi", () => ({
  useListDepartmentsQuery: () => ({
    data: { data: [{ id: "d1", type: "WASTAGE", name: "Wastage" }] },
  }),
  useListVehiclesQuery: () => ({ data: { data: { items: [] } } }),
}));
vi.mock("../wastageApi", () => ({
  useListPurchasesQuery: () => ({
    data: { data: [] },
    isLoading: false,
    isError: false,
  }),
  useCreatePurchaseMutation: () => [createPurchase, { isLoading: false }],
  useUpdatePurchaseMutation: () => [vi.fn(), { isLoading: false }],
  useDeletePurchaseMutation: () => [vi.fn(), { isLoading: false }],
  useListSalesQuery: () => ({
    data: { data: [] },
    isLoading: false,
    isError: false,
  }),
  useGetStockQuery: () => ({
    data: { data: { quantityKg: "12.500", wac: "42.25" } },
    isLoading: false,
    isError: false,
  }),
  useCreateWastageStockWriteoffMutation: () => [vi.fn(), { isLoading: false }],
  useListWastageStockWriteoffsQuery: () => ({ data: { data: [] }, isLoading: false, isError: false, refetch: vi.fn() }),
  useUpdateWastageStockWriteoffMutation: () => [vi.fn(), { isLoading: false }],
  useDeleteWastageStockWriteoffMutation: () => [vi.fn(), { isLoading: false }],
  useCreateSaleMutation: () => [createSale, { isLoading: false }],
  useUpdateSaleMutation: () => [vi.fn(), { isLoading: false }],
  useDeleteSaleMutation: () => [vi.fn(), { isLoading: false }],
  useGetProfitLossReportQuery: () => ({
    data: {
      data: {
        revenue: "100",
        cogs: "40",
        grossProfit: "60",
        operatingExpenses: "10",
        payrollExpenses: "5",
        netProfit: "45",
      },
    },
    isLoading: false,
    isError: false,
  }),
}));

describe("Wastage pages", () => {
  beforeEach(() => {
    createSale.mockReset();
    createPurchase.mockReset();
    toastError.mockReset();
  });
  it("renders purchases and completes its create flow", async () => {
    createPurchase.mockReturnValue({ unwrap: () => Promise.resolve({}) });
    render(<WastagePurchasesPage />);
    fireEvent.click(screen.getByRole("button", { name: /record purchase/i }));
    const numbers = screen.getAllByRole("spinbutton");
    fireEvent.change(numbers[0], { target: { value: "5" } });
    fireEvent.change(numbers[1], { target: { value: "20" } });
    fireEvent.change(numbers[2], { target: { value: "100" } });
    fireEvent.click(screen.getByRole("button", { name: "Save" }));
    await waitFor(() =>
      expect(createPurchase).toHaveBeenCalledWith(
        expect.objectContaining({
          quantityKg: 5,
          ratePerKg: 20,
          amountPaid: 100,
        }),
      ),
    );
  });
  it("renders sales with available stock and handles backend insufficient-stock errors", async () => {
    createSale.mockReturnValue({
      unwrap: () =>
        Promise.reject({
          data: { message: "Insufficient stock. Available: 12.500kg" },
        }),
    });
    render(<WastageSalesPage />);
    fireEvent.click(screen.getByRole("button", { name: /record sale/i }));
    expect(screen.getByText(/available: 12.500kg/i)).toBeInTheDocument();
    const numbers = screen.getAllByRole("spinbutton");
    fireEvent.change(numbers[0], { target: { value: "20" } });
    fireEvent.change(numbers[1], { target: { value: "50" } });
    fireEvent.change(numbers[2], { target: { value: "1000" } });
    fireEvent.click(screen.getByRole("button", { name: "Save" }));
    await waitFor(() =>
      expect(toastError).toHaveBeenCalledWith(
        expect.stringContaining("Insufficient stock"),
      ),
    );
  });
  it("renders stock cards", () => {
    render(<WastageStockPage />);
    expect(screen.getByText("12.500 kg")).toBeInTheDocument();
    expect(screen.getByText(/Rs.*42/)).toBeInTheDocument();
  });
  it("renders all report cards", () => {
    render(<WastageReportPage />);
    for (const label of [
      "Revenue",
      "COGS",
      "Gross Profit",
      "Operating Expenses",
      "Payroll",
      "Net Profit",
    ])
      expect(screen.getByText(label)).toBeInTheDocument();
  });
});
