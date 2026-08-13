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
        return { data: { data: [] } };
      },
      tagTypes: [
        "ShopSale",
        "ShopReport",
        "FreshChickenStock",
        "InternalTransfer",
        "Expense",
        "DepartmentBalance",
        "ConsolidatedReport",
        "DressingBatch",
      ] as const,
      endpoints: () => ({}),
    }),
  };
});

type Module = typeof import("./shopApi");
let api: Module["shopApi"];
let store: ReturnType<typeof configureStore>;
const dispatch = async (action: unknown) =>
  (store.dispatch as (a: unknown) => Promise<unknown>)(action);

describe("shopApi contracts", () => {
  beforeAll(async () => {
    api = (await import("./shopApi")).shopApi;
    store = configureStore({
      reducer: { [api.reducerPath]: api.reducer },
      middleware: (g) => g().concat(api.middleware),
    });
  });
  beforeEach(() => {
    requests.length = 0;
    store.dispatch(api.util.resetApiState());
  });

  it("reads incoming transfers from /shop/incoming-transfers", async () => {
    await dispatch(api.endpoints.getShopIncomingTransfers.initiate());
    expect(requests[0]).toMatchObject({ url: "/shop/incoming-transfers" });
  });

  it("lists and creates sales with correct routes", async () => {
    await dispatch(api.endpoints.listShopSales.initiate());
    expect(requests[0].url).toBe("/shop/sales");

    const body = {
      quantityKg: 5,
      ratePerKg: 300,
      paymentMethod: "cash" as const,
      saleDate: "2026-07-12",
      vehicleId: "shop-vehicle-1",
    };
    await dispatch(api.endpoints.createShopSale.initiate(body));
    expect(requests.find((r) => r.method === "POST")).toMatchObject({
      url: "/shop/sales",
      method: "POST",
      body,
    });
    expect(body.vehicleId).toBe("shop-vehicle-1");
  });

  it("updates and deletes sales", async () => {
    await dispatch(
      api.endpoints.updateShopSale.initiate({
        id: "s1",
        body: { ratePerKg: 320 },
      }),
    );
    expect(requests[0]).toMatchObject({
      url: "/shop/sales/s1",
      method: "PATCH",
    });
    await dispatch(api.endpoints.deleteShopSale.initiate("s2"));
    expect(requests.find((r) => r.method === "DELETE")).toMatchObject({
      url: "/shop/sales/s2",
      method: "DELETE",
    });
  });

  it("gets stock from /shop/stock", async () => {
    await dispatch(api.endpoints.getShopStock.initiate());
    expect(requests[0].url).toBe("/shop/stock");
  });

  it("posts writeoff with correct body shape (no departmentId — backend resolves it)", async () => {
    const body = {
      quantityKg: 2,
      reason: "spoilage" as const,
      writeoffDate: "2026-07-12",
      stockType: "live" as const,
    };
    await dispatch(api.endpoints.createShopStockWriteoff.initiate(body));
    expect(requests[0]).toMatchObject({
      url: "/shop/stock/writeoffs",
      method: "POST",
      body,
    });
  });

  it("cleans undefined report params", async () => {
    await dispatch(
      api.endpoints.getShopProfitLoss.initiate({
        from: "2026-01-01",
        to: undefined,
      }),
    );
    expect(requests[0]).toMatchObject({
      url: "/shop/reports/profit-loss",
      params: { from: "2026-01-01" },
    });
    expect(requests[0].params).not.toHaveProperty("to");
  });

  it("invalidates ShopSale LIST and FreshChickenStock after createShopSale", async () => {
    const sub = (
      store.dispatch as unknown as (
        a: unknown,
      ) => Promise<unknown> & { unsubscribe: () => void }
    )(api.endpoints.listShopSales.initiate());
    await sub;
    await dispatch(
      api.endpoints.createShopSale.initiate({
        quantityKg: 0.75,
        ratePerKg: 100,
        paymentMethod: "cash",
        saleDate: "2026-07-12",
      }),
    );
    await vi.waitFor(() =>
      expect(
        requests.filter((r) => r.url === "/shop/sales" && !r.method),
      ).toHaveLength(2),
    );
    (sub as unknown as { unsubscribe: () => void }).unsubscribe();
  });
});
