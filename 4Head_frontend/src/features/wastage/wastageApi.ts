import { apiSlice } from "@/store/apiSlice";
import type { ApiResponse } from "@/types/api";
import type {
  CreatePurchaseRequest,
  CreateSaleRequest,
  ProfitLossParams,
  ProfitLossReport,
  PurchaseResponse,
  PurchasesResponse,
  SaleResponse,
  SalesResponse,
  StockBalance,
  UpdatePurchaseRequest,
  UpdateSaleRequest,
} from "./types";
import type { StockWriteoffInput } from "@/components/common/StockWriteoffDialog";
import type { StockWriteoffResponse } from "@/features/fresh-chicken-shop/types";

const purchaseRefresh = [
  { type: "WastagePurchase" as const, id: "LIST" },
  { type: "WastageStock" as const, id: "CURRENT" },
  { type: "DepartmentBalance" as const, id: "LIST" },
];
const saleRefresh = [
  { type: "WastageSale" as const, id: "LIST" },
  { type: "WastageStock" as const, id: "CURRENT" },
  { type: "DepartmentBalance" as const, id: "LIST" },
  { type: "ConsolidatedReport" as const, id: "PROFIT_LOSS" },
  { type: "ConsolidatedReport" as const, id: "DEPARTMENTS" },
];

export const wastageApi = apiSlice.injectEndpoints({
  endpoints: (builder) => ({
    listPurchases: builder.query<PurchasesResponse, void>({
      query: () => "/wastage/purchases",
      providesTags: (result) => [
        { type: "WastagePurchase", id: "LIST" },
        ...(result?.data.map(({ id }) => ({
          type: "WastagePurchase" as const,
          id,
        })) ?? []),
      ],
    }),
    createPurchase: builder.mutation<PurchaseResponse, CreatePurchaseRequest>({
      query: (body) => ({ url: "/wastage/purchases", method: "POST", body }),
      invalidatesTags: purchaseRefresh,
    }),
    updatePurchase: builder.mutation<
      PurchaseResponse,
      { id: string; body: UpdatePurchaseRequest }
    >({
      query: ({ id, body }) => ({
        url: `/wastage/purchases/${id}`,
        method: "PATCH",
        body,
      }),
      invalidatesTags: (_r, _e, { id }) => [
        { type: "WastagePurchase", id },
        ...purchaseRefresh,
      ],
    }),
    deletePurchase: builder.mutation<ApiResponse<void>, string>({
      query: (id) => ({ url: `/wastage/purchases/${id}`, method: "DELETE" }),
      invalidatesTags: (_r, _e, id) => [
        { type: "WastagePurchase", id },
        ...purchaseRefresh,
      ],
    }),
    listSales: builder.query<SalesResponse, void>({
      query: () => "/wastage/sales",
      providesTags: (result) => [
        { type: "WastageSale", id: "LIST" },
        ...(result?.data.map(({ id }) => ({
          type: "WastageSale" as const,
          id,
        })) ?? []),
      ],
    }),
    createSale: builder.mutation<SaleResponse, CreateSaleRequest>({
      query: (body) => ({ url: "/wastage/sales", method: "POST", body }),
      invalidatesTags: saleRefresh,
    }),
    updateSale: builder.mutation<
      SaleResponse,
      { id: string; body: UpdateSaleRequest }
    >({
      query: ({ id, body }) => ({
        url: `/wastage/sales/${id}`,
        method: "PATCH",
        body,
      }),
      invalidatesTags: (_r, _e, { id }) => [
        { type: "WastageSale", id },
        ...saleRefresh,
      ],
    }),
    deleteSale: builder.mutation<ApiResponse<void>, string>({
      query: (id) => ({ url: `/wastage/sales/${id}`, method: "DELETE" }),
      invalidatesTags: (_r, _e, id) => [
        { type: "WastageSale", id },
        ...saleRefresh,
      ],
    }),
    getStock: builder.query<ApiResponse<StockBalance>, void>({
      query: () => "/wastage/stock",
      providesTags: [{ type: "WastageStock", id: "CURRENT" }],
    }),
    createWastageStockWriteoff: builder.mutation<
      ApiResponse<StockWriteoffResponse>,
      StockWriteoffInput
    >({
      query: (body) => ({ url: "/wastage/stock/writeoffs", method: "POST", body }),
      invalidatesTags: [
        { type: "WastageStock", id: "CURRENT" },
        { type: "WastageReport", id: "PROFIT_LOSS" },
        { type: "Expense", id: "LIST" },
      ],
    }),
    getProfitLossReport: builder.query<
      ApiResponse<ProfitLossReport>,
      ProfitLossParams | void
    >({
      query: (params) => ({
        url: "/wastage/reports/profit-loss",
        params: params
          ? Object.fromEntries(
              Object.entries(params).filter(
                ([, value]) => value !== undefined && value !== "",
              ),
            )
          : undefined,
      }),
      providesTags: [{ type: "WastageReport", id: "PROFIT_LOSS" }],
    }),
  }),
});

export const {
  useListPurchasesQuery,
  useCreatePurchaseMutation,
  useUpdatePurchaseMutation,
  useDeletePurchaseMutation,
  useListSalesQuery,
  useCreateSaleMutation,
  useUpdateSaleMutation,
  useDeleteSaleMutation,
  useGetStockQuery,
  useCreateWastageStockWriteoffMutation,
  useGetProfitLossReportQuery,
} = wastageApi;
