import type { ApiResponse } from "@/types/api";

export interface Committee {
  id: string;
  departmentId: string;
  department?: { name: string };
  name: string;
  totalMembers: number;
  installmentAmount: string;
  /** Number of installment records posted for this committee. */
  installmentCount: number;
  remainingInstallments: number;
  totalContributed: string;
  totalPayout: string;
  /** Payouts received minus installments paid. */
  currentAmount: string;
  payoutPosition: number;
  startDate: string;
  status: "active" | "completed";
  createdAt: string;
  updatedAt: string;
  deletedAt: string | null;
}

export interface CommitteeInstallment {
  id: string;
  committeeId: string;
  amount: string;
  installmentDate: string;
  createdAt: string;
  updatedAt: string;
  deletedAt: string | null;
}

export interface CommitteePayout {
  id: string;
  committeeId: string;
  payoutAmount: string;
  totalContributed: string;
  excessAmount: string;
  payoutDate: string;
  createdAt: string;
  updatedAt: string;
  deletedAt: string | null;
}

export interface CreateCommitteeRequest {
  departmentId: string;
  name: string;
  totalMembers: number;
  installmentAmount: number;
  payoutPosition: number;
  startDate: string;
}

export interface UpdateCommitteeRequest {
  name?: string;
  totalMembers?: number;
  installmentAmount?: number;
  payoutPosition?: number;
  startDate?: string;
}

export interface CreateInstallmentRequest {
  amount: number;
  installmentDate: string;
  paymentMethod: "cash" | "bank";
}

export interface CreatePayoutRequest {
  payoutAmount: number;
  payoutDate: string;
  totalContributed?: number;
  paymentMethod: "cash" | "bank";
}

export type CommitteesResponse = ApiResponse<Committee[]>;
export type CommitteeResponse = ApiResponse<Committee>;
export type InstallmentsResponse = ApiResponse<CommitteeInstallment[]>;
