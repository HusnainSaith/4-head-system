export interface DayBookTransaction {
 id:string;kind:'sale'|'purchase';date:string;departmentId:string;departmentName:string;departmentType:string;
 partyId:string|null;partyName:string;quantityKg:string;ratePerKg:string;totalAmount:string;settled:string;outstanding:string;notes:string|null;
}
export interface DayBookParty {
 partyId:string;partyName:string;departmentId:string;departmentName:string;sales:string;purchases:string;
 openingBalance:string;periodDebit:string;periodCredit:string;closingBalance:string;currentBalance:string;
}
export interface DayBookReport {
 from:string;to:string;departmentId:string|null;transactions:DayBookTransaction[];parties:DayBookParty[];
 summary:Record<string,string>;transactionCount:number;partyCount:number;
}
export interface DayBookParams {from:string;to:string;departmentId?:string;}
