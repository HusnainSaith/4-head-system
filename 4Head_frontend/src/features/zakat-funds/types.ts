import type { PaymentAccountSelection } from "@/features/accounts/types";
import type { Party } from "@/features/parties/types";
import type { ApiResponse } from "@/types/api";

export type ZakatFundType = "zakat" | "fund";
export type ZakatFundStatus = "active" | "reversed";
export type AllocationMethod = "equal" | "percentage" | "manual";

export interface ZakatFundFilters {
  departmentId?: string;
  accountType?: ZakatFundType;
  calendarYear?: number;
  status?: ZakatFundStatus;
}

export interface ZakatFundDashboard {
  paid: string;
  settled: string;
  outstanding: string;
}

export interface ZakatFundPayment {
  id: string;
  departmentId: string;
  department?: { id: string; name: string };
  accountType: ZakatFundType;
  calendarYear: number;
  amount: string;
  paymentDate: string;
  paymentMethod: "cash" | "bank";
  recipientName: string;
  reference?: string | null;
  notes?: string | null;
  status: ZakatFundStatus;
}

export interface ZakatFundSettlementSplit {
  id: string;
  partyId: string;
  party?: Party;
  amount: string;
  percentage?: string | null;
}

export interface ZakatFundSettlement {
  id: string;
  departmentId: string;
  department?: { id: string; name: string };
  accountType: ZakatFundType;
  calendarYear: number;
  totalAmount: string;
  settlementDate: string;
  allocationMethod: AllocationMethod;
  reference?: string | null;
  status: ZakatFundStatus;
  splits: ZakatFundSettlementSplit[];
}

export interface RecordZakatFundPayment extends PaymentAccountSelection {
  departmentId: string;
  accountType: ZakatFundType;
  amount: string;
  paymentDate: string;
  paymentMethod: "cash" | "bank";
  recipientName: string;
  reference?: string;
  notes?: string;
}

export interface SettleZakatFund {
  departmentId: string;
  accountType: ZakatFundType;
  calendarYear: number;
  settlementDate: string;
  allocationMethod: AllocationMethod;
  splits: { partyId: string; percentage?: string; amount?: string }[];
  reference?: string;
  notes?: string;
}

export type ZakatFundDashboardResponse = ApiResponse<ZakatFundDashboard>;
export type ZakatFundPaymentsResponse = ApiResponse<ZakatFundPayment[]>;
export type ZakatFundSettlementsResponse = ApiResponse<ZakatFundSettlement[]>;
