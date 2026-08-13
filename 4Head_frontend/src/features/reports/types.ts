export interface ConsolidatedProfitLoss{externalRevenue:string;internalTransferRevenue:string;totalCogs:string;totalExpenses:string;totalPayroll:string;netProfit:string;perPartnerShare:string}
export interface PartnerProfitShare extends ConsolidatedProfitLoss{partnerShare:string}
export interface OutstandingBalance{partyId:string;partyName:string;partyType:string;departmentId:string;departmentName:string;balance:string}
export interface StockSummaryItem{productId?:string|null;departmentId:string;departmentName:string;quantityKg:string;wac:string}
export interface StockMovementItem{id:string;departmentId:string;departmentName:string;movementType:string;quantityKg:string;ratePerKg:string;resultingWac:string;sourceType:string;sourceId:string;movementDate:string}
export interface StockSummary{summary:StockSummaryItem[];movements:StockMovementItem[]}
export interface ExpenseBreakdownItem{category:string;categoryId:string;departmentId:string;total:string}
export interface PayrollSummaryItem{departmentId:string;departmentName:string;employeeId:string;employeeName:string;totalNetPayable:string;totalAdvancesDeducted:string;totalBonuses:string}
/** Exact query parameter names accepted by ReportQueryDto. */
export interface DateRangeParams{startDate?:string;endDate?:string}
