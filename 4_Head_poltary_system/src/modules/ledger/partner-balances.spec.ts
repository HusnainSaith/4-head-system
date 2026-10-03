import { LedgerService } from './ledger.service';
import { LedgerRepository } from './ledger.repository';
import { ReportsService } from '../reports/reports.service';

describe('continuous partner balances', () => {
  const accrual = {
    partyId: 'p1',
    departmentId: 'd1',
    departmentName: 'Supply',
    userId: 'u1',
    partnerName: 'Ali',
    percentage: '100.0000',
    profitShare: '100.00',
  };
  const setup = () => {
    const repository = {
      getPartyBalances: jest.fn().mockResolvedValue([
        { partyId: 'p1', balance: '-30.00' },
        { partyId: 'customer', balance: '8.00' },
      ]),
      getDepartmentPartyBalances: jest.fn().mockImplementation(async () => [
        {
          partyId: 'p1',
          partyName: 'Ali',
          partyType: 'partner',
          balance: '-30.00',
        },
      ]),
      findByParty: jest
        .fn()
        .mockResolvedValue([{ amount: '30.00', entryType: 'debit' }]),
    };
    const reports = {
      getPartnerAccruals: jest.fn().mockResolvedValue([accrual]),
    };
    return {
      service: new LedgerService(
        repository as unknown as LedgerRepository,
        reports as unknown as ReportsService,
      ),
      reports,
    };
  };
  it('combines historical accrual with payments without duplicating on repeated reads', async () => {
    const { service } = setup();
    for (let i = 0; i < 2; i++) {
      const balances = await service.getPartyBalances(['p1', 'customer']);
      expect(balances.get('p1')).toBe('70.00');
      expect(balances.get('customer')).toBe('8.00');
      expect(await service.getPartyDepartmentBalance('p1', 'd1')).toBe('70.00');
    }
  });
  it('reflects losses and subsequent corrections immediately', async () => {
    const { service, reports } = setup();
    reports.getPartnerAccruals.mockResolvedValue([
      { ...accrual, profitShare: '-100.00' },
    ]);
    expect((await service.getPartyBalances(['p1'])).get('p1')).toBe('-130.00');
    reports.getPartnerAccruals.mockResolvedValue([
      { ...accrual, profitShare: '150.00' },
    ]);
    expect((await service.getPartyBalances(['p1'])).get('p1')).toBe('120.00');
  });
  it('shows the derived accrual in statements and reconciles the closing balance', async () => {
    const { service, reports } = setup();
    const statement = await service.getPartyStatement(
      'p1',
      '2026-01-01',
      '2026-01-31',
    );
    expect(statement.closingBalance).toBe('70.00');
    expect(statement.entries.at(-1)).toEqual(
      expect.objectContaining({
        sourceType: 'partner_profit_accrual',
        amount: '100.00',
        runningBalance: '70.00',
      }),
    );
    expect(reports.getPartnerAccruals).toHaveBeenCalledWith(
      '2026-01-01',
      '2026-01-31',
      ['p1'],
    );
  });
});
