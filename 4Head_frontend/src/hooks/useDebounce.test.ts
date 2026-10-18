import { act, renderHook } from '@testing-library/react';
import { useDebounce } from './useDebounce';
it('debounces rapid edits and cancels outdated timers on unmount',()=>{
 vi.useFakeTimers();try{const {result,rerender,unmount}=renderHook(({value})=>useDebounce(value,300),{initialProps:{value:''}});rerender({value:'F'});rerender({value:'Falaq'});expect(result.current).toBe('');act(()=>vi.advanceTimersByTime(299));expect(result.current).toBe('');act(()=>vi.advanceTimersByTime(1));expect(result.current).toBe('Falaq');rerender({value:'New'});unmount();act(()=>vi.runOnlyPendingTimers());}finally{vi.useRealTimers();}
});
