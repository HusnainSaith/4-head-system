import { apiSlice } from "@/store/apiSlice";
import type { ApiResponse } from "@/types/api";
import type {
  RecordZakatFundPayment,
  SettleZakatFund,
  ZakatFundDashboardResponse,
  ZakatFundFilters,
  ZakatFundPayment,
  ZakatFundPaymentsResponse,
  ZakatFundSettlement,
  ZakatFundSettlementsResponse,
} from "./types";

const financialTags = [
  { type: "ZakatFund" as const, id: "LIST" },
  { type: "Account" as const, id: "SUMMARY" },
  { type: "Account" as const, id: "CASH" },
  { type: "Account" as const, id: "BANK" },
  { type: "DepartmentBalance" as const, id: "LIST" },
  { type: "BrokerageReport" as const, id: "PROFIT_LOSS" },
  { type: "SupplyReport" as const, id: "PROFIT_LOSS" },
  { type: "WastageReport" as const, id: "PROFIT_LOSS" },
  { type: "ShopReport" as const, id: "PROFIT_LOSS" },
  { type: "ConsolidatedReport" as const, id: "PROFIT_LOSS" },
];

export const zakatFundsApi = apiSlice.injectEndpoints({
  endpoints: (builder) => ({
    getZakatFundDashboard: builder.query<
      ZakatFundDashboardResponse,
      ZakatFundFilters
    >({
      query: (params) => ({ url: "/zakat-funds/dashboard", params }),
      providesTags: [{ type: "ZakatFund", id: "LIST" }],
    }),
    listZakatFundPayments: builder.query<
      ZakatFundPaymentsResponse,
      ZakatFundFilters
    >({
      query: (params) => ({ url: "/zakat-funds/payments", params }),
      providesTags: [{ type: "ZakatFund", id: "LIST" }],
    }),
    listZakatFundSettlements: builder.query<
      ZakatFundSettlementsResponse,
      ZakatFundFilters
    >({
      query: (params) => ({ url: "/zakat-funds/settlements", params }),
      providesTags: [{ type: "ZakatFund", id: "LIST" }],
    }),
    recordZakatFundPayment: builder.mutation<
      ApiResponse<ZakatFundPayment>,
      RecordZakatFundPayment
    >({
      query: (body) => ({ url: "/zakat-funds/payments", method: "POST", body }),
      invalidatesTags: financialTags,
    }),
    settleZakatFund: builder.mutation<
      ApiResponse<ZakatFundSettlement>,
      SettleZakatFund
    >({
      query: (body) => ({
        url: "/zakat-funds/settlements",
        method: "POST",
        body,
      }),
      invalidatesTags: (_result, _error, body) => [
        ...financialTags,
        ...body.splits.flatMap(({ partyId }) => [
          { type: "Party" as const, id: partyId },
          { type: "PartyStatement" as const, id: partyId },
        ]),
      ],
    }),
    reverseZakatFundPayment: builder.mutation<
      ApiResponse<ZakatFundPayment>,
      { id: string; reason: string }
    >({
      query: ({ id, reason }) => ({
        url: `/zakat-funds/payments/${id}/reverse`,
        method: "POST",
        body: { reason },
      }),
      invalidatesTags: financialTags,
    }),
    reverseZakatFundSettlement: builder.mutation<
      ApiResponse<ZakatFundSettlement>,
      { id: string; reason: string; partyIds: string[] }
    >({
      query: ({ id, reason }) => ({
        url: `/zakat-funds/settlements/${id}/reverse`,
        method: "POST",
        body: { reason },
      }),
      invalidatesTags: (_result, _error, { partyIds }) => [
        ...financialTags,
        ...partyIds.flatMap((partyId) => [
          { type: "Party" as const, id: partyId },
          { type: "PartyStatement" as const, id: partyId },
        ]),
      ],
    }),
  }),
});

export const {
  useGetZakatFundDashboardQuery,
  useListZakatFundPaymentsQuery,
  useListZakatFundSettlementsQuery,
  useRecordZakatFundPaymentMutation,
  useSettleZakatFundMutation,
  useReverseZakatFundPaymentMutation,
  useReverseZakatFundSettlementMutation,
} = zakatFundsApi;
