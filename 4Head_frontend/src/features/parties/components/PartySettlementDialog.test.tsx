import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

const mockCreateSettlement = vi.fn();

vi.mock("@/features/parties/partiesApi", () => ({
  useCreatePartySettlementMutation: () => [
    mockCreateSettlement,
    { isLoading: false },
  ],
  useListPartiesQuery: () => ({
    data: {
      success: true,
      data: {
        items: [
          { id: "payable-1", name: "Farm", currentBalance: "500.00" },
          { id: "receivable-1", name: "Buyer", currentBalance: "-300.00" },
        ],
      },
    },
    isLoading: false,
    error: undefined,
  }),
}));

vi.mock("@/features/departments/departmentsApi", () => ({
  useListDepartmentsQuery: () => ({
    data: {
      success: true,
      data: [
        {
          id: "department-1",
          type: "BROKERAGE",
          name: "Brokerage",
          isActive: true,
        },
      ],
    },
  }),
}));

vi.mock("sonner", () => ({
  toast: { success: vi.fn(), error: vi.fn() },
}));

import { PartySettlementDialog } from "./PartySettlementDialog";

describe("PartySettlementDialog", () => {
  beforeAll(() => {
    Object.defineProperties(HTMLElement.prototype, {
      hasPointerCapture: { value: () => false, configurable: true },
      setPointerCapture: { value: () => undefined, configurable: true },
      releasePointerCapture: { value: () => undefined, configurable: true },
      scrollIntoView: { value: () => undefined, configurable: true },
    });
  });

  beforeEach(() => {
    mockCreateSettlement.mockReset();
    mockCreateSettlement.mockReturnValue({
      unwrap: () => Promise.resolve({ success: true }),
    });
  });

  it("submits the resolved department and the requested sign-side parties", async () => {
    const user = userEvent.setup();
    render(
      <PartySettlementDialog
        open
        onOpenChange={vi.fn()}
        departmentCode="BROKERAGE"
      />,
    );

    const selects = screen.getAllByRole("combobox");
    await user.click(selects[0]);
    await user.click(await screen.findByRole("option", { name: /Farm/ }));
    await user.click(selects[1]);
    await user.click(await screen.findByRole("option", { name: /Buyer/ }));
    await user.type(screen.getByRole("spinbutton", { name: /amount/i }), "250");
    await user.click(screen.getByRole("button", { name: /create settlement/i }));

    await waitFor(() =>
      expect(mockCreateSettlement).toHaveBeenCalledWith(
        expect.objectContaining({
          payablePartyId: "payable-1",
          receivablePartyId: "receivable-1",
          departmentId: "department-1",
          settlementAmount: 250,
        }),
      ),
    );
  });

  it("lets an admin select the department inside the reusable form", async () => {
    const user = userEvent.setup();
    render(
      <PartySettlementDialog open onOpenChange={vi.fn()} />,
    );

    const selects = screen.getAllByRole("combobox");
    await user.click(selects[0]);
    await user.click(await screen.findByRole("option", { name: "Brokerage" }));
    await user.click(selects[1]);
    await user.click(await screen.findByRole("option", { name: /Farm/ }));
    await user.click(selects[2]);
    await user.click(await screen.findByRole("option", { name: /Buyer/ }));
    await user.type(screen.getByRole("spinbutton", { name: /amount/i }), "100");
    await user.click(screen.getByRole("button", { name: /create settlement/i }));

    await waitFor(() =>
      expect(mockCreateSettlement).toHaveBeenCalledWith(
        expect.objectContaining({
          departmentId: "department-1",
          payablePartyId: "payable-1",
          receivablePartyId: "receivable-1",
          settlementAmount: 100,
        }),
      ),
    );
  });
});
