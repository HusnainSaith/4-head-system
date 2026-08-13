import { apiSlice } from "@/store/apiSlice";
import type { ApiResponse } from "@/types/api";

export interface ReportDateParams {
  startDate?: string;
  endDate?: string;
}

export interface DepartmentReportParams {
  departmentId?: string;
}

export interface ConsolidatedProfitLoss {
  externalRevenue: string;
  internalTransferRevenue: string;
  totalCogs: string;
  totalExpenses: string;
  totalPayroll: string;
  netProfit: string;
  perPartnerShare: string;
}

export interface DepartmentProfitLoss {
  departmentId: string;
  departmentName: string;
  departmentType: "BROKERAGE" | "SUPPLY" | "WASTAGE" | "FRESH_CHICKEN_SHOP";
  revenue: string;
  cogs: string;
  grossProfit: string;
}

export interface PartnerProfitShare extends ConsolidatedProfitLoss {
  partnerShare: string;
}

export interface OutstandingBalance {
  partyId: string | null;
  partyName?: string | null;
  departmentId?: string | null;
  departmentName?: string | null;
  balance: string;
}

export interface StockSummaryItem {
  productId: string;
  departmentId: string;
  departmentName?: string | null;
  quantityKg: string;
  wac: string;
}

export interface StockMovementItem {
  id: string;
  departmentId: string;
  movementType: string;
  quantityKg: string;
  ratePerKg: string;
  resultingWac: string;
  sourceType: string;
  sourceId: string;
  movementDate: string;
}

/** Exact payload returned by GET /reports/stock-summary. */
export interface StockSummary {
  summary: StockSummaryItem[];
  movements: StockMovementItem[];
}

export interface ExpenseBreakdownItem {
  category: string | null;
  total: string;
}

export interface PayrollSummaryItem {
  departmentId: string;
  totalNetPayable: string;
  totalAdvancesDeducted: string;
  totalBonuses: string;
}

export const dashboardApi = apiSlice.injectEndpoints({
  endpoints: (builder) => ({
    getConsolidatedProfitLoss: builder.query<
      ApiResponse<ConsolidatedProfitLoss>,
      ReportDateParams | void
    >({
      query: (params) => ({
        url: "/reports/consolidated-profit-loss",
        params: params ?? undefined,
      }),
      providesTags: [{ type: "ConsolidatedReport", id: "PROFIT_LOSS" }],
    }),
    getPartnerProfitShare: builder.query<
      ApiResponse<PartnerProfitShare>,
      ReportDateParams | void
    >({
      query: (params) => ({
        url: "/reports/partner-profit-share",
        params: params ?? undefined,
      }),
      providesTags: [{ type: "ConsolidatedReport", id: "PARTNER_SHARE" }],
    }),
    getDepartmentProfitLoss: builder.query<
      ApiResponse<DepartmentProfitLoss[]>,
      ReportDateParams | void
    >({
      query: (params) => ({
        url: "/reports/department-profit-loss",
        params: params ?? undefined,
      }),
      providesTags: [{ type: "ConsolidatedReport", id: "DEPARTMENTS" }],
    }),
    getOutstandingBalances: builder.query<
      ApiResponse<OutstandingBalance[]>,
      DepartmentReportParams | void
    >({
      query: (params) => ({
        url: "/reports/outstanding-balances",
        params: params ?? undefined,
      }),
      providesTags: [{ type: "ConsolidatedReport", id: "BALANCES" }],
    }),
    getStockSummary: builder.query<
      ApiResponse<StockSummary>,
      DepartmentReportParams | void
    >({
      query: (params) => ({
        url: "/reports/stock-summary",
        params: params ?? undefined,
      }),
      providesTags: [{ type: "ConsolidatedReport", id: "STOCK" }],
    }),
    getExpenseBreakdown: builder.query<
      ApiResponse<ExpenseBreakdownItem[]>,
      ReportDateParams & DepartmentReportParams
    >({
      query: (params) => ({ url: "/reports/expense-breakdown", params }),
      providesTags: [{ type: "ConsolidatedReport", id: "EXPENSES" }],
    }),
    getPayrollSummary: builder.query<
      ApiResponse<PayrollSummaryItem[]>,
      ReportDateParams & DepartmentReportParams
    >({
      query: (params) => ({ url: "/reports/payroll-summary", params }),
      providesTags: [{ type: "ConsolidatedReport", id: "PAYROLL" }],
    }),
  }),
});

export const {
  useGetConsolidatedProfitLossQuery,
  useGetPartnerProfitShareQuery,
  useGetDepartmentProfitLossQuery,
  useGetOutstandingBalancesQuery,
  useGetStockSummaryQuery,
  useGetExpenseBreakdownQuery,
  useGetPayrollSummaryQuery,
} = dashboardApi;
