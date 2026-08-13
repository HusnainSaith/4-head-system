import { apiSlice } from "@/store/apiSlice";
import type { ApiResponse } from "@/types/api";
import type { AccountStatement, AccountsSummary, BankAccount, BankBalance, BankMethod, CashAccount, CashBalance, CreateBankAccount } from "./types";

export const accountsApi = apiSlice.injectEndpoints({
  endpoints: (build) => ({
    getAccountsSummary: build.query<ApiResponse<AccountsSummary>, void>({ query: () => "/accounts/summary", providesTags: [{ type: "Account", id: "SUMMARY" }] }),
    getCashAccounts: build.query<ApiResponse<CashBalance[]>, void>({ query: () => "/accounts/cash", providesTags: [{ type: "Account", id: "CASH" }] }),
    getBankAccounts: build.query<ApiResponse<BankBalance[]>, void>({ query: () => "/accounts/bank", providesTags: [{ type: "Account", id: "BANK" }] }),
    createBankAccount: build.mutation<ApiResponse<BankAccount>, CreateBankAccount>({ query: (body) => ({ url: "/accounts/bank", method: "POST", body }), invalidatesTags: [{ type: "Account", id: "SUMMARY" }, { type: "Account", id: "BANK" }] }),
    getBankStatement: build.query<ApiResponse<AccountStatement<BankAccount>>, { id: string; from: string; to: string; method?: BankMethod }>({ query: ({ id, ...params }) => ({ url: `/accounts/bank/${id}/statement`, params }) }),
    getCashStatement: build.query<ApiResponse<AccountStatement<CashAccount>>, { departmentId: string; from: string; to: string }>({ query: ({ departmentId, ...params }) => ({ url: `/accounts/cash/${departmentId}/statement`, params }) }),
  }),
});
export const { useGetAccountsSummaryQuery, useGetCashAccountsQuery, useGetBankAccountsQuery, useCreateBankAccountMutation, useGetBankStatementQuery, useGetCashStatementQuery } = accountsApi;
