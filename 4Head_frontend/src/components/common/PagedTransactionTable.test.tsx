import { render,screen,fireEvent } from '@testing-library/react';
import { PagedTransactionTable } from './PagedTransactionTable';
it('filters all records before rendering a bounded page, including an older record outside the first page',()=>{
 const rows=Array.from({length:121},(_,i)=>({id:String(i),date:i===120?'2026-10-12':'2026-10-16',name:'Party '+i}));
 render(<PagedTransactionTable columns={[{id:'name',header:'Party',cell:r=>r.name}]} data={rows} dateField="date" getRowId={r=>r.id}/>);
 expect(screen.queryByText('Party 120')).not.toBeInTheDocument();fireEvent.change(screen.getByLabelText('From'),{target:{value:'2026-10-12'}});fireEvent.change(screen.getByLabelText('To'),{target:{value:'2026-10-12'}});
 expect(screen.getByText('Party 120')).toBeInTheDocument();expect(screen.queryByText('Party 0')).not.toBeInTheDocument();
});
