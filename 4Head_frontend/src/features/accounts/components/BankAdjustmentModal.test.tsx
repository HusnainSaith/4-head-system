import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

const adjustBank = vi.fn(() => ({ unwrap: () => Promise.resolve({}) }));

vi.mock("../accountsApi", () => ({
  useAdjustBankAccountMutation: () => [adjustBank, { isLoading: false }],
  useGetCashAccountsQuery: () => ({
    data: {
      data: [
        {
          account: { id: "cash-1", accountName: "Admin Cash Drawer" },
          currentBalance: "50000.00",
        },
      ],
    },
    isLoading: false,
  }),
}));

vi.mock("sonner", () => ({
  toast: { success: vi.fn(), error: vi.fn() },
}));

import { BankAdjustmentModal } from "./BankAdjustmentModal";

describe("BankAdjustmentModal", () => {
  beforeEach(() => adjustBank.mockClear());

  it("submits an audited owner bank deposit", async () => {
    const user = userEvent.setup();
    render(
      <BankAdjustmentModal
        open
        onClose={vi.fn()}
        bankAccountId="bank-1"
        accountName="HBL · Admin"
        type="deposit"
      />,
    );

    await user.type(screen.getByRole("spinbutton"), "25000");
    await user.type(
      screen.getByPlaceholderText("Optional reference"),
      "OWN-DEP-001",
    );
    await user.click(screen.getByRole("button", { name: "Deposit" }));

    await waitFor(() =>
      expect(adjustBank).toHaveBeenCalledWith({
        id: "bank-1",
        body: expect.objectContaining({
          type: "deposit",
          amount: 25000,
          cashAccountId: "cash-1",
          bankTransactionMethod: "app",
          appReference: "OWN-DEP-001",
        }),
      }),
    );
  });
});
