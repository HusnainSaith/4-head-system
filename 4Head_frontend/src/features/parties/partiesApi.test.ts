/**
 * partiesApi — query-param construction tests.
 *
 * Strategy: mock @/store/apiSlice with a real RTK Query API backed by a
 * capturing baseQuery. Dispatch each endpoint's initiate() thunk through a
 * real store and assert the URL + params the baseQuery receives — this is
 * exactly what fetchBaseQuery would forward to the network.
 */
import { configureStore } from "@reduxjs/toolkit";
import { PartyType } from "@/features/parties/types";

interface Captured {
  url: string;
  params?: Record<string, unknown>;
  method?: string;
  body?: unknown;
}

// Shared capture array — reset before each test.
const captured: Captured[] = [];

vi.mock("@/store/apiSlice", async () => {
  const { createApi: makeApi } = await import("@reduxjs/toolkit/query/react");
  return {
    apiSlice: makeApi({
      reducerPath: "api",
      baseQuery: (args: unknown) => {
        if (typeof args === "string") {
          captured.push({ url: args });
        } else {
          const { url, params, method, body } = args as Captured;
          captured.push({ url, params, method, body });
        }
        return { data: { success: true, data: [] } };
      },
      tagTypes: ["Party", "PartyStatement", "DepartmentBalance"] as const,
      endpoints: () => ({}),
    }),
  };
});

type PartiesApiModule = typeof import("@/features/parties/partiesApi");
let partiesApi: PartiesApiModule["partiesApi"];
let store: ReturnType<typeof configureStore>;

async function dispatch(action: unknown) {
  await (store.dispatch as (a: unknown) => Promise<unknown>)(action);
}

describe("partiesApi — query builders", () => {
  beforeAll(async () => {
    const mod = await import("@/features/parties/partiesApi");
    partiesApi = mod.partiesApi;
    store = configureStore({
      reducer: { [partiesApi.reducerPath]: partiesApi.reducer },
      middleware: (gDM) => gDM().concat(partiesApi.middleware),
    });
  });

  beforeEach(() => {
    captured.length = 0;
  });

  describe("listParties", () => {
    it("sends no params when called with no arguments", async () => {
      await dispatch(partiesApi.endpoints.listParties.initiate(undefined));
      expect(captured[0].url).toBe("/parties");
      expect(captured[0].params).toBeUndefined();
    });

    it("sends type param when a party type filter is provided", async () => {
      await dispatch(
        partiesApi.endpoints.listParties.initiate({ type: PartyType.FARM }),
      );
      expect(captured[0].url).toBe("/parties");
      expect(captured[0].params).toMatchObject({ type: PartyType.FARM });
    });

    it("sends page and limit for server pagination", async () => {
      await dispatch(
        partiesApi.endpoints.listParties.initiate({ page: 2, limit: 10 }),
      );
      expect(captured[0].params).toMatchObject({ page: 2, limit: 10 });
    });

    it("sends departmentId param when provided", async () => {
      await dispatch(
        partiesApi.endpoints.listParties.initiate({ departmentId: "dept-abc" }),
      );
      expect(captured[0].url).toBe("/parties");
      expect(captured[0].params).toMatchObject({ departmentId: "dept-abc" });
    });

    it("sends both type and departmentId when both are provided", async () => {
      await dispatch(
        partiesApi.endpoints.listParties.initiate({
          type: PartyType.BROKER,
          departmentId: "dept-xyz",
        }),
      );
      expect(captured[0].url).toBe("/parties");
      expect(captured[0].params).toMatchObject({
        type: PartyType.BROKER,
        departmentId: "dept-xyz",
      });
    });
  });

  describe("getParty", () => {
    it("builds the correct single-party URL", async () => {
      await dispatch(partiesApi.endpoints.getParty.initiate("party-abc"));
      expect(captured[0].url).toBe("/parties/party-abc");
    });
  });

  describe("getPartyStatement", () => {
    it("uses the path as the single source of the party ID", async () => {
      await dispatch(
        partiesApi.endpoints.getPartyStatement.initiate({ id: "party-1" }),
      );
      expect(captured[0].url).toBe("/parties/party-1/statement");
      expect(captured[0].params).not.toHaveProperty("partyId");
    });

    it("sends startDate and endDate when provided", async () => {
      await dispatch(
        partiesApi.endpoints.getPartyStatement.initiate({
          id: "party-1",
          startDate: "2025-01-01",
          endDate: "2025-06-30",
        }),
      );
      expect(captured[0].url).toBe("/parties/party-1/statement");
      expect(captured[0].params).toMatchObject({
        startDate: "2025-01-01",
        endDate: "2025-06-30",
      });
    });

    it("omits startDate/endDate when not provided", async () => {
      // Use a different id to avoid RTK Query cache deduplication with the previous test.
      await dispatch(
        partiesApi.endpoints.getPartyStatement.initiate({ id: "party-2" }),
      );
      expect(captured[0].params?.startDate).toBeUndefined();
      expect(captured[0].params?.endDate).toBeUndefined();
    });
  });

  describe("recordPartyPayment", () => {
    it("posts to the correct URL with POST method", async () => {
      await dispatch(
        partiesApi.endpoints.recordPartyPayment.initiate({
          id: "party-1",
          body: {
            amount: 100,
            direction: "received",
            paymentDate: "2025-01-01",
            paymentMethod: "cash",
          },
        }),
      );
      expect(captured[0].url).toBe("/parties/party-1/payments");
      expect(captured[0].method).toBe("POST");
    });

    it("forwards the payment body verbatim", async () => {
      const payload = {
        departmentId: "dept-1",
        amount: 500,
        direction: "received" as const,
        paymentDate: "2025-01-15",
        paymentMethod: "cash" as const,
      };
      await dispatch(
        partiesApi.endpoints.recordPartyPayment.initiate({
          id: "party-1",
          body: payload,
        }),
      );
      expect(captured[0].body).toMatchObject(payload);
    });

    it("invalidates and refetches the department balance", async () => {
      await dispatch(
        partiesApi.endpoints.getDepartmentBalances.initiate("wastage"),
      );
      expect(
        captured.filter(
          (request) => request.url === "/departments/wastage/party-balances",
        ),
      ).toHaveLength(1);

      await dispatch(
        partiesApi.endpoints.recordPartyPayment.initiate({
          id: "party-balance",
          body: {
            departmentId: "dept-1",
            amount: 50,
            direction: "paid",
            paymentDate: "2025-01-01",
            paymentMethod: "cash",
          },
        }),
      );

      await vi.waitFor(() => {
        expect(
          captured.filter(
            (request) => request.url === "/departments/wastage/party-balances",
          ),
        ).toHaveLength(2);
      });
    });

    it("invalidates and refetches the matching party statement", async () => {
      await dispatch(
        partiesApi.endpoints.getPartyStatement.initiate({
          id: "party-refetch",
        }),
      );
      expect(
        captured.filter(
          (request) => request.url === "/parties/party-refetch/statement",
        ),
      ).toHaveLength(1);

      await dispatch(
        partiesApi.endpoints.recordPartyPayment.initiate({
          id: "party-refetch",
          body: {
            amount: 250,
            direction: "received",
            paymentDate: "2025-01-01",
            paymentMethod: "cash",
          },
        }),
      );

      await vi.waitFor(() => {
        expect(
          captured.filter(
            (request) => request.url === "/parties/party-refetch/statement",
          ),
        ).toHaveLength(2);
      });
    });
  });

  describe("getDepartmentBalances", () => {
    it("builds the department-scoped balance URL", async () => {
      await dispatch(
        partiesApi.endpoints.getDepartmentBalances.initiate("brokerage"),
      );
      expect(captured[0].url).toBe("/departments/brokerage/party-balances");
    });
  });

  describe("createParty", () => {
    it("posts to /parties", async () => {
      await dispatch(
        partiesApi.endpoints.createParty.initiate({
          name: "Test Farm",
          partyType: PartyType.FARM,
          departmentIds: ["department-supply"],
        }),
      );
      expect(captured[0].url).toBe("/parties");
      expect(captured[0].method).toBe("POST");
    });
  });

  describe("updateParty", () => {
    it("patches the correct party URL", async () => {
      await dispatch(
        partiesApi.endpoints.updateParty.initiate({
          id: "party-1",
          body: { name: "Updated" },
        }),
      );
      expect(captured[0].url).toBe("/parties/party-1");
      expect(captured[0].method).toBe("PATCH");
    });
  });

  describe("deleteParty", () => {
    it("deletes the correct party URL", async () => {
      await dispatch(partiesApi.endpoints.deleteParty.initiate("party-1"));
      expect(captured[0].url).toBe("/parties/party-1");
      expect(captured[0].method).toBe("DELETE");
    });
  });
});
