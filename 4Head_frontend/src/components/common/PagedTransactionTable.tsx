import { useState } from 'react';
import { DataTable, type DataTableProps } from './DataTable';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
// Array-backed departments filter the full response before paginating the DOM.
// Server-paginated departments send date filters to their list endpoints instead.
export function PagedTransactionTable<T>({dateField,filterKey='',...props}:DataTableProps<T>&{dateField:keyof T;filterKey?:string}){
 const [from,setFrom]=useState(''),[to,setTo]=useState('');
 const [state,setState]=useState({scope:'',page:1});const scope=JSON.stringify([from,to,filterKey]);
 const data=props.data.filter(row=>{const date=String(row[dateField]??'').slice(0,10);return (!from||date>=from)&&(!to||date<=to);});
 const page=state.scope===scope?Math.max(1,Math.min(state.page,Math.ceil(data.length/50))):1;
 return <><div className="my-4 flex flex-wrap items-end gap-3"><div><Label htmlFor="transactions-from">From</Label><Input id="transactions-from" type="date" value={from} onChange={e=>setFrom(e.target.value)}/></div><div><Label htmlFor="transactions-to">To</Label><Input id="transactions-to" type="date" min={from} value={to} onChange={e=>setTo(e.target.value)}/></div>{(from||to)&&<Button variant="outline" onClick={()=>{setFrom('');setTo('');}}>Clear dates</Button>}</div>{from&&to&&from>to&&<p role="alert">From date must be on or before To date.</p>}<DataTable {...props} data={data.slice((page-1)*50,page*50)} pagination={{page,pageSize:50,total:data.length}} onPageChange={page=>setState({scope,page})}/></>;
}
