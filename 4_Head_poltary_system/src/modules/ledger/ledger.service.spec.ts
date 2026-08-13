import { LedgerRepository } from './ledger.repository';
import { LedgerService } from './ledger.service';

describe('LedgerService department party balances', () => {
  const repository = {
    getDepartmentPartyBalances: jest.fn(),
    findAccountByCode: jest.fn(),
    saveEntries: jest.fn(),
  } as unknown as jest.Mocked<LedgerRepository>;
  const service = new LedgerService(repository);

  beforeEach(() => jest.clearAllMocks());

  it('rejects an unbalanced post before persisting anything', async () => {
    await expect(
      service.post([
        {
          departmentId: 'department-1',
          accountCode: 'cash',
          entryType: 'debit',
          amount: '100.00',
          entryDate: new Date(),
          sourceType: 'payment',
          sourceId: '11111111-1111-4111-8111-111111111111',
        },
        {
          departmentId: 'department-1',
          accountCode: 'revenue',
          entryType: 'credit',
          amount: '99.99',
          entryDate: new Date(),
          sourceType: 'payment',
          sourceId: '11111111-1111-4111-8111-111111111111',
        },
      ]),
    ).rejects.toThrow('Unbalanced ledger posting');
    expect(repository.saveEntries).not.toHaveBeenCalled();
  });

  it('separates receivables and payables without netting them together', async () => {
    repository.getDepartmentPartyBalances.mockResolvedValue([
      {
        partyId: 'buyer-1',
        partyName: 'Buyer One',
        partyType: 'buyer',
        balance: '350.25',
      },
      {
        partyId: 'farm-1',
        partyName: 'Farm One',
        partyType: 'farm',
        balance: '-600.50',
      },
      {
        partyId: 'buyer-2',
        partyName: 'Buyer Two',
        partyType: 'buyer',
        balance: '49.75',
      },
    ]);

    await expect(
      service.getDepartmentPartyBalances('department-1'),
    ).resolves.toEqual({
      departmentId: 'department-1',
      totalReceivable: '400.00',
      totalPayable: '600.50',
      parties: [
        expect.objectContaining({ partyId: 'buyer-1', balance: '350.25' }),
        expect.objectContaining({ partyId: 'farm-1', balance: '-600.50' }),
        expect.objectContaining({ partyId: 'buyer-2', balance: '49.75' }),
      ],
    });
  });

  it('returns zero totals when the department has no outstanding parties', async () => {
    repository.getDepartmentPartyBalances.mockResolvedValue([]);

    await expect(
      service.getDepartmentPartyBalances('department-1'),
    ).resolves.toEqual({
      departmentId: 'department-1',
      totalReceivable: '0.00',
      totalPayable: '0.00',
      parties: [],
    });
  });
});
