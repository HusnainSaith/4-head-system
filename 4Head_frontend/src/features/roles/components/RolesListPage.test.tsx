import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { RolesListPage } from "./RolesListPage";

const createRole = vi.fn();
const updateRole = vi.fn();
const deleteRole = vi.fn();

vi.mock("../rolesApi", () => ({
  useListRolesQuery: () => ({
    data: {
      data: [
        { id: "role-owner", name: "owner", description: "Core role" },
        { id: "role-driver", name: "DRIVER", description: "Drivers" },
      ],
    },
    isLoading: false,
    isError: false,
  }),
  useCreateRoleMutation: () => [createRole, { isLoading: false }],
  useUpdateRoleMutation: () => [updateRole, { isLoading: false }],
  useDeleteRoleMutation: () => [deleteRole, { isLoading: false }],
}));

vi.mock("sonner", () => ({
  toast: { success: vi.fn(), error: vi.fn() },
}));

describe("RolesListPage", () => {
  beforeEach(() => {
    createRole.mockReset();
    updateRole.mockReset();
    deleteRole.mockReset();
  });

  it("renders roles and protects core roles from deletion", () => {
    render(<RolesListPage />);
    expect(screen.getByText("owner")).toBeInTheDocument();
    expect(screen.getByText("DRIVER")).toBeInTheDocument();
    expect(screen.getAllByRole("button", { name: /delete/i })).toHaveLength(1);
  });

  it("creates a custom role", async () => {
    createRole.mockReturnValue({ unwrap: () => Promise.resolve({}) });
    render(<RolesListPage />);
    fireEvent.click(screen.getByRole("button", { name: /add role/i }));
    fireEvent.change(screen.getByLabelText("Name"), {
      target: { value: "DISPATCHER" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Save" }));
    await waitFor(() =>
      expect(createRole).toHaveBeenCalledWith(
        expect.objectContaining({ name: "DISPATCHER" }),
      ),
    );
  });
});
