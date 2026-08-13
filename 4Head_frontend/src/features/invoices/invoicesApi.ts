import { apiSlice } from "@/store/apiSlice";
import type { ApiResponse } from "@/types/api";
import type { Invoice, InvoicePage, InvoiceQueryParams } from "./types";

export const invoicesApi = apiSlice.injectEndpoints({
  endpoints: (builder) => ({
    getInvoices: builder.query<
      ApiResponse<InvoicePage>,
      InvoiceQueryParams | void
    >({
      query: (params) => ({ url: "/invoices", params: params || undefined }),
      providesTags: (result) => [
        { type: "Invoice", id: "LIST" },
        ...(result?.data?.items?.map(({ id }) => ({
          type: "Invoice" as const,
          id,
        })) ?? []),
      ],
    }),
    getInvoice: builder.query<ApiResponse<Invoice>, string>({
      query: (id) => `/invoices/${id}`,
      providesTags: (_result, _error, id) => [{ type: "Invoice", id }],
    }),
    getInvoiceBySource: builder.query<
      ApiResponse<Invoice | null>,
      { sourceType: string; sourceId: string }
    >({
      query: ({ sourceType, sourceId }) =>
        `/invoices/by-source/${encodeURIComponent(sourceType)}/${encodeURIComponent(sourceId)}`,
      providesTags: (result) =>
        result?.data ? [{ type: "Invoice", id: result.data.id }] : [],
    }),
    ensureInvoiceBySource: builder.mutation<
      ApiResponse<Invoice>,
      { sourceType: string; sourceId: string }
    >({
      query: ({ sourceType, sourceId }) => ({
        url: `/invoices/by-source/${encodeURIComponent(sourceType)}/${encodeURIComponent(sourceId)}`,
        method: "POST",
      }),
      invalidatesTags: (result) =>
        result?.data
          ? [
              { type: "Invoice", id: result.data.id },
              { type: "Invoice", id: "LIST" },
            ]
          : [{ type: "Invoice", id: "LIST" }],
    }),
    downloadInvoicePdf: builder.query<Blob, string>({
      query: (id) => ({
        url: `/invoices/${id}/pdf`,
        responseHandler: (response) => response.blob(),
      }),
    }),
    cancelInvoice: builder.mutation<ApiResponse<Invoice>, string>({
      query: (id) => ({ url: `/invoices/${id}/cancel`, method: "POST" }),
      invalidatesTags: (_result, _error, id) => [
        { type: "Invoice", id },
        { type: "Invoice", id: "LIST" },
      ],
    }),
  }),
});

export const {
  useGetInvoicesQuery,
  useGetInvoiceQuery,
  useLazyGetInvoiceQuery,
  useLazyGetInvoiceBySourceQuery,
  useEnsureInvoiceBySourceMutation,
  useLazyDownloadInvoicePdfQuery,
  useCancelInvoiceMutation,
} = invoicesApi;
