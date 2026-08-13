import { render, screen } from "@testing-library/react";
import { useSelector } from "react-redux";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { VehicleEntityRoute } from "./ScopedEntityRoute";

const queryState = vi.hoisted(() => ({ departmentId: "supply-department" }));

vi.mock("react-redux", () => ({ useSelector: vi.fn() }));
vi.mock("@/features/vehicles/vehiclesApi", () => ({
  useGetVehicleQuery: () => ({
    data: { data: { departmentId: queryState.departmentId } },
    isLoading: false,
    isError: false,
    refetch: vi.fn(),
  }),
}));
vi.mock("@/features/employees/employeesApi", () => ({
  useGetEmployeeQuery: () => ({ isLoading: false, isError: true, refetch: vi.fn() }),
}));
vi.mock("@/features/parties/partiesApi", () => ({
  useGetPartyQuery: () => ({ isLoading: false, isError: true, refetch: vi.fn() }),
}));

function renderGuard(departmentId: string) {
  vi.mocked(useSelector).mockImplementation((selector) =>
    selector({
      auth: {
        user: {
          role: { name: "department_staff" },
          departmentId,
        },
      },
    } as never),
  );
  return render(
    <MemoryRouter initialEntries={["/vehicles/v1/fuel-logs"]}>
      <Routes>
        <Route
          path="/vehicles/:id/fuel-logs"
          element={
            <VehicleEntityRoute>
              <div>Protected vehicle history</div>
            </VehicleEntityRoute>
          }
        />
      </Routes>
    </MemoryRouter>,
  );
}

describe("ScopedEntityRoute", () => {
  it("blocks department staff from another department", () => {
    renderGuard("brokerage-department");
    expect(screen.getByText("Not authorized")).toBeInTheDocument();
    expect(screen.queryByText("Protected vehicle history")).not.toBeInTheDocument();
  });

  it("renders the child for staff in the owning department", () => {
    renderGuard("supply-department");
    expect(screen.getByText("Protected vehicle history")).toBeInTheDocument();
  });
});
