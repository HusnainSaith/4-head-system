import { createApi as makeApi } from "@reduxjs/toolkit/query/react";

export const apiSlice = makeApi({
  reducerPath: "api",
  baseQuery: () => ({ data: null }),
  tagTypes: [
    "Party",
    "PartyStatement",
    "BrokeragePurchase",
    "BrokerageSale",
    "BrokerageStock",
    "BrokerageReport",
    "BrokerageStockMovement",
    "WastagePurchase",
    "WastageSale",
    "WastageStock",
    "WastageReport",
    "SupplyPurchase",
    "SupplySale",
    "SupplyStock",
    "SupplyReport",
    "InternalTransfer",
    "FreshChickenStock",
    "ShopSale",
    "ShopReport",
  ] as const,
  endpoints: () => ({}),
});
