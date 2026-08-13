export interface DepartmentSummary {
  id: string;
  name: string;
  type: string;
}
export interface Employee {
  id: string;
  userId: string;
  fullName: string;
  designation: string;
  phone?: string | null;
  cnicOrIdNumber?: string | null;
  baseSalary: string;
  joiningDate: string;
  isActive: boolean;
  departmentId: string;
  department?: DepartmentSummary;
  deletedAt?: string | null;
}
export interface CreateEmployeeRequest {
  userId: string;
  fullName: string;
  designation: string;
  phone?: string;
  cnicOrIdNumber?: string;
  baseSalary: number;
  joiningDate: string;
  departmentId: string;
}
export type RecoveryStatus =
  "outstanding" | "partially_recovered" | "fully_recovered";
export interface EmployeeAdvance {
  id: string;
  employeeId: string;
  amount: string;
  advanceDate: string;
  reason?: string | null;
  recoveryStatus: RecoveryStatus;
  amountRecovered: string;
  disbursementStatus: "pending" | "confirmed";
  confirmedAt?: string | null;
  paymentMethod?: "cash" | "bank" | null;
}
export interface CreateAdvanceRequest {
  amount: number;
  advanceDate: string;
  reason?: string;
}
export interface EmployeeBonus {
  id: string;
  employeeId: string;
  amount: string;
  bonusDate: string;
  reason?: string | null;
}
export interface CreateBonusRequest {
  amount: number;
  bonusDate: string;
  reason?: string;
}
export type PaymentStatus = "pending" | "partially_paid" | "paid";
export interface SalaryRun {
  id: string;
  employeeId: string;
  employee: Employee;
  periodMonth: number;
  periodYear: number;
  baseSalary: string;
  totalBonuses: string;
  totalAdvancesDeducted: string;
  netPayable: string;
  paymentStatus: PaymentStatus;
  amountPaid: string;
  paidDate?: string | null;
  paymentMethod?: "cash" | "bank" | null;
  bonuses?: EmployeeBonus[];
}
export interface RunPayrollRequest {
  employeeId: string;
  periodMonth: number;
  periodYear: number;
  recoverAdvances: boolean;
}
export interface PaySalaryRunRequest extends PaymentAccountSelection {
  paidDate: string;
  paymentMethod: "cash" | "bank";
  amount?: number;
}

export interface SalaryWithdrawalAllocation {
  id: string;
  amount: string;
  salaryRun: SalaryRun;
}
export interface SalaryWithdrawal {
  id: string;
  amount: string;
  withdrawalDate: string;
  paymentMethod: "cash" | "bank";
  notes?: string;
  allocations: SalaryWithdrawalAllocation[];
}
export interface SalaryAccount {
  employeeId: string;
  totalAccrued: string;
  totalWithdrawn: string;
  availableBalance: string;
  runs: SalaryRun[];
  withdrawals: SalaryWithdrawal[];
}
export interface CreateSalaryWithdrawalRequest extends PaymentAccountSelection {
  amount: number;
  withdrawalDate: string;
  paymentMethod: "cash" | "bank";
  notes?: string;
}
import type { PaymentAccountSelection } from "@/features/accounts/types";
