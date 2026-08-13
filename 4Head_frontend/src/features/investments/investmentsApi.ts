import { apiSlice } from "@/store/apiSlice";
import type {
  CreateInvestorAccount,
  InvestorLedgerResponse,
  InvestorListResponse,
  InvestorResponse,
  RecordInvestorTransaction,
  InvestorTransactionResponse,
} from "./types";

const invalidates = [
  { type: "Investment" as const, id: "LIST" },
  { type: "Account" as const, id: "SUMMARY" },
  { type: "Account" as const, id: "CASH" },
  { type: "Account" as const, id: "BANK" },
  { type: "DepartmentBalance" as const, id: "LIST" },
];

export const investmentsApi = apiSlice.injectEndpoints({
  endpoints: (builder) => ({
    listInvestors: builder.query<
      InvestorListResponse,
      { search?: string } | void
    >({
      query: (params) => ({
        url: "/investors",
        params: { limit: 100, ...(params ?? {}) },
      }),
      providesTags: [{ type: "Investment", id: "LIST" }],
    }),
    createInvestor: builder.mutation<InvestorResponse, CreateInvestorAccount>({
      query: (body) => ({ url: "/investors", method: "POST", body }),
      invalidatesTags: invalidates,
    }),
    getInvestorLedger: builder.query<InvestorLedgerResponse, string>({
      query: (id) => `/investors/${id}/ledger`,
      providesTags: (_result, _error, id) => [{ type: "Investment", id }],
    }),
    recordInvestorTransaction: builder.mutation<
      InvestorTransactionResponse,
      { id: string; partyId: string; body: RecordInvestorTransaction }
    >({
      query: ({ id, body }) => ({
        url: `/investors/${id}/transactions`,
        method: "POST",
        body,
      }),
      invalidatesTags: (_result, _error, { id, partyId }) => [
        { type: "Investment", id },
        { type: "Party", id: partyId },
        { type: "PartyStatement", id: partyId },
        ...invalidates,
      ],
    }),
  }),
});

export const {
  useListInvestorsQuery,
  useCreateInvestorMutation,
  useGetInvestorLedgerQuery,
  useRecordInvestorTransactionMutation,
} = investmentsApi;
