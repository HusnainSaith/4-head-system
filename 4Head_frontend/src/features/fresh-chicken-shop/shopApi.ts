import { apiSlice } from "@/store/apiSlice";
import type { ApiResponse } from "@/types/api";
import type { InternalTransfer } from "@/features/supply/types";
import type {
  CreateSaleRequest,
  ProfitLossResponse,
  SaleResponse,
  SalesResponse,
  StockResponse,
  StockWriteoffRequest,
  UpdateSaleRequest,
  WriteoffResponse,
  DressingBatch,
  CreateDressingBatchRequest,
  ProcessingYield,
} from "./types";

const clean = (p: Record<string, unknown>) =>
  Object.fromEntries(
    Object.entries(p).filter(([, v]) => v !== undefined && v !== ""),
  );

const saleRefresh = [
  { type: "ShopSale" as const, id: "LIST" },
  { type: "FreshChickenStock" as const, id: "CURRENT" },
  { type: "ShopReport" as const, id: "PROFIT_LOSS" },
  { type: "DepartmentBalance" as const, id: "LIST" },
  { type: "ConsolidatedReport" as const, id: "PROFIT_LOSS" },
  { type: "ConsolidatedReport" as const, id: "DEPARTMENTS" },
];
const batchRefresh = [
  { type: "DressingBatch" as const, id: "LIST" },
  { type: "FreshChickenStock" as const, id: "CURRENT" },
  { type: "Expense" as const, id: "LIST" },
  { type: "ShopReport" as const, id: "PROFIT_LOSS" },
];
const writeoffRefresh = [
  { type: "FreshChickenStock" as const, id: "CURRENT" },
  { type: "ShopReport" as const, id: "PROFIT_LOSS" },
  { type: "Expense" as const, id: "LIST" },
];

export const shopApi = apiSlice.injectEndpoints({
  endpoints: (builder) => ({
    // Incoming transfers are owned/invalidated by Supply (Task S5/S7).
    // This endpoint just reads the same InternalTransfer data filtered to this dept.
    getShopIncomingTransfers: builder.query<
      ApiResponse<InternalTransfer[]>,
      void
    >({
      query: () => "/shop/incoming-transfers",
      providesTags: [{ type: "InternalTransfer", id: "LIST" }],
    }),

    listShopSales: builder.query<SalesResponse, void>({
      query: () => "/shop/sales",
      providesTags: (result) => [
        { type: "ShopSale", id: "LIST" },
        ...(result?.data.map(({ id }) => ({ type: "ShopSale" as const, id })) ??
          []),
      ],
    }),
    createShopSale: builder.mutation<SaleResponse, CreateSaleRequest>({
      query: (body) => ({ url: "/shop/sales", method: "POST", body }),
      invalidatesTags: saleRefresh,
    }),
    updateShopSale: builder.mutation<
      SaleResponse,
      { id: string; body: UpdateSaleRequest }
    >({
      query: ({ id, body }) => ({
        url: `/shop/sales/${id}`,
        method: "PATCH",
        body,
      }),
      invalidatesTags: (_r, _e, { id }) => [
        { type: "ShopSale", id },
        ...saleRefresh,
      ],
    }),
    deleteShopSale: builder.mutation<ApiResponse<void>, string>({
      query: (id) => ({ url: `/shop/sales/${id}`, method: "DELETE" }),
      invalidatesTags: (_r, _e, id) => [
        { type: "ShopSale", id },
        ...saleRefresh,
      ],
    }),

    getShopStock: builder.query<StockResponse, void>({
      query: () => "/shop/stock",
      providesTags: [{ type: "FreshChickenStock", id: "CURRENT" }],
    }),
    createShopStockWriteoff: builder.mutation<
      WriteoffResponse,
      StockWriteoffRequest
    >({
      query: (body) => ({ url: "/shop/stock/writeoffs", method: "POST", body }),
      invalidatesTags: writeoffRefresh,
    }),
    listDressingBatches: builder.query<
      ApiResponse<DressingBatch[]>,
      { from?: string; to?: string } | void
    >({
      query: (params) => ({
        url: "/shop/dressing-batches",
        params: params ? clean(params) : undefined,
      }),
      providesTags: (result) => [
        { type: "DressingBatch", id: "LIST" },
        ...(result?.data.map(({ id }) => ({
          type: "DressingBatch" as const,
          id,
        })) ?? []),
      ],
    }),
    createDressingBatch: builder.mutation<
      ApiResponse<DressingBatch>,
      CreateDressingBatchRequest
    >({
      query: (body) => ({
        url: "/shop/dressing-batches",
        method: "POST",
        body,
      }),
      invalidatesTags: batchRefresh,
    }),
    updateDressingBatch: builder.mutation<
      ApiResponse<DressingBatch>,
      { id: string; notes?: string }
    >({
      query: ({ id, ...body }) => ({
        url: `/shop/dressing-batches/${id}`,
        method: "PATCH",
        body,
      }),
      invalidatesTags: (_r, _e, { id }) => [
        { type: "DressingBatch", id },
        { type: "DressingBatch", id: "LIST" },
      ],
    }),
    deleteDressingBatch: builder.mutation<ApiResponse<void>, string>({
      query: (id) => ({
        url: `/shop/dressing-batches/${id}`,
        method: "DELETE",
      }),
      invalidatesTags: batchRefresh,
    }),
    getProcessingYield: builder.query<
      ApiResponse<ProcessingYield>,
      { from?: string; to?: string } | void
    >({
      query: (params) => ({
        url: "/shop/reports/processing-yield",
        params: params ? clean(params) : undefined,
      }),
      providesTags: [{ type: "DressingBatch", id: "YIELD" }],
    }),

    getShopProfitLoss: builder.query<
      ProfitLossResponse,
      { from?: string; to?: string } | void
    >({
      query: (params) => ({
        url: "/shop/reports/profit-loss",
        params: params
          ? clean({ from: params.from, to: params.to })
          : undefined,
      }),
      providesTags: [{ type: "ShopReport", id: "PROFIT_LOSS" }],
    }),
  }),
});

export const {
  useGetShopIncomingTransfersQuery,
  useListShopSalesQuery,
  useCreateShopSaleMutation,
  useUpdateShopSaleMutation,
  useDeleteShopSaleMutation,
  useGetShopStockQuery,
  useCreateShopStockWriteoffMutation,
  useGetShopProfitLossQuery,
  useListDressingBatchesQuery,
  useCreateDressingBatchMutation,
  useUpdateDressingBatchMutation,
  useDeleteDressingBatchMutation,
  useGetProcessingYieldQuery,
} = shopApi;
