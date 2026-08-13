import { fireEvent, render, screen } from "@testing-library/react";
import { DepartmentCode } from "@/types/enums";
import { DepartmentVehicleSelect } from "./DepartmentVehicleSelect";

const listVehicles = vi.fn();

vi.mock("../vehiclesApi", () => ({
  useListDepartmentsQuery: () => ({
    data: {
      data: [
        { id: "brokerage-id", name: "Brokerage", type: "BROKERAGE" },
      ],
    },
    isLoading: false,
  }),
  useListVehiclesQuery: (params: unknown, options: unknown) => {
    listVehicles(params, options);
    return {
      data: {
        data: {
          items: [
            {
              id: "vehicle-1",
              registrationNumber: "BR-001",
              departmentId: "brokerage-id",
              isActive: true,
            },
          ],
        },
      },
      isLoading: false,
    };
  },
}));

describe("DepartmentVehicleSelect", () => {
  beforeAll(() => {
    Element.prototype.scrollIntoView = vi.fn();
    Element.prototype.hasPointerCapture = vi.fn();
    Element.prototype.setPointerCapture = vi.fn();
    Element.prototype.releasePointerCapture = vi.fn();
  });

  it("matches uppercase backend department types and selects its vehicle", async () => {
    const onChange = vi.fn();
    render(
      <DepartmentVehicleSelect
        departmentCode={DepartmentCode.BROKERAGE}
        value=""
        onChange={onChange}
      />,
    );

    expect(listVehicles).toHaveBeenCalledWith(
      { departmentId: "brokerage-id", page: 1, limit: 100 },
      { skip: false },
    );
    fireEvent.click(screen.getByRole("combobox"));
    fireEvent.click(await screen.findByRole("option", { name: "BR-001" }));
    expect(onChange).toHaveBeenCalledWith("vehicle-1");
  });
});
