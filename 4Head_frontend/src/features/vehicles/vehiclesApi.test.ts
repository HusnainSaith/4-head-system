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
                limit: 20,
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
        "Vehicle",
        "VehicleFuelLog",
        "VehicleMaintenanceLog",
        "Expense",
      ] as const,
      endpoints: () => ({}),
    }),
  };
});

type Module = typeof import("./vehiclesApi");
let api: Module["vehiclesApi"];
let store: ReturnType<typeof configureStore>;
const dispatch = async (action: unknown) =>
  (store.dispatch as unknown as (value: unknown) => Promise<unknown>)(action);

describe("vehiclesApi", () => {
  beforeAll(async () => {
    api = (await import("./vehiclesApi")).vehiclesApi;
    store = configureStore({
      reducer: { [api.reducerPath]: api.reducer },
      middleware: (getDefault) => getDefault().concat(api.middleware),
    });
  });

  beforeEach(() => {
    requests.length = 0;
    store.dispatch(api.util.resetApiState());
  });

  it("filters vehicles by department", async () => {
    await dispatch(
      api.endpoints.listVehicles.initiate({
        departmentId: "d1",
        page: 1,
        limit: 100,
      }),
    );
    expect(requests[0]).toMatchObject({
      url: "/api/v1/vehicles",
      params: { departmentId: "d1", page: 1, limit: 100 },
    });
  });

  it("uses exact fuel routes and omits totalAmount", async () => {
    const body = {
      fuelDate: "2026-07-12",
      liters: 10,
      ratePerLiter: 280,
      paymentMethod: "cash" as const,
    };
    await dispatch(
      api.endpoints.createFuelLog.initiate({ vehicleId: "v1", body }),
    );
    expect(requests[0]).toMatchObject({
      url: "/api/v1/vehicles/v1/fuel-logs",
      method: "POST",
      body,
    });
    expect(body).not.toHaveProperty("totalAmount");
  });

  it("uses exact maintenance mutation routes", async () => {
    await dispatch(
      api.endpoints.updateMaintenanceLog.initiate({
        id: "m1",
        vehicleId: "v1",
        body: { cost: 500 },
      }),
    );
    await dispatch(
      api.endpoints.deleteMaintenanceLog.initiate({
        id: "m1",
        vehicleId: "v1",
      }),
    );
    expect(requests).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          url: "/api/v1/vehicles/maintenance-logs/m1",
          method: "PATCH",
        }),
        expect.objectContaining({
          url: "/api/v1/vehicles/maintenance-logs/m1",
          method: "DELETE",
        }),
      ]),
    );
  });

  it("uses exact vehicle and fuel update/delete routes", async () => {
    await dispatch(
      api.endpoints.updateVehicle.initiate({
        id: "v1",
        body: { driverUserId: "00000000-0000-4000-8000-000000000010" },
      }),
    );
    await dispatch(api.endpoints.deleteVehicle.initiate("v1"));
    await dispatch(
      api.endpoints.updateFuelLog.initiate({
        id: "f1",
        vehicleId: "v1",
        body: { liters: 12 },
      }),
    );
    await dispatch(
      api.endpoints.deleteFuelLog.initiate({ id: "f1", vehicleId: "v1" }),
    );
    expect(requests).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          url: "/api/v1/vehicles/v1",
          method: "PATCH",
        }),
        expect.objectContaining({
          url: "/api/v1/vehicles/v1",
          method: "DELETE",
        }),
        expect.objectContaining({
          url: "/api/v1/vehicles/fuel-logs/f1",
          method: "PATCH",
        }),
        expect.objectContaining({
          url: "/api/v1/vehicles/fuel-logs/f1",
          method: "DELETE",
        }),
      ]),
    );
  });
});
