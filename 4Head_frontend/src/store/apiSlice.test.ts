import { configureStore } from "@reduxjs/toolkit";

vi.mock("@/lib/auth-cookies", () => ({
  clearAuthCookies: vi.fn(),
  getCsrfToken: () => "csrf-token",
}));

describe("apiSlice refresh concurrency", () => {
  it("performs exactly one refresh for five simultaneous 401 responses", async () => {
    let refreshCalls = 0;
    let sessionRefreshed = false;

    const fetchMock = vi.fn(async (input: RequestInfo | URL) => {
      const request = input instanceof Request ? input : new Request(input);
      if (request.url.endsWith("/auth/refresh")) {
        refreshCalls += 1;
        sessionRefreshed = true;
        await Promise.resolve();
        return new Response(JSON.stringify({ data: null }), {
          status: 200,
          headers: { "content-type": "application/json" },
        });
      }

      if (sessionRefreshed) {
        return new Response(JSON.stringify({ data: { ok: true } }), {
          status: 200,
          headers: { "content-type": "application/json" },
        });
      }

      return new Response(JSON.stringify({ message: "expired" }), {
        status: 401,
        headers: { "content-type": "application/json" },
      });
    });
    vi.stubGlobal("fetch", fetchMock);

    const { apiSlice } = await import("./apiSlice");
    const auditApi = apiSlice.injectEndpoints({
      endpoints: (builder) => ({
        auditWidget: builder.query<unknown, number>({
          query: (id) => `/audit/widgets/${id}`,
        }),
      }),
    });
    const store = configureStore({
      reducer: { [auditApi.reducerPath]: auditApi.reducer },
      middleware: (getDefault) => getDefault().concat(auditApi.middleware),
    });

    const results = await Promise.all(
      [1, 2, 3, 4, 5].map((id) =>
        store.dispatch(auditApi.endpoints.auditWidget.initiate(id)),
      ),
    );

    expect(refreshCalls).toBe(1);
    expect(results.every((result) => result.isSuccess)).toBe(true);
    vi.unstubAllGlobals();
  });
});

describe("API request timeout", () => {
  it("ends a stalled request without repeating a payment mutation", async () => {
    vi.useFakeTimers();
    const fetchMock = vi.fn((input: RequestInfo | URL) => {
      const request = input as Request;
      return new Promise<Response>((_resolve, reject) =>
        request.signal.addEventListener(
          "abort",
          () => reject(request.signal.reason),
          { once: true },
        ),
      );
    });
    vi.stubGlobal("fetch", fetchMock);
    const { apiSlice } = await import("./apiSlice");
    const timeoutApi = apiSlice.injectEndpoints({
      endpoints: (builder) => ({
        timeoutPayment: builder.mutation<unknown, void>({
          query: () => ({
            url: "/accounts/test-payment",
            method: "POST",
            body: {},
          }),
        }),
      }),
    });
    const store = configureStore({
      reducer: { [timeoutApi.reducerPath]: timeoutApi.reducer },
      middleware: (defaults) => defaults().concat(timeoutApi.middleware),
    });
    try {
      const request = store.dispatch(
        timeoutApi.endpoints.timeoutPayment.initiate(),
      );
      await vi.advanceTimersByTimeAsync(45001);
      const result = await request;
      expect(result.error).toEqual({
        status: "TIMEOUT_ERROR",
        error: expect.any(String),
      });
      expect(fetchMock).toHaveBeenCalledTimes(1);
      store.dispatch(timeoutApi.util.resetApiState());
    } finally {
      vi.useRealTimers();
      vi.unstubAllGlobals();
    }
  });
});
