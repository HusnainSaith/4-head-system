import { MemoryRouter } from "react-router-dom";
import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { TooltipProvider } from "@/components/ui/tooltip";
import { Sidebar } from "@/components/layout/Sidebar";
import { DepartmentCode, Role } from "@/types/enums";

function renderSidebar(
  role: Role,
  departmentCode: DepartmentCode | null,
  collapsed = false,
) {
  const onCollapsedChange = vi.fn();
  const result = render(
    <MemoryRouter>
      <TooltipProvider>
        <Sidebar
          collapsed={collapsed}
          onCollapsedChange={onCollapsedChange}
          role={role}
          departmentCode={departmentCode}
        />
      </TooltipProvider>
    </MemoryRouter>,
  );
  return { ...result, onCollapsedChange };
}

describe("Sidebar", () => {
  it("shows management navigation to owners", () => {
    renderSidebar(Role.OWNER, null);
    expect(screen.getByText("Brokerage")).toBeInTheDocument();
    expect(screen.queryByText("Purchases")).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Brokerage" }));
    expect(screen.getByText("Purchases")).toBeInTheDocument();
    expect(screen.getByText("Sales")).toBeInTheDocument();
    expect(screen.getByText("Stock")).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Supply" }));
    expect(screen.getByText("Internal Transfers")).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Vehicles" }));
    expect(screen.getByText("Fuel Logs")).toBeInTheDocument();
    expect(screen.getByText("Maintenance Logs")).toBeInTheDocument();
    expect(screen.getByText("Users & Roles")).toBeInTheDocument();
  });

  it("shows only the assigned section and dashboard to department staff", () => {
    renderSidebar(Role.DEPARTMENT_STAFF, DepartmentCode.SUPPLY);
    expect(screen.getByText("Dashboard")).toBeInTheDocument();
    expect(screen.getByText("Supply")).toBeInTheDocument();
    expect(screen.queryByText("Brokerage")).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Supply" }));
    expect(screen.getByText("Reports")).toBeInTheDocument();
  });

  it("shows wastage nested navigation to wastage staff", () => {
    renderSidebar(Role.DEPARTMENT_STAFF, DepartmentCode.WASTAGE);
    expect(screen.getByText("Wastage")).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Wastage" }));
    for (const label of ["Purchases", "Sales", "Stock", "Reports"])
      expect(screen.getByText(label)).toBeInTheDocument();
    expect(screen.queryByText("Brokerage")).not.toBeInTheDocument();
  });

  it("shows only Supply nested navigation to Supply staff", () => {
    renderSidebar(Role.DEPARTMENT_STAFF, DepartmentCode.SUPPLY);
    fireEvent.click(screen.getByRole("button", { name: "Supply" }));
    for (const label of [
      "Supply",
      "Purchases",
      "Sales",
      "Internal Transfers",
      "Stock",
      "Reports",
    ])
      expect(screen.getByText(label)).toBeInTheDocument();
    expect(screen.queryByText("Brokerage")).not.toBeInTheDocument();
    expect(screen.queryByText("Wastage")).not.toBeInTheDocument();
  });

  it("renders an accessible icon-only rail and a working expand toggle", () => {
    const { onCollapsedChange } = renderSidebar(Role.OWNER, null, true);
    expect(screen.queryByText("Brokerage")).not.toBeInTheDocument();
    const brokerage = screen.getByRole("button", { name: "Brokerage" });
    expect(brokerage).toHaveAttribute("aria-expanded", "false");
    expect(screen.queryByText("Salary Runs")).not.toBeInTheDocument();
    fireEvent.click(brokerage);
    expect(onCollapsedChange).toHaveBeenCalledWith(false);
    const toggle = screen.getByRole("button", { name: "Expand sidebar" });
    expect(toggle).toHaveAttribute("aria-expanded", "false");
    fireEvent.click(toggle);
    expect(onCollapsedChange).toHaveBeenCalledWith(false);
  });
});
