import { credentialsSet } from "@/features/auth/authSlice";
import type {
  LoginRequest,
  LoginResponse,
  LogoutRequest,
  LogoutResponse,
  RefreshRequest,
  RefreshResponse,
  SessionUser,
  ForgotPasswordRequest,
  ResetPasswordRequest,
  AuthMessageResponse,
} from "@/features/auth/types";
import { setAuthProfile } from "@/lib/auth-cookies";
import { apiSlice } from "@/store/apiSlice";
import { DepartmentCode } from "@/types/enums";

function getDepartmentCode(
  user: LoginResponse["data"]["user"],
): DepartmentCode | null {
  const value = (
    user as LoginResponse["data"]["user"] & {
      department?: { type?: string } | null;
    }
  ).department?.type;
  return value &&
    Object.values(DepartmentCode).includes(value as DepartmentCode)
    ? (value as DepartmentCode)
    : null;
}

export const authApi = apiSlice.injectEndpoints({
  endpoints: (builder) => ({
    login: builder.mutation<LoginResponse, LoginRequest>({
      query: (body) => ({ url: "/auth/login", method: "POST", body }),
      async onQueryStarted(_request, { dispatch, queryFulfilled }) {
        const { data: response } = await queryFulfilled;
        const { user } = response.data;
        const sessionUser: SessionUser = {
          ...user,
          departmentCode: getDepartmentCode(user),
        };
        setAuthProfile(sessionUser);
        dispatch(credentialsSet(sessionUser));
      },
    }),
    refresh: builder.mutation<RefreshResponse, RefreshRequest>({
      query: (body) => ({ url: "/auth/refresh", method: "POST", body }),
    }),
    logout: builder.mutation<LogoutResponse, LogoutRequest>({
      query: (body) => ({ url: "/auth/logout", method: "POST", body }),
    }),
    forgotPassword: builder.mutation<
      AuthMessageResponse,
      ForgotPasswordRequest
    >({
      query: (body) => ({ url: "/auth/password-forgot", method: "POST", body }),
    }),
    resetPassword: builder.mutation<AuthMessageResponse, ResetPasswordRequest>({
      query: (body) => ({ url: "/auth/reset-password", method: "POST", body }),
    }),
  }),
});

export const {
  useLoginMutation,
  useRefreshMutation,
  useLogoutMutation,
  useForgotPasswordMutation,
  useResetPasswordMutation,
} = authApi;
