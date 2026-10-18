import { BadRequestException, Injectable } from '@nestjs/common';
import { DataSource } from 'typeorm';
import { centsToMoney, moneyToCents } from '../../common/utils/money.util';
import { DayBookQueryDto } from './dto/day-book-query.dto';

// Table/column identifiers are constants; every user-provided value is bound.
const sources = [
 ['brokerage_sales','sale','sale_date','amount_received','description',"t.status::text='active'"],
 ['brokerage_purchases','purchase','purchase_date','amount_paid','description',"t.status::text='active'"],
 ['supply_sales','sale','sale_date','amount_received','notes',"t.status='posted'"],
 ['supply_purchases','purchase','purchase_date','amount_paid','notes',"t.status='posted'"],
 ['wastage_sales','sale','sale_date','amount_received','notes','TRUE'],
 ['wastage_purchases','purchase','purchase_date','amount_paid','notes','TRUE'],
 ['shop_sales','sale','sale_date','amount_received','notes','TRUE','customer_party_id'],
 ['shop_purchases','purchase','purchase_date','amount_paid','notes',"t.status='posted'"],
];
export const DAY_BOOK_TRANSACTIONS_SQL = sources.map(([table,kind,date,settled,notes,active,partyColumn="party_id"]) => `
 SELECT t.id, '${kind}' AS kind, t.${date}::text AS date,
 t.department_id AS "departmentId", d.name AS "departmentName", d.type AS "departmentType",
 t.${partyColumn} AS "partyId", COALESCE(p.name,'Cash / unassigned party') AS "partyName",
 t.quantity_kg::text AS "quantityKg", t.rate_per_kg::text AS "ratePerKg",
 t.total_amount::text AS "totalAmount", t.${settled}::text AS settled,
 t.outstanding_amount::text AS outstanding, t.${notes} AS notes
 FROM ${table} t JOIN departments d ON d.id=t.department_id LEFT JOIN parties p ON p.id=t.${partyColumn}
 WHERE t.deleted_at IS NULL AND ${active} AND t.${date} >= $1::date AND t.${date} <= $2::date
 AND ($3::uuid IS NULL OR t.department_id=$3::uuid)
`).join(' UNION ALL ') + ' ORDER BY date, "departmentName", kind, id';

export interface DayBookTransaction {
 id:string;kind:'sale'|'purchase';date:string;departmentId:string;departmentName:string;departmentType:string;
 partyId:string|null;partyName:string;quantityKg:string;ratePerKg:string;totalAmount:string;settled:string;outstanding:string;notes:string|null;
}
export interface DayBookParty {
 partyId:string;partyName:string;departmentId:string;departmentName:string;
 sales:string;purchases:string;openingBalance:string;periodDebit:string;periodCredit:string;closingBalance:string;currentBalance:string;
}
const money = (n:bigint) => centsToMoney(n);
export function buildDayBook(query:DayBookQueryDto, transactions:DayBookTransaction[], balances:any[]) {
 const parties:DayBookParty[] = balances.map(row=>({...row,sales:row.sales??'0.00',purchases:row.purchases??'0.00'}));
 const totals:Record<string,bigint>={sales:0n,purchases:0n,saleReceipts:0n,purchasePayments:0n,initialPayable:0n,initialReceivable:0n,openingPayable:0n,openingReceivable:0n,periodDebit:0n,periodCredit:0n,closingPayable:0n,closingReceivable:0n,currentPayable:0n,currentReceivable:0n};
 const byKey=new Map(parties.map(row=>[`${row.departmentId}:${row.partyId}`,row]));
 for(const row of transactions){const total=moneyToCents(row.totalAmount),settled=moneyToCents(row.settled);totals[row.kind==='sale'?'sales':'purchases']+=total;totals[row.kind==='sale'?'saleReceipts':'purchasePayments']+=settled;
  const signed=moneyToCents(row.outstanding)*(row.kind==='sale'?-1n:1n);if(row.partyId){if(signed>0n)totals.initialPayable+=signed;else totals.initialReceivable-=signed;}
  const party=byKey.get(`${row.departmentId}:${row.partyId}`);if(party){const field=row.kind==='sale'?'sales':'purchases';party[field]=money(moneyToCents(party[field])+total);}
 }
 for(const row of parties){for(const period of ['opening','closing','current'] as const){const value=moneyToCents(row[`${period}Balance`]);totals[`${period}${value>=0n?'Payable':'Receivable'}`]+=value>=0n?value:-value;}
  totals.periodDebit+=moneyToCents(row.periodDebit);totals.periodCredit+=moneyToCents(row.periodCredit);
 }
 return {from:query.from,to:query.to,departmentId:query.departmentId??null,transactions,parties,summary:Object.fromEntries(Object.entries(totals).map(([key,value])=>[key,money(value)])),transactionCount:transactions.length,partyCount:parties.length};
}
@Injectable()
export class DayBookService {
 constructor(private readonly dataSource:DataSource){}
 async getDayBook(query:DayBookQueryDto){
  if(query.from>query.to)throw new BadRequestException('From date must be on or before To date');
  return this.dataSource.transaction('REPEATABLE READ',async manager=>{
   await manager.query('SET TRANSACTION READ ONLY');
   const transactions:DayBookTransaction[]=await manager.query(DAY_BOOK_TRANSACTIONS_SQL,[query.from,query.to,query.departmentId??null]);
   const keys=[...new Map(transactions.filter(row=>row.partyId).map(row=>[`${row.departmentId}:${row.partyId}`,{partyId:row.partyId,partyName:row.partyName,departmentId:row.departmentId,departmentName:row.departmentName}])).values()];
   const balances=keys.length?await manager.query(`
    WITH participants AS (SELECT * FROM jsonb_to_recordset($3::jsonb) AS p("partyId" uuid,"partyName" text,"departmentId" uuid,"departmentName" text))
    SELECT p."partyId",p."partyName",p."departmentId",p."departmentName",
     COALESCE(SUM(CASE WHEN le.entry_date < $1::date THEN CASE WHEN le.entry_type='credit' THEN le.amount ELSE -le.amount END ELSE 0 END),0)::text AS "openingBalance",
     COALESCE(SUM(CASE WHEN le.entry_date BETWEEN $1::date AND $2::date AND le.entry_type='debit' THEN le.amount ELSE 0 END),0)::text AS "periodDebit",
     COALESCE(SUM(CASE WHEN le.entry_date BETWEEN $1::date AND $2::date AND le.entry_type='credit' THEN le.amount ELSE 0 END),0)::text AS "periodCredit",
     COALESCE(SUM(CASE WHEN le.entry_date <= $2::date THEN CASE WHEN le.entry_type='credit' THEN le.amount ELSE -le.amount END ELSE 0 END),0)::text AS "closingBalance",
     COALESCE(SUM(CASE WHEN le.entry_type='credit' THEN le.amount ELSE -le.amount END),0)::text AS "currentBalance"
    FROM participants p LEFT JOIN ledger_entries le ON le.party_id=p."partyId" AND le.department_id=p."departmentId"
    GROUP BY p."partyId",p."partyName",p."departmentId",p."departmentName" ORDER BY p."departmentName",p."partyName",p."partyId"
   `,[query.from,query.to,JSON.stringify(keys)]):[];
   return {success:true,message:'Day book retrieved successfully',data:buildDayBook(query,transactions,balances)};
  });
 }
}
