vi.mock("@/features/departments/departmentsApi", () => ({
  useListDepartmentsQuery: () => ({
    data: {
      data: [
        { id: "brokerage-dept", type: "BROKERAGE" },
        { id: "d1", type: "WASTAGE" },
      ],
    },
  }),
}));
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

const listPurchases = vi.fn();
const listSales = vi.fn();
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
    currentData: {
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
  useListBrokeragePurchasesQuery: (args:unknown) => (listPurchases(args), {
    data: {
      data: {
        summary:{totalAmount:"9000.00",settled:"1000.00",outstanding:"8000.00"},
        pagination:{page:1,limit:20,total:45,totalPages:3,hasNextPage:true,hasPreviousPage:false},
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
            description: "Saved transaction note",
            purchaseDate: "2026-07-13",
          },
        ],
      },
    },
    isLoading: false,
    isError: false,
  }),
  useListBrokerageSalesQuery: (args:unknown) => (listSales(args), {
    data: {
      data: {
        summary:{totalAmount:"9000.00",settled:"1000.00",outstanding:"8000.00"},
        pagination:{page:1,limit:20,total:45,totalPages:3,hasNextPage:true,hasPreviousPage:false},
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
            description: "Saved transaction note",
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
    expect(screen.getByText("Saved transaction note")).toBeInTheDocument();

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
      expect(screen.getByText("Saved transaction note")).toBeInTheDocument();

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
    expect(screen.getByText("Saved transaction note")).toBeInTheDocument();

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

  it("offers only external buyers and supports party search", () => {
    render(<BrokerageTransactionsPage kind="sale" />);
    fireEvent.click(screen.getByRole("button", { name: /record sale/i }));
    expect(screen.queryByText(/automatic transfer/i)).not.toBeInTheDocument();
    expect(
      screen.getByLabelText("Buyer (Customer or Broker)"),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("textbox", { name: "Search parties" }),
    ).toBeInTheDocument();
  });
});

it.each(['purchase','sale'] as const)('sends the %s date to the server, resets pagination and uses full-filter totals',async kind=>{
 const spy=kind==='sale'?listSales:listPurchases;spy.mockClear();render(<BrokerageTransactionsPage kind={kind}/>);
 fireEvent.click(screen.getByRole('button',{name:/next/i}));expect(spy).toHaveBeenLastCalledWith(expect.objectContaining({page:2}));
 fireEvent.change(screen.getByLabelText('Filter transactions by date'),{target:{value:'2026-10-12'}});
 expect(spy).toHaveBeenLastCalledWith(expect.objectContaining({page:1,from:'2026-10-12',to:'2026-10-12',limit:20}));
 expect(screen.getByText(/9,000/)).toBeInTheDocument();
 fireEvent.change(screen.getByRole('textbox',{name:'Search transactions'}),{target:{value:'Buyer'}});
 await waitFor(()=>expect(spy).toHaveBeenLastCalledWith(expect.objectContaining({search:'Buyer',page:1})));
});
