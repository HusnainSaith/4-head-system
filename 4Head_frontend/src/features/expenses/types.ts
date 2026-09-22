export type ExpenseSourceType="manual"|"vehicle_fuel"|"vehicle_maintenance"|"stock_writeoff"|"processing_loss"|"allocation";
export interface ExpenseCategory{id:string;name:string;description?:string|null;categoryType:string;isActive:boolean;isSystemGenerated:boolean}
export interface Expense extends PaymentAccountSelection{id:string;departmentId:string;department?:{id:string;name:string};categoryId:string;category?:ExpenseCategory;amount:string;expenseDate:string;paymentMethod:"cash"|"bank";description?:string|null;receiptReference?:string|null;sourceType:ExpenseSourceType;sourceId?:string|null}
export interface CreateExpenseRequest extends PaymentAccountSelection{departmentId:string;categoryId:string;amount:string;expenseDate:string;paymentMethod:"cash"|"bank";description?:string;receiptReference?:string}
import type { PaymentAccountSelection } from "@/features/accounts/types";
