import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { Role } from "@/types/enums";
import { VehiclesListPage } from "./VehiclesListPage";
import { VehicleFuelLogsPage } from "./VehicleFuelLogsPage";
import { VehicleMaintenanceLogsPage } from "./VehicleMaintenanceLogsPage";
const createVehicle = vi.fn(),
  createFuel = vi.fn(),
  createMaintenance = vi.fn();
vi.mock("react-redux", () => ({
  useSelector: (selector: (s: unknown) => unknown) =>
    selector({
      auth: {
        user: {
          role: { name: Role.DEPARTMENT_STAFF },
          departmentId: "00000000-0000-4000-8000-000000000001",
        },
      },
    }),
}));
vi.mock("sonner", () => ({ toast: { success: vi.fn(), error: vi.fn() } }));
vi.mock("@/features/users/usersApi", () => ({
  useListDriversQuery: () => ({
    data: {
      data: [
        {
          id: "00000000-0000-4000-8000-000000000010",
          fullName: "Ali",
          role: { name: "DRIVER" },
        },
      ],
    },
    isError: false,
  }),
}));
vi.mock("../vehiclesApi", () => ({
  useListVehiclesQuery: () => ({
    data: {
      data: {
        items: [
          {
            id: "v1",
            registrationNumber: "ABC-123",
            vehicleType: "truck",
            driverName: "Ali",
            departmentId: "d1",
            department: { id: "d1", name: "Supply", type: "SUPPLY" },
            isActive: true,
          },
        ],
        pagination: {
          page: 1,
          limit: 100,
          total: 1,
          totalPages: 1,
          hasNextPage: false,
          hasPreviousPage: false,
        },
      },
    },
    isLoading: false,
    isError: false,
  }),
  useListDepartmentsQuery: () => ({
    data: { data: [{ id: "d1", name: "Supply", type: "SUPPLY" }] },
    isLoading: false,
  }),
  useCreateVehicleMutation: () => [createVehicle, { isLoading: false }],
  useDeleteVehicleMutation: () => [vi.fn(), { isLoading: false }],
  useUpdateVehicleMutation: () => [vi.fn(), { isLoading: false }],
  useGetVehicleQuery: () => ({
    data: {
      data: { id: "v1", registrationNumber: "ABC-123", vehicleType: "truck" },
    },
    isLoading: false,
  }),
  useListFuelLogsQuery: () => ({
    data: {
      data: [
        {
          id: "f1",
          vehicleId: "v1",
          fuelDate: "2026-07-01",
          liters: "10",
          ratePerLiter: "200",
          totalAmount: "2000",
          paymentMethod: "cash",
        },
        {
          id: "f2",
          vehicleId: "v1",
          fuelDate: "2026-07-02",
          liters: "5",
          ratePerLiter: "200",
          totalAmount: "1000",
          paymentMethod: "cash",
        },
      ],
    },
    isLoading: false,
    isError: false,
  }),
  useCreateFuelLogMutation: () => [createFuel, { isLoading: false }],
  useUpdateFuelLogMutation: () => [vi.fn(), { isLoading: false }],
  useDeleteFuelLogMutation: () => [vi.fn(), { isLoading: false }],
  useListMaintenanceLogsQuery: () => ({
    data: {
      data: [
        {
          id: "m1",
          vehicleId: "v1",
          maintenanceDate: "2026-07-01",
          maintenanceType: "Oil",
          cost: "500",
          paymentMethod: "cash",
        },
        {
          id: "m2",
          vehicleId: "v1",
          maintenanceDate: "2026-07-02",
          maintenanceType: "Tyre",
          cost: "1500",
          paymentMethod: "bank",
        },
      ],
    },
    isLoading: false,
    isError: false,
  }),
  useCreateMaintenanceLogMutation: () => [
    createMaintenance,
    { isLoading: false },
  ],
  useUpdateMaintenanceLogMutation: () => [vi.fn(), { isLoading: false }],
  useDeleteMaintenanceLogMutation: () => [vi.fn(), { isLoading: false }],
}));
const routed = (path: string, element: React.ReactNode) =>
  render(
    <MemoryRouter initialEntries={[path]}>
      <Routes>
        <Route path="/vehicles/:id/fuel-logs" element={element} />
        <Route path="/vehicles/:id/maintenance-logs" element={element} />
      </Routes>
    </MemoryRouter>,
  );
describe("vehicle pages", () => {
  beforeEach(() => {
    createVehicle.mockReset();
    createFuel.mockReset();
    createMaintenance.mockReset();
  });
  it("renders vehicles", () => {
    render(
      <MemoryRouter>
        <VehiclesListPage />
      </MemoryRouter>,
    );
    expect(screen.getByText("ABC-123")).toBeInTheDocument();
  });
  it("keeps list actions keyboard reachable in logical order", async () => {
    const user = userEvent.setup();
    render(
      <MemoryRouter>
        <VehiclesListPage />
      </MemoryRouter>,
    );
    await user.tab();
    expect(
      screen.getByRole("button", { name: /register vehicle/i }),
    ).toHaveFocus();
    await user.tab();
    expect(screen.getByRole("row", { name: /ABC-123/i })).toHaveFocus();
    await user.tab();
    expect(screen.getByRole("button", { name: "Read" })).toHaveFocus();
  });
  it("creates a vehicle", async () => {
    createVehicle.mockReturnValue({ unwrap: () => Promise.resolve({}) });
    render(
      <MemoryRouter>
        <VehiclesListPage />
      </MemoryRouter>,
    );
    fireEvent.click(screen.getByRole("button", { name: /register vehicle/i }));
    fireEvent.change(screen.getByLabelText(/registration number/i), {
      target: { value: "XYZ-9" },
    });
    fireEvent.click(screen.getByRole("combobox", { name: /driver/i }));
    fireEvent.click(screen.getByRole("option", { name: "Ali" }));
    fireEvent.submit(
      screen.getByRole("button", { name: "Register" }).closest("form")!,
    );
    await waitFor(() => expect(createVehicle).toHaveBeenCalled());
  });
  it("shows fuel running total and creates", async () => {
    createFuel.mockReturnValue({ unwrap: () => Promise.resolve({}) });
    routed("/vehicles/v1/fuel-logs", <VehicleFuelLogsPage />);
    expect(screen.getByText(/3,000/)).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: /add fuel log/i }));
    fireEvent.change(screen.getByLabelText("Liters"), {
      target: { value: "10" },
    });
    fireEvent.change(screen.getByLabelText(/rate per liter/i), {
      target: { value: "250" },
    });
    fireEvent.submit(
      screen.getByRole("button", { name: "Save" }).closest("form")!,
    );
    await waitFor(() => expect(createFuel).toHaveBeenCalled());
  });
  it("shows maintenance running total and creates", async () => {
    createMaintenance.mockReturnValue({ unwrap: () => Promise.resolve({}) });
    routed("/vehicles/v1/maintenance-logs", <VehicleMaintenanceLogsPage />);
    expect(screen.getByText(/2,000/)).toBeInTheDocument();
    fireEvent.click(
      screen.getByRole("button", { name: /add maintenance log/i }),
    );
    fireEvent.change(screen.getByLabelText(/maintenance type/i), {
      target: { value: "Service" },
    });
    fireEvent.change(screen.getByLabelText("Cost"), {
      target: { value: "750" },
    });
    fireEvent.submit(
      screen.getByRole("button", { name: "Save" }).closest("form")!,
    );
    await waitFor(() => expect(createMaintenance).toHaveBeenCalled());
  });
});
