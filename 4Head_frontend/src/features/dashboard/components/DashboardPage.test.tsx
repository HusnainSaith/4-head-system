import { configureStore } from "@reduxjs/toolkit";
import { Provider } from "react-redux";
import { MemoryRouter } from "react-router-dom";
import { render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import authReducer from "@/features/auth/authSlice";
import {
  authenticatedState,
  departmentUser,
  ownerUser,
} from "@/test/auth-fixtures";

const reportMocks = vi.hoisted(() => ({
  profit: vi.fn(),
  balances: vi.fn(),
  stock: vi.fn(),
  departmentProfit: vi.fn(),
}));

vi.mock("@/features/dashboard/dashboardApi", () => ({
  useGetConsolidatedProfitLossQuery: reportMocks.profit,
  useGetOutstandingBalancesQuery: reportMocks.balances,
  useGetStockSummaryQuery: reportMocks.stock,
  useGetDepartmentProfitLossQuery: reportMocks.departmentProfit,
}));

vi.mock("@/features/vehicles/vehiclesApi", () => ({
  useListDepartmentsQuery: () => ({
    isLoading: false,
    isError: false,
    refetch: vi.fn(),
    data: { data: [{ id: "department-1", name: "Supply" }] },
  }),
}));

import { DashboardPage } from "@/features/dashboard/components/DashboardPage";

const queryState = {
  isLoading: false,
  isError: false,
  refetch: vi.fn(),
};

function renderDashboard(user: typeof ownerUser) {
  const store = configureStore({
    reducer: { auth: authReducer },
    preloadedState: { auth: authenticatedState(user) },
  });
  return render(
    <Provider store={store}>
      <MemoryRouter>
        <DashboardPage />
      </MemoryRouter>
    </Provider>,
  );
}

beforeEach(() => {
  vi.clearAllMocks();
  reportMocks.profit.mockReturnValue({
    ...queryState,
    data: {
      data: {
        externalRevenue: "1000",
        internalTransferRevenue: "0",
        totalCogs: "400",
        totalExpenses: "100",
        totalPayroll: "100",
        netProfit: "400",
        perPartnerShare: "133.33",
      },
    },
  });
  reportMocks.balances.mockReturnValue({
    ...queryState,
    data: { data: [{ partyId: "party-1", balance: "250" }] },
  });
  reportMocks.stock.mockReturnValue({
    ...queryState,
    data: {
      data: {
        summary: [
          {
            productId: "product-1",
            departmentId: "department-1",
            quantityKg: "50",
            wac: "200",
          },
        ],
        movements: [],
      },
    },
  });
  reportMocks.departmentProfit.mockReturnValue({
    ...queryState,
    data: {
      data: [
        {
          departmentId: "department-1",
          departmentName: "Supply",
          departmentType: "SUPPLY",
          revenue: "1000",
          cogs: "400",
          grossProfit: "600",
        },
      ],
    },
  });
});

describe("DashboardPage", () => {
  it("renders consolidated real-data widgets for an owner", () => {
    renderDashboard(ownerUser);
    expect(screen.getByText("Business dashboard")).toBeInTheDocument();
    expect(screen.getByText("External revenue")).toBeInTheDocument();
    expect(reportMocks.profit).toHaveBeenCalledOnce();
  });

  it("renders only department-scoped widgets for department staff", () => {
    renderDashboard(departmentUser);
    expect(screen.getByText("Department dashboard")).toBeInTheDocument();
    expect(screen.getByText("Today's purchases and sales")).toBeInTheDocument();
    expect(reportMocks.profit).not.toHaveBeenCalled();
    expect(reportMocks.stock).toHaveBeenCalledWith(
      { departmentId: "department-1" },
      { skip: false },
    );
  });
});
