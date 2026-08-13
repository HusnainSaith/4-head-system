import { fireEvent, render, screen } from "@testing-library/react";
import { DepartmentCode, Role } from "@/types/enums";
import { SupplyPurchasesPage } from "./SupplyPurchasesPage";
import { SupplySalesPage } from "./SupplySalesPage";
import { SupplyStockPage } from "./SupplyStockPage";
vi.mock("@/features/accounts/components", () => ({ PaymentAccountFields: () => null }));

vi.mock("@/features/parties/components/DepartmentBalancesPanel", () => ({
  DepartmentBalancesPanel: () => null,
}));
import { SupplyReportPage } from "./SupplyReportPage";
import { InternalTransfersPage } from "./InternalTransfersPage";
vi.mock("@/features/invoices/components/InvoiceButton", () => ({
  InvoiceButton: () => <button type="button">Print</button>,
}));
const listParties = vi.fn();
const createTransfer = vi.fn();
vi.mock("@/features/vehicles/components/DepartmentVehicleSelect", () => ({
  DepartmentVehicleSelect: () => null,
}));
vi.mock("@/features/vehicles/components/DepartmentVehicleSelect", () => ({
  DepartmentVehicleSelect: () => null,
}));
vi.mock("react-redux", () => ({
  useSelector: (selector: (state: unknown) => unknown) =>
    selector({
      auth: {
        user: {
          role: { name: Role.OWNER },
          departmentCode: DepartmentCode.SUPPLY,
        },
      },
    }),
}));
vi.mock("sonner", () => ({ toast: { success: vi.fn(), error: vi.fn() } }));
vi.mock("@/features/parties/partiesApi", () => ({
  useListPartiesQuery: (...args: unknown[]) => {
    listParties(...args);
    return { data: { data: { items: [] } } };
  },
}));
vi.mock("@/features/vehicles/vehiclesApi", () => ({
  useListDepartmentsQuery: () => ({
    data: { data: [{ id: "d1", type: "SUPPLY", name: "Supply" }] },
  }),
  useListVehiclesQuery: () => ({ data: { data: { items: [] } } }),
}));
const pagination = {
  page: 1,
  limit: 10,
  total: 1,
  totalPages: 1,
  hasNextPage: false,
  hasPreviousPage: false,
};
vi.mock("../supplyApi", () => ({
  useListSupplyPurchasesQuery: () => ({
    data: {
      data: {
        items: [
          {
            id: "p1",
            party: { name: "Broker One" },
            quantityKg: "10",
            ratePerKg: "200",
            totalAmount: "2000",
            paymentMethod: "cash",
            amountPaid: "500",
            outstandingAmount: "1500",
            purchaseDate: "2026-07-12",
            status: "posted",
            vehicle: { registrationNumber: "ABC-1" },
          },
        ],
        pagination,
      },
    },
    isLoading: false,
    isError: false,
  }),
  useListSupplySalesQuery: () => ({
    data: {
      data: {
        items: [
          {
            id: "s1",
            party: { name: "Shop One" },
            quantityKg: "5",
            ratePerKg: "300",
            commissionPerKg: "75",
            totalAmount: "1500",
            paymentMethod: "credit",
            amountReceived: "250",
            outstandingAmount: "1250",
            saleDate: "2026-07-12",
            status: "posted",
          },
        ],
        pagination,
      },
    },
    isLoading: false,
    isError: false,
  }),
  useCreateSupplyPurchaseMutation: () => [vi.fn(), { isLoading: false }],
  useCreateSupplySaleMutation: () => [vi.fn(), { isLoading: false }],
  useDeleteSupplyPurchaseMutation: () => [vi.fn(), { isLoading: false }],
  useDeleteSupplySaleMutation: () => [vi.fn(), { isLoading: false }],
  useGetSupplyStockQuery: () => ({
    data: { data: { quantityKg: "25.000", wac: "225.50" } },
    isLoading: false,
    isError: false,
  }),
  useCreateSupplyStockWriteoffMutation: () => [vi.fn(), { isLoading: false }],
  useListInternalTransfersQuery: () => ({
    data: {
      data: {
        items: [
          {
            id: "t1",
            quantityKg: "2",
            internalRatePerKg: "250",
            totalAmount: "500",
            amountSettled: "100",
            remainingBalance: "400",
            settlementStatus: "partially_settled",
            transferDate: "2026-07-12",
          },
        ],
        pagination,
      },
    },
    isLoading: false,
    isError: false,
  }),
  useCreateInternalTransferMutation: () => [
    createTransfer,
    { isLoading: false },
  ],
  useSettleInternalTransferMutation: () => [vi.fn(), { isLoading: false }],
  useGetSupplyProfitLossQuery: () => ({
    data: {
      data: {
        externalOnly: {
          revenue: "100",
          cogs: "40",
          grossProfit: "60",
          operatingExpenses: "10",
          payroll: "5",
          netProfit: "45",
        },
        includingInternalTransfers: {
          revenue: "300",
          cogs: "120",
          grossProfit: "180",
          operatingExpenses: "20",
          payroll: "15",
          netProfit: "145",
        },
      },
    },
    isLoading: false,
    isError: false,
  }),
}));
describe("Supply pages", () => {
  beforeEach(() => {
    listParties.mockClear();
    createTransfer.mockReset();
  });
  it("renders purchases with backend payment and relation values", () => {
    render(<SupplyPurchasesPage />);
    expect(screen.getByText("Broker One")).toBeInTheDocument();
    expect(screen.getByText("ABC-1")).toBeInTheDocument();
    expect(screen.getAllByText(/1,500/).length).toBeGreaterThan(0);
  });
  it("renders external sales explanation and authoritative commission", () => {
    render(<SupplySalesPage />);
    expect(
      screen.getByText(/external sales to independent shop owners/i),
    ).toBeInTheDocument();
    expect(screen.getByText("Shop One")).toBeInTheDocument();
    expect(screen.getByText(/75/)).toBeInTheDocument();
  });
  it("requests shop-owner parties when the sale form opens", () => {
    render(<SupplySalesPage />);
    fireEvent.click(screen.getByRole("button", { name: /record sale/i }));
    expect(listParties).toHaveBeenCalledWith(
      expect.objectContaining({ type: "shop_owner" }),
      expect.anything(),
    );
    expect(screen.getByText(/Available: 25.000 kg/i)).toBeInTheDocument();
  });
  it("renders stock and its transfer-aware caption", () => {
    render(<SupplyStockPage />);
    expect(screen.getByText("25.000 kg")).toBeInTheDocument();
    expect(
      screen.getByText(/internal transfers sent to the Fresh Chicken Shop/i),
    ).toBeInTheDocument();
  });
  it("keeps both report views distinct", () => {
    render(<SupplyReportPage />);
    expect(screen.getByText("External Sales Only")).toBeInTheDocument();
    expect(
      screen.getByText("Including Internal Transfers"),
    ).toBeInTheDocument();
    expect(screen.getAllByText("Revenue")).toHaveLength(2);
    expect(screen.getByText(/300/)).toBeInTheDocument();
  });
  it("renders partial transfer balances and settlement action", () => {
    render(<InternalTransfersPage />);
    expect(screen.getByText("partially settled")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Settle" })).toBeInTheDocument();
    expect(screen.getByText(/400/)).toBeInTheDocument();
  });
});
