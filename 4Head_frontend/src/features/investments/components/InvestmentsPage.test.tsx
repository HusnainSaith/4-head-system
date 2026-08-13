import { render, screen } from "@testing-library/react";

vi.mock("@/features/accounts/components", () => ({
  PaymentAccountFields: () => null,
}));
vi.mock("@/features/parties/partiesApi", () => ({
  useListPartiesQuery: () => ({ data: { data: { items: [] } } }),
}));
vi.mock("@/features/vehicles/vehiclesApi", () => ({
  useListDepartmentsQuery: () => ({ data: { data: [] } }),
}));
vi.mock("../investmentsApi", () => ({
  useListInvestorsQuery: () => ({
    data: {
      data: {
        items: [
          {
            id: "investor-1",
            partyId: "party-1",
            party: { name: "Shafique" },
            investorType: "brother",
            status: "active",
            accountBalance: "125000.00",
          },
        ],
      },
    },
    isLoading: false,
    isError: false,
    refetch: vi.fn(),
  }),
  useGetInvestorLedgerQuery: () => ({
    data: { data: { openingOrExternalBalance: "0.00", capital: [] } },
    isError: false,
    refetch: vi.fn(),
  }),
  useCreateInvestorMutation: () => [vi.fn(), { isLoading: false }],
  useRecordInvestorTransactionMutation: () => [vi.fn(), { isLoading: false }],
}));

import { InvestmentsPage } from "./InvestmentsPage";
describe("InvestmentsPage", () => {
  it("shows unified investor and Shafique balances", () => {
    render(<InvestmentsPage />);
    expect(screen.getByText("Investor Accounts")).toBeInTheDocument();
    expect(screen.getByText("Shafique balance")).toBeInTheDocument();
    expect(screen.getByText("Shafique")).toBeInTheDocument();
    expect(screen.getByText("Shafique / Brother account")).toBeInTheDocument();
    expect(screen.getAllByText(/125,000/).length).toBeGreaterThan(0);
  });
});
