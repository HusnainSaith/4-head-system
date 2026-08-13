import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { OwnerDashboard } from "./OwnerDashboard";

vi.mock("@/features/dashboard/dashboardApi", () => ({
  useGetConsolidatedProfitLossQuery: () => ({
    data: { data: { externalRevenue: "100000", netProfit: "-25000" } },
    isLoading: false,
    isError: false,
    refetch: vi.fn(),
  }),
  useGetOutstandingBalancesQuery: () => ({
    data: {
      data: [
        { partyId: "p1", balance: "40000" },
        { partyId: "p2", balance: "10000" },
        { partyId: "p3", balance: "-30000" },
      ],
    },
    isLoading: false,
    isError: false,
    refetch: vi.fn(),
  }),
  useGetDepartmentProfitLossQuery: () => ({
    data: {
      data: [
        {
          departmentId: "department-1",
          departmentName: "Brokerage",
          departmentType: "BROKERAGE",
          revenue: "200000",
          cogs: "190000",
          grossProfit: "10000",
        },
      ],
    },
    isLoading: false,
    isError: false,
    refetch: vi.fn(),
  }),
  useGetStockSummaryQuery: () => ({
    data: {
      data: {
        summary: [
          {
            productId: "product-1",
            departmentId: "department-1",
            departmentName: "Brokerage",
            quantityKg: "125",
            wac: "300",
          },
        ],
        movements: [],
      },
    },
    isLoading: false,
    isError: false,
    refetch: vi.fn(),
  }),
}));

vi.mock("@/features/vehicles/vehiclesApi", () => ({
  useListDepartmentsQuery: () => ({
    data: { data: [{ id: "department-1", name: "Brokerage" }] },
    isLoading: false,
    isError: false,
    refetch: vi.fn(),
  }),
}));

describe("OwnerDashboard", () => {
  it("shows combined receivable and payable without netting", () => {
    render(
      <MemoryRouter>
        <OwnerDashboard />
      </MemoryRouter>,
    );
    expect(screen.getByText("Total receivable")).toBeInTheDocument();
    expect(screen.getByText(/50,000/)).toBeInTheDocument();
    expect(screen.getByText("Total payable")).toBeInTheDocument();
    expect(screen.getByText(/30,000/)).toBeInTheDocument();
  });

  it("shows live department revenue, gross profit, and quick links", () => {
    render(
      <MemoryRouter>
        <OwnerDashboard />
      </MemoryRouter>,
    );
    expect(screen.getAllByText("Brokerage").length).toBeGreaterThan(0);
    expect(screen.getByText("Gross profit")).toBeInTheDocument();
    expect(screen.getByText(/200,000/)).toBeInTheDocument();
    expect(screen.getByText(/10,000/)).toBeInTheDocument();
    expect(screen.queryByText("Coming soon")).not.toBeInTheDocument();
    expect(screen.getByRole("link", { name: /view report/i })).toHaveAttribute(
      "href",
      "/brokerage/reports/profit-loss",
    );
    expect(
      screen.getByRole("link", { name: /brokerage entry/i }),
    ).toHaveAttribute("href", "/brokerage");
  });
});
