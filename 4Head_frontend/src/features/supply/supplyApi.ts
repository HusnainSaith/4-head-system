import { apiSlice } from "@/store/apiSlice";
import type { ApiResponse } from "@/types/api";
import type {
  CreatePurchaseRequest,
  CreateSaleRequest,
  CreateTransferRequest,
  InternalTransfer,
  ListQuery,
  PaginatedResponse,
  ProfitLossReport,
  SettleTransferRequest,
  StockBalance,
  SupplyPurchase,
  SupplySale,
  TransferListQuery,
} from "./types";
import type { StockWriteoffInput } from "@/components/common/StockWriteoffDialog";
import type { StockWriteoffResponse } from "@/features/fresh-chicken-shop/types";

const clean = <T extends object>(value: T) =>
  Object.fromEntries(
    Object.entries(value).filter(
      ([, item]) => item !== undefined && item !== "",
    ),
  );
const purchaseRefresh = [
  { type: "SupplyPurchase" as const, id: "LIST" },
  { type: "SupplyStock" as const, id: "CURRENT" },
  { type: "SupplyReport" as const, id: "PROFIT_LOSS" },
  { type: "DepartmentBalance" as const, id: "LIST" },
];
const saleRefresh = [
  { type: "SupplySale" as const, id: "LIST" },
  { type: "SupplyStock" as const, id: "CURRENT" },
  { type: "SupplyReport" as const, id: "PROFIT_LOSS" },
  { type: "DepartmentBalance" as const, id: "LIST" },
  { type: "ConsolidatedReport" as const, id: "PROFIT_LOSS" },
  { type: "ConsolidatedReport" as const, id: "DEPARTMENTS" },
];
const transferRefresh = [
  { type: "InternalTransfer" as const, id: "LIST" },
  { type: "SupplyStock" as const, id: "CURRENT" },
  { type: "FreshChickenStock" as const, id: "CURRENT" },
  { type: "SupplyReport" as const, id: "PROFIT_LOSS" },
];
export const supplyApi = apiSlice.injectEndpoints({
  endpoints: (builder) => ({
    listSupplyPurchases: builder.query<
      PaginatedResponse<SupplyPurchase>,
      ListQuery | void
    >({
      query: (params) => ({
        url: "/supply/purchases",
        params: params ? clean(params) : undefined,
      }),
      providesTags: (result) => [
        { type: "SupplyPurchase", id: "LIST" },
        ...(result?.data.items.map(({ id }) => ({
          type: "SupplyPurchase" as const,
          id,
        })) ?? []),
      ],
    }),
    getSupplyPurchase: builder.query<ApiResponse<SupplyPurchase>, string>({
      query: (id) => `/supply/purchases/${id}`,
      providesTags: (_r, _e, id) => [{ type: "SupplyPurchase", id }],
    }),
    createSupplyPurchase: builder.mutation<
      ApiResponse<SupplyPurchase>,
      CreatePurchaseRequest
    >({
      query: (body) => ({ url: "/supply/purchases", method: "POST", body }),
      invalidatesTags: purchaseRefresh,
    }),
    updateSupplyPurchase: builder.mutation<
      ApiResponse<SupplyPurchase>,
      { id: string; body: Partial<CreatePurchaseRequest> }
    >({
      query: ({ id, body }) => ({
        url: `/supply/purchases/${id}`,
        method: "PATCH",
        body,
      }),
      invalidatesTags: (_r, _e, { id }) => [
        { type: "SupplyPurchase", id },
        ...purchaseRefresh,
      ],
    }),
    deleteSupplyPurchase: builder.mutation<ApiResponse<void>, string>({
      query: (id) => ({ url: `/supply/purchases/${id}`, method: "DELETE" }),
      invalidatesTags: (_r, _e, id) => [
        { type: "SupplyPurchase", id },
        ...purchaseRefresh,
      ],
    }),
    listSupplySales: builder.query<
      PaginatedResponse<SupplySale>,
      ListQuery | void
    >({
      query: (params) => ({
        url: "/supply/sales",
        params: params ? clean(params) : undefined,
      }),
      providesTags: (result) => [
        { type: "SupplySale", id: "LIST" },
        ...(result?.data.items.map(({ id }) => ({
          type: "SupplySale" as const,
          id,
        })) ?? []),
      ],
    }),
    getSupplySale: builder.query<ApiResponse<SupplySale>, string>({
      query: (id) => `/supply/sales/${id}`,
      providesTags: (_r, _e, id) => [{ type: "SupplySale", id }],
    }),
    createSupplySale: builder.mutation<
      ApiResponse<SupplySale>,
      CreateSaleRequest
    >({
      query: (body) => ({ url: "/supply/sales", method: "POST", body }),
      invalidatesTags: saleRefresh,
    }),
    updateSupplySale: builder.mutation<
      ApiResponse<SupplySale>,
      { id: string; body: Partial<CreateSaleRequest> }
    >({
      query: ({ id, body }) => ({
        url: `/supply/sales/${id}`,
        method: "PATCH",
        body,
      }),
      invalidatesTags: (_r, _e, { id }) => [
        { type: "SupplySale", id },
        ...saleRefresh,
      ],
    }),
    deleteSupplySale: builder.mutation<ApiResponse<void>, string>({
      query: (id) => ({ url: `/supply/sales/${id}`, method: "DELETE" }),
      invalidatesTags: (_r, _e, id) => [
        { type: "SupplySale", id },
        ...saleRefresh,
      ],
    }),
    getSupplyStock: builder.query<ApiResponse<StockBalance>, void>({
      query: () => "/supply/stock",
      providesTags: [{ type: "SupplyStock", id: "CURRENT" }],
    }),
    createSupplyStockWriteoff: builder.mutation<
      ApiResponse<StockWriteoffResponse>,
      StockWriteoffInput
    >({
      query: (body) => ({
        url: "/supply/stock/writeoffs",
        method: "POST",
        body,
      }),
      invalidatesTags: [
        { type: "SupplyStock", id: "CURRENT" },
        { type: "SupplyReport", id: "PROFIT_LOSS" },
        { type: "Expense", id: "LIST" },
      ],
    }),
    listInternalTransfers: builder.query<
      PaginatedResponse<InternalTransfer>,
      TransferListQuery | void
    >({
      query: (params) => ({
        url: "/supply/internal-transfers",
        params: params ? clean(params) : undefined,
      }),
      providesTags: (result) => [
        { type: "InternalTransfer", id: "LIST" },
        ...(result?.data.items.map(({ id }) => ({
          type: "InternalTransfer" as const,
          id,
        })) ?? []),
      ],
    }),
    getInternalTransfer: builder.query<ApiResponse<InternalTransfer>, string>({
      query: (id) => `/supply/internal-transfers/${id}`,
      providesTags: (_r, _e, id) => [{ type: "InternalTransfer", id }],
    }),
    createInternalTransfer: builder.mutation<
      ApiResponse<InternalTransfer>,
      CreateTransferRequest
    >({
      query: (body) => ({
        url: "/supply/internal-transfers",
        method: "POST",
        body,
      }),
      invalidatesTags: transferRefresh,
    }),
    settleInternalTransfer: builder.mutation<
      ApiResponse<InternalTransfer>,
      { id: string; body: SettleTransferRequest }
    >({
      query: ({ id, body }) => ({
        url: `/supply/internal-transfers/${id}/settle`,
        method: "POST",
        body,
      }),
      invalidatesTags: (_r, _e, { id }) => [
        { type: "InternalTransfer", id },
        { type: "InternalTransfer", id: "LIST" },
        { type: "SupplyReport", id: "PROFIT_LOSS" },
      ],
    }),
    getSupplyProfitLoss: builder.query<
      ApiResponse<ProfitLossReport>,
      { from?: string; to?: string } | void
    >({
      query: (params) => ({
        url: "/supply/reports/profit-loss",
        params: params ? clean(params) : undefined,
      }),
      providesTags: [{ type: "SupplyReport", id: "PROFIT_LOSS" }],
    }),
  }),
});
export const {
  useListSupplyPurchasesQuery,
  useCreateSupplyPurchaseMutation,
  useUpdateSupplyPurchaseMutation,
  useDeleteSupplyPurchaseMutation,
  useListSupplySalesQuery,
  useCreateSupplySaleMutation,
  useUpdateSupplySaleMutation,
  useDeleteSupplySaleMutation,
  useGetSupplyStockQuery,
  useCreateSupplyStockWriteoffMutation,
  useListInternalTransfersQuery,
  useCreateInternalTransferMutation,
  useSettleInternalTransferMutation,
  useGetSupplyProfitLossQuery,
} = supplyApi;
