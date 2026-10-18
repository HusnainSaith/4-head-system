import { PartiesService } from './parties.service';
import { PartyPaymentDirection, PartyPaymentMethod } from './dto/record-party-payment.dto';
import { LedgerRepository } from '../ledger/ledger.repository';

describe('Party balance signs in every department', () => {
  it.each(['brokerage', 'supply', 'wastage', 'shop'])('%s receipts split receivable repayment from excess payable', async departmentId => {
    const post = jest.fn();
    const repo = {create: (value: any) => value, save: async (value: any) => ({id: 'payment', ...value})};
    const service = new PartiesService({findById: async () => ({id:'party', name:'Party', primaryDepartmentId: departmentId})} as any,
      {getPartyDepartmentBalance: async () => '-350.00', post} as any,
      {transaction: async (work: any) => work({getRepository: () => repo})} as any);
    await service.recordPayment('party', {departmentId, amount: 420, direction: PartyPaymentDirection.RECEIVED, paymentDate:'2026-10-01', paymentMethod:PartyPaymentMethod.CASH, cashAccountId:'admin'});
    const entries = post.mock.calls[0][0];
    expect(entries.filter((entry: any) => entry.partyId)).toEqual([
      expect.objectContaining({accountCode: 'accounts_receivable', entryType:'credit', amount:'350.00'}),
      expect.objectContaining({accountCode: 'accounts_payable', entryType:'credit', amount:'70.00'}),
    ]);
    expect(entries.filter((entry: any)=>entry.entryType==='credit').reduce((sum: number,entry: any)=>sum+Number(entry.amount),0)).toBe(420);
    expect(entries.find((entry: any)=>entry.accountCode==='cash')).toMatchObject({entryType:'debit',amount:'420.00'});
  });
  it.each([
    ['-350.00', 350, 'accounts_receivable'],
    ['-350.00', 100, 'accounts_receivable'],
    ['0.00', 100, 'accounts_payable'],
    ['200.00', 100, 'accounts_payable'],
  ])('receipt against balance %s of %s uses %s', async (balance, amount, accountCode) => {
    const post = jest.fn();
    const repo = {create: (value: any)=>value, save: async (value: any)=>({id:'payment',...value})};
    const service = new PartiesService({findById: async()=>({id:'party',name:'Party',primaryDepartmentId:'dept'})} as any,
      {getPartyDepartmentBalance: async()=>balance,post} as any,
      {transaction: async(work:any)=>work({getRepository:()=>repo})} as any);
    await service.recordPayment('party',{amount:Number(amount),direction:PartyPaymentDirection.RECEIVED,paymentDate:'2026-10-01',paymentMethod:PartyPaymentMethod.CASH,cashAccountId:'admin'});
    expect(post.mock.calls[0][0].filter((entry:any)=>entry.partyId)).toEqual([expect.objectContaining({accountCode,entryType:'credit',amount:Number(amount).toFixed(2)})]);
  });
  it('filters balance joins by department without excluding zero-balance parties', async () => {
    const query = jest.fn().mockResolvedValue([]);
    const repository = new LedgerRepository({query} as any, null as any);
    await repository.getPartyBalances(['party'], 'brokerage');
    expect(query).toHaveBeenCalledWith(expect.stringContaining('AND ($2::uuid IS NULL OR le.department_id = $2::uuid)'), [['party'], 'brokerage']);
    await repository.getPartyBalances(['party']);
    expect(query).toHaveBeenLastCalledWith(expect.stringContaining('LEFT JOIN ledger_entries'), [['party'], null]);
  });
  it('passes the selected department to party-picker balance calculation', async () => {
    const getPartyBalances = jest.fn().mockResolvedValue(new Map([['party','-350.00']]));
    const service = new PartiesService({findAll: async()=>({items:[{id:'party'}],pagination:{total:1}})} as any,{getPartyBalances} as any,{} as any);
    const result = await service.findAll({departmentId:'brokerage'} as any);
    expect(getPartyBalances).toHaveBeenCalledWith(['party'],'brokerage');
    expect(result.data.items[0].currentBalance).toBe('-350.00');
  });
});
