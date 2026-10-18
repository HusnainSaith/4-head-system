import { buildDayBook, DAY_BOOK_TRANSACTIONS_SQL, DayBookService } from './day-book.service';
import { validate } from 'class-validator';
import { plainToInstance } from 'class-transformer';
import { DayBookQueryDto } from './dto/day-book-query.dto';
const transaction=(overrides:any={})=>({id:'sale',kind:'sale',date:'2026-10-12',departmentId:'dept',departmentName:'Brokerage',departmentType:'BROKERAGE',partyId:'party',partyName:'Farm',quantityKg:'1',ratePerKg:'0.10',totalAmount:'0.10',settled:'0',outstanding:'0.10',notes:null,...overrides});
describe('Day book accounting and validation',()=>{
 it('sums decimal currency exactly and separates payable from receivable without netting parties',()=>{
  const rows=[transaction(),transaction({id:'sale2',totalAmount:'0.20',outstanding:'0.20'}),transaction({id:'purchase',kind:'purchase',partyId:'other',totalAmount:'5',outstanding:'5'})];
  const balances=[{partyId:'party',departmentId:'dept',partyName:'Farm',departmentName:'Brokerage',openingBalance:'-10.00',periodDebit:'0.30',periodCredit:'0',closingBalance:'-10.30',currentBalance:'-5.00'},
   {partyId:'other',departmentId:'dept',partyName:'Supplier',departmentName:'Brokerage',openingBalance:'20',periodDebit:'0',periodCredit:'5',closingBalance:'25',currentBalance:'30'}];
  const report=buildDayBook({from:'2026-10-12',to:'2026-10-12'},rows as any,balances);
  expect(report.summary).toMatchObject({sales:'0.30',purchases:'5.00',closingPayable:'25.00',closingReceivable:'10.30',currentPayable:'30.00',currentReceivable:'5.00',initialPayable:'5.00',initialReceivable:'0.30'});
  expect(report.parties[0].sales).toBe('0.30');expect(report.transactionCount).toBe(3);
 });
 it('handles overpayments crossing zero and excludes cash/unassigned parties from party balances',()=>{
  const result=buildDayBook({from:'2026-10-01',to:'2026-10-18'},[transaction({outstanding:'-5'}),transaction({kind:'purchase',outstanding:'-3'}),transaction({partyId:null,outstanding:'9'})] as any,[]);
  expect(result.summary.initialPayable).toBe('5.00');expect(result.summary.initialReceivable).toBe('3.00');expect(result.partyCount).toBe(0);
 });
 it('uses a read-only consistent snapshot and skips the balance query for empty ranges',async()=>{
  const manager={query:jest.fn().mockResolvedValueOnce(undefined).mockResolvedValueOnce([])};
  const source={transaction:jest.fn(async(_isolation:any,callback:any)=>callback(manager))};
  const result=await new DayBookService(source as any).getDayBook({from:'2026-10-12',to:'2026-10-12'});
  expect(source.transaction).toHaveBeenCalledWith('REPEATABLE READ',expect.any(Function));expect(manager.query).toHaveBeenNthCalledWith(1,'SET TRANSACTION READ ONLY');expect(manager.query).toHaveBeenCalledTimes(2);expect(result.data.transactionCount).toBe(0);
 });
 it('refuses inverted ranges before querying the database',async()=>{
  const source={transaction:jest.fn()};await expect(new DayBookService(source as any).getDayBook({from:'2026-10-18',to:'2026-10-01'})).rejects.toThrow('From date');expect(source.transaction).not.toHaveBeenCalled();
 });
 it.each(['2026-02-30','2026-10-01T12:00:00Z','10/12/2026','bad'])('rejects invalid or ambiguous calendar date %s',async from=>{
  expect((await validate(plainToInstance(DayBookQueryDto,{from,to:'2026-10-18'}))).length).toBeGreaterThan(0);
 });
 it('uses all eight transaction sources and the shop customer-party column',()=>{
  for(const table of ['brokerage_sales','brokerage_purchases','supply_sales','supply_purchases','wastage_sales','wastage_purchases','shop_sales','shop_purchases'])expect(DAY_BOOK_TRANSACTIONS_SQL).toContain('FROM '+table);
  expect(DAY_BOOK_TRANSACTIONS_SQL).toContain('t.customer_party_id');expect(DAY_BOOK_TRANSACTIONS_SQL).toContain('<= $2::date');
 });
});
