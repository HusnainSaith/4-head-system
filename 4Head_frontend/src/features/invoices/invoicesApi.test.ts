import { configureStore } from "@reduxjs/toolkit";
interface RequestShape {
  url: string;
  method?: string;
  params?: unknown;
  responseHandler?: unknown;
}
const requests: RequestShape[] = [];
vi.mock("@/store/apiSlice", async () => {
  const { createApi } = await import("@reduxjs/toolkit/query/react");
  return {
    apiSlice: createApi({
      reducerPath: "invoiceTestApi",
      baseQuery: (arg: unknown) => {
        requests.push(
          typeof arg === "string" ? { url: arg } : (arg as RequestShape),
        );
        return { data: { success: true, data: null } };
      },
      tagTypes: ["Invoice"] as const,
      endpoints: () => ({}),
    }),
  };
});
type Module = typeof import("./invoicesApi");
let api: Module["invoicesApi"];
let store: ReturnType<typeof configureStore>;
const dispatch = (action: unknown) =>
  (store.dispatch as unknown as (value: unknown) => Promise<unknown>)(action);

describe("invoicesApi", () => {
  beforeAll(async () => {
    api = (await import("./invoicesApi")).invoicesApi;
    store = configureStore({
      reducer: { [api.reducerPath]: api.reducer },
      middleware: (getDefault) => getDefault().concat(api.middleware),
    });
  });
  beforeEach(() => {
    requests.length = 0;
    store.dispatch(api.util.resetApiState());
  });
  it("passes list filters as query parameters", async () => {
    await dispatch(
      api.endpoints.getInvoices.initiate({ page: 2, invoiceType: "sale" }),
    );
    expect(requests[0]).toMatchObject({
      url: "/invoices",
      params: { page: 2, invoiceType: "sale" },
    });
  });
  it("uses the by-source route", async () => {
    await dispatch(
      api.endpoints.getInvoiceBySource.initiate({
        sourceType: "internal_transfer",
        sourceId: "source-1",
      }),
    );
    expect(requests[0]).toMatchObject({
      url: "/invoices/by-source/internal_transfer/source-1",
    });
  });
  it("posts to the by-source route when generating a missing invoice", async () => {
    await dispatch(
      api.endpoints.ensureInvoiceBySource.initiate({
        sourceType: "sale",
        sourceId: "source-1",
      }),
    );
    expect(requests[0]).toMatchObject({
      url: "/invoices/by-source/sale/source-1",
      method: "POST",
    });
  });
  it("configures PDF responses as blobs", async () => {
    await dispatch(api.endpoints.downloadInvoicePdf.initiate("invoice-1"));
    expect(requests[0]?.url).toBe("/invoices/invoice-1/pdf");
    expect(requests[0]?.responseHandler).toBeTypeOf("function");
  });
});
