import { configureStore } from "@reduxjs/toolkit";

interface Request { url: string; params?: Record<string, unknown>; method?: string; body?: unknown }
const requests: Request[] = [];
vi.mock("@/store/apiSlice", async () => {
  const { createApi: makeApi } = await import("@reduxjs/toolkit/query/react");
  return { apiSlice: makeApi({ reducerPath: "api", baseQuery: (args: unknown) => { requests.push(typeof args === "string" ? { url: args } : args as Request); return { data: { data: [] } }; }, tagTypes: ["WastagePurchase", "WastageSale", "WastageStock", "WastageReport", "Expense", "DepartmentBalance", "ConsolidatedReport"] as const, endpoints: () => ({}) }) };
});

type ApiModule = typeof import("./wastageApi");
let api: ApiModule["wastageApi"]; let store: ReturnType<typeof configureStore>;
const dispatch = async (action: unknown) => (store.dispatch as (value: unknown) => Promise<unknown>)(action);

describe("wastageApi contracts", () => {
  beforeAll(async () => { api = (await import("./wastageApi")).wastageApi; store = configureStore({ reducer: { [api.reducerPath]: api.reducer }, middleware: (getDefault) => getDefault().concat(api.middleware) }); });
  beforeEach(() => { requests.length = 0; store.dispatch(api.util.resetApiState()); });
  it("uses sale query and mutation routes", async () => { await dispatch(api.endpoints.listSales.initiate()); await dispatch(api.endpoints.createSale.initiate({ quantityKg: 2, ratePerKg: 50, paymentMethod: "cash", amountReceived: 100, saleDate: "2026-07-12" })); expect(requests).toEqual(expect.arrayContaining([expect.objectContaining({ url: "/wastage/sales" }), expect.objectContaining({ url: "/wastage/sales", method: "POST" })])); });
  it("cleans optional report query parameters", async () => { await dispatch(api.endpoints.getProfitLossReport.initiate({ from: "2026-01-01", to: undefined })); expect(requests[0]).toMatchObject({ url: "/wastage/reports/profit-loss", params: { from: "2026-01-01" } }); expect(requests[0].params).not.toHaveProperty("to"); });
  it("posts Wastage shrinkage to the dedicated backend endpoint", async () => { const body = { quantityKg: 1.5, reason: "spoilage" as const, writeoffDate: "2026-07-15" }; await dispatch(api.endpoints.createWastageStockWriteoff.initiate(body)); expect(requests[0]).toMatchObject({ url: "/wastage/stock/writeoffs", method: "POST", body }); });
  it("invalidates the active sale list after a write", async () => { const subscription = (store.dispatch as unknown as (action: unknown) => Promise<unknown> & { unsubscribe: () => void })(api.endpoints.listSales.initiate()); await subscription; await dispatch(api.endpoints.createSale.initiate({ quantityKg: 1, ratePerKg: 10, paymentMethod: "cash", saleDate: "2026-07-12" })); await vi.waitFor(() => expect(requests.filter((request) => request.url === "/wastage/sales" && !request.method)).toHaveLength(2)); subscription.unsubscribe(); });
});
