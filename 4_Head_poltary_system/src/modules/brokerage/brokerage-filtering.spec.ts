import { BrokerageRepository } from './brokerage.repository';
describe('Brokerage complete date-filtered lists',()=>{
 it.each(['purchase','sale'])('filters the entire %s dataset before pagination and aggregates all matches',async kind=>{
  const qb:any={};for(const method of ['leftJoin','leftJoinAndSelect','select','addSelect','where','orderBy','addOrderBy','offset','limit'])qb[method]=jest.fn().mockReturnValue(qb);
  qb.getRawOne=jest.fn().mockResolvedValue({total:'23',totalAmount:'5247015.00',settled:'0.00',outstanding:'5247015.00'});qb.getMany=jest.fn().mockResolvedValue([{id:'row'}]);const entity={createQueryBuilder:()=>qb};
  const repository=new BrokerageRepository(entity as any,entity as any);const params={from:'2026-10-12',to:'2026-10-12',search:'cp',page:2,limit:2};
  const result=kind==='purchase'?await repository.findAllPurchasesPaginated(params as any):await repository.findAllSalesPaginated(params as any);
  expect(result.pagination).toMatchObject({page:2,total:23,totalPages:12});expect(result.summary.totalAmount).toBe('5247015.00');expect(qb.offset).toHaveBeenCalledWith(2);expect(qb.limit).toHaveBeenCalledWith(2);
  const [sql,bindings]=qb.where.mock.calls[0];expect(sql).toContain('>= :from');expect(sql).toContain('<= :to');expect(sql).toContain('description ILIKE :search');expect(sql).toContain('vehicle.registration_number');expect(bindings.from).toBe('2026-10-12');expect(qb.addOrderBy).toHaveBeenCalledWith(expect.stringContaining('.id'),'DESC');
 });
});
