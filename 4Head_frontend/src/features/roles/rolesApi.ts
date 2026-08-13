import { apiSlice } from "@/store/apiSlice";
import type { ApiResponse } from "@/types/api";
import type { ManagedRole, SaveRoleRequest } from "./types";

export const rolesApi = apiSlice.injectEndpoints({
  endpoints: (builder) => ({
    listRoles: builder.query<ApiResponse<ManagedRole[]>, void>({
      query: () => "/roles",
      providesTags: (result) => [
        { type: "Role", id: "LIST" },
        ...(result?.data.map(({ id }) => ({ type: "Role" as const, id })) ??
          []),
      ],
    }),
    createRole: builder.mutation<ApiResponse<ManagedRole>, SaveRoleRequest>({
      query: (body) => ({ url: "/roles", method: "POST", body }),
      invalidatesTags: [
        { type: "Role", id: "LIST" },
        { type: "User", id: "ROLES" },
      ],
    }),
    updateRole: builder.mutation<
      ApiResponse<ManagedRole>,
      { id: string; body: SaveRoleRequest }
    >({
      query: ({ id, body }) => ({ url: `/roles/${id}`, method: "PATCH", body }),
      invalidatesTags: (_r, _e, { id }) => [
        { type: "Role", id },
        { type: "Role", id: "LIST" },
        { type: "User", id: "ROLES" },
      ],
    }),
    deleteRole: builder.mutation<ApiResponse<null>, string>({
      query: (id) => ({ url: `/roles/${id}`, method: "DELETE" }),
      invalidatesTags: (_r, _e, id) => [
        { type: "Role", id },
        { type: "Role", id: "LIST" },
        { type: "User", id: "ROLES" },
      ],
    }),
  }),
});

export const {
  useListRolesQuery,
  useCreateRoleMutation,
  useUpdateRoleMutation,
  useDeleteRoleMutation,
} = rolesApi;
