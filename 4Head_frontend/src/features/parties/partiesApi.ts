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
  AdjustPartyBalanceRequest,
  CreatePartySettlementRequest,
  PartySettlementResponse,
  PartySettlementHistoryResponse,
  UpdatePartySettlementRequest,
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
    adjustPartyBalance: builder.mutation<
      ApiResponse<{ partyId: string; departmentId: string; balance: string }>,
      { id: string; body: AdjustPartyBalanceRequest }
    >({
      query: ({ id, body }) => ({
        url: `/parties/${id}/adjust-balance`,
        method: "POST",
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
        { type: "Party", id: "LIST" },
        { type: "Party", id },
        { type: "PartyStatement", id },
        { type: "DepartmentBalance", id: "LIST" },
        { type: "Account", id: "CASH" },
        { type: "Account", id: "BANK" },
        { type: "Account", id: "SUMMARY" },
        { type: "BrokerageSale", id: "LIST" },
        { type: "SupplyPurchase", id: "LIST" },
        { type: "BrokerageReport", id: "PROFIT_LOSS" },
        { type: "SupplyReport", id: "PROFIT_LOSS" },
        { type: "ConsolidatedReport", id: "PROFIT_LOSS" },
      ],
    }),
    updatePartyPayment: builder.mutation<
      RecordPaymentResponse,
      { id: string; paymentId: string; body: RecordPaymentRequest }
    >({
      query: ({ id, paymentId, body }) => ({
        url: `/parties/${id}/payments/${paymentId}`,
        method: "PATCH",
        body,
      }),
      invalidatesTags: (_result, _error, { id }) => [
        { type: "Party", id },
        { type: "PartyStatement", id },
        { type: "DepartmentBalance", id: "LIST" },
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
    createPartySettlement: builder.mutation<
      PartySettlementResponse,
      CreatePartySettlementRequest
    >({
      query: (body) => ({
        url: "/parties/settlements",
        method: "POST",
        body,
      }),
      invalidatesTags: (_result, _error, body) => [
        { type: "Party", id: "LIST" },
        { type: "Party", id: "SETTLEMENTS" },
        { type: "Party", id: body.payablePartyId },
        { type: "Party", id: body.receivablePartyId },
        { type: "PartyStatement", id: body.payablePartyId },
        { type: "PartyStatement", id: body.receivablePartyId },
        { type: "DepartmentBalance", id: "LIST" },
        { type: "DepartmentBalance", id: body.departmentId },
      ],
    }),
    listPartySettlements: builder.query<
      PartySettlementHistoryResponse,
      { departmentId?: string } | void
    >({
      query: (params) => ({
        url: "/parties/settlements/all",
        params: params?.departmentId
          ? { departmentId: params.departmentId }
          : undefined,
      }),
      providesTags: (result) => [
        { type: "Party", id: "SETTLEMENTS" },
        ...(result?.data.map((settlement) => ({
          type: "Party" as const,
          id: `SETTLEMENT-${settlement.id}`,
        })) ?? []),
      ],
    }),
    updatePartySettlement: builder.mutation<
      PartySettlementResponse,
      { id: string; body: UpdatePartySettlementRequest }
    >({
      query: ({ id, body }) => ({
        url: `/parties/settlements/${id}`,
        method: "PATCH",
        body,
      }),
      invalidatesTags: (result) => [
        { type: "Party", id: "LIST" },
        { type: "Party", id: "SETTLEMENTS" },
        { type: "PartyStatement", id: result?.data.payablePartyId ?? "LIST" },
        { type: "PartyStatement", id: result?.data.receivablePartyId ?? "LIST" },
        { type: "DepartmentBalance", id: "LIST" },
      ],
    }),
    deletePartySettlement: builder.mutation<
      ApiResponse<null>,
      { id: string; reason?: string }
    >({
      query: ({ id, reason }) => ({
        url: `/parties/settlements/${id}`,
        method: "DELETE",
        body: { reason },
      }),
      invalidatesTags: [
        { type: "Party", id: "LIST" },
        { type: "Party", id: "SETTLEMENTS" },
        { type: "PartyStatement", id: "LIST" },
        { type: "DepartmentBalance", id: "LIST" },
      ],
    }),
    reversePartySettlement: builder.mutation<
      PartySettlementResponse,
      { id: string; reversalReason: string }
    >({
      query: ({ id, reversalReason }) => ({
        url: `/parties/settlements/${id}/reverse`,
        method: "POST",
        body: { reversalReason },
      }),
      invalidatesTags: (result) => [
        { type: "Party", id: "LIST" },
        { type: "Party", id: "SETTLEMENTS" },
        { type: "Party", id: result?.data.payablePartyId ?? "LIST" },
        { type: "Party", id: result?.data.receivablePartyId ?? "LIST" },
        {
          type: "PartyStatement",
          id: result?.data.payablePartyId ?? "LIST",
        },
        {
          type: "PartyStatement",
          id: result?.data.receivablePartyId ?? "LIST",
        },
        { type: "DepartmentBalance", id: "LIST" },
        {
          type: "DepartmentBalance",
          id: result?.data.departmentId ?? "LIST",
        },
      ],
    }),
    getPartySettlementHistory: builder.query<
      PartySettlementHistoryResponse,
      { partyId: string; departmentId?: string }
    >({
      query: ({ partyId, departmentId }) => ({
        url: `/parties/${partyId}/settlements`,
        params: departmentId ? { departmentId } : undefined,
      }),
      providesTags: (_result, _error, { partyId }) => [
        { type: "Party", id: partyId },
      ],
    }),
  }),
});

export const {
  useListPartiesQuery,
  useGetPartyQuery,
  useCreatePartyMutation,
  useUpdatePartyMutation,
  useAdjustPartyBalanceMutation,
  useDeletePartyMutation,
  useGetPartyStatementQuery,
  useRecordPartyPaymentMutation,
  useUpdatePartyPaymentMutation,
  useGetDepartmentBalancesQuery,
  useCreatePartySettlementMutation,
  useListPartySettlementsQuery,
  useUpdatePartySettlementMutation,
  useDeletePartySettlementMutation,
  useReversePartySettlementMutation,
  useGetPartySettlementHistoryQuery,
} = partiesApi;
