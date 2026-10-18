import { PartiesService } from './parties.service';
import { LedgerEntry } from '../ledger/entities/ledger-entry.entity';

describe('Statement balance adjustment operations', () => {
  let service: PartiesService,
    repo: any,
    source: any,
    entry: any,
    settlementRepo: any,
    manager: any;
  beforeEach(() => {
    entry = {
      id: 'entry',
      sourceId: 'entry',
      partyId: 'party',
      sourceType: 'party_adjustment',
      amount: '100',
      entryType: 'credit',
      description: 'Original',
    };
    repo = {
      findOne: jest
        .fn()
        .mockImplementation(async ({ where }) =>
          where.partyId === 'party' ? entry : null,
        ),
      update: jest.fn(),
      delete: jest.fn(),
    };
    settlementRepo = { findOne: jest.fn().mockResolvedValue(null) };
    manager = {
      getRepository: () => repo,
      query: jest.fn().mockResolvedValue([{ id: 'receivable' }]),
    };
    source = {
      getRepository: (entity: any) =>
        entity === LedgerEntry ? repo : settlementRepo,
      transaction: jest.fn(async (fn) => fn(manager)),
    };
    service = new PartiesService(
      { findById: jest.fn().mockResolvedValue({ id: 'party' }) } as any,
      {} as any,
      source,
    );
  });
  it('updates a standalone adjustment with the account matching its signed balance', async () => {
    await service.updateStatementAdjustment(
      'party',
      'entry',
      {
        date: '2026-10-01',
        amount: 250,
        entryType: 'debit',
        notes: 'Correction',
      },
      'actor',
    );
    expect(manager.query).toHaveBeenCalledWith(expect.any(String), [
      'accounts_receivable',
    ]);
    expect(repo.update).toHaveBeenCalledWith(
      { id: 'entry', partyId: 'party' },
      expect.objectContaining({
        amount: '250.00',
        entryType: 'debit',
        description: 'Correction',
      }),
    );
    expect(repo.findOne).toHaveBeenCalledWith(
      expect.objectContaining({ lock: { mode: 'pessimistic_write' } }),
    );
  });
  it('deletes only the requested standalone adjustment', async () => {
    await service.deleteStatementAdjustment('party', 'entry', 'actor');
    expect(repo.delete).toHaveBeenCalledWith({ id: 'entry', partyId: 'party' });
  });
  it('refuses another party or unsupported source without writes', async () => {
    await expect(
      service.deleteStatementAdjustment('another', 'entry', 'actor'),
    ).rejects.toThrow('not found');
    expect(source.transaction).not.toHaveBeenCalled();
  });
  it('refuses orphan reversal entries without writes', async () => {
    entry.sourceId = 'original';
    await expect(
      service.deleteStatementAdjustment('party', 'entry', 'actor'),
    ).rejects.toThrow('original settlement');
    expect(repo.delete).not.toHaveBeenCalled();
  });
  it('edits the entire settlement rather than one of its ledger rows', async () => {
    settlementRepo.findOne.mockResolvedValue({ id: 'settlement' });
    const update = jest
      .spyOn(service, 'updatePartySettlement')
      .mockResolvedValue({ success: true } as any);
    await service.updateStatementAdjustment(
      'party',
      'entry',
      {
        date: '2026-10-01',
        amount: 250,
        entryType: 'credit',
        notes: 'Updated',
      },
      'actor',
    );
    expect(update).toHaveBeenCalledWith(
      'settlement',
      { settlementDate: '2026-10-01', settlementAmount: 250, notes: 'Updated' },
      'actor',
    );
    expect(repo.update).not.toHaveBeenCalled();
  });
  it('reverses both parties through the existing settlement deletion operation', async () => {
    settlementRepo.findOne.mockResolvedValue({ id: 'settlement' });
    const remove = jest
      .spyOn(service, 'deletePartySettlement')
      .mockResolvedValue({ success: true } as any);
    await service.deleteStatementAdjustment('party', 'entry', 'actor');
    expect(remove).toHaveBeenCalledWith(
      'settlement',
      'Deleted from party statement',
      'actor',
    );
    expect(repo.delete).not.toHaveBeenCalled();
  });
});
