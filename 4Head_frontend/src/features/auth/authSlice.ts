import { createSlice, type PayloadAction } from "@reduxjs/toolkit";
import type { SessionUser } from "@/features/auth/types";

export interface AuthState {
  user: SessionUser | null;
  isAuthenticated: boolean;
  isCheckingAuth: boolean;
}

const initialState: AuthState = {
  user: null,
  isAuthenticated: false,
  isCheckingAuth: true,
};

const authSlice = createSlice({
  name: "auth",
  initialState,
  reducers: {
    credentialsSet(state, action: PayloadAction<SessionUser>) {
      state.user = action.payload;
      state.isAuthenticated = true;
      state.isCheckingAuth = false;
    },
    sessionCheckStarted(state) {
      state.isCheckingAuth = true;
    },
    sessionRestored(state, action: PayloadAction<SessionUser>) {
      state.user = action.payload;
      state.isAuthenticated = true;
      state.isCheckingAuth = false;
    },
    loggedOut(state) {
      state.user = null;
      state.isAuthenticated = false;
      state.isCheckingAuth = false;
    },
  },
});

export const {
  credentialsSet,
  sessionCheckStarted,
  sessionRestored,
  loggedOut,
} = authSlice.actions;

type AuthRootState = { auth: AuthState };

export const selectCurrentUser = (state: AuthRootState) => state.auth.user;
export const selectIsAuthenticated = (state: AuthRootState) =>
  state.auth.isAuthenticated;
export const selectIsCheckingAuth = (state: AuthRootState) =>
  state.auth.isCheckingAuth;
export const selectUserRole = (state: AuthRootState) =>
  state.auth.user?.role?.name ?? null;
export const selectUserDepartmentId = (state: AuthRootState) =>
  state.auth.user?.departmentId ?? null;
export const selectUserDepartmentCode = (state: AuthRootState) =>
  state.auth.user?.departmentCode ?? null;

export default authSlice.reducer;
