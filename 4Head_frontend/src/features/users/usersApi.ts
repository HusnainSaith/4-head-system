import { apiSlice } from "@/store/apiSlice";
import type { ApiResponse } from "@/types/api";
import type {
  CreateUserRequest,
  UpdateUserRequest,
  User,
  UserRole,
} from "./types";

export const usersApi = apiSlice.injectEndpoints({
  endpoints: (builder) => ({
    listUsers: builder.query<
      ApiResponse<User[]>,
      { search?: string; roleId?: string; departmentId?: string } | void
    >({
      query: (params) => ({ url: "/users", params: params ?? undefined }),
      providesTags: (result) => [
        { type: "User", id: "LIST" },
        ...(result?.data.map(({ id }) => ({ type: "User" as const, id })) ??
          []),
      ],
    }),
    listUserRoles: builder.query<ApiResponse<UserRole[]>, void>({
      query: () => "/users/roles",
      providesTags: [{ type: "User", id: "ROLES" }],
    }),
    listDrivers: builder.query<
      ApiResponse<User[]>,
      { departmentId?: string } | void
    >({
      query: (params) => ({
        url: "/users/drivers",
        params: params ?? undefined,
      }),
      providesTags: [{ type: "User", id: "DRIVERS" }],
    }),
    listEmployeeUsers: builder.query<
      ApiResponse<User[]>,
      { departmentId?: string } | void
    >({
      query: (params) => ({
        url: "/users/employees",
        params: params ?? undefined,
      }),
      providesTags: [{ type: "User", id: "EMPLOYEE_USERS" }],
    }),
    listPartyUsers: builder.query<ApiResponse<User[]>, void>({
      query: () => "/users/party-users",
      providesTags: [{ type: "User", id: "PARTY_USERS" }],
    }),
    createUser: builder.mutation<ApiResponse<User>, CreateUserRequest>({
      query: (body) => ({ url: "/users", method: "POST", body }),
      invalidatesTags: [
        { type: "User", id: "LIST" },
        { type: "User", id: "PARTY_USERS" },
      ],
    }),
    updateUser: builder.mutation<
      ApiResponse<User>,
      { id: string; body: UpdateUserRequest }
    >({
      query: ({ id, body }) => ({ url: `/users/${id}`, method: "PATCH", body }),
      invalidatesTags: (_result, _error, { id }) => [
        { type: "User", id },
        { type: "User", id: "LIST" },
        { type: "User", id: "PARTY_USERS" },
      ],
    }),
    deactivateUser: builder.mutation<ApiResponse<null>, string>({
      query: (id) => ({ url: `/users/${id}`, method: "DELETE" }),
      invalidatesTags: (_result, _error, id) => [
        { type: "User", id },
        { type: "User", id: "LIST" },
        { type: "User", id: "PARTY_USERS" },
      ],
    }),
    activateUser: builder.mutation<ApiResponse<User>, string>({
      query: (id) => ({ url: `/users/${id}/activate`, method: "PATCH" }),
      invalidatesTags: (_result, _error, id) => [
        { type: "User", id },
        { type: "User", id: "LIST" },
        { type: "User", id: "PARTY_USERS" },
      ],
    }),
  }),
});

export const {
  useListUsersQuery,
  useListUserRolesQuery,
  useListDriversQuery,
  useListEmployeeUsersQuery,
  useListPartyUsersQuery,
  useCreateUserMutation,
  useUpdateUserMutation,
  useDeactivateUserMutation,
  useActivateUserMutation,
} = usersApi;
