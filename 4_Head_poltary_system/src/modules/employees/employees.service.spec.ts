import { DataSource } from 'typeorm';
import { LedgerService } from '../ledger/ledger.service';
import { EmployeesRepository } from './employees.repository';
import { EmployeesService } from './employees.service';
import { EmployeeAdvance } from './entities/employee-advance.entity';
import { Employee } from './entities/employee.entity';
import { SalaryRun } from './entities/salary-run.entity';
import { SalaryWithdrawal } from './entities/salary-withdrawal.entity';
import { SalaryWithdrawalAllocation } from './entities/salary-withdrawal-allocation.entity';

describe('EmployeesService activation lifecycle', () => {
  const repository = {
    findEmployeeById: jest.fn(),
    findEmployeeByIdIncludingInactive: jest.fn(),
    deactivate: jest.fn(),
    softDelete: jest.fn(),
    activate: jest.fn(),
  } as unknown as jest.Mocked<EmployeesRepository>;
  const service = new EmployeesService(
    repository,
    {} as DataSource,
    {} as LedgerService,
  );

  beforeEach(() => jest.clearAllMocks());

  it('soft-deactivates an employee while retaining the record', async () => {
    repository.findEmployeeById.mockResolvedValue({
      id: 'employee-1',
    } as never);

    await expect(service.remove('employee-1')).resolves.toMatchObject({
      success: true,
    });
    expect(repository.deactivate).toHaveBeenCalledWith('employee-1');
    expect(repository.softDelete).toHaveBeenCalledWith('employee-1');
  });

  it('restores and activates an inactive employee', async () => {
    repository.findEmployeeByIdIncludingInactive
      .mockResolvedValueOnce({ id: 'employee-1', isActive: false } as never)
      .mockResolvedValueOnce({ id: 'employee-1', isActive: true } as never);

    await expect(service.activate('employee-1')).resolves.toMatchObject({
      success: true,
      data: { id: 'employee-1', isActive: true },
    });
    expect(repository.activate).toHaveBeenCalledWith('employee-1');
  });
});

describe('EmployeesService accounting', () => {
  const repository = {} as jest.Mocked<EmployeesRepository>;
  const manager = {
    findOne: jest.fn(),
    findOneOrFail: jest.fn(),
    create: jest.fn(),
    save: jest.fn(),
  };
  const dataSource = {
    transaction: jest.fn((callback: (value: typeof manager) => unknown) =>
      callback(manager),
    ),
  } as unknown as DataSource;
  const ledger = { post: jest.fn() } as unknown as jest.Mocked<LedgerService>;
  const service = new EmployeesService(repository, dataSource, ledger);

  beforeEach(() => jest.clearAllMocks());

  it('posts a confirmed advance against employee advance and cash', async () => {
    const advance = {
      id: 'advance-1',
      employeeId: 'employee-1',
      amount: '250.00',
      disbursementStatus: 'pending',
      employee: {
        fullName: 'Employee One',
        departmentId: 'department-1',
      },
    };
    manager.findOne.mockResolvedValueOnce(advance).mockResolvedValueOnce({
      id: 'employee-1',
      fullName: 'Employee One',
      departmentId: 'department-1',
    });
    manager.save.mockImplementation(async (_entity, value) => value);

    await service.confirmAdvance('employee-1', 'advance-1', 'cash', 'owner-1', {
      cashAccountId: '00000000-0000-4000-8000-000000000020',
    });

    expect(manager.findOne).toHaveBeenNthCalledWith(
      1,
      EmployeeAdvance,
      expect.objectContaining({
        where: { id: 'advance-1', employeeId: 'employee-1' },
        lock: { mode: 'pessimistic_write' },
      }),
    );
    expect(manager.findOne.mock.calls[0]?.[1]).not.toHaveProperty('relations');

    expect(ledger.post).toHaveBeenCalledWith(
      expect.arrayContaining([
        expect.objectContaining({
          accountCode: 'employee_advance',
          entryType: 'debit',
          amount: '250.00',
        }),
        expect.objectContaining({
          accountCode: 'cash',
          entryType: 'credit',
          amount: '250.00',
        }),
      ]),
      manager,
    );
  });

  it('accrues unpaid salary to the employee account instead of reducing cash', async () => {
    Object.assign(repository, {
      findSalaryRun: jest.fn().mockResolvedValue(null),
      findEmployeeById: jest.fn().mockResolvedValue({
        id: 'employee-1',
        fullName: 'Employee One',
        baseSalary: '1000.00',
        departmentId: 'department-1',
      }),
      findBonusesForPeriod: jest.fn().mockResolvedValue([{ amount: '200.00' }]),
    });
    manager.create.mockImplementation((_entity, value) => value);
    manager.save.mockImplementation(async (_entity, value) => ({
      id: 'run-1',
      ...value,
    }));

    const run = await service.runPayroll(
      {
        employeeId: 'employee-1',
        periodMonth: 7,
        periodYear: 2026,
        recoverAdvances: false,
      },
      'owner-1',
    );

    expect(run).toMatchObject({ netPayable: '1200.00', amountPaid: '0.00' });
    expect(ledger.post).toHaveBeenCalledWith(
      expect.arrayContaining([
        expect.objectContaining({
          accountCode: 'payroll_expense',
          entryType: 'debit',
          amount: '1200.00',
          entryDate: new Date('2026-07-01T00:00:00.000Z'),
        }),
        expect.objectContaining({
          accountCode: 'employee_salary_payable',
          entryType: 'credit',
          amount: '1200.00',
        }),
      ]),
      manager,
    );
    expect(ledger.post.mock.calls[0]?.[0]).not.toEqual(
      expect.arrayContaining([
        expect.objectContaining({ accountCode: 'cash' }),
      ]),
    );
  });

  it('deducts confirmed advances only when recovery is selected', async () => {
    Object.assign(repository, {
      findSalaryRun: jest.fn().mockResolvedValue(null),
      findEmployeeById: jest.fn().mockResolvedValue({
        id: 'employee-1',
        fullName: 'Employee One',
        baseSalary: '1000.00',
        departmentId: 'department-1',
      }),
      findBonusesForPeriod: jest.fn().mockResolvedValue([]),
      findRecoverableAdvances: jest.fn().mockResolvedValue([
        {
          id: 'advance-1',
          amount: '300.00',
          amountRecovered: '0.00',
          recoveryStatus: 'outstanding',
        },
      ]),
    });
    manager.create.mockImplementation((_entity, value) => value);
    manager.save.mockImplementation(async (_entity, value) => value);

    const withoutRecovery = await service.runPayroll(
      {
        employeeId: 'employee-1',
        periodMonth: 6,
        periodYear: 2026,
        recoverAdvances: false,
      },
      'owner-1',
    );
    expect(withoutRecovery.totalAdvancesDeducted).toBe('0.00');
    expect(withoutRecovery.netPayable).toBe('1000.00');
    expect(repository.findRecoverableAdvances).not.toHaveBeenCalled();

    const withRecovery = await service.runPayroll(
      {
        employeeId: 'employee-1',
        periodMonth: 7,
        periodYear: 2026,
        recoverAdvances: true,
      },
      'owner-1',
    );
    expect(withRecovery.totalAdvancesDeducted).toBe('300.00');
    expect(withRecovery.netPayable).toBe('700.00');
    expect(repository.findRecoverableAdvances).toHaveBeenCalledWith(
      'employee-1',
    );
  });
});

describe('EmployeesService salary account withdrawals', () => {
  it('settles accrued monthly salaries oldest-first and leaves a partial balance', async () => {
    const runs = [
      {
        id: 'run-june',
        employeeId: 'employee-1',
        periodMonth: 6,
        periodYear: 2026,
        netPayable: '1000.00',
        amountPaid: '0.00',
        paymentStatus: 'pending',
      },
      {
        id: 'run-july',
        employeeId: 'employee-1',
        periodMonth: 7,
        periodYear: 2026,
        netPayable: '1200.00',
        amountPaid: '0.00',
        paymentStatus: 'pending',
      },
    ] as SalaryRun[];
    const query = {
      setLock: jest.fn().mockReturnThis(),
      where: jest.fn().mockReturnThis(),
      andWhere: jest.fn().mockReturnThis(),
      orderBy: jest.fn().mockReturnThis(),
      addOrderBy: jest.fn().mockReturnThis(),
      getMany: jest.fn().mockResolvedValue(runs),
    };
    const runRepository = { createQueryBuilder: jest.fn(() => query) };
    const withdrawalRepository = {
      create: jest.fn((value) => value),
      save: jest.fn(async (value) => ({ id: 'withdrawal-1', ...value })),
      findOneOrFail: jest.fn(async () => ({ id: 'withdrawal-1' })),
    };
    const allocationRepository = {
      create: jest.fn((value) => value),
    };
    const manager = {
      findOne: jest.fn(async (entity) =>
        entity === Employee
          ? { id: 'employee-1', departmentId: 'department-1' }
          : null,
      ),
      getRepository: jest.fn((entity) => {
        if (entity === SalaryRun) return runRepository;
        if (entity === SalaryWithdrawal) return withdrawalRepository;
        if (entity === SalaryWithdrawalAllocation) return allocationRepository;
        throw new Error('Unexpected repository');
      }),
      save: jest.fn(async (_entity, value) => value),
    };
    const dataSource = {
      transaction: jest.fn((callback) => callback(manager)),
    } as unknown as DataSource;
    const ledger = { post: jest.fn() } as unknown as jest.Mocked<LedgerService>;
    const service = new EmployeesService(
      {} as EmployeesRepository,
      dataSource,
      ledger,
    );

    await service.withdrawSalary(
      'employee-1',
      {
        amount: 1500,
        withdrawalDate: '2026-07-16',
        paymentMethod: 'cash',
        cashAccountId: '00000000-0000-4000-8000-000000000020',
      },
      'owner-1',
    );

    expect(runs[0]).toMatchObject({
      amountPaid: '1000.00',
      paymentStatus: 'paid',
    });
    expect(runs[1]).toMatchObject({
      amountPaid: '500.00',
      paymentStatus: 'partially_paid',
    });
    expect(allocationRepository.create).toHaveBeenNthCalledWith(
      1,
      expect.objectContaining({ salaryRunId: 'run-june', amount: '1000.00' }),
    );
    expect(allocationRepository.create).toHaveBeenNthCalledWith(
      2,
      expect.objectContaining({ salaryRunId: 'run-july', amount: '500.00' }),
    );
    expect(ledger.post).toHaveBeenCalledWith(
      expect.arrayContaining([
        expect.objectContaining({
          accountCode: 'employee_salary_payable',
          entryType: 'debit',
          amount: '1500.00',
        }),
        expect.objectContaining({
          accountCode: 'cash',
          entryType: 'credit',
          amount: '1500.00',
        }),
      ]),
      manager,
    );
  });
});
