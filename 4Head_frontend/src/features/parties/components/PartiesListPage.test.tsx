/**
 * PartiesListPage — render, filter, empty, and error state tests.
 *
 * The __mocks__/apiSlice stub returns { data: null } for every query, so we
 * override useListPartiesQuery per-test via vi.mock on the partiesApi module.
 */
import { configureStore } from "@reduxjs/toolkit";
import { Provider } from "react-redux";
import { MemoryRouter } from "react-router-dom";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import authReducer, { credentialsSet } from "@/features/auth/authSlice";
import { apiSlice } from "@/store/apiSlice";
import {
  ownerUser,
  departmentUser,
  authenticatedState,
} from "@/test/auth-fixtures";
import { PartyType, type Party } from "@/features/parties/types";

// ── mock the entire partiesApi module ──────────────────────────────────────
vi.mock("@/features/parties/partiesApi", () => ({
  useListPartiesQuery: vi.fn(),
  useCreatePartyMutation: vi.fn(() => [vi.fn(), { isLoading: false }]),
  useUpdatePartyMutation: vi.fn(() => [vi.fn(), { isLoading: false }]),
  useDeletePartyMutation: vi.fn(() => [vi.fn(), { isLoading: false }]),
}));
vi.mock("@/features/vehicles/vehiclesApi", () => ({
  useListDepartmentsQuery: vi.fn(() => ({
    data: {
      data: [
        { id: "department-brokerage", name: "Brokerage", type: "BROKERAGE" },
        { id: "department-supply", name: "Supply", type: "SUPPLY" },
      ],
    },
  })),
}));

import * as partiesApiModule from "@/features/parties/partiesApi";
import { PartiesListPage } from "@/features/parties/components/PartiesListPage";
import { departmentOptionsFrom } from "@/features/parties/department-options";

// ── helpers ────────────────────────────────────────────────────────────────

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
    notes: null,
    createdAt: "2025-01-01T00:00:00.000Z",
    updatedAt: "2025-01-01T00:00:00.000Z",
    deletedAt: null,
    createdBy: null,
    updatedBy: null,
    ...overrides,
  };
}

function buildStore(user = ownerUser) {
  const store = configureStore({
    reducer: { auth: authReducer, [apiSlice.reducerPath]: apiSlice.reducer },
    middleware: (gDM) => gDM().concat(apiSlice.middleware),
    preloadedState: { auth: authenticatedState(user) },
  });
  store.dispatch(credentialsSet(user));
  return store;
}

function renderPage(user = ownerUser) {
  const store = buildStore(user);
  return render(
    <Provider store={store}>
      <MemoryRouter>
        <PartiesListPage />
      </MemoryRouter>
    </Provider>,
  );
}

const mockUseListPartiesQuery = () =>
  vi.mocked(partiesApiModule.useListPartiesQuery);

// ── tests ──────────────────────────────────────────────────────────────────

describe("PartiesListPage", () => {
  function paginatedResponse(items: Party[]) {
    return {
      success: true,
      message: "Parties retrieved successfully",
      data: {
        items,
        pagination: {
          page: 1,
          limit: 10,
          total: items.length,
          totalPages: Math.max(1, Math.ceil(items.length / 10)),
          hasNextPage: false,
          hasPreviousPage: false,
        },
      },
    };
  }

  beforeEach(() => {
    mockUseListPartiesQuery().mockReturnValue({
      data: paginatedResponse([]),
      isLoading: false,
      isError: false,
      refetch: vi.fn(),
    } as ReturnType<typeof partiesApiModule.useListPartiesQuery>);
  });

  it("renders the page heading", () => {
    renderPage();
    expect(screen.getByText("Parties")).toBeInTheDocument();
  });

  it("renders the Add Party button", () => {
    renderPage();
    expect(
      screen.getByRole("button", { name: /add party/i }),
    ).toBeInTheDocument();
  });

  it("uses reference department names instead of UUID fallbacks", () => {
    expect(
      departmentOptionsFrom(
        [
          {
            id: "department-brokerage",
            name: "Brokerage",
            type: "BROKERAGE",
          },
        ],
        [],
        null,
        null,
      ),
    ).toEqual([{ id: "department-brokerage", name: "Brokerage" }]);
  });

  it("shows empty state when there are no parties", () => {
    renderPage();
    expect(screen.getByText("No parties found")).toBeInTheDocument();
  });

  it("renders party rows when data is returned", () => {
    mockUseListPartiesQuery().mockReturnValue({
      data: paginatedResponse([
        makeParty({ id: "p1", name: "Alpha Farm", partyType: PartyType.FARM }),
        makeParty({
          id: "p2",
          name: "Beta Broker",
          partyType: PartyType.BROKER,
        }),
      ]),
      isLoading: false,
      isError: false,
      refetch: vi.fn(),
    } as ReturnType<typeof partiesApiModule.useListPartiesQuery>);

    renderPage();
    expect(screen.getByText("Alpha Farm")).toBeInTheDocument();
    expect(screen.getByText("Beta Broker")).toBeInTheDocument();
  });

  it("sends name search to the server", async () => {
    mockUseListPartiesQuery().mockReturnValue({
      data: paginatedResponse([
        makeParty({ id: "p1", name: "Alpha Farm" }),
        makeParty({
          id: "p2",
          name: "Beta Broker",
          partyType: PartyType.BROKER,
        }),
      ]),
      isLoading: false,
      isError: false,
      refetch: vi.fn(),
    } as ReturnType<typeof partiesApiModule.useListPartiesQuery>);

    renderPage();
    const searchInput = screen.getByPlaceholderText("Search parties");
    await userEvent.type(searchInput, "alpha");
    expect(mockUseListPartiesQuery()).toHaveBeenLastCalledWith(
      expect.objectContaining({ search: "alpha", page: 1 }),
    );
  });

  it("shows the loading skeleton while fetching", () => {
    mockUseListPartiesQuery().mockReturnValue({
      data: undefined,
      isLoading: true,
      isError: false,
      refetch: vi.fn(),
    } as ReturnType<typeof partiesApiModule.useListPartiesQuery>);

    renderPage();
    // PageSkeleton renders skeleton rows — the table heading should not appear
    expect(screen.queryByText("Parties")).not.toBeInTheDocument();
  });

  it("shows the error state when the query fails", () => {
    mockUseListPartiesQuery().mockReturnValue({
      data: undefined,
      isLoading: false,
      isError: true,
      refetch: vi.fn(),
    } as ReturnType<typeof partiesApiModule.useListPartiesQuery>);

    renderPage();
    expect(screen.getByText("Parties could not be loaded")).toBeInTheDocument();
  });

  it("hides the department filter for department staff", () => {
    mockUseListPartiesQuery().mockReturnValue({
      data: paginatedResponse([]),
      isLoading: false,
      isError: false,
      refetch: vi.fn(),
    } as ReturnType<typeof partiesApiModule.useListPartiesQuery>);

    renderPage(departmentUser);
    expect(screen.queryByLabelText("Department")).not.toBeInTheDocument();
  });
});
