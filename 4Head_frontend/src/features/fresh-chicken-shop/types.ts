import type { ApiResponse } from "@/types/api";
import type { PaymentAccountSelection } from "@/features/accounts/types";
// Reuse InternalTransfer from supply — same entity, same shape
export type { InternalTransfer } from "@/features/supply/types";

export interface ShopSale {
  id: string;
  departmentId: string;
  customerPartyId?: string | null;
  customerParty?: { id: string; name: string; partyType: string } | null;
  vehicleId?: string | null;
  vehicle?: { id: string; registrationNumber: string } | null;
  quantityKg: string;
  ratePerKg: string;
  wacAtSale: string;
  totalAmount: string;
  profitMarginPerKg: string;
  paymentMethod: "cash" | "bank" | "credit";
  amountReceived: string;
  outstandingAmount: string;
  saleDate: string;
  notes?: string | null;
  createdAt: string;
  updatedAt: string;
  deletedAt?: string | null;
}

/** Mirrors CreateShopSaleDto. Derived amounts are backend-owned. */
export interface CreateSaleRequest extends PaymentAccountSelection {
  customerPartyId?: string;
  vehicleId?: string;
  quantityKg: number;
  ratePerKg: number;
  paymentMethod: "cash" | "bank" | "credit";
  amountReceived?: number;
  saleDate: string;
  notes?: string;
}

export type UpdateSaleRequest = Partial<CreateSaleRequest>;

/** Mirrors StockWriteoff entity fields accepted by the shop writeoff handler */
export interface StockWriteoffRequest {
  quantityKg: number;
  ratePerKg: number;
  reason: "spoilage" | "mortality" | "transit_loss" | "other";
  note?: string;
  writeoffDate: string;
  stockType: "live" | "dressed";
}

export interface StockWriteoffResponse {
  id: string;
  departmentId: string;
  quantityKg: string;
  ratePerKg: string;
  reason: string;
  note: string | null;
  writeoffDate: string;
  valuationAmount: string;
  stockType: "standard" | "live" | "dressed";
}

/** Mirrors InventoryService.getBalance return shape */
export interface StockBalance {
  id: string;
  productId: string;
  departmentId: string;
  quantityKg: string;
  wac: string;
  stockType: "standard" | "live" | "dressed";
}

export interface ShopStockPools {
  live: StockBalance;
  dressed: StockBalance;
}

export interface DressingBatch {
  id: string;
  departmentId: string;
  liveWeightKg: string;
  dressedWeightKg: string;
  shrinkageKg: string;
  liveWacAtProcessing: string;
  dressedCostPerKg: string;
  processingLossAmount: string;
  batchDate: string;
  notes?: string;
}

export interface CreateDressingBatchRequest {
  liveWeightKg: number;
  dressedWeightKg: number;
  batchDate: string;
  notes?: string;
}

export interface ProcessingYield {
  liveWeightKg: string;
  dressedWeightKg: string;
  shrinkageKg: string;
  yieldPercentage: string;
  processingLossAmount: string;
  batchCount: number;
}

/** Mirrors FreshChickenShopService.getProfitLoss return — single set, no grossProfit */
export interface ProfitLossReport {
  revenue: string;
  cogs: string;
  operatingExpenses: string;
  payrollExpenses: string;
  netProfit: string;
  purchaseQuantityKg: string;
  saleQuantityKg: string;
  shrinkageKg: string;
}

export type SaleResponse = ApiResponse<ShopSale>;
export type SalesResponse = ApiResponse<ShopSale[]>;
export type StockResponse = ApiResponse<ShopStockPools>;
export type WriteoffResponse = ApiResponse<StockWriteoffResponse>;
export type ProfitLossResponse = ApiResponse<ProfitLossReport>;
