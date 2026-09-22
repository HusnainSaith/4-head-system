import {
  createApi,
  fetchBaseQuery,
  type BaseQueryFn,
  type FetchArgs,
  type FetchBaseQueryError,
} from "@reduxjs/toolkit/query/react";
import { loggedOut } from "@/features/auth/authSlice";
import { clearAuthCookies, getCsrfToken } from "@/lib/auth-cookies";

const rawBaseQuery = fetchBaseQuery({
  baseUrl: import.meta.env.VITE_API_BASE_URL,
  credentials: "include",
  prepareHeaders: (headers) => {
    const csrfToken = getCsrfToken();
    if (csrfToken) headers.set("X-CSRF-Token", csrfToken);
    return headers;
  },
});

type RawBaseQuery = typeof rawBaseQuery;
type BaseQueryApi = Parameters<RawBaseQuery>[1];
type BaseQueryExtraOptions = Parameters<RawBaseQuery>[2];

function isSessionEndpoint(args: string | FetchArgs): boolean {
  const url = typeof args === "string" ? args : args.url;
  return ["/auth/login", "/auth/refresh", "/auth/logout"].some((path) =>
    url.endsWith(path),
  );
}

function isImportantMutation(args: string | FetchArgs): boolean {
  if (typeof args === "string") return false;
  const method = args.method?.toUpperCase();
  if (!method || !["POST", "PATCH", "PUT", "DELETE"].includes(method))
    return false;
  const path = args.url.replace(/^\/api\/v1/, "").split("?")[0];
  return [
    "/users",
    "/roles",
    "/departments",
    "/parties",
    "/brokerage",
    "/supply",
    "/wastage",
    "/fresh-chicken-shop",
    "/expenses",
    "/expense-allocations",
    "/employees",
    "/payroll",
    "/accounts",
    "/investments",
    "/investors",
    "/investor-profit-periods",
    "/brother",
    "/committees",
    "/zakat-funds",
    "/vehicles",
    "/inventory",
    "/invoices",
  ].some((prefix) => path === prefix || path.startsWith(`${prefix}/`));
}

async function refreshSession(
  api: BaseQueryApi,
  extraOptions: BaseQueryExtraOptions,
): Promise<boolean> {
  const result = await rawBaseQuery(
    {
      url: "/auth/refresh",
      method: "POST",
      body: {},
    },
    api,
    extraOptions,
  );

  if (!result.error) return true;

  clearAuthCookies();
  api.dispatch(loggedOut());
  return false;
}

let refreshInFlight: Promise<boolean> | null = null;

const baseQueryWithRefresh: BaseQueryFn<
  string | FetchArgs,
  unknown,
  FetchBaseQueryError
> = async (args, api, extraOptions) => {
  const result = await rawBaseQuery(args, api, extraOptions);

  if (!result.error && isImportantMutation(args)) {
    api.dispatch(
      apiSlice.util.invalidateTags([{ type: "Notification", id: "LIST" }]),
    );
  }

  if (result.error?.status !== 401 || isSessionEndpoint(args)) {
    return result;
  }

  if (!refreshInFlight) {
    refreshInFlight = refreshSession(api, extraOptions).finally(() => {
      refreshInFlight = null;
    });
  }

  const refreshed = await refreshInFlight;
  if (!refreshed) return result;
  const retryResult = await rawBaseQuery(args, api, extraOptions);
  if (!retryResult.error && isImportantMutation(args)) {
    api.dispatch(
      apiSlice.util.invalidateTags([{ type: "Notification", id: "LIST" }]),
    );
  }
  return retryResult;
};

/** Single RTK Query API; feature modules extend it with injectEndpoints(). */
export const apiSlice = createApi({
  reducerPath: "api",
  baseQuery: baseQueryWithRefresh,
  tagTypes: [
    "Party",
    "PartyStatement",
    "BrokeragePurchase",
    "BrokerageSale",
    "BrokerageStock",
    "BrokerageReport",
    "BrokerageStockMovement",
    "WastagePurchase",
    "WastageSale",
    "WastageStock",
    "WastageReport",
    "SupplyPurchase",
    "SupplySale",
    "SupplyStock",
    "SupplyReport",
    "InternalTransfer",
    "FreshChickenStock",
    "DressingBatch",
    "Vehicle",
    "VehicleFuelLog",
    "VehicleMaintenanceLog",
    "Expense",
    "Employee",
    "EmployeeAdvance",
    "EmployeeBonus",
    "SalaryRun",
    "SalaryAccount",
    "ShopSale",
    "ShopReport",
    "User",
    "Role",
    "ConsolidatedReport",
    "Invoice",
    "Notification",
    "DepartmentBalance",
    "Committee",
    "CommitteeInstallment",
    "Account",
    "Investment",
    "ZakatFund",
    "Department",
  ],
  endpoints: () => ({}),
});
