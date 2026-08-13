import { configureStore } from "@reduxjs/toolkit";

interface Captured { url: string; params?: Record<string, unknown>; method?: string; body?: unknown }
const captured: Captured[] = [];
vi.mock("@/store/apiSlice", async () => {
  const { createApi: makeApi } = await import("@reduxjs/toolkit/query/react");
  return { apiSlice: makeApi({ reducerPath: "api", baseQuery: (args: unknown) => { captured.push(typeof args === "string" ? { url: args } : args as Captured); return { data: [] }; }, tagTypes: ["BrokeragePurchase", "BrokerageSale", "BrokerageStock", "BrokerageReport", "SupplyPurchase", "SupplyStock", "SupplyReport", "BrokerageStockMovement", "DepartmentBalance", "ConsolidatedReport"] as const, endpoints: () => ({}) }) };
});

type Module = typeof import("./brokerageApi");
let api: Module["brokerageApi"]; let store: ReturnType<typeof configureStore>;
const dispatch = async (action: unknown) => { await (store.dispatch as (value: unknown) => Promise<unknown>)(action); };

describe("brokerageApi request contracts", () => {
  beforeAll(async () => { api=(await import("./brokerageApi")).brokerageApi; store=configureStore({reducer:{[api.reducerPath]:api.reducer},middleware:(g)=>g().concat(api.middleware)}); });
  beforeEach(()=>{captured.length=0;});
  it("lists and creates purchases", async()=>{ await dispatch(api.endpoints.listBrokeragePurchases.initiate()); expect(captured[0].url).toBe("/brokerage/purchases"); await dispatch(api.endpoints.createBrokeragePurchase.initiate({quantityKg:10,ratePerKg:200,paymentMethod:"cash",purchaseDate:"2026-07-12"})); expect(captured.find((r)=>r.method==="POST")).toMatchObject({url:"/brokerage/purchases",method:"POST",body:{quantityKg:10,ratePerKg:200}}); });
  it("updates and deletes purchases", async()=>{ await dispatch(api.endpoints.updateBrokeragePurchase.initiate({id:"p1",body:{ratePerKg:220}})); expect(captured[0]).toMatchObject({url:"/brokerage/purchases/p1",method:"PATCH"}); await dispatch(api.endpoints.deleteBrokeragePurchase.initiate("p2")); expect(captured.find((r)=>r.method==="DELETE")).toMatchObject({url:"/brokerage/purchases/p2",method:"DELETE"}); });
  it("uses exact sale routes and never sends commission", async()=>{ const body={quantityKg:5,ratePerKg:300,paymentMethod:"credit" as const,saleDate:"2026-07-12"}; await dispatch(api.endpoints.createBrokerageSale.initiate(body)); expect(captured[0]).toMatchObject({url:"/brokerage/sales",method:"POST",body}); expect(captured[0].body).not.toHaveProperty("commissionPerKg"); });
  it("sends the explicit Supply destination", async()=>{ const body={destinationType:"supply" as const,quantityKg:12,ratePerKg:325,paymentMethod:"credit" as const,amountReceived:0,saleDate:"2026-07-17"}; await dispatch(api.endpoints.createBrokerageSale.initiate(body)); expect(captured[0]).toMatchObject({url:"/brokerage/sales",method:"POST",body}); });
  it("gets stock and posts exact write-off reason", async()=>{ await dispatch(api.endpoints.getBrokerageStock.initiate()); expect(captured[0].url).toBe("/brokerage/stock"); await dispatch(api.endpoints.createBrokerageStockWriteoff.initiate({departmentId:"d1",quantityKg:1,reason:"transit_loss",writeoffDate:"2026-07-12"})); expect(captured.find((r)=>r.method==="POST")).toMatchObject({url:"/brokerage/stock/writeoffs",method:"POST",body:{reason:"transit_loss"}}); });
  it("cleans report date parameters", async()=>{ await dispatch(api.endpoints.getBrokerageProfitLoss.initiate({from:"2026-01-01",to:undefined})); expect(captured[0]).toMatchObject({url:"/brokerage/reports/profit-loss",params:{from:"2026-01-01"}}); expect(captured[0].params).not.toHaveProperty("to"); });
});
