import { DataSource } from 'typeorm';
import { EmployeesService } from './employees.service';
import { EmployeesRepository } from './employees.repository';
import { LedgerService } from '../ledger/ledger.service';
import { RunPayrollDto } from './dto/run-payroll.dto';
import { validate } from 'class-validator';

describe('manual payroll deductions', () => {
  const repository = {
    findSalaryRun: jest.fn(),
    findEmployeeById: jest.fn(),
    findBonusesForPeriod: jest.fn(),
    findRecoverableAdvances: jest.fn(),
  };
  const manager = { create: jest.fn(), save: jest.fn() };
  const ledger = { post: jest.fn() };
  const service = new EmployeesService(
    repository as unknown as EmployeesRepository,
    {
      transaction: (fn: (value: typeof manager) => unknown) => fn(manager),
    } as unknown as DataSource,
    ledger as unknown as LedgerService,
  );
  const input = {
    employeeId: '00000000-0000-4000-8000-000000000001',
    periodMonth: 10,
    periodYear: 2026,
  };
  beforeEach(() => {
    jest.resetAllMocks();
    repository.findSalaryRun.mockResolvedValue(null);
    repository.findEmployeeById.mockResolvedValue({
      baseSalary: '35000.00',
      departmentId: 'd',
    });
    repository.findBonusesForPeriod.mockResolvedValue([]);
    repository.findRecoverableAdvances.mockResolvedValue([]);
    manager.create.mockImplementation((_, value) => value);
    manager.save.mockImplementation(async (_, value) => ({
      id: 'run',
      ...value,
    }));
  });
  it('subtracts 5000 from 35000 and reduces payroll expense to 30000', async () => {
    const run = await service.runPayroll(
      { ...input, manualDeduction: 5000, deductionReason: 'Leave' },
      'u',
    );
    expect(run).toMatchObject({
      netPayable: '30000.00',
      manualDeduction: '5000.00',
      deductionReason: 'Leave',
    });
    expect(ledger.post.mock.calls[0][0]).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          accountCode: 'payroll_expense',
          amount: '30000.00',
        }),
        expect.objectContaining({
          accountCode: 'employee_salary_payable',
          amount: '30000.00',
        }),
      ]),
    );
  });
  it('defaults the deduction to zero for existing clients', async () => {
    expect(await service.runPayroll(input, 'u')).toMatchObject({
      netPayable: '35000.00',
      manualDeduction: '0.00',
    });
  });
  it('caps advance recovery after the manual deduction', async () => {
    const advance = {
      amount: '32000.00',
      amountRecovered: '0.00',
      recoveryStatus: 'outstanding',
    };
    repository.findRecoverableAdvances.mockResolvedValue([advance]);
    expect(
      await service.runPayroll(
        { ...input, manualDeduction: 5000, recoverAdvances: true },
        'u',
      ),
    ).toMatchObject({
      netPayable: '0.00',
      totalAdvancesDeducted: '30000.00',
      paymentStatus: 'paid',
    });
    expect(advance).toMatchObject({
      amountRecovered: '30000.00',
      recoveryStatus: 'partially_recovered',
    });
  });
  it('calculates decimal salary and bonuses exactly', async () => {
    repository.findEmployeeById.mockResolvedValue({
      baseSalary: '0.10',
      departmentId: 'd',
    });
    repository.findBonusesForPeriod.mockResolvedValue([{ amount: '0.20' }]);
    expect(
      await service.runPayroll({ ...input, manualDeduction: 0.1 }, 'u'),
    ).toMatchObject({ netPayable: '0.20' });
  });
  it.each([-1, 35001, 0.001, NaN, Infinity])(
    'rejects invalid deduction %s before posting',
    async (manualDeduction) => {
      await expect(
        service.runPayroll({ ...input, manualDeduction }, 'u'),
      ).rejects.toThrow();
      expect(ledger.post).not.toHaveBeenCalled();
      expect(manager.save).not.toHaveBeenCalled();
    },
  );
  it('accepts a full salary deduction without creating a cash payment', async () => {
    expect(
      await service.runPayroll({ ...input, manualDeduction: 35000 }, 'u'),
    ).toMatchObject({ netPayable: '0.00', paymentStatus: 'paid' });
    expect(ledger.post.mock.calls[0][0]).not.toEqual(
      expect.arrayContaining([
        expect.objectContaining({ accountCode: 'cash' }),
      ]),
    );
  });
  it('validates payroll period and deduction precision on API input', async () => {
    const dto = Object.assign(new RunPayrollDto(), input, {
      periodMonth: 13,
      periodYear: 1,
      manualDeduction: 1.001,
    });
    expect((await validate(dto)).map((error) => error.property)).toEqual(
      expect.arrayContaining(['periodMonth', 'periodYear', 'manualDeduction']),
    );
  });
});
