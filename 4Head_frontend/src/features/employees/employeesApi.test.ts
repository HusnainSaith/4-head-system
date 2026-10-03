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
        "Employee",
        "EmployeeAdvance",
        "EmployeeBonus",
        "SalaryRun",
        "SalaryAccount",
        "Account",
        "ConsolidatedReport",
        "SupplyReport",
        "BrokerageReport",
        "WastageReport",
        "ShopReport",
      ] as const,
      endpoints: () => ({}),
    }),
  };
});
type Module = typeof import("./employeesApi");
let api: Module["employeesApi"];
let store: ReturnType<typeof configureStore>;
const dispatch = async (a: unknown) =>
  (store.dispatch as unknown as (x: unknown) => Promise<unknown>)(a);
describe("employeesApi", () => {
  beforeAll(async () => {
    api = (await import("./employeesApi")).employeesApi;
    store = configureStore({
      reducer: { [api.reducerPath]: api.reducer },
      middleware: (g) => g().concat(api.middleware),
    });
  });
  beforeEach(() => {
    requests.length = 0;
    store.dispatch(api.util.resetApiState());
  });
  it("passes employee department filter", async () => {
    await dispatch(
      api.endpoints.listEmployees.initiate({ departmentId: "d1" }),
    );
    expect(requests[0]).toMatchObject({
      url: "/employees",
      params: { departmentId: "d1" },
    });
  });
  it("uses advance and bonus routes", async () => {
    await dispatch(
      api.endpoints.createAdvance.initiate({
        employeeId: "e1",
        body: { amount: 100, advanceDate: "2026-07-01" },
      }),
    );
    await dispatch(
      api.endpoints.createBonus.initiate({
        employeeId: "e1",
        body: { amount: 50, bonusDate: "2026-07-01" },
      }),
    );
    expect(requests.map((r) => r.url)).toEqual([
      "/employees/e1/advances",
      "/employees/e1/bonuses",
    ]);
  });
  it("refreshes salary balances and payroll details after recording a bonus", async () => {
    await dispatch(api.endpoints.getSalaryAccount.initiate("e1"));
    await dispatch(api.endpoints.getSalaryRun.initiate("r1"));
    await dispatch(api.endpoints.listSalaryRuns.initiate({}));
    requests.length = 0;
    await dispatch(
      api.endpoints.createBonus.initiate({
        employeeId: "e1",
        body: { amount: 14999, bonusDate: "2026-09-30" },
      }),
    );
    await vi.waitFor(() => {
      expect(requests.map((request) => request.url)).toEqual(
        expect.arrayContaining([
          "/employees/e1/bonuses",
          "/employees/e1/salary-account",
          "/payroll/runs/r1",
          "/payroll/runs",
        ]),
      );
    });
  });
  it("uses the employee update, delete, and activate routes", async () => {
    await dispatch(
      api.endpoints.updateEmployee.initiate({
        id: "e1",
        body: { designation: "Manager" },
      }),
    );
    await dispatch(api.endpoints.deactivateEmployee.initiate("e1"));
    await dispatch(api.endpoints.activateEmployee.initiate("e1"));
    expect(requests).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ url: "/employees/e1", method: "PATCH" }),
        expect.objectContaining({ url: "/employees/e1", method: "DELETE" }),
        expect.objectContaining({
          url: "/employees/e1/activate",
          method: "PATCH",
        }),
      ]),
    );
  });
  it("uses employee-scoped bonus update and delete routes", async () => {
    await dispatch(
      api.endpoints.updateBonus.initiate({
        employeeId: "e1",
        bonusId: "b1",
        body: { amount: 50, bonusDate: "2026-10-01", reason: "Corrected" },
      }),
    );
    await dispatch(
      api.endpoints.deleteBonus.initiate({ employeeId: "e1", bonusId: "b1" }),
    );
    expect(requests).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          url: "/employees/e1/bonuses/b1",
          method: "PATCH",
          body: expect.objectContaining({ amount: 50 }),
        }),
        expect.objectContaining({
          url: "/employees/e1/bonuses/b1",
          method: "DELETE",
        }),
      ]),
    );
  });
  it("passes payroll filters and payment body", async () => {
    await dispatch(
      api.endpoints.listSalaryRuns.initiate({
        departmentId: "d1",
        periodMonth: 7,
        periodYear: 2026,
      }),
    );
    await dispatch(
      api.endpoints.markSalaryRunPaid.initiate({
        id: "r1",
        body: { paidDate: "2026-07-31", paymentMethod: "bank" },
      }),
    );
    expect(requests[0].params).toEqual({
      departmentId: "d1",
      periodMonth: 7,
      periodYear: 2026,
    });
    expect(requests[1]).toMatchObject({
      url: "/payroll/runs/r1/pay",
      method: "POST",
    });
  });
});
