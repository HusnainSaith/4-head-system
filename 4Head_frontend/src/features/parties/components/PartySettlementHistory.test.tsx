import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

const mockDelete = vi.fn();

vi.mock("@/features/parties/partiesApi", () => ({
  useDeletePartySettlementMutation: () => [mockDelete, { isLoading: false }],
  useReversePartySettlementMutation: () => [vi.fn(), { isLoading: false }],
  useUpdatePartySettlementMutation: () => [vi.fn(), { isLoading: false }],
}));

vi.mock("sonner", () => ({
  toast: { success: vi.fn(), error: vi.fn() },
}));

import { PartySettlementHistory } from "./PartySettlementHistory";

describe("PartySettlementHistory", () => {
  beforeEach(() => {
    mockDelete.mockReset();
    mockDelete.mockReturnValue({
      unwrap: () => Promise.resolve({ success: true, data: null }),
    });
  });

  it("shows all settlement details and deletes through reversal", async () => {
    const user = userEvent.setup();
    render(
      <PartySettlementHistory
        canManage
        settlements={[
          {
            id: "settlement-1",
            payablePartyId: "payable-1",
            payableParty: { name: "Farm" },
            receivablePartyId: "receivable-1",
            receivableParty: { name: "Buyer" },
            departmentId: "department-1",
            department: { id: "department-1", name: "Brokerage" },
            settlementAmount: "250.00",
            settlementDate: "2026-07-01",
            status: "active",
            createdAt: "2026-07-01T00:00:00Z",
            updatedAt: "2026-07-01T00:00:00Z",
          } as never,
        ]}
      />,
    );

    expect(screen.getByText("Brokerage")).toBeInTheDocument();
    expect(screen.getByText("Farm")).toBeInTheDocument();
    expect(screen.getByText("Buyer")).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: /^delete$/i }));
    await user.type(screen.getByLabelText("Reason"), "Duplicate settlement");
    await user.click(
      screen.getByRole("button", { name: /delete and reverse/i }),
    );

    await waitFor(() =>
      expect(mockDelete).toHaveBeenCalledWith({
        id: "settlement-1",
        reason: "Duplicate settlement",
      }),
    );
  });
});
