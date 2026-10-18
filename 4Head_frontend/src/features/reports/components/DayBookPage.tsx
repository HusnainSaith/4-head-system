import { useState } from 'react';
import { DataTable, type DataTableColumn } from '@/components/common/DataTable';
import { PageContainer } from '@/components/layout/PageContainer';
import { PageHeader } from '@/components/common/PageHeader';
import { ErrorState } from '@/components/common/ErrorState';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useListDepartmentsQuery } from '@/features/departments/departmentsApi';
import { formatPartyBalance } from '@/features/parties/party-balance';
import { useGetDayBookQuery } from '../reportsApi';
import type { DayBookParams, DayBookParty, DayBookTransaction } from '../day-book-types';
import { printDayBook } from '../day-book-print';
const currency=(v:string)=>new Intl.NumberFormat('en-PK',{style:'currency',currency:'PKR',minimumFractionDigits:2}).format(Number(v));
function localToday(){const now=new Date();return `${now.getFullYear()}-${String(now.getMonth()+1).padStart(2,'0')}-${String(now.getDate()).padStart(2,'0')}`;}
export function DayBookPage(){
 const [from,setFrom]=useState(()=>localToday().slice(0,8)+'01'),[to,setTo]=useState(localToday),[department,setDepartment]=useState('');
 const [params,setParams]=useState<DayBookParams|null>(null),[page,setPage]=useState(1),[partyPage,setPartyPage]=useState(1);
 const departments=useListDepartmentsQuery();const query=useGetDayBookQuery(params??{from,to},{skip:!params});
 const report=query.currentData;const data=report?.data;const invalid=!!from&&!!to&&from>to;
 const transactionColumns:DataTableColumn<DayBookTransaction>[]=[
 {id:'date',header:'Date',cell:r=>r.date},{id:'department',header:'Department',cell:r=>r.departmentName},{id:'kind',header:'Type',cell:r=>r.kind},
 {id:'party',header:'Party',cell:r=>r.partyName},{id:'weight',header:'Weight (kg)',cell:r=>r.quantityKg,align:'right'},
 {id:'total',header:'Total',cell:r=>currency(r.totalAmount),align:'right'},{id:'settled',header:'Paid / received on transaction',cell:r=>currency(r.settled),align:'right'},
 {id:'balance',header:'Initial party balance',cell:r=>formatPartyBalance(Number(r.outstanding)*(r.kind==='sale'?-1:1)),align:'right'},{id:'notes',header:'Notes',cell:r=><span className="whitespace-pre-wrap">{r.notes??'—'}</span>}
 ];
 const partyColumns:DataTableColumn<DayBookParty>[]=[{id:'party',header:'Party',cell:r=>r.partyName},{id:'department',header:'Department',cell:r=>r.departmentName},
 {id:'opening',header:'Opening balance',cell:r=>formatPartyBalance(r.openingBalance),align:'right'},{id:'debit',header:'Period debit',cell:r=>currency(r.periodDebit),align:'right'},
 {id:'credit',header:'Period credit',cell:r=>currency(r.periodCredit),align:'right'},{id:'closing',header:'Range closing balance',cell:r=>formatPartyBalance(r.closingBalance),align:'right'},
 {id:'current',header:'Overall recorded balance',cell:r=>formatPartyBalance(r.currentBalance),align:'right'}];
 const cards=[['Period sales','sales'],['Period purchases','purchases'],['Initial payable from period transactions','initialPayable'],['Initial receivable from period transactions','initialReceivable'],['Range closing payable','closingPayable'],['Range closing receivable','closingReceivable'],['Overall recorded payable','currentPayable'],['Overall recorded receivable','currentReceivable']];
 return <PageContainer><PageHeader title="Day Book" description="Sales, purchases and participating party balances for an inclusive date range." actions={<Button disabled={!data||query.isFetching} onClick={()=>data&&printDayBook(data)}>Print complete day book</Button>}/>
 <form className="mb-5 grid gap-4 md:grid-cols-4" onSubmit={event=>{event.preventDefault();if(invalid||!from||!to)return;const next={from,to,departmentId:department||undefined};setPage(1);setPartyPage(1);if(JSON.stringify(next)===JSON.stringify(params))void query.refetch();else setParams(next);}}>
 <div><Label htmlFor="day-book-from">From</Label><Input id="day-book-from" type="date" value={from} required onChange={e=>setFrom(e.target.value)}/></div>
 <div><Label htmlFor="day-book-to">To</Label><Input id="day-book-to" type="date" value={to} required min={from} onChange={e=>setTo(e.target.value)}/></div>
 <div><Label htmlFor="day-book-department">Department</Label><select id="day-book-department" className="h-9 w-full rounded border bg-background px-3" value={department} onChange={e=>setDepartment(e.target.value)}><option value="">All departments</option>{departments.data?.data.map(d=><option value={d.id} key={d.id}>{d.name}</option>)}</select></div>
 <Button className="self-end" type="submit" disabled={invalid||!from||!to||query.isFetching}>{query.isFetching?'Loading…':'Generate day book'}</Button></form>
 {invalid&&<p role="alert">From date must be on or before To date.</p>}
 <p className="mb-4 text-sm text-muted-foreground">Positive = payable to the party. Negative = receivable from the party. Only parties with sales or purchases in the generated range are included.</p>
 {query.isError?<ErrorState title="Day book could not be loaded" error={query.error} onRetry={()=>void query.refetch()}/>:params&&<>
 <p className="mb-4 font-medium">{params.from} through {params.to}, both dates included. {data?.transactionCount??0} transactions.</p>
 <div className="mb-6 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">{cards.map(([title,key])=><div className="rounded-lg border bg-card p-4" key={key}><p className="text-sm text-muted-foreground">{title}</p><strong>{currency(data?.summary[key]??'0')}</strong></div>)}</div>
 <h2 className="mb-2 font-semibold">Sales and purchases</h2><DataTable columns={transactionColumns} data={data?.transactions.slice((page-1)*50,page*50)??[]} getRowId={r=>`${r.departmentId}:${r.kind}:${r.id}`} isLoading={query.isFetching} pagination={{page,pageSize:50,total:data?.transactionCount??0}} onPageChange={setPage}/>
 <h2 className="mb-2 mt-6 font-semibold">Participating party balances</h2><p className="mb-2 text-sm text-muted-foreground">Opening + period credits − period debits = range closing. Overall balances include all recorded dates. Later payments and settlements are reflected in ledger balances.</p>
 <DataTable columns={partyColumns} data={data?.parties.slice((partyPage-1)*50,partyPage*50)??[]} getRowId={r=>`${r.departmentId}:${r.partyId}`} isLoading={query.isFetching} pagination={{page:partyPage,pageSize:50,total:data?.partyCount??0}} onPageChange={setPartyPage}/></>}
 </PageContainer>;
}
