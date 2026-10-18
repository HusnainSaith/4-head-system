import { ShopPurchasesPage } from "@/features/fresh-chicken-shop/components/ShopPurchasesPage";
const { createShopPurchase, cancelShopPurchase } = vi.hoisted(() => ({
  createShopPurchase: vi.fn(),
  cancelShopPurchase: vi.fn(),
}));
vi.mock("@/features/fresh-chicken-shop/shopApi", () => ({
  useListShopPurchasesQuery: () => ({
    data: {
      data: {
        items: [
          {
            id: "shop-purchase",
            party: { name: "External Farm" },
            quantityKg: "100.000",
            ratePerKg: "320.00",
            totalAmount: "32000.00",
            amountPaid: "0.00",
            outstandingAmount: "32000.00",
            status: "posted",
            purchaseDate: "2026-10-04",
          },
        ],
        pagination: {
          page: 1,
          totalPages: 1,
          hasNextPage: false,
          hasPreviousPage: false,
        },
      },
    },
  }),
  useCreateShopPurchaseMutation: () => [createShopPurchase, {}],
  useDeleteShopPurchaseMutation: () => [cancelShopPurchase, {}],
}));
import { fireEvent, render, screen } from "@testing-library/react";
import { DepartmentCode, Role } from "@/types/enums";
import { SupplyPurchasesPage } from "./SupplyPurchasesPage";
import { SupplySalesPage } from "./SupplySalesPage";
import { SupplyStockPage } from "./SupplyStockPage";
vi.mock("@/features/accounts/components", () => ({
  PaymentAccountFields: () => null,
}));

vi.mock("@/features/parties/components/DepartmentBalancesPanel", () => ({
  DepartmentBalancesPanel: () => null,
}));
import { SupplyReportPage } from "./SupplyReportPage";
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
    data: {
      data: [
        { id: "d1", type: "SUPPLY", name: "Supply" },
        { id: "shop1", type: "FRESH_CHICKEN_SHOP", name: "Fresh Chicken Shop" },
      ],
    },
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
            notes: "Saved transaction note",
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
            notes: "Saved transaction note",
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
  useListSupplyStockWriteoffsQuery: () => ({
    data: {
      data: [
        {
          id: "w1",
          quantityKg: "1.500",
          reason: "spoilage",
          writeoffDate: "2026-07-12",
          valuationAmount: "337.50",
          note: "damaged",
        },
      ],
    },
    isLoading: false,
    isError: false,
    refetch: vi.fn(),
  }),
  useUpdateSupplyStockWriteoffMutation: () => [vi.fn(), { isLoading: false }],
  useDeleteSupplyStockWriteoffMutation: () => [vi.fn(), { isLoading: false }],
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
          purchaseQuantityKg: "10.000",
          saleQuantityKg: "5.000",
          shrinkageKg: "1.000",
        },
        includingInternalTransfers: {
          revenue: "300",
          cogs: "120",
          grossProfit: "180",
          operatingExpenses: "20",
          payroll: "15",
          netProfit: "145",
          purchaseQuantityKg: "10.000",
          saleQuantityKg: "7.000",
          shrinkageKg: "1.000",
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
    expect(screen.getByText("Saved transaction note")).toBeInTheDocument();
    expect(screen.getByText("Broker One")).toBeInTheDocument();
    expect(screen.getByText("ABC-1")).toBeInTheDocument();
    expect(screen.getAllByText(/1,500/).length).toBeGreaterThan(0);
  });
  it("renders external sales explanation and authoritative commission", () => {
    render(<SupplySalesPage />);
    expect(screen.getByText("Saved transaction note")).toBeInTheDocument();
    expect(
      screen.getByText(/external sales to independent shop owners/i),
    ).toBeInTheDocument();
    expect(screen.getByText("Shop One")).toBeInTheDocument();
    expect(screen.getByText(/75/)).toBeInTheDocument();
  });
  it("requests department parties for the admin when the sale form opens", () => {
    render(<SupplySalesPage />);
    expect(screen.getByText("Saved transaction note")).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: /record sale/i }));
    expect(listParties).toHaveBeenCalledWith(
      expect.objectContaining({ departmentId: "d1", type: undefined }),
      { skip: false },
    );
    expect(screen.getByText(/Available: 25.000 kg/i)).toBeInTheDocument();
  });
  it("renders stock and its transfer-aware caption", () => {
    render(<SupplyStockPage />);
    expect(screen.getByText("25.000 kg")).toBeInTheDocument();
    expect(
      screen.getByText(/purchases and external sales/i),
    ).toBeInTheDocument();
    expect(screen.getByText("Shrinkage records")).toBeInTheDocument();
    expect(screen.getByText("1.500 kg")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Edit" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Delete" })).toBeInTheDocument();
  });
  it("keeps both report views distinct", () => {
    render(<SupplyReportPage />);
    expect(screen.getByText("Profit and Loss")).toBeInTheDocument();
    expect(
      screen.queryByText("Including Internal Transfers"),
    ).not.toBeInTheDocument();
    expect(screen.getAllByText("Revenue")).toHaveLength(1);
    expect(screen.getByText(/100/)).toBeInTheDocument();
    expect(screen.getAllByText("10.000 kg")).toHaveLength(1);
  });
});

vi.mock("@/features/departments/departmentsApi", () => ({
  useListDepartmentsQuery: () => ({
    data: {
      data: [
        { id: "d1", type: "SUPPLY", name: "Supply" },
        { id: "shop1", type: "FRESH_CHICKEN_SHOP", name: "Fresh Chicken Shop" },
      ],
    },
  }),
}));

describe("Shop external purchase page", () => {
  it("renders external purchases with shop-specific titles and searches farm suppliers", () => {
    render(<ShopPurchasesPage />);
    expect(
      screen.getByRole("heading", { name: "Fresh Chicken Shop Purchases" }),
    ).toBeInTheDocument();
    expect(screen.getByText("External Farm")).toBeInTheDocument();
    expect(
      screen.getByRole("textbox", { name: "Search transactions" }),
    ).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: /record purchase/i }));
    expect(listParties).toHaveBeenCalledWith(
      expect.objectContaining({ departmentId: "shop1", type: "farm" }),
      { skip: false },
    );
    expect(screen.getByPlaceholderText("Search parties…")).toBeInTheDocument();
  });
  it("uses the shop cancellation endpoint rather than Supply", () => {
    cancelShopPurchase.mockReturnValue({ unwrap: () => Promise.resolve({}) });
    render(<ShopPurchasesPage />);
    fireEvent.click(screen.getByRole("button", { name: "Cancel" }));
    fireEvent.click(screen.getByRole("button", { name: "Cancel purchase" }));
    expect(cancelShopPurchase).toHaveBeenCalledWith("shop-purchase");
  });
});
