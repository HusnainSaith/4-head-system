import type { ApiResponse } from "@/types/api";
import type { Party } from "@/features/parties/types";
import type { VehicleOption } from "@/features/vehicles/vehiclesApi";
import type { PaymentAccountSelection } from "@/features/accounts/types";

export type SupplyPaymentMethod = "cash" | "bank" | "credit";
export type TransactionStatus = "posted" | "cancelled";
export type SettlementStatus = "unsettled" | "partially_settled" | "settled";
export interface Pagination { page: number; limit: number; total: number; totalPages: number; hasNextPage: boolean; hasPreviousPage: boolean }
interface TransactionBase { id: string; departmentId: string; partyId?: string; party?: Party; quantityKg: string; ratePerKg: string; totalAmount: string; paymentMethod: SupplyPaymentMethod; vehicleId?: string; vehicle?: VehicleOption; notes?: string; status: TransactionStatus; createdAt: string; updatedAt: string }
export interface SupplyPurchase extends TransactionBase { amountPaid: string; outstandingAmount: string; purchaseDate: string; sourceBrokerageSaleId?: string }
export interface SupplySale extends TransactionBase { commissionPerKg: string; amountReceived: string; outstandingAmount: string; saleDate: string }
export interface CreatePurchaseRequest extends PaymentAccountSelection { partyId?: string; quantityKg: number; ratePerKg: number; paymentMethod: SupplyPaymentMethod; amountPaid?: number; purchaseDate: string; vehicleId?: string; notes?: string }
export interface CreateSaleRequest extends PaymentAccountSelection { partyId?: string; quantityKg: number; ratePerKg: number; paymentMethod: SupplyPaymentMethod; amountReceived?: number; saleDate: string; vehicleId?: string; notes?: string }
export interface ListQuery { page?: number; limit?: number; from?: string; to?: string; paymentMethod?: SupplyPaymentMethod; partyId?: string; vehicleId?: string; status?: TransactionStatus }
export interface StockBalance { id: string; productId: string; departmentId: string; quantityKg: string; wac: string }
export interface DepartmentSummary { id: string; name: string; type: string }
export interface InternalTransfer { id: string; fromDepartmentId: string; toDepartmentId: string; fromDepartment?: DepartmentSummary; toDepartment?: DepartmentSummary; quantityKg: string; internalRatePerKg: string; totalAmount: string; amountSettled: string; remainingBalance: string; settlementStatus: SettlementStatus; transferDate: string; vehicleId?: string; vehicle?: VehicleOption; notes?: string }
export interface TransferListQuery { page?: number; limit?: number; from?: string; to?: string; settlementStatus?: SettlementStatus }
export interface CreateTransferRequest { quantityKg: number; internalRatePerKg: number; transferDate: string; vehicleId?: string; notes?: string }
export interface SettleTransferRequest extends PaymentAccountSelection { amount: number; settlementDate: string; paymentMethod: "cash" | "bank" }
export interface ProfitLossView { revenue: string; cogs: string; grossProfit: string; operatingExpenses: string; payroll: string; netProfit: string; purchaseQuantityKg: string; saleQuantityKg: string; shrinkageKg: string }
export interface StockWriteoff { id: string; quantityKg: string; ratePerKg: string; reason: "spoilage" | "mortality" | "transit_loss" | "other"; note?: string; writeoffDate: string; valuationAmount: string; stockType?: "standard" | "live" | "dressed" }
export interface ProfitLossReport { externalOnly: ProfitLossView; includingInternalTransfers: ProfitLossView }
export type PaginatedResponse<T> = ApiResponse<{ items: T[]; pagination: Pagination }>;
