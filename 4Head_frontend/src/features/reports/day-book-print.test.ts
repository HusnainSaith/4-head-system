import { dayBookPrintHtml } from './day-book-print';
import type { DayBookReport } from './day-book-types';
it('prints every report row and includes range balances while escaping party names and notes',()=>{
 const transactions=Array.from({length:125},(_,i)=>({id:String(i),kind:'sale',date:'2026-10-12',departmentId:'d',departmentName:'Brokerage',departmentType:'BROKERAGE',partyId:'p',partyName:'Party '+i,quantityKg:'1',ratePerKg:'1',totalAmount:'1',settled:'0',outstanding:'1',notes:i===124?'<script>bad()</script> & note':''}));
 const report={from:'2026-10-12',to:'2026-10-12',departmentId:null,transactions,parties:[{partyId:'p',partyName:'<Supplier>',departmentId:'d',departmentName:'Brokerage',sales:'125',purchases:'0',openingBalance:'100',periodDebit:'125',periodCredit:'0',closingBalance:'-25',currentBalance:'-25'}],summary:{sales:'125',purchases:'0',closingPayable:'0',closingReceivable:'25'},transactionCount:125,partyCount:1} as DayBookReport;
 const html=dayBookPrintHtml(report);expect(html).toContain('Party 124');expect(html).toContain('2026-10-12 through 2026-10-12');expect(html).toContain('Range closing');expect(html).toContain('Overall recorded');expect(html).toContain('&lt;script&gt;bad()&lt;/script&gt; &amp; note');expect(html).not.toContain('<script>bad()');expect(html).toContain('&lt;Supplier&gt;');
});
