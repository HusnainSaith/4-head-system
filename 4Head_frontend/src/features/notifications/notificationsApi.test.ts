import { configureStore } from "@reduxjs/toolkit";
interface RequestShape {
  url: string;
  method?: string;
  params?: unknown;
}
const requests: RequestShape[] = [];
vi.mock("@/store/apiSlice", async () => {
  const { createApi } = await import("@reduxjs/toolkit/query/react");
  return {
    apiSlice: createApi({
      reducerPath: "notificationTestApi",
      baseQuery: (arg: unknown) => {
        requests.push(
          typeof arg === "string" ? { url: arg } : (arg as RequestShape),
        );
        return {
          data: {
            success: true,
            data: { items: [], pagination: { total: 0 } },
          },
        };
      },
      tagTypes: ["Notification"] as const,
      endpoints: () => ({}),
    }),
  };
});
type Module = typeof import("./notificationsApi");
let api: Module["notificationsApi"];
let store: ReturnType<typeof configureStore>;
const dispatch = (action: unknown) =>
  (store.dispatch as unknown as (value: unknown) => Promise<unknown>)(action);

describe("notificationsApi", () => {
  beforeAll(async () => {
    api = (await import("./notificationsApi")).notificationsApi;
    store = configureStore({
      reducer: { [api.reducerPath]: api.reducer },
      middleware: (getDefault) => getDefault().concat(api.middleware),
    });
  });
  beforeEach(() => {
    requests.length = 0;
    store.dispatch(api.util.resetApiState());
  });
  it("passes status and source filters", async () => {
    await dispatch(
      api.endpoints.getNotifications.initiate({
        status: "failed",
        sourceType: "sale",
      }),
    );
    expect(requests[0]).toMatchObject({
      url: "/notifications",
      params: { status: "failed", sourceType: "sale" },
    });
  });
  it("posts to the retry endpoint", async () => {
    await dispatch(api.endpoints.retryNotification.initiate("notification-1"));
    expect(requests[0]).toMatchObject({
      url: "/notifications/notification-1/retry",
      method: "POST",
    });
  });
  it("posts to the resend endpoint", async () => {
    await dispatch(api.endpoints.resendNotification.initiate("notification-1"));
    expect(requests[0]).toMatchObject({
      url: "/notifications/notification-1/resend",
      method: "POST",
    });
  });
  it("deletes a notification through its soft-delete endpoint", async () => {
    await dispatch(api.endpoints.deleteNotification.initiate("notification-1"));
    expect(requests[0]).toMatchObject({
      url: "/notifications/notification-1",
      method: "DELETE",
    });
  });
});
