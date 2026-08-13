import { useCallback } from "react";
import { useDispatch, useSelector } from "react-redux";
import { useLoginMutation, useLogoutMutation } from "@/features/auth/authApi";
import {
  loggedOut,
  selectCurrentUser,
  selectIsAuthenticated,
  selectUserDepartmentId,
  selectUserRole,
} from "@/features/auth/authSlice";
import type { LoginRequest } from "@/features/auth/types";
import { clearAuthCookies } from "@/lib/auth-cookies";
import type { AppDispatch } from "@/store/store";

export function useAuth() {
  const dispatch = useDispatch<AppDispatch>();
  const user = useSelector(selectCurrentUser);
  const isAuthenticated = useSelector(selectIsAuthenticated);
  const role = useSelector(selectUserRole);
  const departmentId = useSelector(selectUserDepartmentId);
  const [loginMutation, loginState] = useLoginMutation();
  const [logoutMutation, logoutState] = useLogoutMutation();

  const login = useCallback(
    async (request: LoginRequest) => {
      const response = await loginMutation(request).unwrap();
      return response.data.user;
    },
    [loginMutation],
  );

  const logout = useCallback(async () => {
    try {
      await logoutMutation({}).unwrap();
    } catch {
      // Local logout must complete even if backend revocation is unavailable.
    } finally {
      clearAuthCookies();
      dispatch(loggedOut());
    }
  }, [dispatch, logoutMutation]);

  return {
    user,
    isAuthenticated,
    role,
    departmentId,
    login,
    logout,
    isLoggingIn: loginState.isLoading,
    loginError: loginState.error,
    isLoggingOut: logoutState.isLoading,
  };
}
