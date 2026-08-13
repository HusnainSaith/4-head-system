import { configureStore } from "@reduxjs/toolkit";
interface R {
  url: string;
  params?: unknown;
}
const requests: R[] = [];
vi.mock("@/store/apiSlice", async () => {
  const { createApi: makeApi } = await import("@reduxjs/toolkit/query/react");
  return {
    apiSlice: makeApi({
      reducerPath: "api",
      baseQuery: (a: unknown) => {
        requests.push(typeof a === "string" ? { url: a } : (a as R));
        return { data: { data: [] } };
      },
      endpoints: () => ({}),
    }),
  };
});
type M = typeof import("./reportsApi");
let api: M["reportsApi"];
let store: ReturnType<typeof configureStore>;
const d = (a: unknown) =>
  (store.dispatch as unknown as (x: unknown) => Promise<unknown>)(a);
describe("reportsApi", () => {
  beforeAll(async () => {
    api = (await import("./reportsApi")).reportsApi;
    store = configureStore({
      reducer: { [api.reducerPath]: api.reducer },
      middleware: (g) => g().concat(api.middleware),
    });
  });
  beforeEach(() => {
    requests.length = 0;
    store.dispatch(api.util.resetApiState());
  });
  it("uses exact six report routes and filters", async () => {
    await d(
      api.endpoints.getConsolidatedProfitLoss.initiate({
        startDate: "2026-01-01",
        endDate: "2026-01-31",
      }),
    );
    await d(api.endpoints.getPartnerProfitShare.initiate());
    await d(
      api.endpoints.getOutstandingBalances.initiate({ departmentId: "d1" }),
    );
    await d(
      api.endpoints.getStockSummary.initiate({
        departmentId: "d1",
        startDate: "2026-01-01",
      }),
    );
    await d(api.endpoints.getExpenseBreakdown.initiate({ categoryId: "c1" }));
    await d(api.endpoints.getPayrollSummary.initiate({ departmentId: "d1" }));
    expect(requests.map((r) => r.url)).toEqual([
      "/reports/consolidated-profit-loss",
      "/reports/partner-profit-share",
      "/reports/outstanding-balances",
      "/reports/stock-summary",
      "/reports/expense-breakdown",
      "/reports/payroll-summary",
    ]);
    expect(requests[3].params).toMatchObject({
      departmentId: "d1",
      startDate: "2026-01-01",
    });
  });
});
