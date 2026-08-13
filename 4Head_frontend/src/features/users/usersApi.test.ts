import { configureStore } from "@reduxjs/toolkit";

interface RequestRecord {
  url: string;
  method?: string;
  body?: unknown;
}

const requests: RequestRecord[] = [];

vi.mock("@/store/apiSlice", async () => {
  const { createApi } = await import("@reduxjs/toolkit/query/react");
  return {
    apiSlice: createApi({
      reducerPath: "api",
      baseQuery: (request: string | RequestRecord) => {
        const normalized =
          typeof request === "string" ? { url: request } : request;
        requests.push(normalized);
        return normalized.url === "/users"
          ? { data: { data: [] } }
          : { data: { data: {} } };
      },
      tagTypes: ["User"],
      endpoints: () => ({}),
    }),
  };
});

describe("usersApi", () => {
  it("uses the exact user routes and invalidates the list", async () => {
    const { usersApi } = await import("./usersApi");
    const store = configureStore({
      reducer: { [usersApi.reducerPath]: usersApi.reducer },
      middleware: (getDefaultMiddleware) =>
        getDefaultMiddleware().concat(usersApi.middleware),
    });

    const subscription = store.dispatch(
      usersApi.endpoints.listUsers.initiate(),
    );
    await subscription;
    await store.dispatch(
      usersApi.endpoints.createUser.initiate({
        fullName: "New User",
        email: "new@example.com",
        password: "StrongPass1",
        roleId: "00000000-0000-4000-8000-000000000001",
      }),
    );
    await store.dispatch(
      usersApi.endpoints.updateUser.initiate({
        id: "user-1",
        body: { phone: "03001234567" },
      }),
    );
    await store.dispatch(usersApi.endpoints.deactivateUser.initiate("user-1"));
    await store.dispatch(usersApi.endpoints.activateUser.initiate("user-1"));

    expect(requests).toEqual(
      expect.arrayContaining([
        { url: "/users" },
        expect.objectContaining({ url: "/users", method: "POST" }),
        expect.objectContaining({ url: "/users/user-1", method: "PATCH" }),
        expect.objectContaining({ url: "/users/user-1", method: "DELETE" }),
        expect.objectContaining({
          url: "/users/user-1/activate",
          method: "PATCH",
        }),
      ]),
    );
    expect(
      requests.filter((request) => request.url === "/users").length,
    ).toBeGreaterThan(2);
    subscription.unsubscribe();
  });
});
