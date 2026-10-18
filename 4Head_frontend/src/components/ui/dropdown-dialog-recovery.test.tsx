import { useState } from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { DropdownMenu,DropdownMenuTrigger,DropdownMenuContent,DropdownMenuItem } from './dropdown-menu';
import { Dialog,DialogContent,DialogTitle,DialogDescription } from './dialog';
function Fixture(){const[open,setOpen]=useState(false),[clicks,setClicks]=useState(0);return <><button onClick={()=>setClicks(clicks+1)}>Outside {clicks}</button><DropdownMenu><DropdownMenuTrigger>Actions</DropdownMenuTrigger><DropdownMenuContent><DropdownMenuItem onSelect={()=>setOpen(true)}>Edit record</DropdownMenuItem></DropdownMenuContent></DropdownMenu><Dialog open={open} onOpenChange={setOpen}><DialogContent><DialogTitle>Edit</DialogTitle><DialogDescription>Edit transaction</DialogDescription><button onClick={()=>setOpen(false)}>Cancel edit</button></DialogContent></Dialog></>;}
it('leaves the page clickable after repeatedly opening a dialog from a menu and cancelling it',async()=>{
 Object.defineProperties(HTMLElement.prototype,{hasPointerCapture:{value:()=>false,configurable:true},setPointerCapture:{value:()=>{},configurable:true},releasePointerCapture:{value:()=>{},configurable:true},scrollIntoView:{value:()=>{},configurable:true}});
 const user=userEvent.setup();render(<Fixture/>);
 for(let i=0;i<3;i++){await user.click(screen.getByRole('button',{name:'Actions'}));expect(document.body.style.pointerEvents).not.toBe('none');await user.click(screen.getByRole('menuitem',{name:'Edit record'}));await user.click(screen.getByRole('button',{name:'Cancel edit'}));await waitFor(()=>expect(document.body.style.pointerEvents).not.toBe('none'));await user.click(screen.getByRole('button',{name:'Outside '+i}));}
 expect(screen.getByRole('button',{name:'Outside 3'})).toBeInTheDocument();
});
