import { PartiesService } from './parties.service';
import { LedgerEntry } from '../ledger/entities/ledger-entry.entity';

describe('Opening balance statement actions', () => {
  let service: PartiesService,
    manager: any,
    repo: any,
    party: any,
    entries: any[];
  beforeEach(() => {
    party = { id: 'party', openingBalance: '100.00' };
    entries = [
      {
        id: 'entry',
        partyId: 'party',
        sourceType: 'opening_balance',
        sourceId: 'party',
        entryType: 'credit',
      },
      { id: 'control', partyId: null, entryType: 'debit' },
    ];
    repo = {
      findOne: jest.fn().mockResolvedValue(entries[0]),
      find: jest.fn().mockImplementation(async () => entries),
      update: jest.fn(),
      delete: jest.fn(),
    };
    manager = {
      findOne: jest.fn().mockResolvedValue(party),
      getRepository: () => repo,
      query: jest.fn().mockResolvedValue([{ id: 'ar' }]),
      save: jest.fn(),
    };
    const source = {
      getRepository: (entity: any) =>
        entity === LedgerEntry ? repo : { findOne: jest.fn() },
      transaction: jest.fn(async (fn: any) => fn(manager)),
    };
    service = new PartiesService(
      { findById: jest.fn().mockResolvedValue(party) } as any,
      {} as any,
      source as any,
    );
  });
  it('updates both accounting rows and the signed opening balance atomically', async () => {
    await service.updateStatementAdjustment(
      'party',
      'entry',
      {
        date: '2026-10-01',
        amount: 250,
        entryType: 'debit',
        notes: 'Corrected',
      },
      'actor',
    );
    expect(repo.update).toHaveBeenCalledWith(
      'entry',
      expect.objectContaining({
        amount: '250.00',
        entryType: 'debit',
        accountId: 'ar',
      }),
    );
    expect(repo.update).toHaveBeenCalledWith(
      'control',
      expect.objectContaining({
        amount: '250.00',
        entryType: 'credit',
        accountId: 'ar',
      }),
    );
    expect(party.openingBalance).toBe('-250.00');
    expect(manager.findOne).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({ lock: { mode: 'pessimistic_write' } }),
    );
  });
  it('removes the matched pair and resets the opening balance only when requested', async () => {
    await service.deleteStatementAdjustment('party', 'entry', 'actor');
    expect(repo.delete).toHaveBeenCalledWith({
      sourceType: 'opening_balance',
      sourceId: 'party',
    });
    expect(party.openingBalance).toBe('0.00');
  });
  it('rejects incomplete or unrelated pairs without changing balances', async () => {
    entries.splice(1);
    await expect(
      service.deleteStatementAdjustment('party', 'entry', 'actor'),
    ).rejects.toThrow('incomplete');
    expect(repo.delete).not.toHaveBeenCalled();
    expect(manager.save).not.toHaveBeenCalled();
  });
});
