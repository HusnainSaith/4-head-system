export type BankMethod = "cheque" | "app";
export interface PaymentAccountSelection { cashAccountId?: string; bankAccountId?: string; bankTransactionMethod?: BankMethod; chequeNumber?: string; appReference?: string; }

export interface CashAccount { id: string; departmentId: string; accountName: string; openingBalance: string; department?: { name: string }; }
export interface BankAccount { id: string; bankName: string; accountTitle: string; accountNumber?: string; branchName?: string; openingBalance: string; }
export interface CashBalance { account: CashAccount; openingBalance: string; totalIn: string; totalOut: string; currentBalance: string; }
export interface BankBalance { account: BankAccount; openingBalance: string; totalIn: string; totalOut: string; currentBalance: string; chequeIn: string; chequeOut: string; appIn: string; appOut: string; }
export interface AccountsSummary { totalCash: string; totalBank: string; totalFunds: string; cashAccounts: CashBalance[]; bankAccounts: BankBalance[]; }
export interface AccountTransaction { id: string; entry_type: "debit" | "credit"; amount: string; entry_date: string; source_type: string; description?: string; bank_transaction_method?: BankMethod; cheque_number?: string; app_reference?: string; direction: "IN" | "OUT"; runningBalance: string; }
export interface AccountStatement<T = CashAccount | BankAccount> { account: T; transactions: AccountTransaction[]; openingBalance: string; closingBalance: string; }
export interface CreateBankAccount { bankName: string; accountTitle: string; accountNumber?: string; branchName?: string; openingBalance?: number; openingBalanceDate?: string; }
