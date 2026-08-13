import { MemoryRouter, Route, Routes } from "react-router-dom";
import { fireEvent, render, screen } from "@testing-library/react";
import { beforeEach } from "vitest";
import { TooltipProvider } from "@/components/ui/tooltip";

const preferences = vi.hoisted(() => ({
  get: vi.fn(() => true),
  set: vi.fn(),
}));

vi.mock("@/lib/ui-preferences", () => ({
  getSidebarCollapsed: preferences.get,
  setSidebarCollapsed: preferences.set,
}));
vi.mock("@/features/auth/hooks/useAuth", () => ({
  useAuth: () => ({
    user: {
      id: "owner-1",
      fullName: "Test Owner",
      email: "owner@example.com",
      phone: null,
      departmentCode: null,
    },
    role: "owner",
    logout: vi.fn(),
    isLoggingOut: false,
  }),
}));

import { AppShell } from "@/components/layout/AppShell";

beforeEach(() => {
  vi.clearAllMocks();
  preferences.get.mockReturnValue(true);
});

describe("AppShell sidebar preference", () => {
  it("shows shared back and refresh controls on every routed page", () => {
    render(
      <MemoryRouter>
        <TooltipProvider>
          <Routes>
            <Route element={<AppShell />}>
              <Route index element={<p>Page content</p>} />
            </Route>
          </Routes>
        </TooltipProvider>
      </MemoryRouter>,
    );
    expect(screen.getByRole("button", { name: "Go back" })).toBeVisible();
    expect(screen.getByRole("button", { name: "Refresh page" })).toBeVisible();
  });

  it("uses router history when back is pressed", () => {
    render(
      <MemoryRouter initialEntries={["/previous", "/current"]} initialIndex={1}>
        <TooltipProvider>
          <Routes>
            <Route element={<AppShell />}>
              <Route path="previous" element={<p>Previous page</p>} />
              <Route path="current" element={<p>Current page</p>} />
            </Route>
          </Routes>
        </TooltipProvider>
      </MemoryRouter>,
    );
    fireEvent.click(screen.getByRole("button", { name: "Go back" }));
    expect(screen.getByText("Previous page")).toBeInTheDocument();
  });

  it("restores collapsed state on mount and persists the next toggle", () => {
    render(
      <MemoryRouter>
        <TooltipProvider>
          <Routes>
            <Route element={<AppShell />}>
              <Route index element={<p>Page content</p>} />
            </Route>
          </Routes>
        </TooltipProvider>
      </MemoryRouter>,
    );

    expect(preferences.get).toHaveBeenCalledOnce();
    const toggle = screen.getByRole("button", { name: "Expand sidebar" });
    expect(toggle).toHaveAttribute("aria-expanded", "false");
    fireEvent.click(toggle);
    expect(preferences.set).toHaveBeenCalledWith(false);
    expect(
      screen.getByRole("button", { name: "Collapse sidebar" }),
    ).toHaveAttribute("aria-expanded", "true");
  });

  it("visibly changes from expanded navigation to the icon-only rail", () => {
    preferences.get.mockReturnValue(false);
    render(
      <MemoryRouter>
        <TooltipProvider>
          <Routes>
            <Route element={<AppShell />}>
              <Route index element={<p>Page content</p>} />
            </Route>
          </Routes>
        </TooltipProvider>
      </MemoryRouter>,
    );

    expect(screen.getByText("Brokerage")).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Collapse sidebar" }));
    expect(screen.queryByText("Brokerage")).not.toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: "Brokerage" }),
    ).toBeInTheDocument();
    expect(preferences.set).toHaveBeenCalledWith(true);
  });
});
