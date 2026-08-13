import { configureStore } from "@reduxjs/toolkit";
import { Provider } from "react-redux";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import authReducer from "@/features/auth/authSlice";
import type { LoginRequest } from "@/features/auth/types";
import { loggedOutState, ownerUser } from "@/test/auth-fixtures";

const loginMock = vi.hoisted(() =>
  vi.fn<(request: LoginRequest) => Promise<typeof ownerUser>>(),
);
const hookState = vi.hoisted(() => ({ loginError: undefined as unknown }));

vi.mock("@/features/auth/hooks/useAuth", () => ({
  useAuth: () => ({
    user: null,
    isAuthenticated: false,
    role: null,
    departmentId: null,
    login: loginMock,
    logout: vi.fn(),
    isLoggingIn: false,
    loginError: hookState.loginError,
    isLoggingOut: false,
  }),
}));

vi.mock("sonner", () => ({
  toast: { success: vi.fn(), error: vi.fn() },
}));

import { LoginPage } from "@/features/auth/components/LoginPage";

function renderLogin() {
  const store = configureStore({
    reducer: { auth: authReducer },
    preloadedState: { auth: loggedOutState },
  });
  return render(
    <Provider store={store}>
      <MemoryRouter initialEntries={["/login"]}>
        <Routes>
          <Route path="/login" element={<LoginPage />} />
          <Route path="/" element={<p>Dashboard destination</p>} />
        </Routes>
      </MemoryRouter>
    </Provider>,
  );
}

beforeEach(() => {
  loginMock.mockReset();
  hookState.loginError = undefined;
});

describe("LoginPage", () => {
  it("has a logical keyboard focus order", async () => {
    const user = userEvent.setup();
    renderLogin();

    expect(screen.getByLabelText("Email * (required)")).toHaveFocus();
    await user.tab();
    expect(screen.getByLabelText("Password * (required)")).toHaveFocus();
    await user.tab();
    expect(
      screen.getByRole("link", { name: "Forgot password?" }),
    ).toHaveFocus();
    await user.tab();
    expect(screen.getByRole("button", { name: "Sign in" })).toHaveFocus();
  });

  it("renders and validates the backend login fields", async () => {
    const user = userEvent.setup();
    renderLogin();

    expect(
      screen.getByRole("heading", { name: "Sign in" }),
    ).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "Sign in" }));

    expect(await screen.findByText("Email is required")).toBeInTheDocument();
    expect(screen.getByText("Password is required")).toBeInTheDocument();
    expect(loginMock).not.toHaveBeenCalled();
  });

  it("submits valid credentials and navigates to the dashboard", async () => {
    loginMock.mockResolvedValue(ownerUser);
    const user = userEvent.setup();
    renderLogin();

    await user.type(
      screen.getByLabelText("Email * (required)"),
      "owner@example.com",
    );
    await user.type(screen.getByLabelText("Password * (required)"), "secret");
    await user.click(screen.getByRole("button", { name: "Sign in" }));

    expect(loginMock).toHaveBeenCalledWith({
      email: "owner@example.com",
      password: "secret",
    });
    expect(
      await screen.findByText("Dashboard destination"),
    ).toBeInTheDocument();
  });

  it("shows the backend authentication error inline", async () => {
    hookState.loginError = {
      status: 401,
      data: { message: "Invalid email or password." },
    };
    renderLogin();

    expect(
      await screen.findByText("Invalid email or password."),
    ).toBeInTheDocument();
  });
});
