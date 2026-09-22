import { configureStore } from "@reduxjs/toolkit";
import { Provider } from "react-redux";
import { fireEvent, render, screen } from "@testing-library/react";
import authReducer, { credentialsSet } from "@/features/auth/authSlice";
import { apiSlice } from "@/store/apiSlice";
import { PartyType } from "@/features/parties/types";
import { ownerUser, authenticatedState } from "@/test/auth-fixtures";
import { IncomingTransfersPage } from "./IncomingTransfersPage";
import { ShopSalesPage } from "./ShopSalesPage";
import { ShopStockPage } from "./ShopStockPage";
vi.mock("@/features/accounts/components", () => ({ PaymentAccountFields: () => null }));

vi.mock("@/features/parties/components/DepartmentBalancesPanel", () => ({
  DepartmentBalancesPanel: () => null,
}));
vi.mock("@/features/vehicles/components/DepartmentVehicleSelect", () => ({
  DepartmentVehicleSelect: () => null,
}));
import { ShopReportPage } from "./ShopReportPage";

const {
  mockSale,
  mockTransfer,
  mockStock,
  mockReport,
  mockListPartiesQuery,
  mockCreateShopSale,
} = vi.hoisted(() => ({
  mockCreateShopSale: vi.fn(),
  mockListPartiesQuery: vi.fn(() => ({
    data: {
      data: {
        items: [{ id: "c1", name: "Walk-in Customer", partyType: "customer" }],
      },
    },
  })),
  mockSale: {
    id: "sale1",
    customerParty: {
      id: "c1",
      name: "Walk-in Customer",
      partyType: "customer",
    },
    customerPartyId: "c1",
    quantityKg: "5.000",
    ratePerKg: "350.00",
    wacAtSale: "290.0000",
    totalAmount: "1750.00",
    cogsAmount: "1450.00",
    profitMarginPerKg: "60.00",
    paymentMethod: "cash" as const,
    amountReceived: "1750.00",
    outstandingAmount: "0.00",
    saleDate: "2026-07-12",
    departmentId: "dept1",
    createdAt: "2026-07-12T00:00:00Z",
    updatedAt: "2026-07-12T00:00:00Z",
  },
  mockTransfer: {
    id: "t1",
    fromDepartmentId: "supply1",
    toDepartmentId: "shop1",
    quantityKg: "10.000",
    internalRatePerKg: "280.00",
    totalAmount: "2800.00",
    amountSettled: "1000.00",
    remainingBalance: "1800.00",
    settlementStatus: "partially_settled" as const,
    transferDate: "2026-07-10",
  },
  mockStock: {
    live: {
      id: "live1",
      productId: "p1",
      departmentId: "dept1",
      stockType: "live",
      quantityKg: "42.500",
      wac: "290.00",
    },
    dressed: {
      id: "dressed1",
      productId: "p1",
      departmentId: "dept1",
      stockType: "dressed",
      quantityKg: "30.000",
      wac: "300.00",
    },
  },
  mockReport: {
    revenue: "50000.00",
    cogs: "30000.00",
    operatingExpenses: "5000.00",
    payrollExpenses: "3000.00",
    netProfit: "12000.00",
  },
}));

vi.mock("@/features/parties/partiesApi", () => ({
  useListPartiesQuery: mockListPartiesQuery,
  useCreatePartyMutation: vi.fn(() => [vi.fn(), { isLoading: false }]),
}));
vi.mock("sonner", () => ({ toast: { success: vi.fn(), error: vi.fn() } }));

vi.mock("@/features/fresh-chicken-shop/shopApi", () => ({
  useGetShopIncomingTransfersQuery: vi.fn(() => ({
    data: { data: [mockTransfer] },
    isLoading: false,
    isError: false,
  })),
  useListShopSalesQuery: vi.fn(() => ({
    data: { data: [mockSale] },
    isLoading: false,
    isError: false,
  })),
  useCreateShopSaleMutation: vi.fn(() => [
    mockCreateShopSale,
    { isLoading: false },
  ]),
  useUpdateShopSaleMutation: vi.fn(() => [vi.fn(), { isLoading: false }]),
  useDeleteShopSaleMutation: vi.fn(() => [vi.fn(), { isLoading: false }]),
  useGetShopStockQuery: vi.fn(() => ({
    data: { data: mockStock },
    isLoading: false,
    isError: false,
  })),
  useCreateShopStockWriteoffMutation: vi.fn(() => [
    vi.fn().mockResolvedValue({ data: { valuationAmount: "580.00" } }),
    { isLoading: false },
  ]),
  useListShopStockWriteoffsQuery: vi.fn(() => ({ data: { data: [] }, isLoading: false, isError: false, refetch: vi.fn() })),
  useUpdateShopStockWriteoffMutation: vi.fn(() => [vi.fn(), { isLoading: false }]),
  useDeleteShopStockWriteoffMutation: vi.fn(() => [vi.fn(), { isLoading: false }]),
  useGetShopProfitLossQuery: vi.fn(() => ({
    data: { data: mockReport },
    isLoading: false,
    isError: false,
  })),
}));

function buildStore() {
  const store = configureStore({
    reducer: { auth: authReducer, [apiSlice.reducerPath]: apiSlice.reducer },
    middleware: (gDM) => gDM().concat(apiSlice.middleware),
    preloadedState: { auth: authenticatedState(ownerUser) },
  });
  store.dispatch(credentialsSet(ownerUser));
  return store;
}

function wrap(ui: React.ReactElement) {
  return render(<Provider store={buildStore()}>{ui}</Provider>);
}

// ── IncomingTransfersPage ──────────────────────────────────────────────────
describe("IncomingTransfersPage", () => {
  it("renders transfer data read-only", () => {
    wrap(<IncomingTransfersPage />);
    expect(screen.getByText("Incoming Transfers")).toBeInTheDocument();
    expect(screen.getByText("10.000 kg")).toBeInTheDocument();
    expect(screen.getByText("partially settled")).toBeInTheDocument();
  });

  it("has no create/settle action buttons", () => {
    wrap(<IncomingTransfersPage />);
    expect(
      screen.queryByRole("button", { name: /new transfer/i }),
    ).not.toBeInTheDocument();
    expect(
      screen.queryByRole("button", { name: /settle/i }),
    ).not.toBeInTheDocument();
  });

  it("shows caption directing users to Supply side", () => {
    wrap(<IncomingTransfersPage />);
    expect(
      screen.getByText(/Supply → Internal Transfers/i),
    ).toBeInTheDocument();
  });
});

// ── ShopSalesPage ──────────────────────────────────────────────────────────
describe("ShopSalesPage", () => {
  beforeEach(() => {
    mockCreateShopSale.mockReset();
    mockCreateShopSale.mockReturnValue({
      unwrap: () => Promise.resolve({ data: mockSale }),
    });
  });
  it("renders dressed weight and backend-derived margin", () => {
    wrap(<ShopSalesPage />);
    expect(screen.getByText("Walk-in Customer")).toBeInTheDocument();
    expect(screen.getByText("5.000 kg")).toBeInTheDocument();
    expect(screen.getByText(/60/)).toBeInTheDocument();
  });

  it("opens record sale dialog with stock hint", () => {
    wrap(<ShopSalesPage />);
    fireEvent.click(screen.getByRole("button", { name: /record sale/i }));
    expect(screen.getByText(/Available stock: 30.000 kg/i)).toBeInTheDocument();
  });

  it("requests customers within the backend pagination limit", () => {
    wrap(<ShopSalesPage />);
    fireEvent.click(screen.getByRole("button", { name: /record sale/i }));

    expect(mockListPartiesQuery).toHaveBeenCalledWith(
      { type: PartyType.CUSTOMER, limit: 100 },
      { skip: false },
    );
  });

  it("shows insufficient-stock error when dressed quantity exceeds available", () => {
    wrap(<ShopSalesPage />);
    fireEvent.click(screen.getByRole("button", { name: /record sale/i }));
    const quantityInput = screen.getByLabelText(/dressed weight/i);
    fireEvent.change(quantityInput, { target: { value: "999" } });
    const rateInput = screen.getByLabelText(/sale rate per dressed kg/i);
    fireEvent.change(rateInput, { target: { value: "300" } });
    fireEvent.submit(quantityInput.closest("form")!);
    expect(screen.getByText(/insufficient stock/i)).toBeInTheDocument();
  });

  it("shows inline new customer form when toggled", () => {
    wrap(<ShopSalesPage />);
    fireEvent.click(screen.getByRole("button", { name: /record sale/i }));
    fireEvent.click(screen.getByRole("button", { name: /\+ new customer/i }));
    expect(screen.getByPlaceholderText(/customer name/i)).toBeInTheDocument();
  });

  it("submits dressed-sale inputs and renders the backend-WAC preview", () => {
    wrap(<ShopSalesPage />);
    fireEvent.click(screen.getByRole("button", { name: /record sale/i }));
    fireEvent.change(screen.getByLabelText(/dressed weight/i), {
      target: { value: "30" },
    });
    fireEvent.change(screen.getByLabelText(/sale rate per dressed kg/i), {
      target: { value: "480" },
    });
    expect(screen.getByText(/estimated break-even rate/i)).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Save" }));
    expect(mockCreateShopSale).toHaveBeenCalledWith(
      expect.objectContaining({
        quantityKg: 30,
        ratePerKg: 480,
      }),
    );
    const submitted = mockCreateShopSale.mock.calls[0]?.[0];
    expect(submitted).not.toHaveProperty("profitMarginPerKg");
  });
});

// ── ShopStockPage ──────────────────────────────────────────────────────────
describe("ShopStockPage", () => {
  it("renders stock stats and caption about internal transfers", () => {
    wrap(<ShopStockPage />);
    expect(screen.getByText("42.500 kg")).toBeInTheDocument();
    expect(screen.getByText("30.000 kg")).toBeInTheDocument();
    expect(
      screen.getByText(/internal transfers from Supply/i),
    ).toBeInTheDocument();
  });

  it("opens write-off dialog", () => {
    wrap(<ShopStockPage />);
    fireEvent.click(screen.getByRole("button", { name: /add shrinkage/i }));
    expect(screen.getByRole("dialog")).toBeInTheDocument();
    expect(screen.getByLabelText(/weight \(kg\)/i)).toBeInTheDocument();
  });

  it("write-off dialog has reason select with expected default", () => {
    wrap(<ShopStockPage />);
    fireEvent.click(screen.getByRole("button", { name: /add shrinkage/i }));
    expect(screen.getAllByText("spoilage").length).toBeGreaterThan(0);
  });
});

// ── ShopReportPage ─────────────────────────────────────────────────────────
describe("ShopReportPage", () => {
  it("renders all five P&L stat cards", () => {
    wrap(<ShopReportPage />);
    expect(screen.getByText("Revenue")).toBeInTheDocument();
    expect(screen.getByText("COGS")).toBeInTheDocument();
    expect(screen.getByText("Operating expenses")).toBeInTheDocument();
    expect(screen.getByText("Payroll")).toBeInTheDocument();
    expect(screen.getByText("Net profit")).toBeInTheDocument();
  });

  it("does NOT render a grossProfit card (not in backend response)", () => {
    wrap(<ShopReportPage />);
    expect(screen.queryByText(/gross profit/i)).not.toBeInTheDocument();
  });

  it("renders formatted monetary values", () => {
    wrap(<ShopReportPage />);
    expect(screen.getByText(/50,000/)).toBeInTheDocument();
    expect(screen.getByText(/12,000/)).toBeInTheDocument();
  });
});
