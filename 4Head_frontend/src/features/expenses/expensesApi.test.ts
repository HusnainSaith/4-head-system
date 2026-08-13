import { configureStore } from "@reduxjs/toolkit";
interface Req {
  url: string;
  method?: string;
  body?: unknown;
  params?: unknown;
}
const requests: Req[] = [];
vi.mock("@/store/apiSlice", async () => {
  const { createApi: makeApi } = await import("@reduxjs/toolkit/query/react");
  return {
    apiSlice: makeApi({
      reducerPath: "api",
      baseQuery: (a: unknown) => {
        requests.push(typeof a === "string" ? { url: a } : (a as Req));
        return { data: { data: [] } };
      },
      tagTypes: ["Expense"] as const,
      endpoints: () => ({}),
    }),
  };
});
type M = typeof import("./expensesApi");
let api: M["expensesApi"];
let store: ReturnType<typeof configureStore>;
const dispatch = (a: unknown) =>
  (store.dispatch as unknown as (x: unknown) => Promise<unknown>)(a);
describe("expensesApi", () => {
  beforeAll(async () => {
    api = (await import("./expensesApi")).expensesApi;
    store = configureStore({
      reducer: { [api.reducerPath]: api.reducer },
      middleware: (g) => g().concat(api.middleware),
    });
  });
  beforeEach(() => {
    requests.length = 0;
    store.dispatch(api.util.resetApiState());
  });
  it("creates only a manual-shaped expense payload", async () => {
    const body = {
      departmentId: "d1",
      categoryId: "c1",
      amount: "100.00",
      expenseDate: "2026-07-13",
      paymentMethod: "cash" as const,
      cashAccountId: "00000000-0000-4000-8000-000000000020",
    };
    await dispatch(api.endpoints.createExpense.initiate(body));
    expect(requests[0]).toMatchObject({
      url: "/expenses",
      method: "POST",
      body,
    });
    expect(body).not.toHaveProperty("sourceType");
  });
  it("uses protected category management routes", async () => {
    await dispatch(
      api.endpoints.updateExpenseCategory.initiate({
        id: "c1",
        body: { isActive: false },
      }),
    );
    expect(requests[0]).toMatchObject({
      url: "/expenses/categories/c1",
      method: "PATCH",
    });
  });
});
