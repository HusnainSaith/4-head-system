import { apiSlice } from "@/store/apiSlice";
import type { ApiResponse } from "@/types/api";
import type {
  CreatePartyRequest,
  DeletePartyResponse,
  ListPartiesParams,
  PartiesResponse,
  PartyResponse,
  PartyStatementParams,
  PartyStatementResponse,
  RecordPaymentRequest,
  RecordPaymentResponse,
  DepartmentBalances,
  UpdatePartyRequest,
} from "@/features/parties/types";

export const partiesApi = apiSlice.injectEndpoints({
  endpoints: (builder) => ({
    listParties: builder.query<PartiesResponse, ListPartiesParams | void>({
      query: (params) => ({
        url: "/parties",
        params: params ?? undefined,
      }),
      providesTags: (result) => [
        { type: "Party", id: "LIST" },
        ...(result?.data?.items?.map((party) => ({
          type: "Party" as const,
          id: party.id,
        })) ?? []),
      ],
    }),
    getParty: builder.query<PartyResponse, string>({
      query: (id) => `/parties/${id}`,
      providesTags: (_result, _error, id) => [{ type: "Party", id }],
    }),
    createParty: builder.mutation<PartyResponse, CreatePartyRequest>({
      query: (body) => ({ url: "/parties", method: "POST", body }),
      invalidatesTags: [{ type: "Party", id: "LIST" }],
    }),
    updateParty: builder.mutation<
      PartyResponse,
      { id: string; body: UpdatePartyRequest }
    >({
      query: ({ id, body }) => ({
        url: `/parties/${id}`,
        method: "PATCH",
        body,
      }),
      invalidatesTags: (_result, _error, { id }) => [
        { type: "Party", id },
        { type: "Party", id: "LIST" },
      ],
    }),
    deleteParty: builder.mutation<DeletePartyResponse, string>({
      query: (id) => ({ url: `/parties/${id}`, method: "DELETE" }),
      invalidatesTags: (_result, _error, id) => [
        { type: "Party", id },
        { type: "Party", id: "LIST" },
        { type: "PartyStatement", id },
      ],
    }),
    getPartyStatement: builder.query<
      PartyStatementResponse,
      PartyStatementParams
    >({
      query: ({ id, startDate, endDate }) => ({
        url: `/parties/${id}/statement`,
        params: { startDate, endDate },
      }),
      providesTags: (_result, _error, { id }) => [
        { type: "PartyStatement", id },
      ],
    }),
    recordPartyPayment: builder.mutation<
      RecordPaymentResponse,
      { id: string; body: RecordPaymentRequest }
    >({
      query: ({ id, body }) => ({
        url: `/parties/${id}/payments`,
        method: "POST",
        body,
      }),
      invalidatesTags: (_result, _error, { id }) => [
        { type: "Party", id },
        { type: "Party", id: "LIST" },
        { type: "PartyStatement", id },
        { type: "DepartmentBalance", id: "LIST" },
        { type: "BrokerageSale", id: "LIST" },
        { type: "SupplyPurchase", id: "LIST" },
        { type: "BrokerageReport", id: "PROFIT_LOSS" },
        { type: "SupplyReport", id: "PROFIT_LOSS" },
        { type: "ConsolidatedReport", id: "PROFIT_LOSS" },
      ],
    }),
    getDepartmentBalances: builder.query<
      ApiResponse<DepartmentBalances>,
      string
    >({
      query: (departmentType) =>
        `/departments/${departmentType}/party-balances`,
      providesTags: (result) => [
        { type: "DepartmentBalance", id: "LIST" },
        ...(result?.data.departmentId
          ? [
              {
                type: "DepartmentBalance" as const,
                id: result.data.departmentId,
              },
            ]
          : []),
      ],
    }),
  }),
});

export const {
  useListPartiesQuery,
  useGetPartyQuery,
  useCreatePartyMutation,
  useUpdatePartyMutation,
  useDeletePartyMutation,
  useGetPartyStatementQuery,
  useRecordPartyPaymentMutation,
  useGetDepartmentBalancesQuery,
} = partiesApi;
