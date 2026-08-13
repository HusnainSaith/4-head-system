import { render, screen } from "@testing-library/react";

vi.mock("react-redux", () => ({
  useSelector: (selector: () => unknown) => selector(),
}));
vi.mock("@/features/auth/authSlice", () => ({
  selectUserRole: () => "owner",
  selectUserDepartmentId: () => null,
}));
vi.mock("@/features/vehicles/vehiclesApi", () => ({
  useListDepartmentsQuery: () => ({ data: { data: [] } }),
}));
vi.mock("../committeesApi", () => ({
  useListCommitteesQuery: () => ({
    data: {
      data: [
        {
          id: "committee-1",
          departmentId: "department-1",
          department: { name: "Supply" },
          name: "Test Committee",
          totalMembers: 5,
          installmentAmount: "100.00",
          installmentCount: 2,
          remainingInstallments: 3,
          totalContributed: "200.00",
          totalPayout: "500.00",
          currentAmount: "300.00",
          payoutPosition: 1,
          startDate: "2026-08-01",
          status: "active",
        },
      ],
    },
    isLoading: false,
    isError: false,
    refetch: vi.fn(),
  }),
  useCreateCommitteeMutation: () => [vi.fn(), { isLoading: false }],
  useRecordInstallmentMutation: () => [vi.fn(), { isLoading: false }],
  useRecordPayoutMutation: () => [vi.fn(), { isLoading: false }],
}));

import { CommitteesPage } from "./CommitteesPage";

describe("CommitteesPage", () => {
  it("shows recorded installments and the payout-minus-installment amount", () => {
    render(<CommitteesPage />);

    expect(screen.getByText("2 / 5")).toBeInTheDocument();
    expect(screen.getByText(/Rs\s*300/)).toBeInTheDocument();
    expect(
      screen.getByText(/Installments column shows recorded \/ total/i),
    ).toBeInTheDocument();
  });
});
