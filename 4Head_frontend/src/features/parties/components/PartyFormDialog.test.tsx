/**
 * PartyFormDialog — validation errors and mutation call tests.
 */
import { configureStore } from "@reduxjs/toolkit";
import { Provider } from "react-redux";
import { render, screen, waitFor, fireEvent } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import authReducer from "@/features/auth/authSlice";
import { apiSlice } from "@/store/apiSlice";
import { authenticatedState, ownerUser } from "@/test/auth-fixtures";
import { PartyType, type Party } from "@/features/parties/types";
import { PartyFormDialog } from "@/features/parties/components/PartyFormDialog";

// ── mock mutations ─────────────────────────────────────────────────────────
const mockCreate = vi.fn();
const mockUpdate = vi.fn();

vi.mock("@/features/parties/partiesApi", () => ({
  useCreatePartyMutation: vi.fn(() => [mockCreate, { isLoading: false }]),
  useUpdatePartyMutation: vi.fn(() => [mockUpdate, { isLoading: false }]),
}));
vi.mock("@/features/users/usersApi", () => ({
  useListPartyUsersQuery: () => ({
    data: {
      data: [
        {
          id: "00000000-0000-4000-8000-000000000099",
          fullName: "New Farm",
          phone: null,
          role: { name: "PARTY" },
        },
        {
          id: "00000000-0000-4000-8000-000000000100",
          fullName: "Shafique",
          email: "shafique@example.com",
          phone: "03001234567",
          role: { name: "INVESTOR" },
        },
      ],
    },
  }),
}));

// sonner toast — silence it
vi.mock("sonner", () => ({ toast: { success: vi.fn(), error: vi.fn() } }));

// ── helpers ────────────────────────────────────────────────────────────────

function buildStore() {
  return configureStore({
    reducer: { auth: authReducer, [apiSlice.reducerPath]: apiSlice.reducer },
    middleware: (gDM) => gDM().concat(apiSlice.middleware),
    preloadedState: { auth: authenticatedState(ownerUser) },
  });
}

function renderDialog(props: {
  open?: boolean;
  party?: Party | null;
  onOpenChange?: (open: boolean) => void;
}) {
  const store = buildStore();
  return render(
    <Provider store={store}>
      <PartyFormDialog
        open={props.open ?? true}
        onOpenChange={props.onOpenChange ?? vi.fn()}
        party={props.party ?? null}
        departmentOptions={[
          { id: "00000000-0000-4000-8000-000000000001", name: "Supply" },
          { id: "00000000-0000-4000-8000-000000000002", name: "Wastage" },
        ]}
      />
    </Provider>,
  );
}

function makeParty(overrides: Partial<Party> = {}): Party {
  return {
    id: "party-1",
    userId: null,
    partyType: PartyType.FARM,
    name: "Existing Farm",
    phone: null,
    address: null,
    linkedDepartmentId: null,
    primaryDepartmentId: "00000000-0000-4000-8000-000000000001",
    departments: [
      { id: "00000000-0000-4000-8000-000000000001", name: "Supply" },
    ],
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

// ── tests ──────────────────────────────────────────────────────────────────

describe("PartyFormDialog", () => {
  beforeEach(() => {
    mockCreate.mockReset();
    mockUpdate.mockReset();
  });

  it("renders the create dialog title when no party is provided", () => {
    renderDialog({});
    expect(screen.getByText("Add party")).toBeInTheDocument();
  });

  it("renders the edit dialog title when a party is provided", () => {
    renderDialog({ party: makeParty() });
    expect(screen.getByText("Edit party")).toBeInTheDocument();
  });

  it("lets an admin search and select an investor user", async () => {
    renderDialog({});
    await userEvent.type(
      screen.getByRole("textbox", { name: /search party users/i }),
      "shafique",
    );
    expect(
      screen.getByRole("option", {
        name: /shafique.*investor/i,
        hidden: true,
      }),
    ).toBeInTheDocument();
    expect(
      screen.queryByRole("option", { name: /new farm/i, hidden: true }),
    ).not.toBeInTheDocument();
  });

  it("shows a validation error when name is empty on submit", async () => {
    renderDialog({});
    // Clear the name field (it starts empty) and submit
    await userEvent.click(
      screen.getByRole("button", { name: /create party/i }),
    );
    await waitFor(() => {
      expect(screen.getByText("Name is required")).toBeInTheDocument();
    });
  });

  it("shows a validation error for an invalid opening balance", async () => {
    renderDialog({});
    await userEvent.type(
      screen.getByRole("textbox", { name: /name/i }),
      "Test Party",
    );
    // Simulate a value with too many decimal places — the schema rejects it.
    // fireEvent.change bypasses the browser's number-input sanitization.
    fireEvent.change(
      screen.getByRole("spinbutton", { name: /opening balance/i }),
      {
        target: { value: "1.234" },
      },
    );
    await userEvent.click(
      screen.getByRole("button", { name: /create party/i }),
    );
    await waitFor(() => {
      expect(screen.getByText("Max 2 decimal places")).toBeInTheDocument();
    });
  });

  it("calls createParty mutation with correct payload on valid submit", async () => {
    mockCreate.mockReturnValue({
      unwrap: () => Promise.resolve({ success: true, data: makeParty() }),
    });

    renderDialog({});
    fireEvent.click(screen.getByRole("combobox", { name: /party user/i }));
    fireEvent.click(screen.getByRole("option", { name: /new farm/i }));
    const name = screen.getByRole("textbox", { name: /^name/i });
    await userEvent.clear(name);
    await userEvent.type(name, "New Farm");
    await userEvent.click(screen.getAllByText("Supply").at(-1)!);
    await userEvent.click(
      screen.getByRole("button", { name: /create party/i }),
    );

    await waitFor(() => {
      expect(mockCreate).toHaveBeenCalledWith(
        expect.objectContaining({
          name: "New Farm",
          userId: "00000000-0000-4000-8000-000000000099",
          partyType: PartyType.CUSTOMER,
          departmentIds: ["00000000-0000-4000-8000-000000000001"],
        }),
      );
    });
  });

  it("calls updateParty mutation with the party id on edit submit", async () => {
    mockUpdate.mockReturnValue({
      unwrap: () => Promise.resolve({ success: true, data: makeParty() }),
    });
    const party = makeParty({ name: "Old Name" });

    renderDialog({ party });
    const nameInput = screen.getByRole("textbox", { name: /name/i });
    await userEvent.clear(nameInput);
    await userEvent.type(nameInput, "New Name");
    await userEvent.click(
      screen.getByRole("button", { name: /save changes/i }),
    );

    await waitFor(() => {
      expect(mockUpdate).toHaveBeenCalledWith(
        expect.objectContaining({
          id: "party-1",
          body: expect.objectContaining({ name: "New Name" }),
        }),
      );
      expect(mockUpdate.mock.calls[0][0].body).not.toHaveProperty(
        "openingBalance",
      );
    });
  });

  it("does not show the opening balance field when editing", () => {
    renderDialog({ party: makeParty() });
    expect(screen.queryByLabelText(/opening balance/i)).not.toBeInTheDocument();
  });
});
