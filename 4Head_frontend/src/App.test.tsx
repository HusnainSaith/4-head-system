import { configureStore } from "@reduxjs/toolkit";
import { Provider } from "react-redux";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import authReducer from "@/features/auth/authSlice";
import { ProtectedRoute } from "@/routes/ProtectedRoute";
import { RoleGuard } from "@/routes/RoleGuard";
import {
  authenticatedState,
  departmentUser,
  loggedOutState,
} from "@/test/auth-fixtures";
import { Role } from "@/types/enums";

function renderWithAuth(
  auth: ReturnType<typeof authenticatedState> | typeof loggedOutState,
  route: string,
  element: React.ReactNode,
) {
  const store = configureStore({
    reducer: { auth: authReducer },
    preloadedState: { auth },
  });
  return render(
    <Provider store={store}>
      <MemoryRouter initialEntries={[route]}>
        <Routes>
          <Route path="/login" element={<p>Login destination</p>} />
          <Route path={route} element={element} />
        </Routes>
      </MemoryRouter>
    </Provider>,
  );
}

describe("route guards", () => {
  it("redirects an unauthenticated protected route to login", () => {
    renderWithAuth(
      loggedOutState,
      "/private",
      <ProtectedRoute>
        <p>Private content</p>
      </ProtectedRoute>,
    );
    expect(screen.getByText("Login destination")).toBeInTheDocument();
    expect(screen.queryByText("Private content")).not.toBeInTheDocument();
  });

  it("renders the shared not-authorized state for a disallowed role", () => {
    renderWithAuth(
      authenticatedState(departmentUser),
      "/owner-only",
      <RoleGuard allowedRoles={[Role.OWNER]}>
        <p>Owner content</p>
      </RoleGuard>,
    );
    expect(screen.getByText("Not authorized")).toBeInTheDocument();
  });
});
