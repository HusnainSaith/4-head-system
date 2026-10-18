import { AccountsRepository } from './accounts.repository';
import { LedgerService } from '../ledger/ledger.service';

describe('Single admin cash drawer', () => {
  it('lists and resolves only the shared admin drawer for every department', async () => {
    const cash = {
      find: jest.fn().mockResolvedValue([]),
      findOneOrFail: jest.fn(),
    };
    const repository = new AccountsRepository(cash as any, {} as any);
    await repository.findAllCashAccounts();
    await repository.findCashByDepartment('brokerage');
    await repository.findCashById('admin');
    expect(cash.find).toHaveBeenCalledWith(
      expect.objectContaining({
        where: {
          accountName: 'Admin Cash Drawer',
          isShared: true,
          isActive: true,
        },
      }),
    );
    expect(
      cash.findOneOrFail.mock.calls.every(
        ([options]) =>
          options.where.isShared &&
          options.where.accountName === 'Admin Cash Drawer',
      ),
    ).toBe(true);
  });
  const entries: any[] = [
    {
      departmentId: 'department',
      accountCode: 'cash',
      entryType: 'debit',
      amount: '10.00',
      entryDate: new Date(),
      sourceType: 'payment',
      sourceId: 'payment',
    },
    {
      departmentId: 'department',
      accountCode: 'revenue',
      entryType: 'credit',
      amount: '10.00',
      entryDate: new Date(),
      sourceType: 'payment',
      sourceId: 'payment',
    },
  ];
  const setup = () => {
    const repo = {
      adminCashAccountId: jest.fn().mockResolvedValue('admin'),
      findAccountByCode: jest.fn(async (code) => ({ id: code })),
      saveEntries: jest.fn(),
    };
    return { repo, service: new LedgerService(repo as any) };
  };
  it('links system cash postings without a drawer to Admin Cash Drawer', async () => {
    const { repo, service } = setup();
    await service.post(entries);
    expect(repo.saveEntries).toHaveBeenCalledWith(
      expect.arrayContaining([
        expect.objectContaining({ cashAccountId: 'admin' }),
      ]),
      undefined,
    );
  });
  it('rejects a retired drawer before persisting entries', async () => {
    const { repo, service } = setup();
    await expect(
      service.post([{ ...entries[0], cashAccountId: 'retired' }, entries[1]]),
    ).rejects.toThrow('Admin Cash Drawer');
    expect(repo.saveEntries).not.toHaveBeenCalled();
  });
  it('preserves historical drawer links during audited reversals', async () => {
    const { repo, service } = setup();
    await service.post(
      [{ ...entries[0], cashAccountId: 'retired' }, entries[1]],
      undefined,
      true,
    );
    expect(repo.adminCashAccountId).not.toHaveBeenCalled();
    expect(repo.saveEntries).toHaveBeenCalledWith(
      expect.arrayContaining([
        expect.objectContaining({ cashAccountId: 'retired' }),
      ]),
      undefined,
    );
  });
});
