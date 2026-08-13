import { configureStore } from "@reduxjs/toolkit";
interface Request {
  url: string;
  params?: Record<string, unknown>;
  method?: string;
  body?: unknown;
}
const requests: Request[] = [];
vi.mock("@/store/apiSlice", async () => {
  const { createApi: makeApi } = await import("@reduxjs/toolkit/query/react");
  return {
    apiSlice: makeApi({
      reducerPath: "api",
      baseQuery: (args: unknown) => {
        requests.push(
          typeof args === "string" ? { url: args } : (args as Request),
        );
        return {
          data: {
            data: {
              items: [],
              pagination: {
                page: 1,
                limit: 10,
                total: 0,
                totalPages: 0,
                hasNextPage: false,
                hasPreviousPage: false,
              },
            },
          },
        };
      },
      tagTypes: [
        "SupplyPurchase",
        "SupplySale",
        "SupplyStock",
        "SupplyReport",
        "InternalTransfer",
        "FreshChickenStock",
        "Expense",
        "DepartmentBalance",
        "ConsolidatedReport",
      ] as const,
      endpoints: () => ({}),
    }),
  };
});
type Module = typeof import("./supplyApi");
let api: Module["supplyApi"];
let store: ReturnType<typeof configureStore>;
const dispatch = async (action: unknown) =>
  (store.dispatch as unknown as (a: unknown) => Promise<unknown>)(action);
describe("supplyApi contracts", () => {
  beforeAll(async () => {
    api = (await import("./supplyApi")).supplyApi;
    store = configureStore({
      reducer: { [api.reducerPath]: api.reducer },
      middleware: (g) => g().concat(api.middleware),
    });
  });
  beforeEach(() => {
    requests.length = 0;
    store.dispatch(api.util.resetApiState());
  });
  it("constructs filtered purchase URLs and omits empty filters", async () => {
    await dispatch(
      api.endpoints.listSupplyPurchases.initiate({
        page: 2,
        limit: 10,
        from: "",
        paymentMethod: "cash",
      }),
    );
    expect(requests[0]).toMatchObject({
      url: "/supply/purchases",
      params: { page: 2, limit: 10, paymentMethod: "cash" },
    });
    expect(requests[0].params).not.toHaveProperty("from");
  });
  it("uses exact external sale descriptors", async () => {
    const body = {
      quantityKg: 2,
      ratePerKg: 300,
      paymentMethod: "credit" as const,
      amountReceived: 50,
      saleDate: "2026-07-12",
    };
    await dispatch(api.endpoints.createSupplySale.initiate(body));
    expect(requests[0]).toMatchObject({
      url: "/supply/sales",
      method: "POST",
      body,
    });
    expect(body).not.toHaveProperty("commissionPerKg");
  });
  it("keeps transfer endpoints distinct and settles with the exact body", async () => {
    await dispatch(
      api.endpoints.createInternalTransfer.initiate({
        quantityKg: 1,
        internalRatePerKg: 200,
        transferDate: "2026-07-12",
      }),
    );
    await dispatch(
      api.endpoints.settleInternalTransfer.initiate({
        id: "t1",
        body: {
          amount: 100,
          settlementDate: "2026-07-13",
          paymentMethod: "bank",
        },
      }),
    );
    expect(requests).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          url: "/supply/internal-transfers",
          method: "POST",
        }),
        expect.objectContaining({
          url: "/supply/internal-transfers/t1/settle",
          method: "POST",
          body: {
            amount: 100,
            settlementDate: "2026-07-13",
            paymentMethod: "bank",
          },
        }),
      ]),
    );
  });
  it("gets stock and parses dual report route", async () => {
    await dispatch(api.endpoints.getSupplyStock.initiate());
    await dispatch(
      api.endpoints.getSupplyProfitLoss.initiate({
        from: "2026-01-01",
        to: undefined,
      }),
    );
    expect(requests).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ url: "/supply/stock" }),
        expect.objectContaining({
          url: "/supply/reports/profit-loss",
          params: { from: "2026-01-01" },
        }),
      ]),
    );
  });
  it("posts Supply shrinkage to the dedicated backend endpoint", async () => {
    const body = {
      quantityKg: 2,
      reason: "other" as const,
      writeoffDate: "2026-07-15",
    };
    await dispatch(api.endpoints.createSupplyStockWriteoff.initiate(body));
    expect(requests[0]).toMatchObject({
      url: "/supply/stock/writeoffs",
      method: "POST",
      body,
    });
  });
});
