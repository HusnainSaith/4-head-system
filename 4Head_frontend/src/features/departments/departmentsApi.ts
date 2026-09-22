import { apiSlice } from "@/store/apiSlice";
import type { ApiResponse } from "@/types/api";

export interface Department {
  id: string;
  type: "BROKERAGE" | "SUPPLY" | "WASTAGE" | "FRESH_CHICKEN_SHOP";
  name: string;
  isActive: boolean;
}

export const departmentsApi = apiSlice.injectEndpoints({
  endpoints: (builder) => ({
    listDepartments: builder.query<ApiResponse<Department[]>, void>({
      query: () => "/departments",
      providesTags: [{ type: "Department", id: "LIST" }],
    }),
  }),
});

export const { useListDepartmentsQuery } = departmentsApi;
