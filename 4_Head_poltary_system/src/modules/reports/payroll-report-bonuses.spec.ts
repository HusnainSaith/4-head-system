import { ReportsRepository } from './reports.repository';
import { pendingPayrollBonuses } from '../employees/pending-payroll-bonuses';
import { EntityManager } from 'typeorm';

describe('payroll report bonuses and calendar boundaries', () => {
  it('keeps inclusive calendar dates intact when summing ledger payroll and late bonuses', async () => {
    const query: any = {};
    for (const method of [
      'leftJoin',
      'select',
      'setParameter',
      'where',
      'andWhere',
    ])
      query[method] = jest.fn(() => query);
    query.getRawOne = jest.fn(async () => ({ sum: '30000.00' }));
    const manager = {
      query: jest.fn(async (_sql: string, _params?: unknown[]) => [
        { amount: '10.00' },
      ]),
    };
    const ledgerRepo = { manager, createQueryBuilder: () => query };
    const repository = new ReportsRepository(
      ...([
        ledgerRepo,
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
      ] as any as ConstructorParameters<typeof ReportsRepository>),
    );
    expect(
      await repository.sumLedgerAccount(
        'd',
        ['payroll_expense'],
        'debit',
        new Date('1970-01-01'),
        new Date('2026-10-02'),
      ),
    ).toBe(30010);
    expect(query.andWhere).toHaveBeenCalledWith('le.entry_date < :to', {
      to: '2026-10-02',
    });
    expect(manager.query).toHaveBeenCalledWith(
      expect.stringContaining('LEFT JOIN salary_runs'),
      ['d', '1970-01-01', '2026-10-02'],
    );
  });
  it('supports bonuses before payroll, and excludes cancelled or already-accrued amounts in its grouped query', async () => {
    const manager = {
      query: jest.fn(async (_sql: string, _params?: unknown[]) => [
        { amount: '0.00' },
      ]),
    };
    expect(
      await pendingPayrollBonuses(
        manager as unknown as EntityManager,
        null,
        new Date('2026-09-01'),
        new Date('2026-10-01'),
      ),
    ).toBe(0);
    const sql = manager.query.mock.calls[0][0];
    expect(sql).toContain('sr.deleted_at IS NULL');
    expect(sql).toContain('employee_salary_payable');
    expect(sql).toContain('entry.entry_type');
    expect(sql).toContain('bonus_date < $3::date');
  });
});
