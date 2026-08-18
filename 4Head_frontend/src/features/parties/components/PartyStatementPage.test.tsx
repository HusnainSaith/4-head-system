/**
 * PartyStatementPage — statement rows and payment dialog submit tests.
 */
import { configureStore } from "@reduxjs/toolkit";
import { Provider } from "react-redux";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { render, screen, waitFor } from "@testing-library/react";
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
const mockRecordPayment = vi.fn();

vi.mock("@/features/parties/partiesApi", () => ({
  useGetPartyQuery: vi.fn(),
  useGetPartyStatementQuery: vi.fn(),
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
  });

  it("renders the party name as the page title", () => {
    setupSuccessfulQueries();
    renderPage();
    expect(screen.getByText("Test Farm")).toBeInTheDocument();
  });

  it("shows receivable/payable totals and prints the statement", async () => {
    const print = vi.spyOn(window, "print").mockImplementation(() => undefined);
    setupSuccessfulQueries();
    renderPage();
    expect(screen.getByText("Receivable from party")).toBeInTheDocument();
    expect(screen.getByText("Payable to party")).toBeInTheDocument();
    await userEvent.click(
      screen.getByRole("button", { name: /print statement/i }),
    );
    expect(print).toHaveBeenCalled();
    print.mockRestore();
  });

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
    expect(screen.getByText("First sale")).toBeInTheDocument();
    expect(screen.getByText("Second sale")).toBeInTheDocument();
  });

  it("shows investor payables as positive labelled balances", () => {
    setupSuccessfulQueries(
      [
        makeEntry({
          entryType: "credit",
          amount: "180000",
          runningBalance: "-180000",
        }),
      ],
      makeParty({ partyType: PartyType.INVESTOR, name: "Tayyab" }),
      "-180000",
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
});
