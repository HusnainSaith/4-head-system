import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { Role } from "@/types/enums";
import { PartyType } from "@/features/parties/types";
import { BrokerageTransactionsPage } from "./BrokerageTransactionsPage";

vi.mock("@/features/parties/components/DepartmentBalancesPanel", () => ({
  DepartmentBalancesPanel: () => null,
}));
vi.mock("@/features/parties/components/PartySettlementDialog", () => ({
  PartySettlementDialog: () => null,
}));
vi.mock("@/features/accounts/components", () => ({
  PaymentAccountFields: () => null,
}));

const createPurchase = vi.fn();
const createSale = vi.fn();

vi.mock("react-redux", () => ({
  useSelector: (selector: (state: unknown) => unknown) =>
    selector({ auth: { user: { role: { name: Role.OWNER } } } }),
}));
vi.mock("sonner", () => ({
  toast: { success: vi.fn(), error: vi.fn() },
}));
vi.mock("@/features/parties/partiesApi", () => ({
  useListPartiesQuery: ({ type }: { type: PartyType }) => ({
    data: {
      data: {
        items:
          type === PartyType.BROKER
            ? [
                {
                  id: "broker-1",
                  name: "Broker Party A",
                  partyType: PartyType.BROKER,
                },
              ]
            : [],
      },
    },
  }),
}));
vi.mock("@/features/vehicles/components/DepartmentVehicleSelect", () => ({
  DepartmentVehicleSelect: () => null,
}));
vi.mock("@/features/invoices/components/InvoiceButton", () => ({
  InvoiceButton: () => null,
}));
vi.mock("../brokerageApi", () => ({
  useListBrokeragePurchasesQuery: () => ({
    data: {
      data: {
        items: [
          {
            id: "purchase-1",
            party: { name: "Farm A" },
            quantityKg: "10.000",
            ratePerKg: "100.00",
            totalAmount: "1000.00",
            amountPaid: "400.00",
            outstandingAmount: "600.00",
            paymentMethod: "credit",
            purchaseDate: "2026-07-13",
          },
        ],
      },
    },
    isLoading: false,
    isError: false,
  }),
  useListBrokerageSalesQuery: () => ({
    data: {
      data: {
        items: [
          {
            id: "sale-1",
            party: { name: "Buyer A" },
            quantityKg: "5.000",
            ratePerKg: "120.00",
            commissionPerKg: "20.00",
            totalAmount: "600.00",
            amountReceived: "250.00",
            outstandingAmount: "350.00",
            paymentMethod: "credit",
            saleDate: "2026-07-13",
          },
        ],
      },
    },
    isLoading: false,
    isError: false,
  }),
  useCreateBrokeragePurchaseMutation: () => [
    createPurchase,
    { isLoading: false },
  ],
  useCreateBrokerageSaleMutation: () => [createSale, { isLoading: false }],
  useUpdateBrokeragePurchaseMutation: () => [vi.fn(), { isLoading: false }],
  useUpdateBrokerageSaleMutation: () => [vi.fn(), { isLoading: false }],
  useDeleteBrokeragePurchaseMutation: () => [vi.fn()],
  useDeleteBrokerageSaleMutation: () => [vi.fn()],
}));

describe("Brokerage transaction balances", () => {
  beforeAll(() => {
    Element.prototype.scrollIntoView = vi.fn();
  });

  beforeEach(() => {
    createPurchase.mockReset();
    createSale.mockReset();
  });

  it("shows purchase paid/payable values and submits amountPaid", async () => {
    createPurchase.mockReturnValue({ unwrap: () => Promise.resolve({}) });
    render(<BrokerageTransactionsPage kind="purchase" />);

    expect(screen.getByText("Initial payable")).toBeInTheDocument();
    expect(screen.getByText(/600/)).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: /record purchase/i }));
    const numbers = screen.getAllByRole("spinbutton");
    fireEvent.change(numbers[0], { target: { value: "5" } });
    fireEvent.change(numbers[1], { target: { value: "20" } });
    fireEvent.change(numbers[2], { target: { value: "100" } });
    fireEvent.click(screen.getByRole("button", { name: "Save" }));

    await waitFor(() =>
      expect(createPurchase).toHaveBeenCalledWith(
        expect.objectContaining({ amountPaid: 100, quantityKg: 5 }),
      ),
    );
  });

  it.each([
    ["purchase", /record purchase/i, "Seller (Farm or Broker)"],
    ["sale", /record sale/i, "Buyer (Customer or Broker)"],
  ] as const)(
    "allows a broker party in a Brokerage %s",
    async (kind, buttonName, partyLabel) => {
      render(<BrokerageTransactionsPage kind={kind} />);

      fireEvent.click(screen.getByRole("button", { name: buttonName }));
      fireEvent.click(screen.getByLabelText(partyLabel));

      expect(
        await screen.findByRole("option", { name: "Broker Party A" }),
      ).toBeInTheDocument();
    },
  );

  it("shows sale received/receivable values and submits amountReceived", async () => {
    createSale.mockReturnValue({ unwrap: () => Promise.resolve({}) });
    render(<BrokerageTransactionsPage kind="sale" />);

    expect(screen.getByText("Initial receivable")).toBeInTheDocument();
    expect(screen.getByText(/350/)).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: /record sale/i }));
    const numbers = screen.getAllByRole("spinbutton");
    fireEvent.change(numbers[0], { target: { value: "5" } });
    fireEvent.change(numbers[1], { target: { value: "20" } });
    fireEvent.change(numbers[2], { target: { value: "100" } });
    fireEvent.click(screen.getByRole("button", { name: "Save" }));

    await waitFor(() =>
      expect(createSale).toHaveBeenCalledWith(
        expect.objectContaining({ amountReceived: 100, quantityKg: 5 }),
      ),
    );
  });

  it("records a Supply destination with an initial received amount", async () => {
    createSale.mockReturnValue({ unwrap: () => Promise.resolve({}) });
    render(<BrokerageTransactionsPage kind="sale" />);

    fireEvent.click(screen.getByRole("button", { name: /record sale/i }));
    fireEvent.click(screen.getAllByRole("combobox")[0]);
    fireEvent.click(
      await screen.findByRole("option", {
        name: /supply department \(automatic transfer\)/i,
      }),
    );

    expect(screen.queryByLabelText("Buyer")).not.toBeInTheDocument();
    expect(screen.getByLabelText("Amount received")).toBeInTheDocument();
    const numbers = screen.getAllByRole("spinbutton");
    fireEvent.change(numbers[0], { target: { value: "12" } });
    fireEvent.change(numbers[1], { target: { value: "325" } });
    fireEvent.change(numbers[2], { target: { value: "900" } });
    fireEvent.click(screen.getByRole("button", { name: "Save" }));

    await waitFor(() =>
      expect(createSale).toHaveBeenCalledWith(
        expect.objectContaining({
          destinationType: "supply",
          quantityKg: 12,
          ratePerKg: 325,
          paymentMethod: "credit",
          amountReceived: 900,
        }),
      ),
    );
  });
});
