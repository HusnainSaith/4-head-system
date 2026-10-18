vi.mock("@/features/wastage/wastageApi", () => ({
  useUpdateSaleMutation: () => [mockWastageUpdate, { isLoading: false }],
  useUpdatePurchaseMutation: () => [mockWastageUpdate, { isLoading: false }],
  useDeleteSaleMutation: () => [mockWastageDelete],
  useDeletePurchaseMutation: () => [mockWastageDelete],
}));
vi.mock("@/features/fresh-chicken-shop/shopApi", () => ({
  useUpdateShopSaleMutation: () => [mockShopUpdate, { isLoading: false }],
  useUpdateShopPurchaseMutation: () => [mockShopUpdate, { isLoading: false }],
  useDeleteShopSaleMutation: () => [mockShopDelete],
  useDeleteShopPurchaseMutation: () => [mockShopDelete],
}));
let mockDepartmentType = "BROKERAGE";
const mockWastageUpdate = vi.fn();
const mockWastageDelete = vi.fn();
const mockShopUpdate = vi.fn();
const mockShopDelete = vi.fn();
const mockBrokerageUpdateSale = vi.fn();
const mockBrokerageUpdatePurchase = vi.fn();
const mockBrokerageDeleteSale = vi.fn();
const mockBrokerageDeletePurchase = vi.fn();
vi.mock("@/features/parties/components/PartyFormDialog", () => ({
  PartyFormDialog: ({ party }: { party: { currentBalance?: string } }) => (
    <div data-testid="party-editor-balance">{party.currentBalance}</div>
  ),
}));
vi.mock("@/features/departments/departmentsApi", () => ({
  useListDepartmentsQuery: () => ({
    data: { data: [{ id: "dept-1", type: mockDepartmentType }] },
  }),
}));
vi.mock("@/features/brokerage/brokerageApi", () => ({
  useUpdateBrokerageSaleMutation: () => [
    mockBrokerageUpdateSale,
    { isLoading: false },
  ],
  useUpdateBrokeragePurchaseMutation: () => [
    mockBrokerageUpdatePurchase,
    { isLoading: false },
  ],
  useDeleteBrokerageSaleMutation: () => [mockBrokerageDeleteSale],
  useDeleteBrokeragePurchaseMutation: () => [mockBrokerageDeletePurchase],
}));
/**
 * PartyStatementPage — statement rows and payment dialog submit tests.
 */
import { configureStore } from "@reduxjs/toolkit";
import { Provider } from "react-redux";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import authReducer from "@/features/auth/authSlice";
import { apiSlice } from "@/store/apiSlice";
import { authenticatedState, ownerUser } from "@/test/auth-fixtures";
import {
  PartyType,
  type Party,
  type PartyStatementEntry,
} from "@/features/parties/types";

// ── mock mutations / queries ───────────────────────────────────────────────
const mockUpdateAdjustment = vi.fn();
const mockDeleteAdjustment = vi.fn();
const mockRecordPayment = vi.fn();
const mockDeleteParty = vi.fn();

vi.mock("@/features/parties/partiesApi", () => ({
  useUpdateStatementAdjustmentMutation: () => [
    mockUpdateAdjustment,
    { isLoading: false },
  ],
  useDeleteStatementAdjustmentMutation: () => [
    mockDeleteAdjustment,
    { isLoading: false },
  ],
  useGetPartyQuery: vi.fn(),
  useGetPartyStatementQuery: vi.fn(),
  useDeletePartyMutation: vi.fn(() => [mockDeleteParty, { isLoading: false }]),
  useUpdatePartyPaymentMutation: vi.fn(() => [vi.fn(), { isLoading: false }]),
  useDeletePartyPaymentMutation: vi.fn(() => [vi.fn(), { isLoading: false }]),
  useRecordPartyPaymentMutation: vi.fn(() => [
    mockRecordPayment,
    { isLoading: false },
  ]),
}));

vi.mock("sonner", () => ({ toast: { success: vi.fn(), error: vi.fn() } }));

import * as partiesApiModule from "@/features/parties/partiesApi";
import { PartyStatementPage } from "@/features/parties/components/PartyStatementPage";

// ── helpers ────────────────────────────────────────────────────────────────

function buildStore() {
  return configureStore({
    reducer: { auth: authReducer, [apiSlice.reducerPath]: apiSlice.reducer },
    middleware: (gDM) => gDM().concat(apiSlice.middleware),
    preloadedState: { auth: authenticatedState(ownerUser) },
  });
}

function renderPage(partyId = "party-1") {
  const store = buildStore();
  return render(
    <Provider store={store}>
      <MemoryRouter initialEntries={[`/parties/${partyId}`]}>
        <Routes>
          <Route path="/parties/:id" element={<PartyStatementPage />} />
        </Routes>
      </MemoryRouter>
    </Provider>,
  );
}

function makeParty(overrides: Partial<Party> = {}): Party {
  return {
    id: "party-1",
    userId: null,
    partyType: PartyType.FARM,
    name: "Test Farm",
    phone: null,
    address: null,
    linkedDepartmentId: null,
    primaryDepartmentId: null,
    departments: [],
    openingBalance: "0",
    currentBalance: "0.00",
    notes: null,
    createdAt: "2025-01-01T00:00:00.000Z",
    updatedAt: "2025-01-01T00:00:00.000Z",
    deletedAt: null,
    createdBy: null,
    updatedBy: null,
    ...overrides,
  };
}

function makeEntry(
  overrides: Partial<PartyStatementEntry> = {},
): PartyStatementEntry {
  return {
    id: "entry-1",
    departmentId: "dept-1",
    accountId: "acc-1",
    partyId: "party-1",
    entryType: "debit",
    amount: "1000",
    entryDate: "2025-03-01",
    sourceType: "sale",
    sourceId: "src-1",
    description: "Sale entry",
    createdAt: "2025-03-01T00:00:00.000Z",
    createdBy: null,
    runningBalance: "1000",
    ...overrides,
  };
}

function setupSuccessfulQueries(
  entries: PartyStatementEntry[] = [makeEntry()],
  party: Party = makeParty(),
  closingBalance = "1000",
) {
  const partyResponse = { success: true, data: party };
  const statementResponse = {
    success: true,
    data: { entries, closingBalance },
  };

  vi.mocked(partiesApiModule.useGetPartyQuery).mockReturnValue({
    data: partyResponse,
    isLoading: false,
    isError: false,
    refetch: vi.fn(),
  } as ReturnType<typeof partiesApiModule.useGetPartyQuery>);

  vi.mocked(partiesApiModule.useGetPartyStatementQuery).mockReturnValue({
    data: statementResponse,
    isLoading: false,
    isError: false,
    refetch: vi.fn(),
  } as ReturnType<typeof partiesApiModule.useGetPartyStatementQuery>);
}

// ── tests ──────────────────────────────────────────────────────────────────

describe("PartyStatementPage", () => {
  beforeEach(() => {
    mockRecordPayment.mockReset();
    mockDeleteParty.mockReset();
  });

  it("renders the party name as the page title", () => {
    setupSuccessfulQueries();
    renderPage();
    expect(screen.getByText("Test Farm")).toBeInTheDocument();
  });

  it("shows edit and delete party actions", () => {
    setupSuccessfulQueries();
    renderPage();
    expect(
      screen.getAllByRole("button", { name: /^edit$/i }).length,
    ).toBeGreaterThan(0);
    expect(
      screen.getAllByRole("button", { name: /^delete$/i }).length,
    ).toBeGreaterThan(0);
  });

  it("shows receivable/payable totals and prints the statement", async () => {
    const printWindow = {
      document: {
        open: vi.fn(),
        write: vi.fn(),
        close: vi.fn(),
      },
      addEventListener: vi.fn(),
      focus: vi.fn(),
      print: vi.fn(),
    } as unknown as Window;
    vi.spyOn(window, "open").mockReturnValue(printWindow);
    setupSuccessfulQueries();
    renderPage();
    expect(screen.getByText("Receivable from party")).toBeInTheDocument();
    expect(screen.getByText("Payable to party")).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: /print statement/i }),
    ).toBeDisabled();
    await userEvent.type(screen.getByLabelText("From"), "2025-01-01");
    await userEvent.type(screen.getByLabelText("To"), "2025-03-31");
    await userEvent.click(
      screen.getByRole("button", { name: /print statement/i }),
    );
    expect(printWindow.document.write).toHaveBeenCalledWith(
      expect.stringContaining("<title>4Head ERP</title>"),
    );
    expect(printWindow.document.write).toHaveBeenCalledWith(
      expect.stringContaining("<h1>Account History</h1>"),
    );
    expect(printWindow.document.write).toHaveBeenCalledWith(
      expect.stringContaining(
        "For the Period From, <strong>2025-01-01</strong> to <strong>2025-03-31</strong>",
      ),
    );
    expect(printWindow.print).toHaveBeenCalled();
    vi.restoreAllMocks();
  });

  it.each(["sale", "purchase", "payment"] as const)(
    "shows the admin's saved %s note separately from the type",
    (sourceType) => {
      setupSuccessfulQueries([
        makeEntry({
          sourceType,
          description: "Admin's exact message\nSecond line",
        }),
      ]);
      renderPage();
      expect(
        screen.getByRole("columnheader", { name: "Notes" }),
      ).toBeInTheDocument();
      const note = screen.getByText("Admin's exact message Second line");
      expect(note.textContent).toBe("Admin's exact message\nSecond line");
      expect(note).toHaveClass("whitespace-pre-wrap");
    },
  );

  it("renders statement entry rows", () => {
    setupSuccessfulQueries([
      makeEntry({
        id: "e1",
        description: "First sale",
        entryDate: "2025-03-01",
      }),
      makeEntry({
        id: "e2",
        description: "Second sale",
        entryDate: "2025-03-02",
        entryType: "credit",
        runningBalance: "500",
      }),
    ]);
    renderPage();
    expect(screen.getByText(/First sale/)).toBeInTheDocument();
    expect(screen.getByText(/Second sale/)).toBeInTheDocument();
  });

  it("shows weight, rate, and total for transaction entries", () => {
    setupSuccessfulQueries([
      makeEntry({
        quantityKg: "16.000",
        ratePerKg: "325.00",
        totalAmount: "5200.00",
      }),
    ]);
    renderPage();
    expect(screen.getByText("Weight")).toBeInTheDocument();
    expect(screen.getByText("16.000 kg")).toBeInTheDocument();
    expect(screen.getByText(/325\.00/)).toBeInTheDocument();
    expect(screen.queryByText(/5,200\.00/)).not.toBeInTheDocument();
    expect(screen.getByText("Debit")).toBeInTheDocument();
    expect(screen.getByText("Credit")).toBeInTheDocument();
  });

  it("shows period totals and closing balance at the end of the statement", () => {
    setupSuccessfulQueries([
      makeEntry({
        entryType: "debit",
        amount: "1000",
        runningBalance: "-1000",
      }),
      makeEntry({
        id: "entry-2",
        entryType: "credit",
        amount: "250",
        runningBalance: "-750",
      }),
    ]);
    renderPage();
    expect(screen.getByText("Total")).toBeInTheDocument();
    expect(screen.getByText("Closing Balance")).toBeInTheDocument();
    expect(screen.getAllByText(/1,000\.00/).length).toBeGreaterThan(0);
    expect(screen.getAllByText(/750\.00/).length).toBeGreaterThan(0);
  });

  it("shows investor payables as positive labelled balances", () => {
    setupSuccessfulQueries(
      [
        makeEntry({
          entryType: "credit",
          amount: "180000",
          runningBalance: "180000",
        }),
      ],
      makeParty({ partyType: PartyType.INVESTOR, name: "Tayyab" }),
      "180000",
    );
    renderPage();
    expect(screen.getByText("Investor balance")).toBeInTheDocument();
    expect(screen.getByText(/180,000.*Payable/)).toBeInTheDocument();
    expect(screen.queryByText(/-Rs.*180,000/)).not.toBeInTheDocument();
  });

  it("shows empty state when there are no entries", () => {
    setupSuccessfulQueries([]);
    renderPage();
    expect(screen.getByText("No statement entries")).toBeInTheDocument();
  });

  it("shows the error state when a query fails", () => {
    vi.mocked(partiesApiModule.useGetPartyQuery).mockReturnValue({
      data: undefined,
      isLoading: false,
      isError: true,
      refetch: vi.fn(),
    } as ReturnType<typeof partiesApiModule.useGetPartyQuery>);

    vi.mocked(partiesApiModule.useGetPartyStatementQuery).mockReturnValue({
      data: undefined,
      isLoading: false,
      isError: false,
      refetch: vi.fn(),
    } as ReturnType<typeof partiesApiModule.useGetPartyStatementQuery>);

    renderPage();
    expect(
      screen.getByText("Statement could not be loaded"),
    ).toBeInTheDocument();
  });

  it("opens the payment dialog when Record payment is clicked", async () => {
    setupSuccessfulQueries();
    renderPage();
    await userEvent.click(
      screen.getByRole("button", { name: /record payment/i }),
    );
    expect(
      screen.getByText("Record payment", {
        selector: "[role='heading'], h2, [data-slot='dialog-title']",
      }),
    ).toBeInTheDocument();
  });

  it("calls recordPartyPayment with correct payload on payment submit", async () => {
    mockRecordPayment.mockReturnValue({
      unwrap: () =>
        Promise.resolve({
          success: true,
          data: { partyId: "party-1", dto: {} },
        }),
    });
    setupSuccessfulQueries();
    renderPage();

    await userEvent.click(
      screen.getByRole("button", { name: /record payment/i }),
    );

    const amountInput = screen.getByRole("spinbutton", { name: /amount/i });
    await userEvent.clear(amountInput);
    await userEvent.type(amountInput, "500");

    await userEvent.click(
      screen.getByRole("button", { name: /^record payment$/i }),
    );

    await waitFor(() => {
      expect(mockRecordPayment).toHaveBeenCalledWith(
        expect.objectContaining({
          id: "party-1",
          body: expect.objectContaining({ amount: 500, paymentMethod: "cash" }),
        }),
      );
    });
  });

  it("shows a validation error when amount is missing on payment submit", async () => {
    setupSuccessfulQueries();
    renderPage();

    await userEvent.click(
      screen.getByRole("button", { name: /record payment/i }),
    );
    // Clear the amount field and submit without filling it
    const amountInput = screen.getByRole("spinbutton", { name: /amount/i });
    await userEvent.clear(amountInput);
    await userEvent.click(
      screen.getByRole("button", { name: /^record payment$/i }),
    );

    await waitFor(() => {
      expect(screen.getByText("Amount is required")).toBeInTheDocument();
    });
  });

  it.each(["sale", "purchase"] as const)(
    "routes a Brokerage %s edit to Brokerage instead of Supply",
    async (sourceType) => {
      const user = userEvent.setup();
      const mutation =
        sourceType === "sale"
          ? mockBrokerageUpdateSale
          : mockBrokerageUpdatePurchase;
      mutation.mockReturnValue({ unwrap: () => Promise.resolve({}) });
      setupSuccessfulQueries([makeEntry({ sourceType })], makeParty());
      renderPage();
      await user.click(
        screen.getAllByRole("button", { name: /^edit$/i }).at(-1)!,
      );
      await user.click(screen.getByRole("button", { name: "Save changes" }));
      await waitFor(() =>
        expect(mutation).toHaveBeenCalledWith(
          expect.objectContaining({
            id: "src-1",
            body:
              sourceType === "sale"
                ? { saleDate: "2025-03-01" }
                : { purchaseDate: "2025-03-01" },
          }),
        ),
      );
    },
  );
  it.each(["sale", "purchase"] as const)(
    "cancels a Brokerage %s from its statement",
    async (sourceType) => {
      const user = userEvent.setup();
      const mutation =
        sourceType === "sale"
          ? mockBrokerageDeleteSale
          : mockBrokerageDeletePurchase;
      mutation.mockReturnValue({ unwrap: () => Promise.resolve({}) });
      vi.spyOn(window, "confirm").mockReturnValue(true);
      setupSuccessfulQueries([makeEntry({ sourceType })], makeParty());
      renderPage();
      await user.click(
        screen.getAllByRole("button", { name: /^delete$/i }).at(-1)!,
      );
      await waitFor(() => expect(mutation).toHaveBeenCalledWith("src-1"));
      vi.restoreAllMocks();
    },
  );

  it("preserves payment amount and account when saving a date-only change", async () => {
    const user = userEvent.setup();
    const mutation = vi.fn(() => ({ unwrap: () => Promise.resolve({}) }));
    vi.mocked(partiesApiModule.useUpdatePartyPaymentMutation).mockReturnValue([
      mutation,
      { isLoading: false },
    ] as unknown as ReturnType<
      typeof partiesApiModule.useUpdatePartyPaymentMutation
    >);
    setupSuccessfulQueries([makeEntry({ sourceType: "payment" })]);
    renderPage();
    await user.click(
      screen.getAllByRole("button", { name: /^edit$/i }).at(-1)!,
    );
    await user.click(screen.getByRole("button", { name: "Save changes" }));
    await waitFor(() =>
      expect(mutation).toHaveBeenCalledWith({
        id: "party-1",
        paymentId: "src-1",
        body: { paymentDate: "2025-03-01" },
      }),
    );
  });
});
describe("Party editor signed balance", () => {
  it.each(["-350.00", "350.00"])(
    "uses the statement balance %s when the party detail has no balance field",
    async (balance) => {
      const user = userEvent.setup();
      setupSuccessfulQueries(
        [
          makeEntry({
            amount: "350.00",
            entryType: balance.startsWith("-") ? "debit" : "credit",
            runningBalance: balance,
          }),
        ],
        makeParty({ currentBalance: undefined }),
        balance,
      );
      renderPage();
      await user.click(screen.getByTitle("Edit party"));
      expect(screen.getByTestId("party-editor-balance")).toHaveTextContent(
        balance,
      );
    },
  );
});

describe("Statement adjustments", () => {
  it.each([undefined, "2500.00"])(
    "edits the complete adjustment amount (%s)",
    async (settlementAmount) => {
      const user = userEvent.setup();
      mockUpdateAdjustment.mockClear();
      mockUpdateAdjustment.mockReturnValue({
        unwrap: () => Promise.resolve({}),
      });
      setupSuccessfulQueries([
        makeEntry({ sourceType: "party_adjustment", settlementAmount }),
      ]);
      renderPage();
      await user.click(
        screen.getAllByRole("button", { name: /^edit$/i }).at(-1)!,
      );
      expect(screen.getByLabelText("Amount")).toHaveValue(
        settlementAmount ? 2500 : 1000,
      );
      await user.click(screen.getByRole("button", { name: "Save changes" }));
      await waitFor(() =>
        expect(mockUpdateAdjustment).toHaveBeenCalledWith({
          id: "party-1",
          entryId: "entry-1",
          body: {
            date: "2025-03-01",
            amount: settlementAmount ? 2500 : 1000,
            entryType: "debit",
            notes: "Sale entry",
          },
        }),
      );
    },
  );
  it("deletes an adjustment through its guarded endpoint", async () => {
    const user = userEvent.setup();
    mockDeleteAdjustment.mockReturnValue({ unwrap: () => Promise.resolve({}) });
    vi.spyOn(window, "confirm").mockReturnValue(true);
    setupSuccessfulQueries([makeEntry({ sourceType: "party_adjustment" })]);
    renderPage();
    await user.click(
      screen.getAllByRole("button", { name: /^delete$/i }).at(-1)!,
    );
    await waitFor(() =>
      expect(mockDeleteAdjustment).toHaveBeenCalledWith({
        id: "party-1",
        entryId: "entry-1",
      }),
    );
    vi.restoreAllMocks();
  });
});

describe("Statement action safeguards", () => {
  it.each(["opening_balance", "party_adjustment"] as const)(
    "edits %s through the balance endpoint",
    async (sourceType) => {
      const user = userEvent.setup();
      mockUpdateAdjustment.mockReturnValue({
        unwrap: () => Promise.resolve({}),
      });
      setupSuccessfulQueries([makeEntry({ sourceType })]);
      renderPage();
      await user.click(
        screen.getAllByRole("button", { name: /^edit$/i }).at(-1)!,
      );
      await user.click(screen.getByRole("button", { name: "Save changes" }));
      await waitFor(() =>
        expect(mockUpdateAdjustment).toHaveBeenCalledWith(
          expect.objectContaining({ entryId: "entry-1" }),
        ),
      );
    },
  );
  it("does not offer mutation buttons on reversed settlements", () => {
    setupSuccessfulQueries([
      makeEntry({
        sourceType: "party_adjustment",
        settlementStatus: "reversed",
      }),
    ]);
    renderPage();
    expect(screen.getByText("Reversed")).toBeInTheDocument();
    const row = within(screen.getByText("Reversed").closest("tr")!);
    expect(
      row.queryByRole("button", { name: /^edit$/i }),
    ).not.toBeInTheDocument();
    expect(
      row.queryByRole("button", { name: /^delete$/i }),
    ).not.toBeInTheDocument();
  });
  it("preserves the complete amount for a split payment date correction", async () => {
    const user = userEvent.setup();
    const mutation = vi.fn(() => ({ unwrap: () => Promise.resolve({}) }));
    vi.mocked(partiesApiModule.useUpdatePartyPaymentMutation).mockReturnValue([
      mutation,
      { isLoading: false },
    ] as unknown as ReturnType<
      typeof partiesApiModule.useUpdatePartyPaymentMutation
    >);
    setupSuccessfulQueries([
      makeEntry({
        sourceType: "payment",
        amount: "1000",
        paymentAmount: "2500",
      }),
    ]);
    renderPage();
    await user.click(
      screen.getAllByRole("button", { name: /^edit$/i }).at(-1)!,
    );
    expect(screen.getByLabelText("Amount")).toHaveValue(2500);
    await user.click(screen.getByRole("button", { name: "Save changes" }));
    await waitFor(() =>
      expect(mutation).toHaveBeenCalledWith({
        id: "party-1",
        paymentId: "src-1",
        body: { paymentDate: "2025-03-01" },
      }),
    );
  });
});

describe("Statement department routing", () => {
  afterEach(() => {
    mockDepartmentType = "BROKERAGE";
    vi.restoreAllMocks();
  });
  it.each(["WASTAGE", "FRESH_CHICKEN_SHOP"])(
    "edits and cancels transactions using %s operations",
    async (department) => {
      mockDepartmentType = department;
      const update =
        department === "WASTAGE" ? mockWastageUpdate : mockShopUpdate;
      const remove =
        department === "WASTAGE" ? mockWastageDelete : mockShopDelete;
      update.mockReturnValue({ unwrap: () => Promise.resolve({}) });
      remove.mockReturnValue({ unwrap: () => Promise.resolve({}) });
      const user = userEvent.setup();
      setupSuccessfulQueries([makeEntry({ sourceType: "sale" })]);
      renderPage();
      await user.click(
        screen.getAllByRole("button", { name: /^edit$/i }).at(-1)!,
      );
      await user.click(screen.getByRole("button", { name: "Save changes" }));
      await waitFor(() =>
        expect(update).toHaveBeenCalledWith({
          id: "src-1",
          body: { saleDate: "2025-03-01" },
        }),
      );
      vi.spyOn(window, "confirm").mockReturnValue(true);
      await user.click(
        screen.getAllByRole("button", { name: /^delete$/i }).at(-1)!,
      );
      await waitFor(() => expect(remove).toHaveBeenCalledWith("src-1"));
    },
  );
});
