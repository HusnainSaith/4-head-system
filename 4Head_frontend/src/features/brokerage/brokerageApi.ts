import { apiSlice } from "@/store/apiSlice";
import type { ApiResponse } from "@/types/api";
import type {
  BrokerageProfitLoss,
  BrokerageStockBalance,
  CreatePurchaseRequest,
  CreateSaleRequest,
  PaginatedPurchasesResponse,
  PaginatedSalesResponse,
  ProfitLossParams,
  PurchaseListQuery,
  PurchaseResponse,
  SaleListQuery,
  SaleResponse,
  StockWriteoffRequest,
  StockWriteoffResponse,
  UpdatePurchaseRequest,
  UpdateSaleRequest,
} from "./types";

const cleanParams = <T extends Record<string, unknown>>(
  params: T,
): Partial<T> =>
  Object.fromEntries(
    Object.entries(params).filter(
      ([, v]) => v !== undefined && v !== "" && v !== null,
    ),
  ) as Partial<T>;

const refreshTransactionState = [
  { type: "BrokerageStock" as const, id: "CURRENT" },
  { type: "BrokerageReport" as const, id: "PROFIT_LOSS" },
  { type: "BrokerageStockMovement" as const, id: "LIST" },
  { type: "DepartmentBalance" as const, id: "LIST" },
  { type: "ConsolidatedReport" as const, id: "PROFIT_LOSS" },
  { type: "ConsolidatedReport" as const, id: "DEPARTMENTS" },
];

export const brokerageApi = apiSlice.injectEndpoints({
  endpoints: (builder) => ({
    listBrokeragePurchases: builder.query<
      PaginatedPurchasesResponse,
      PurchaseListQuery | void
    >({
      query: (params) => ({
        url: "/brokerage/purchases",
        params: params
          ? cleanParams(params as Record<string, unknown>)
          : undefined,
      }),
      providesTags: (result) => [
        { type: "BrokeragePurchase", id: "LIST" },
        ...(result?.data?.items?.map(({ id }) => ({
          type: "BrokeragePurchase" as const,
          id,
        })) ?? []),
      ],
    }),
    getBrokeragePurchase: builder.query<PurchaseResponse, string>({
      query: (id) => `/brokerage/purchases/${id}`,
      providesTags: (_r, _e, id) => [{ type: "BrokeragePurchase", id }],
    }),
    createBrokeragePurchase: builder.mutation<
      PurchaseResponse,
      CreatePurchaseRequest
    >({
      query: (body) => ({ url: "/brokerage/purchases", method: "POST", body }),
      invalidatesTags: [
        { type: "BrokeragePurchase", id: "LIST" },
        ...refreshTransactionState,
      ],
    }),
    updateBrokeragePurchase: builder.mutation<
      PurchaseResponse,
      { id: string; body: UpdatePurchaseRequest }
    >({
      query: ({ id, body }) => ({
        url: `/brokerage/purchases/${id}`,
        method: "PATCH",
        body,
      }),
      invalidatesTags: (_r, _e, { id }) => [
        { type: "BrokeragePurchase", id },
        { type: "BrokeragePurchase", id: "LIST" },
        ...refreshTransactionState,
      ],
    }),
    deleteBrokeragePurchase: builder.mutation<ApiResponse<void>, string>({
      query: (id) => ({ url: `/brokerage/purchases/${id}`, method: "DELETE" }),
      invalidatesTags: (_r, _e, id) => [
        { type: "BrokeragePurchase", id },
        { type: "BrokeragePurchase", id: "LIST" },
        ...refreshTransactionState,
      ],
    }),

    listBrokerageSales: builder.query<
      PaginatedSalesResponse,
      SaleListQuery | void
    >({
      query: (params) => ({
        url: "/brokerage/sales",
        params: params
          ? cleanParams(params as Record<string, unknown>)
          : undefined,
      }),
      providesTags: (result) => [
        { type: "BrokerageSale", id: "LIST" },
        ...(result?.data?.items?.map(({ id }) => ({
          type: "BrokerageSale" as const,
          id,
        })) ?? []),
      ],
    }),
    getBrokerageSale: builder.query<SaleResponse, string>({
      query: (id) => `/brokerage/sales/${id}`,
      providesTags: (_r, _e, id) => [{ type: "BrokerageSale", id }],
    }),
    createBrokerageSale: builder.mutation<SaleResponse, CreateSaleRequest>({
      query: (body) => ({ url: "/brokerage/sales", method: "POST", body }),
      invalidatesTags: [
        { type: "BrokerageSale", id: "LIST" },
        { type: "SupplyPurchase", id: "LIST" },
        { type: "SupplyStock", id: "CURRENT" },
        { type: "SupplyReport", id: "PROFIT_LOSS" },
        ...refreshTransactionState,
      ],
    }),
    updateBrokerageSale: builder.mutation<
      SaleResponse,
      { id: string; body: UpdateSaleRequest }
    >({
      query: ({ id, body }) => ({
        url: `/brokerage/sales/${id}`,
        method: "PATCH",
        body,
      }),
      invalidatesTags: (_r, _e, { id }) => [
        { type: "BrokerageSale", id },
        { type: "BrokerageSale", id: "LIST" },
        ...refreshTransactionState,
      ],
    }),
    deleteBrokerageSale: builder.mutation<ApiResponse<void>, string>({
      query: (id) => ({ url: `/brokerage/sales/${id}`, method: "DELETE" }),
      invalidatesTags: (_r, _e, id) => [
        { type: "BrokerageSale", id },
        { type: "BrokerageSale", id: "LIST" },
        { type: "SupplyPurchase", id: "LIST" },
        { type: "SupplyStock", id: "CURRENT" },
        { type: "SupplyReport", id: "PROFIT_LOSS" },
        ...refreshTransactionState,
      ],
    }),

    getBrokerageStock: builder.query<ApiResponse<BrokerageStockBalance>, void>({
      query: () => "/brokerage/stock",
      providesTags: [{ type: "BrokerageStock", id: "CURRENT" }],
    }),
    createBrokerageStockWriteoff: builder.mutation<
      ApiResponse<StockWriteoffResponse>,
      StockWriteoffRequest
    >({
      query: (body) => ({
        url: "/brokerage/stock/writeoffs",
        method: "POST",
        body,
      }),
      invalidatesTags: [
        ...refreshTransactionState,
        { type: "Expense", id: "LIST" },
      ],
    }),
    getBrokerageProfitLoss: builder.query<
      ApiResponse<BrokerageProfitLoss>,
      ProfitLossParams | void
    >({
      query: (params) => ({
        url: "/brokerage/reports/profit-loss",
        params: params
          ? cleanParams({ from: params.from, to: params.to })
          : undefined,
      }),
      providesTags: [{ type: "BrokerageReport", id: "PROFIT_LOSS" }],
    }),
  }),
});

export const {
  useListBrokeragePurchasesQuery,
  useGetBrokeragePurchaseQuery,
  useCreateBrokeragePurchaseMutation,
  useUpdateBrokeragePurchaseMutation,
  useDeleteBrokeragePurchaseMutation,
  useListBrokerageSalesQuery,
  useGetBrokerageSaleQuery,
  useCreateBrokerageSaleMutation,
  useUpdateBrokerageSaleMutation,
  useDeleteBrokerageSaleMutation,
  useGetBrokerageStockQuery,
  useCreateBrokerageStockWriteoffMutation,
  useGetBrokerageProfitLossQuery,
} = brokerageApi;
