import { configureStore } from "@reduxjs/toolkit";
import { waitFor } from "@testing-library/react";
import { accountsApi } from "./accountsApi";
import { partiesApi } from "@/features/parties/partiesApi";

vi.mock("@/lib/auth-cookies", () => ({
  clearAuthCookies: vi.fn(), getCsrfToken: () => "test-token",
}));

describe("cash and bank refresh after payments", () => {
  afterEach(() => vi.unstubAllGlobals());

  it.each(["record", "edit", "delete"])("refreshes subscribed balances and statements after a payment %s", async (operation) => {
    let balance = "100.00";
    vi.stubGlobal("fetch", vi.fn(async (input: RequestInfo | URL) => {
      const request = input instanceof Request ? input : new Request(input);
      if (request.method !== "GET") balance = "250.00";
      const data = request.url.includes("statement")
        ? { closingBalance: balance, transactions: [] }
        : { totalCash: balance, totalBank: "0.00", totalFunds: balance };
      return new Response(JSON.stringify({ data }), { status: 200, headers: { "content-type": "application/json" } });
    }));
    const store = configureStore({
      reducer: { [accountsApi.reducerPath]: accountsApi.reducer },
      middleware: (g) => g().concat(accountsApi.middleware),
    });
    const params = { id: "account", from: "2026-09-29", to: "2026-09-29" };
    const subscriptions = [
      store.dispatch(accountsApi.endpoints.getAccountsSummary.initiate()),
      store.dispatch(accountsApi.endpoints.getCashStatement.initiate(params)),
      store.dispatch(accountsApi.endpoints.getBankStatement.initiate(params)),
    ];
    try {
      await Promise.all(subscriptions);
      expect(accountsApi.endpoints.getCashStatement.select(params)(store.getState()).data?.data.closingBalance).toBe("100.00");
      const body = { departmentId: "department", amount: 150, direction: "received" as const, paymentDate: "2026-09-29", paymentMethod: "cash" as const, cashAccountId: "account" };
      if (operation === "record") await store.dispatch(partiesApi.endpoints.recordPartyPayment.initiate({ id: "party", body })).unwrap();
      if (operation === "edit") await store.dispatch(partiesApi.endpoints.updatePartyPayment.initiate({ id: "party", paymentId: "payment", body })).unwrap();
      if (operation === "delete") await store.dispatch(partiesApi.endpoints.deletePartyPayment.initiate({ id: "party", paymentId: "payment" })).unwrap();
      await waitFor(() => {
        expect(accountsApi.endpoints.getAccountsSummary.select()(store.getState()).data?.data.totalCash).toBe("250.00");
        expect(accountsApi.endpoints.getCashStatement.select(params)(store.getState()).data?.data.closingBalance).toBe("250.00");
        expect(accountsApi.endpoints.getBankStatement.select(params)(store.getState()).data?.data.closingBalance).toBe("250.00");
      });
    } finally {
      subscriptions.forEach((subscription) => subscription.unsubscribe());
      store.dispatch(accountsApi.util.resetApiState());
    }
  });
});
