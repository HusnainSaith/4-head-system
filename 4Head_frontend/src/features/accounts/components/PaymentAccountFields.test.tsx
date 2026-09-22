import { useState } from "react";
import { render, screen, waitFor } from "@testing-library/react";
import type { PaymentAccountSelection } from "../types";

vi.mock("../accountsApi", () => ({
  useGetCashAccountsQuery: () => ({
    data: {
      success: true,
      data: [
        {
          account: {
            id: "shared-cash-1",
            accountName: "Admin Cash Drawer",
            openingBalance: "0.00",
            isShared: true,
          },
          openingBalance: "0.00",
          totalIn: "1000.00",
          totalOut: "100.00",
          currentBalance: "900.00",
        },
      ],
    },
  }),
  useGetBankAccountsQuery: () => ({ data: undefined }),
}));

import { PaymentAccountFields } from "./PaymentAccountFields";

function CashFields() {
  const [value, setValue] = useState<PaymentAccountSelection>({});
  return (
    <PaymentAccountFields
      paymentMethod="cash"
      value={value}
      onChange={setValue}
      departmentId="another-department"
    />
  );
}

describe("PaymentAccountFields", () => {
  it("shows and automatically selects the shared admin drawer for every department", async () => {
    render(<CashFields />);
    const drawer = screen.getByLabelText("Cash drawer *");
    expect(screen.getByRole("option", { name: /Admin Cash Drawer/ })).toBeInTheDocument();
    await waitFor(() => expect(drawer).toHaveValue("shared-cash-1"));
  });
});
