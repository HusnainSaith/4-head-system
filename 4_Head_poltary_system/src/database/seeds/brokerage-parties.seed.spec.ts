import { DataSource } from 'typeorm';
import { Party } from '../../modules/parties/entities/party.entity';
import { User } from '../../modules/users/entities/user.entity';
import { Department } from '../../modules/departments/entities/department.entity';
import { Role } from '../../modules/roles/entities/role.entity';
import { LedgerEntry } from '../../modules/ledger/entities/ledger-entry.entity';
import {
  BROKERAGE_BALANCE_DATE,
  ENTRIES,
  seedBrokerageParties,
  resetBrokerageTransactions,
} from './brokerage-parties.seed';

jest.mock('bcryptjs', () => ({
  hash: jest.fn().mockResolvedValue('test-hash'),
}));

function fixture() {
  const postings: Array<Record<string, unknown>> = [];
  const remove = jest.fn().mockResolvedValue({ affected: 2 });
  const saveParty = jest.fn().mockImplementation(async (party) => party);
  const builder = {
    leftJoinAndSelect: jest.fn().mockReturnThis(),
    where: jest.fn().mockImplementation((_sql, params) => {
      builder.name = params.name;
      return builder;
    }),
    andWhere: jest.fn().mockReturnThis(),
    name: '',
    getMany: jest.fn().mockImplementation(async () => [
      {
        id: builder.name,
        name: builder.name,
        primaryDepartmentId: 'brokerage',
      },
    ]),
  };
  const query = jest
    .fn()
    .mockImplementation(async (sql: string, params?: unknown[]) => {
      if (sql.includes('pg_advisory')) return [];
      if (sql.includes('to_regclass')) return [{ table: 'shop_purchases' }];
      if (sql.includes('chart_of_accounts')) return [{ id: params?.[0] }];
      if (sql.includes("source_type != 'opening_balance'"))
        return [{ balance: params?.[0] === 'Five star feed' ? '1000' : '0' }];
      if (sql.includes('FROM parties p')) {
        const amount = postings
          .filter((p) => p.partyId === params?.[0])
          .reduce(
            (sum, p) =>
              sum + Number(p.amount) * (p.entryType === 'credit' ? 1 : -1),
            0,
          );
        return [
          {
            balance: String(
              amount + (params?.[0] === 'Five star feed' ? 1000 : 0),
            ),
          },
        ];
      }
      throw new Error(`Unexpected query: ${sql}`);
    });
  const manager = {
    query,
    getRepository: (entity: unknown) => {
      if (entity === Department)
        return { findOneBy: async () => ({ id: 'brokerage' }) };
      if (entity === Role) return { findOneBy: async () => ({ id: 'staff' }) };
      if (entity === User) return { findOneBy: async () => ({ id: 'user' }) };
      if (entity === Party)
        return {
          createQueryBuilder: () => builder,
          save: saveParty,
          create: (party: { name: string }) => ({ ...party, id: party.name }),
        };
      if (entity === LedgerEntry)
        return {
          delete: remove,
          create: (entry: unknown) => entry,
          save: async (entries: Array<Record<string, unknown>>) =>
            postings.push(...entries),
        };
      throw new Error('Unexpected entity');
    },
  };
  const transaction = jest
    .fn()
    .mockImplementation(async (work) => work(manager));
  return {
    source: { transaction } as unknown as DataSource,
    postings,
    remove,
    saveParty,
    query,
    builder,
    transaction,
  };
}

describe('Brokerage-only balance snapshot seed', () => {
  it('add-only leaves existing parties, users and ledger records untouched', async () => {
    const f = fixture();
    const result = await seedBrokerageParties(
      f.source,
      'as-of',
      undefined,
      true,
    );
    expect(result.added).toBe(0);
    expect(result.skipped).toHaveLength(4);
    expect(f.remove).not.toHaveBeenCalled();
    expect(f.saveParty).not.toHaveBeenCalled();
    expect(f.postings).toHaveLength(0);
  });
  it('add-only inserts a missing party with its signed October opening balance', async () => {
    const f = fixture();
    f.builder.getMany.mockImplementation(async () =>
      f.builder.name === 'Anwer'
        ? []
        : [
            {
              id: f.builder.name,
              name: f.builder.name,
              primaryDepartmentId: 'brokerage',
            },
          ],
    );
    const result = await seedBrokerageParties(
      f.source,
      'as-of',
      undefined,
      true,
    );
    expect(result.added).toBe(1);
    expect(f.remove).not.toHaveBeenCalled();
    expect(f.postings.find((p) => p.partyId === 'Anwer')).toMatchObject({
      amount: '500000.00',
      entryType: 'debit',
      entryDate: '2026-10-01',
    });
    expect(f.saveParty).toHaveBeenCalledTimes(1);
  });
  it('rejects add-only combined with a destructive reset', async () => {
    const f = fixture();
    await expect(
      seedBrokerageParties(
        f.source,
        'as-of',
        { detachSupplyLinks: true },
        true,
      ),
    ).rejects.toThrow('Add-only cannot reset');
    expect(f.transaction).not.toHaveBeenCalled();
  });
  it('uses 1 October, scopes opening replacements and preserves transactions while matching balances', async () => {
    const f = fixture();
    await seedBrokerageParties(f.source);
    expect(f.transaction).toHaveBeenCalledTimes(1);
    expect(f.remove).toHaveBeenCalledTimes(ENTRIES.length);
    for (const [criteria] of f.remove.mock.calls)
      expect(criteria).toMatchObject({
        sourceType: 'opening_balance',
        departmentId: 'brokerage',
      });
    expect(f.postings.every((p) => p.entryDate === '2026-10-01')).toBe(true);
    const farm = f.postings.find((p) => p.partyId === 'Five star feed');
    expect(farm).toMatchObject({ amount: '7157040.00', entryType: 'credit' });
    const receivable = f.postings.find(
      (p) => p.partyId === 'Faheem & Brothers',
    );
    expect(receivable).toMatchObject({
      amount: '136974140.00',
      entryType: 'debit',
    });
    expect(
      f.postings.reduce(
        (sum, p) =>
          sum + Number(p.amount) * (p.entryType === 'credit' ? 1 : -1),
        0,
      ),
    ).toBe(0);
    expect(f.postings.some((p) => p.partyId === 'Asif sab')).toBe(false);
    expect(BROKERAGE_BALANCE_DATE).toBe('2026-10-01');
  });
  it('can reconcile the current balance without deleting later transactions', async () => {
    const f = fixture();
    await seedBrokerageParties(f.source, 'current');
    expect(
      f.query.mock.calls
        .filter(([sql]) => sql.includes("source_type != 'opening_balance'"))
        .every(([, params]) => params[2] === true),
    ).toBe(true);
  });
  it('rejects ambiguous parties before replacing their opening entries', async () => {
    const f = fixture();
    f.builder.getMany.mockResolvedValue([
      { id: 'one' },
      { id: 'two' },
    ] as never);
    await expect(seedBrokerageParties(f.source)).rejects.toThrow(
      'Ambiguous Brokerage party',
    );
    expect(f.remove).not.toHaveBeenCalled();
  });
});

describe('Brokerage transaction reset safeguards', () => {
  it('requires an explicit decision for linked Supply records before deleting anything', async () => {
    const query = jest.fn().mockResolvedValueOnce([{ count: 3 }]);
    await expect(
      resetBrokerageTransactions({ query } as never, 'brokerage', false),
    ).rejects.toThrow('explicit --detach-supply-links');
    expect(query).toHaveBeenCalledTimes(1);
  });
  it('rejects unplanned payroll, expense or investment records before any deletion', async () => {
    const query = jest
      .fn()
      .mockResolvedValueOnce([{ count: 0 }])
      .mockResolvedValueOnce([{ count: '1' }]);
    await expect(
      resetBrokerageTransactions({ query } as never, 'brokerage', false),
    ).rejects.toThrow('separate reset plan');
    expect(query).toHaveBeenCalledTimes(2);
  });
  it('only detaches Supply source links and deletes Brokerage transaction rows', async () => {
    const query = jest
      .fn()
      .mockResolvedValueOnce([{ count: 3 }])
      .mockResolvedValueOnce([{ count: '0' }])
      .mockResolvedValue([[], 3]);
    const counts = await resetBrokerageTransactions(
      { query } as never,
      'brokerage',
      true,
    );
    expect(counts.detachedSupplyLinks).toBe(3);
    const writes = query.mock.calls.slice(2);
    for (const [sql, params] of writes) {
      if (sql.includes('DELETE FROM notifications')) {
        expect(sql).toContain("source_type = 'brokerage'");
        continue;
      }
      expect(sql).toContain('department_id = $1');
      expect(params).toEqual(['brokerage']);
    }
    expect(writes[0][0]).toContain('SET source_brokerage_sale_id = NULL');
    expect(
      writes.some(
        ([sql]) =>
          sql.includes('DELETE FROM "users"') ||
          sql.includes('DELETE FROM "parties"') ||
          sql.includes('DELETE FROM "departments"'),
      ),
    ).toBe(false);
  });
});
