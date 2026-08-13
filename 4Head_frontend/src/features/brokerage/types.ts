import type { ApiResponse } from "@/types/api";
import type { Party } from "@/features/parties/types";
import type { PaymentAccountSelection } from "@/features/accounts/types";

export type BrokeragePaymentMethod = "cash" | "bank" | "credit";
export type BrokeragePurchaseStatus = "active" | "cancelled";
export type BrokerageSaleStatus = "active" | "cancelled";

export interface PartySummary {
  id: string;
  name: string;
  partyType: string;
  phone: string | null;
}

export interface VehicleSummary {
  id: string;
  registrationNumber: string;
  make: string;
  model: string;
}

interface BrokerageBase {
  id: string;
  departmentId: string;
  partyId: string | null;
  party?: Party | null;
  vehicleId: string | null;
  vehicle?: VehicleSummary | null;
  quantityKg: string;
  ratePerKg: string;
  totalAmount: string;
  amountPaid: string;
  outstandingAmount: string;
  paymentMethod: BrokeragePaymentMethod;
  description: string | null;
  status: BrokeragePurchaseStatus;
  createdAt: string;
  updatedAt: string;
  deletedAt: string | null;
}

export interface BrokeragePurchase extends BrokerageBase {
  purchaseDate: string;
  financedAmount: string;
}

export interface BrokerageSale extends BrokerageBase {
  destinationType: "external" | "supply";
  commissionPerKg: string;
  commissionAmount: string;
  amountReceived: string;
  saleDate: string;
}

export interface PaginationMeta {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
  hasNextPage: boolean;
  hasPreviousPage: boolean;
}

export interface PaginatedData<T> {
  items: T[];
  pagination: PaginationMeta;
}

export type PaginatedPurchasesResponse = ApiResponse<
  PaginatedData<BrokeragePurchase>
>;
export type PaginatedSalesResponse = ApiResponse<PaginatedData<BrokerageSale>>;
export type PurchaseResponse = ApiResponse<BrokeragePurchase>;
export type SaleResponse = ApiResponse<BrokerageSale>;

export interface PurchaseListQuery {
  page?: number;
  limit?: number;
  from?: string;
  to?: string;
  paymentMethod?: BrokeragePaymentMethod;
  partyId?: string;
  vehicleId?: string;
  search?: string;
  status?: BrokeragePurchaseStatus;
}

export interface SaleListQuery {
  page?: number;
  limit?: number;
  from?: string;
  to?: string;
  paymentMethod?: BrokeragePaymentMethod;
  partyId?: string;
  vehicleId?: string;
  search?: string;
  status?: BrokerageSaleStatus;
}

export interface CreatePurchaseRequest extends PaymentAccountSelection {
  partyId?: string;
  vehicleId?: string;
  quantityKg: number;
  ratePerKg: number;
  amountPaid?: number;
  paymentMethod: BrokeragePaymentMethod;
  purchaseDate: string;
  description?: string;
}

export type UpdatePurchaseRequest = Partial<CreatePurchaseRequest>;

export interface CreateSaleRequest extends PaymentAccountSelection {
  destinationType?: "external" | "supply";
  partyId?: string;
  vehicleId?: string;
  quantityKg: number;
  ratePerKg: number;
  amountReceived?: number;
  paymentMethod: BrokeragePaymentMethod;
  saleDate: string;
  description?: string;
}

export type UpdateSaleRequest = Partial<CreateSaleRequest>;

export interface BrokerageStockBalance {
  id: string;
  productId: string;
  departmentId: string;
  quantityKg: string;
  wac: string;
}

export type StockWriteoffReason =
  "spoilage" | "mortality" | "transit_loss" | "other";

export interface StockWriteoffRequest {
  departmentId?: string;
  quantityKg: number;
  reason: StockWriteoffReason;
  note?: string;
  writeoffDate: string;
}

export interface StockWriteoffResponse {
  id: string;
  departmentId: string;
  quantityKg: string;
  reason: StockWriteoffReason;
  note: string | null;
  writeoffDate: string;
  valuationAmount: string;
}

export interface BrokerageProfitLoss {
  revenue: string;
  cogs: string;
  operatingExpenses: string;
  payrollExpenses: string;
  netProfit: string;
}

export interface ProfitLossParams {
  from?: string;
  to?: string;
}
