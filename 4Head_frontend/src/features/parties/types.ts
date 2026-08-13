import type { ApiResponse } from "@/types/api";
import type { PaymentAccountSelection } from "@/features/accounts/types";

/** Mirrors backend common/types/party-type.enum.ts exactly. */
export enum PartyType {
  FARM = "farm",
  BROKER = "broker",
  SHOP_OWNER = "shop_owner",
  CUSTOMER = "customer",
  FACTORY = "factory",
  INTERNAL_DEPARTMENT = "internal_department",
  RANDOM_USER = "random_user",
  INVESTOR = "investor",
}

export interface PartyDepartment {
  id: string;
  name: string;
}

/** Serialized Party entity. Nullable columns are returned as null by TypeORM. */
export interface Party {
  id: string;
  userId: string | null;
  partyType: PartyType;
  name: string;
  phone: string | null;
  address: string | null;
  linkedDepartmentId: string | null;
  linkedDepartment?: PartyDepartment | null;
  primaryDepartmentId: string | null;
  primaryDepartment?: PartyDepartment | null;
  departments: PartyDepartment[];
  openingBalance: string;
  notes: string | null;
  createdAt: string;
  updatedAt: string;
  deletedAt: string | null;
  createdBy: string | null;
  updatedBy: string | null;
}

/** Exact CreatePartyDto fields. openingBalance: positive = party owes business; negative = business owes party. */
export interface CreatePartyRequest {
  userId?: string;
  partyType: PartyType;
  name: string;
  phone?: string;
  address?: string;
  linkedDepartmentId?: string;
  primaryDepartmentId?: string;
  departmentIds: string[];
  notes?: string;
  /** Positive = party owes the business (receivable). Negative = business owes the party (payable). */
  openingBalance?: number;
}

/** Exact UpdatePartyDto fields; openingBalance is create-only. */
export type UpdatePartyRequest = Partial<
  Omit<CreatePartyRequest, "openingBalance">
>;

export type LedgerEntryType = "debit" | "credit";
export type LedgerSourceType =
  | "purchase"
  | "sale"
  | "internal_transfer"
  | "payment"
  | "expense"
  | "salary"
  | "advance"
  | "bonus"
  | "stock_writeoff"
  | "opening_balance"
  | "salary_withdrawal"
  | "committee"
  | "investment"
  | "brother_adjustment"
  | "investor_capital"
  | "investor_profit"
  | "zakat_fund";

export interface PartyStatementEntry {
  id: string;
  departmentId: string;
  accountId: string;
  partyId: string | null;
  entryType: LedgerEntryType;
  amount: string;
  entryDate: string;
  sourceType: LedgerSourceType;
  sourceId: string;
  description: string | null;
  createdAt: string;
  createdBy: string | null;
  runningBalance: string;
}

export interface PartyStatement {
  entries: PartyStatementEntry[];
  closingBalance: string;
}

/** Backend payment endpoint DTO. */
export interface RecordPaymentRequest extends PaymentAccountSelection {
  departmentId?: string;
  amount: number;
  direction: "received" | "paid";
  paymentDate: string;
  paymentMethod: "cash" | "bank";
  notes?: string;
}

export interface DepartmentPartyBalance {
  partyId: string;
  partyName: string;
  partyType: string;
  /** Positive means receivable; negative means payable. */
  balance: string;
}

export interface DepartmentBalances {
  departmentId: string;
  totalReceivable: string;
  totalPayable: string;
  parties: DepartmentPartyBalance[];
}

export interface RecordPaymentResponseData {
  id: string;
  partyId: string;
  amount: string;
  paymentDate: string;
  paymentMethod: string;
  direction: "received" | "paid";
  notes?: string;
}

/** Pagination metadata returned by the backend. */
export interface PaginationMeta {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
  hasNextPage: boolean;
  hasPreviousPage: boolean;
}

/** Paginated list response data wrapper. */
export interface PaginatedPartyData {
  items: Party[];
  pagination: PaginationMeta;
}

export interface ListPartiesParams {
  page?: number;
  limit?: number;
  type?: PartyType;
  departmentId?: string;
  search?: string;
}

export interface PartyStatementParams {
  id: string;
  startDate?: string;
  endDate?: string;
}

export type PartyResponse = ApiResponse<Party>;
/** TypeORM excludes the newly soft-deleted row when the repository re-reads it. */
export type DeletePartyResponse = ApiResponse<Party | null>;
export type PartiesResponse = ApiResponse<PaginatedPartyData>;
export type PartyStatementResponse = ApiResponse<PartyStatement>;
export type RecordPaymentResponse = ApiResponse<RecordPaymentResponseData>;
