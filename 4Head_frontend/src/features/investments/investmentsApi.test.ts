import { configureStore } from "@reduxjs/toolkit";

const captured: Array<{
  url: string;
  method?: string;
  body?: unknown;
  params?: unknown;
}> = [];
vi.mock("@/store/apiSlice", async () => {
  const { createApi } = await import("@reduxjs/toolkit/query/react");
  return {
    apiSlice: createApi({
      reducerPath: "api",
      baseQuery: (
        args:
          | string
          | { url: string; method?: string; body?: unknown; params?: unknown },
      ) => {
        captured.push(typeof args === "string" ? { url: args } : args);
        return { data: { data: { items: [] } } };
      },
      tagTypes: ["Investment", "DepartmentBalance", "Account"],
      endpoints: () => ({}),
    }),
  };
});

describe("investmentsApi", () => {
  it("builds investor account and unified transaction requests", async () => {
    const { investmentsApi } = await import("./investmentsApi");
    const store = configureStore({
      reducer: { [investmentsApi.reducerPath]: investmentsApi.reducer },
      middleware: (getDefault) =>
        getDefault().concat(investmentsApi.middleware),
    });
    const dispatch = store.dispatch as (action: unknown) => Promise<unknown>;
    await dispatch(
      investmentsApi.endpoints.createInvestor.initiate({
        partyId: "party-1",
        investorType: "standard",
      }),
    );
    await dispatch(
      investmentsApi.endpoints.recordInvestorTransaction.initiate({
        id: "investor-1",
        partyId: "party-1",
        body: {
          action: "profit",
          departmentId: "department-1",
          amount: "2500.00",
          transactionDate: "2026-08-12",
        },
      }),
    );
    expect(captured).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ url: "/investors", method: "POST" }),
        expect.objectContaining({
          url: "/investors/investor-1/transactions",
          method: "POST",
          body: expect.objectContaining({ action: "profit" }),
        }),
      ]),
    );
  });
});
