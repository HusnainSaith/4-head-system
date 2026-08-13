import type { ApiResponse } from "@/types/api";
import type { PaymentAccountSelection } from "@/features/accounts/types";

export type WastagePaymentMethod = "cash" | "bank" | "credit";

interface WastageTransactionBase {
  id: string;
  departmentId: string;
  partyId?: string | null;
  quantityKg: string;
  ratePerKg: string;
  totalAmount: string;
  paymentMethod: WastagePaymentMethod;
  vehicleId?: string | null;
  notes?: string | null;
  createdAt: string;
  updatedAt: string;
  deletedAt?: string | null;
  createdBy?: string | null;
  updatedBy?: string | null;
}

export interface WastagePurchase extends WastageTransactionBase {
  amountPaid: string;
  outstandingAmount: string;
  purchaseDate: string;
}

export interface WastageSale extends WastageTransactionBase {
  commissionPerKg: string;
  amountReceived: string;
  outstandingAmount: string;
  saleDate: string;
}

/** Exact fields accepted by CreateWastagePurchaseDto. */
export interface CreatePurchaseRequest extends PaymentAccountSelection {
  partyId?: string;
  quantityKg: number;
  ratePerKg: number;
  amountPaid?: number;
  paymentMethod: WastagePaymentMethod;
  purchaseDate: string;
  vehicleId?: string;
  notes?: string;
}

/** Exact fields accepted by CreateWastageSaleDto. */
export interface CreateSaleRequest extends PaymentAccountSelection {
  partyId?: string;
  quantityKg: number;
  ratePerKg: number;
  paymentMethod: WastagePaymentMethod;
  saleDate: string;
  amountReceived?: number;
  vehicleId?: string;
  notes?: string;
}

export interface StockBalance {
  id: string;
  productId: string;
  departmentId: string;
  quantityKg: string;
  wac: string;
}

export interface ProfitLossReport {
  revenue: string;
  cogs: string;
  grossProfit: string;
  operatingExpenses: string;
  payrollExpenses: string;
  netProfit: string;
}

export interface ProfitLossParams {
  from?: string;
  to?: string;
}
export type UpdatePurchaseRequest = Partial<CreatePurchaseRequest>;
export type UpdateSaleRequest = Partial<CreateSaleRequest>;
export type PurchasesResponse = ApiResponse<WastagePurchase[]>;
export type SalesResponse = ApiResponse<WastageSale[]>;
export type PurchaseResponse = ApiResponse<WastagePurchase>;
export type SaleResponse = ApiResponse<WastageSale>;
