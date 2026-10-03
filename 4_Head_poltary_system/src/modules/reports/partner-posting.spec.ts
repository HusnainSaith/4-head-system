import { ReportsRepository } from './reports.repository';
import { ReportsService } from './reports.service';
import { LedgerEntry } from '../ledger/entities/ledger-entry.entity';
import { ChartOfAccount } from '../ledger/entities/chart-of-account.entity';

describe('explicit partner profit postings', () => {
  let repository: ReportsRepository;
  let manager: any;
  let previous: any[];
  let amount: string;
  let configured: boolean;
  beforeEach(() => {
    amount = '-192788.00';
    configured = true;
    previous = [];
    manager = {
      query: jest.fn(),
      findOne: jest.fn(async () => ({ id: 'd' })),
      getRepository: jest.fn(() => ({})),
      find: jest.fn(async (entity) =>
        entity === ChartOfAccount
          ? [
              { id: 'payable', code: 'accounts_payable' },
              { id: 'equity', code: 'retained_earnings' },
            ]
          : previous,
      ),
      create: jest.fn((_entity, data) => data),
      save: jest.fn(async (_entity, entries) => {
        previous.push(...entries);
        return entries;
      }),
    };
    const departmentRepo = {
      manager: { transaction: async (fn: any) => fn(manager) },
    };
    repository = new ReportsRepository(
      ...([
        {},
        {},
        {},
        {},
        {},
        {},
        {},
        {},
        {},
        {},
        departmentRepo,
      ] as any as ConstructorParameters<typeof ReportsRepository>),
    );
  });
  const dto = () => ({
    startDate: '2026-09-01',
    endDate: '2026-09-30',
    expectedNetProfit: amount,
  });
  const preview = async () => ({
    configured,
    netProfit: amount,
    partners: [{ partyId: 'p1', profitShare: amount }],
  });
  it('posts loss as a partner debit with a balancing equity credit', async () => {
    expect(
      (await repository.postPartnerProfit('d', dto(), 'admin', preview))
        .changed,
    ).toBe(true);
    expect(manager.save).toHaveBeenCalledWith(
      LedgerEntry,
      expect.arrayContaining([
        expect.objectContaining({
          partyId: 'p1',
          accountId: 'payable',
          entryType: 'debit',
          amount: '192788.00',
        }),
        expect.objectContaining({
          accountId: 'equity',
          entryType: 'credit',
          amount: '192788.00',
        }),
      ]),
    );
  });
  it('does not post the same profit twice', async () => {
    amount = '100.00';
    await repository.postPartnerProfit('d', dto(), 'admin', preview);
    expect(
      (await repository.postPartnerProfit('d', dto(), 'admin', preview))
        .changed,
    ).toBe(false);
    expect(manager.save).toHaveBeenCalledTimes(1);
  });
  it('posts only the difference if the same period is corrected', async () => {
    amount = '100.00';
    await repository.postPartnerProfit('d', dto(), 'admin', preview);
    amount = '-20.00';
    await repository.postPartnerProfit('d', dto(), 'admin', preview);
    expect(manager.save.mock.calls[1][1]).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          partyId: 'p1',
          entryType: 'debit',
          amount: '120.00',
        }),
      ]),
    );
  });
  it('rejects overlapping date ranges without writing entries', async () => {
    await repository.postPartnerProfit('d', dto(), 'admin', preview);
    await expect(
      repository.postPartnerProfit(
        'd',
        { ...dto(), startDate: '2026-09-15', endDate: '2026-10-01' },
        'admin',
        preview,
      ),
    ).rejects.toThrow('overlaps');
    expect(manager.save).toHaveBeenCalledTimes(1);
  });
  it('extends a cumulative period without posting earlier profit again', async () => {
    amount = '100.00';
    await repository.postPartnerProfit('d', dto(), 'admin', preview);
    amount = '120.00';
    await repository.postPartnerProfit(
      'd',
      { ...dto(), endDate: '2026-10-01' },
      'admin',
      preview,
    );
    expect(manager.save.mock.calls[1][1]).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          partyId: 'p1',
          entryType: 'credit',
          amount: '20.00',
        }),
      ]),
    );
    expect(
      (
        await repository.postPartnerProfit(
          'd',
          { ...dto(), endDate: '2026-10-01' },
          'admin',
          preview,
        )
      ).changed,
    ).toBe(false);
  });
  it('rejects a stale preview and incomplete ownership', async () => {
    await expect(
      repository.postPartnerProfit(
        'd',
        { ...dto(), expectedNetProfit: '1.00' },
        'admin',
        preview,
      ),
    ).rejects.toThrow('changed');
    configured = false;
    await expect(
      repository.postPartnerProfit('d', dto(), 'admin', preview),
    ).rejects.toThrow('Configure');
    expect(manager.save).not.toHaveBeenCalled();
  });
  it('does not include unposted previews in actual partner balances', async () => {
    const service = new ReportsService(repository);
    expect(await service.getPartnerAccruals()).toEqual([]);
    expect(manager.save).not.toHaveBeenCalled();
  });
});
