import type { PaymentAccountSelection } from "@/features/accounts/types";
import type { Party, PaginationMeta } from "@/features/parties/types";
import type { ApiResponse } from "@/types/api";

export type InvestorType = "standard" | "brother";
export type InvestorStatus = "active" | "inactive";
export type InvestorAccountAction =
  "deposit" | "withdrawal" | "profit" | "loss" | "farm_transfer";
export type InvestorTransactionType =
  | "investment"
  | "additional_investment"
  | "capital_withdrawal"
  | "capital_refund"
  | "manual_profit"
  | "manual_loss"
  | "farm_transfer";

export interface Investor {
  id: string;
  partyId: string;
  party: Party;
  investorType: InvestorType;
  profitSharePercentage: string;
  status: InvestorStatus;
  accountBalance: string;
  notes?: string | null;
}

export interface InvestorAccountTransaction {
  id: string;
  investorId: string;
  departmentId: string;
  department?: { id: string; name: string };
  farmPartyId?: string | null;
  farmParty?: Party | null;
  transactionType: InvestorTransactionType;
  amount: string;
  balanceBefore: string;
  balanceAfter: string;
  transactionDate: string;
  paymentMethod?: "cash" | "bank" | null;
  reference?: string | null;
  notes?: string | null;
  createdAt: string;
}

export interface CreateInvestorAccount {
  partyId: string;
  investorType: InvestorType;
  notes?: string;
}

export interface RecordInvestorTransaction extends PaymentAccountSelection {
  action: InvestorAccountAction;
  departmentId: string;
  amount: string;
  transactionDate: string;
  paymentMethod?: "cash" | "bank";
  farmPartyId?: string;
  reference?: string;
  notes?: string;
}

export interface InvestorLedger {
  openingOrExternalBalance: string;
  capital: InvestorAccountTransaction[];
}

export type InvestorListResponse = ApiResponse<{
  items: Investor[];
  pagination: PaginationMeta;
}>;
export type InvestorResponse = ApiResponse<Investor>;
export type InvestorLedgerResponse = ApiResponse<InvestorLedger>;
export type InvestorTransactionResponse =
  ApiResponse<InvestorAccountTransaction>;
