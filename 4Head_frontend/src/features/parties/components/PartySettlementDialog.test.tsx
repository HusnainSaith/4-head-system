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
          {
            id: "payable-extra",
            name: "Akram Sab",
            currentBalance: "274443.00",
          },
          {
            id: "receivable-extra",
            name: "Munzoor Sab",
            currentBalance: "-20949327.00",
          },
          {
            id: "falaq-source",
            name: "Falaq Khata",
            currentBalance: "9999444.00",
          },
          {
            id: "falaq-target",
            name: "falaq PS",
            currentBalance: "5853334.00",
          },
          {
            id: "current-falaq",
            name: "Falaq Current",
            currentBalance: "8890708.00",
          },
          {
            id: "basharat-positive",
            name: "Basharat payable",
            currentBalance: "5121200.00",
          },
          {
            id: "basharat-negative",
            name: "Basharat receivable",
            currentBalance: "-10000000.00",
          },
          { id: "zero-party", name: "Zero Party", currentBalance: "0.00" },
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
    await user.click(
      screen.getByRole("button", { name: /create settlement/i }),
    );

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
    render(<PartySettlementDialog open onOpenChange={vi.fn()} />);

    const selects = screen.getAllByRole("combobox");
    await user.click(selects[0]);
    await user.click(await screen.findByRole("option", { name: "Brokerage" }));
    await user.click(selects[1]);
    await user.click(await screen.findByRole("option", { name: /Farm/ }));
    await user.click(selects[2]);
    await user.click(await screen.findByRole("option", { name: /Buyer/ }));
    await user.type(screen.getByRole("spinbutton", { name: /amount/i }), "100");
    await user.click(
      screen.getByRole("button", { name: /create settlement/i }),
    );

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

  it("filters both party lists and preserves the selected party while searching", async () => {
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

    const search = screen.getByRole("searchbox", { name: /search parties/i });
    await user.type(search, "  bUY  ");
    expect(selects[0]).toHaveTextContent("Farm (Balance: +500.00)");
    expect(
      screen.getByText("Current balance: Rs. +500.00"),
    ).toBeInTheDocument();
    await user.click(selects[0]);
    expect(
      await screen.findByRole("option", { name: /Buyer/ }),
    ).toBeInTheDocument();
    expect(
      screen.queryByRole("option", { name: /Farm/ }),
    ).not.toBeInTheDocument();
    await user.keyboard("{Escape}");
    await user.click(selects[1]);
    await user.click(await screen.findByRole("option", { name: /Buyer/ }));

    await user.clear(search);
    await user.click(selects[0]);
    expect(
      await screen.findByRole("option", { name: /Farm/ }),
    ).toBeInTheDocument();
  });

  it("allows excess payable to become receivable and submits the full amount", async () => {
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
    await user.click(await screen.findByRole("option", { name: /Akram Sab/ }));
    await user.click(selects[1]);
    await user.click(
      await screen.findByRole("option", { name: /Munzoor Sab/ }),
    );
    await user.type(
      screen.getByRole("spinbutton", { name: /amount/i }),
      "300000",
    );
    expect(screen.getByRole("status")).toHaveTextContent(
      "Akram Sab will owe us Rs. 25557.00",
    );
    await user.click(
      screen.getByRole("button", { name: /create settlement/i }),
    );
    await waitFor(() =>
      expect(mockCreateSettlement).toHaveBeenCalledWith(
        expect.objectContaining({
          settlementAmount: 300000,
          payablePartyId: "payable-extra",
          receivablePartyId: "receivable-extra",
        }),
      ),
    );
  });

  it("shows positive, negative, and zero parties in both dropdowns with signed balances", async () => {
    const user = userEvent.setup();
    render(
      <PartySettlementDialog
        open
        onOpenChange={vi.fn()}
        departmentCode="BROKERAGE"
      />,
    );
    const selects = screen.getAllByRole("combobox");
    for (const select of selects) {
      await user.click(select);
      expect(
        await screen.findByRole("option", { name: "Farm (Balance: +500.00)" }),
      ).toBeInTheDocument();
      expect(
        screen.getByRole("option", { name: "Buyer (Balance: -300.00)" }),
      ).toBeInTheDocument();
      expect(
        screen.getByRole("option", { name: "Zero Party (Balance: 0.00)" }),
      ).toBeInTheDocument();
      await user.keyboard("{Escape}");
    }
    await user.click(selects[0]);
    await user.click(screen.getByRole("option", { name: /Buyer/ }));
    expect(selects[0]).toHaveTextContent("Buyer (Balance: -300.00)");
    expect(
      screen.getByText("Current balance: Rs. -300.00"),
    ).toBeInTheDocument();
    await user.click(selects[1]);
    await user.click(screen.getByRole("option", { name: /Farm/ }));
    expect(selects[1]).toHaveTextContent("Farm (Balance: +500.00)");
  });

  it("subtracts from the first party and adds to the second with notes", async () => {
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
    await user.click(screen.getByRole("option", { name: /Buyer/ }));
    await user.click(selects[1]);
    await user.click(screen.getByRole("option", { name: /Farm/ }));
    await user.type(
      screen.getByRole("spinbutton", { name: /amount/i }),
      "16307",
    );
    await user.type(
      screen.getByLabelText("Notes (Optional)"),
      "Transfer between accounts",
    );
    await user.click(
      screen.getByRole("button", { name: /create settlement/i }),
    );
    await waitFor(() =>
      expect(mockCreateSettlement).toHaveBeenCalledWith(
        expect.objectContaining({
          payablePartyId: "receivable-1",
          receivablePartyId: "payable-1",
          settlementAmount: 16307,
          notes: "Transfer between accounts",
        }),
      ),
    );
  });
});

it("subtracts from Falaq Khata and adds to falaq PS when both have payable balances", async () => {
  const user = userEvent.setup();
  render(
    <PartySettlementDialog
      open
      onOpenChange={vi.fn()}
      departmentCode="BROKERAGE"
    />,
  );
  await user.click(
    screen.getByRole("combobox", { name: "Payable Party (we owe them)" }),
  );
  await user.click(screen.getByRole("option", { name: /Falaq Khata/ }));
  await user.click(screen.getByRole("combobox", { name: "Receivable Party" }));
  await user.click(screen.getByRole("option", { name: /falaq PS/ }));
  await user.type(
    screen.getByRole("spinbutton", { name: /amount/i }),
    "1108736",
  );
  expect(screen.getByLabelText("Projected balances")).toHaveTextContent(
    "Falaq Khata: subtract Rs. 1108736.00 → +8890708.00",
  );
  expect(screen.getByLabelText("Projected balances")).toHaveTextContent(
    "falaq PS: add Rs. 1108736.00 → +6962070.00",
  );
  await user.click(screen.getByRole("button", { name: /create settlement/i }));
  await waitFor(() =>
    expect(mockCreateSettlement).toHaveBeenCalledWith(
      expect.objectContaining({
        payablePartyId: "falaq-source",
        receivablePartyId: "falaq-target",
        settlementAmount: 1108736,
      }),
    ),
  );
});

it.each([
  ["Basharat payable", "basharat-positive", "+13068900.00"],
  ["Basharat receivable", "basharat-negative", "-2052300.00"],
])(
  "reduces Falaq payable and adjusts %s correctly",
  async (name, id, result) => {
    mockCreateSettlement.mockReturnValue({
      unwrap: () => Promise.resolve({ success: true }),
    });
    const user = userEvent.setup();
    render(
      <PartySettlementDialog
        open
        onOpenChange={vi.fn()}
        departmentCode="BROKERAGE"
      />,
    );
    await user.click(
      screen.getByRole("combobox", { name: "Payable Party (we owe them)" }),
    );
    await user.click(screen.getByRole("option", { name: /Falaq Current/ }));
    await user.click(
      screen.getByRole("combobox", { name: "Receivable Party" }),
    );
    await user.click(screen.getByRole("option", { name: new RegExp(name) }));
    await user.type(
      screen.getByRole("spinbutton", { name: /amount/i }),
      "7947700",
    );
    expect(screen.getByLabelText("Projected balances")).toHaveTextContent(
      "Falaq Current: subtract Rs. 7947700.00 → +943008.00",
    );
    expect(screen.getByLabelText("Projected balances")).toHaveTextContent(
      name + ": add Rs. 7947700.00 → " + result,
    );
    await user.click(
      screen.getByRole("button", { name: /create settlement/i }),
    );
    await waitFor(() =>
      expect(mockCreateSettlement).toHaveBeenCalledWith(
        expect.objectContaining({
          payablePartyId: "current-falaq",
          receivablePartyId: id,
          settlementAmount: 7947700,
        }),
      ),
    );
  },
);
