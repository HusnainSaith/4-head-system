import { DataSource } from 'typeorm';
import { EmployeesService } from './employees.service';
import { EmployeesRepository } from './employees.repository';
import { LedgerService } from '../ledger/ledger.service';
import { Employee } from './entities/employee.entity';
import { EmployeeBonus } from './entities/employee-bonus.entity';
import { SalaryRun } from './entities/salary-run.entity';
import { SalaryWithdrawal } from './entities/salary-withdrawal.entity';
import { SalaryWithdrawalAllocation } from './entities/salary-withdrawal-allocation.entity';

describe('late bonus withdrawals', () => {
  let service: EmployeesService;
  let savedRun: SalaryRun;
  let manager: any;
  let ledger: any;
  let accrued: string;
  beforeEach(() => {
    savedRun = {
      id: 'run',
      employeeId: 'employee',
      periodMonth: 9,
      periodYear: 2026,
      netPayable: '34667.00',
      totalBonuses: '0.00',
      amountPaid: '34667.00',
      paymentStatus: 'paid',
    } as SalaryRun;
    accrued = '34667.00';
    const query: any = {};
    for (const name of [
      'setLock',
      'where',
      'andWhere',
      'orderBy',
      'addOrderBy',
    ])
      query[name] = jest.fn(() => query);
    query.getMany = jest.fn(async () => [savedRun]);
    const withdrawal = {
      create: (value: any) => value,
      save: jest.fn(async (value: any) => ({ id: 'withdrawal', ...value })),
      findOneOrFail: jest.fn(async () => ({ id: 'withdrawal' })),
    };
    manager = {
      findOne: jest.fn(async (entity) =>
        entity === Employee
          ? { id: 'employee', departmentId: 'department' }
          : null,
      ),
      query: jest.fn(async (sql: string) =>
        sql.includes('chart_of_accounts')
          ? [{ amount: accrued }]
          : sql.includes('FOR UPDATE')
            ? [{ opening_balance: '100000.00' }]
            : [{ balance: '0.00' }],
      ),
      getRepository: jest.fn((entity) => {
        if (entity === SalaryRun)
          return {
            createQueryBuilder: () => query,
            find: async () => [savedRun],
          };
        if (entity === EmployeeBonus)
          return {
            find: async () => [
              {
                employeeId: 'employee',
                bonusDate: '2026-09-30',
                amount: '14999.00',
              },
            ],
          };
        if (entity === SalaryWithdrawal)
          return { ...withdrawal, find: async () => [] };
        if (entity === SalaryWithdrawalAllocation)
          return { create: (value: any) => value };
        throw Error('Unexpected repository');
      }),
      save: jest.fn(async (_entity, value) => value),
    };
    ledger = {
      post: jest.fn(async (entries) => {
        for (const entry of entries)
          if (entry.sourceType === 'salary' && entry.entryType === 'credit')
            accrued = entry.amount === '14999.00' ? '49666.00' : accrued;
      }),
    };
    service = new EmployeesService(
      {
        findEmployeeByIdIncludingInactive: async () => ({ id: 'employee' }),
      } as unknown as EmployeesRepository,
      {
        getRepository: manager.getRepository,
        transaction: async (fn: any) => fn(manager),
      } as unknown as DataSource,
      ledger as LedgerService,
    );
  });
  const withdraw = (amount: number) => ({
    amount,
    withdrawalDate: '2026-10-01',
    paymentMethod: 'cash' as const,
    cashAccountId: '00000000-0000-4000-8000-000000000020',
  });
  it('shows the new bonus in total credited and available balance with no writes', async () => {
    expect((await service.getSalaryAccount('employee')).data).toMatchObject({
      totalAccrued: '49666.00',
      totalWithdrawn: '34667.00',
      availableBalance: '14999.00',
    });
    expect(manager.save).not.toHaveBeenCalled();
    expect(ledger.post).not.toHaveBeenCalled();
    expect(savedRun.netPayable).toBe('34667.00');
  });
  it('withdraws a bonus from an already-paid month and accrues it once', async () => {
    await service.withdrawSalary('employee', withdraw(4999), 'admin');
    await service.withdrawSalary('employee', withdraw(10000), 'admin');
    expect(savedRun).toMatchObject({
      netPayable: '34667.00',
      totalBonuses: '0.00',
      amountPaid: '49666.00',
      paymentStatus: 'paid',
    });
    const accrualPosts = ledger.post.mock.calls.filter(
      ([entries]: any) => entries[0].sourceType === 'salary',
    );
    expect(accrualPosts).toHaveLength(1);
    expect(accrualPosts[0][0]).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          accountCode: 'employee_salary_payable',
          entryType: 'credit',
          amount: '14999.00',
        }),
      ]),
    );
  });
  it('rejects exceeding the bonus balance before saving or posting', async () => {
    await expect(
      service.withdrawSalary('employee', withdraw(15000), 'admin'),
    ).rejects.toThrow('cannot exceed');
    expect(manager.save).not.toHaveBeenCalled();
    expect(ledger.post).not.toHaveBeenCalled();
  });
  it('rejects a bonus withdrawal when the selected cash account has no funds', async () => {
    manager.query.mockImplementation(async (sql: string) =>
      sql.includes('FOR UPDATE')
        ? [{ opening_balance: '0.00' }]
        : [{ balance: '0.00' }],
    );
    await expect(
      service.withdrawSalary('employee', withdraw(14999), 'admin'),
    ).rejects.toThrow('Insufficient cash');
    expect(manager.save).not.toHaveBeenCalled();
    expect(ledger.post).not.toHaveBeenCalled();
  });
});
