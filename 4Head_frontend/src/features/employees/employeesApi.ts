import { apiSlice } from "@/store/apiSlice";
import type { ApiResponse } from "@/types/api";
import type {
  CreateAdvanceRequest,
  CreateBonusRequest,
  CreateEmployeeRequest,
  Employee,
  EmployeeAdvance,
  EmployeeBonus,
  PaySalaryRunRequest,
  RunPayrollRequest,
  SalaryRun,
  SalaryAccount,
  SalaryWithdrawal,
  CreateSalaryWithdrawalRequest,
} from "./types";
import type { PaymentAccountSelection } from "@/features/accounts/types";

export const employeesApi = apiSlice.injectEndpoints({
  endpoints: (builder) => ({
    listEmployees: builder.query<
      ApiResponse<Employee[]>,
      { departmentId?: string } | void
    >({
      query: (p) => ({ url: "/employees", params: p || undefined }),
      providesTags: (r) => [
        { type: "Employee", id: "LIST" },
        ...(r?.data.map(({ id }) => ({ type: "Employee" as const, id })) ?? []),
      ],
    }),
    getEmployee: builder.query<ApiResponse<Employee>, string>({
      query: (id) => `/employees/${id}`,
      providesTags: (_r, _e, id) => [{ type: "Employee", id }],
    }),
    createEmployee: builder.mutation<
      ApiResponse<Employee>,
      CreateEmployeeRequest
    >({
      query: (body) => ({ url: "/employees", method: "POST", body }),
      invalidatesTags: [{ type: "Employee", id: "LIST" }],
    }),
    updateEmployee: builder.mutation<
      ApiResponse<Employee>,
      { id: string; body: Partial<CreateEmployeeRequest> }
    >({
      query: ({ id, body }) => ({
        url: `/employees/${id}`,
        method: "PATCH",
        body,
      }),
      invalidatesTags: (_r, _e, { id }) => [
        { type: "Employee", id },
        { type: "Employee", id: "LIST" },
      ],
    }),
    deactivateEmployee: builder.mutation<ApiResponse<void>, string>({
      query: (id) => ({ url: `/employees/${id}`, method: "DELETE" }),
      invalidatesTags: (_r, _e, id) => [
        { type: "Employee", id },
        { type: "Employee", id: "LIST" },
      ],
    }),
    activateEmployee: builder.mutation<ApiResponse<Employee>, string>({
      query: (id) => ({ url: `/employees/${id}/activate`, method: "PATCH" }),
      invalidatesTags: (_r, _e, id) => [
        { type: "Employee", id },
        { type: "Employee", id: "LIST" },
      ],
    }),
    listAdvances: builder.query<ApiResponse<EmployeeAdvance[]>, string>({
      query: (id) => `/employees/${id}/advances`,
      providesTags: (_r, _e, id) => [{ type: "EmployeeAdvance", id }],
    }),
    createAdvance: builder.mutation<
      ApiResponse<EmployeeAdvance>,
      { employeeId: string; body: CreateAdvanceRequest }
    >({
      query: ({ employeeId, body }) => ({
        url: `/employees/${employeeId}/advances`,
        method: "POST",
        body,
      }),
      invalidatesTags: (_r, _e, { employeeId }) => [
        { type: "EmployeeAdvance", id: employeeId },
      ],
    }),
    confirmAdvance: builder.mutation<
      ApiResponse<EmployeeAdvance>,
      { employeeId: string; advanceId: string; paymentMethod: "cash" | "bank" } & PaymentAccountSelection
    >({
      query: ({ employeeId, advanceId, ...body }) => ({
        url: `/employees/${employeeId}/advances/${advanceId}/confirm`,
        method: "POST",
        body,
      }),
      invalidatesTags: (_r, _e, { employeeId }) => [
        { type: "EmployeeAdvance", id: employeeId },
      ],
    }),
    listBonuses: builder.query<ApiResponse<EmployeeBonus[]>, string>({
      query: (id) => `/employees/${id}/bonuses`,
      providesTags: (_r, _e, id) => [{ type: "EmployeeBonus", id }],
    }),
    createBonus: builder.mutation<
      ApiResponse<EmployeeBonus>,
      { employeeId: string; body: CreateBonusRequest }
    >({
      query: ({ employeeId, body }) => ({
        url: `/employees/${employeeId}/bonuses`,
        method: "POST",
        body,
      }),
      invalidatesTags: (_r, _e, { employeeId }) => [
        { type: "EmployeeBonus", id: employeeId },
      ],
    }),
    runPayroll: builder.mutation<ApiResponse<SalaryRun>, RunPayrollRequest>({
      query: (body) => ({ url: "/payroll/runs", method: "POST", body }),
      invalidatesTags: (_r, _e, b) => [
        { type: "SalaryRun", id: "LIST" },
        { type: "EmployeeAdvance", id: b.employeeId },
        { type: "SalaryAccount", id: b.employeeId },
        { type: "ConsolidatedReport", id: "PROFIT_LOSS" },
      ],
    }),
    listSalaryRuns: builder.query<
      ApiResponse<SalaryRun[]>,
      {
        departmentId?: string;
        periodMonth?: number;
        periodYear?: number;
      } | void
    >({
      query: (params) => ({
        url: "/payroll/runs",
        params: params || undefined,
      }),
      providesTags: (r) => [
        { type: "SalaryRun", id: "LIST" },
        ...(r?.data.map(({ id }) => ({ type: "SalaryRun" as const, id })) ??
          []),
      ],
    }),
    getSalaryRun: builder.query<ApiResponse<SalaryRun>, string>({
      query: (id) => `/payroll/runs/${id}`,
      providesTags: (_r, _e, id) => [{ type: "SalaryRun", id }],
    }),
    markSalaryRunPaid: builder.mutation<
      ApiResponse<SalaryRun>,
      { id: string; body: PaySalaryRunRequest }
    >({
      query: ({ id, body }) => ({
        url: `/payroll/runs/${id}/pay`,
        method: "POST",
        body,
      }),
      invalidatesTags: (_r, _e, { id }) => [
        { type: "SalaryRun", id },
        { type: "SalaryRun", id: "LIST" },
        { type: "ConsolidatedReport", id: "PROFIT_LOSS" },
        { type: "ConsolidatedReport", id: "PARTNER_SHARE" },
        { type: "ConsolidatedReport", id: "PAYROLL" },
        { type: "BrokerageReport", id: "PROFIT_LOSS" },
        { type: "SupplyReport", id: "PROFIT_LOSS" },
        { type: "WastageReport", id: "PROFIT_LOSS" },
        { type: "ShopReport", id: "PROFIT_LOSS" },
      ],
    }),
    getSalaryAccount: builder.query<ApiResponse<SalaryAccount>, string>({
      query: (employeeId) => `/employees/${employeeId}/salary-account`,
      providesTags: (_r, _e, employeeId) => [
        { type: "SalaryAccount", id: employeeId },
      ],
    }),
    withdrawSalary: builder.mutation<
      ApiResponse<SalaryWithdrawal>,
      { employeeId: string; body: CreateSalaryWithdrawalRequest }
    >({
      query: ({ employeeId, body }) => ({
        url: `/employees/${employeeId}/salary-account/withdrawals`,
        method: "POST",
        body,
      }),
      invalidatesTags: (_r, _e, { employeeId }) => [
        { type: "SalaryAccount", id: employeeId },
        { type: "SalaryRun", id: "LIST" },
      ],
    }),
  }),
});
export const {
  useListEmployeesQuery,
  useGetEmployeeQuery,
  useCreateEmployeeMutation,
  useUpdateEmployeeMutation,
  useDeactivateEmployeeMutation,
  useActivateEmployeeMutation,
  useListAdvancesQuery,
  useCreateAdvanceMutation,
  useConfirmAdvanceMutation,
  useListBonusesQuery,
  useCreateBonusMutation,
  useRunPayrollMutation,
  useListSalaryRunsQuery,
  useGetSalaryRunQuery,
  useMarkSalaryRunPaidMutation,
  useGetSalaryAccountQuery,
  useWithdrawSalaryMutation,
} = employeesApi;
