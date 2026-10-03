import { DataSource } from 'typeorm';
import { validate } from 'class-validator';
import { EmployeesService } from './employees.service';
import { EmployeesRepository } from './employees.repository';
import { LedgerService } from '../ledger/ledger.service';
import { Employee } from './entities/employee.entity';
import { EmployeeBonus } from './entities/employee-bonus.entity';
import { SalaryRun } from './entities/salary-run.entity';
import { CreateBonusDto } from './dto/create-bonus.dto';

describe('bonus management', () => {
  let bonus: EmployeeBonus;
  let runs: SalaryRun[];
  let manager: any;
  let ledger: any;
  let service: EmployeesService;
  beforeEach(() => {
    bonus = {
      id: 'b',
      employeeId: 'e',
      amount: '500.00',
      bonusDate: new Date('2026-09-30'),
      reason: 'Old',
    } as EmployeeBonus;
    runs = [
      {
        id: 'r',
        employeeId: 'e',
        periodMonth: 9,
        periodYear: 2026,
        totalBonuses: '500.00',
        netPayable: '30500.00',
        amountPaid: '0.00',
        manualDeduction: '5000.00',
        totalAdvancesDeducted: '0.00',
      },
    ] as SalaryRun[];
    const query: any = {};
    for (const method of ['setLock', 'where', 'orderBy', 'addOrderBy'])
      query[method] = jest.fn(() => query);
    query.getMany = jest.fn(async () => runs);
    manager = {
      findOne: jest.fn(async (entity, options) =>
        entity === Employee
          ? { id: 'e', departmentId: 'd' }
          : options.where.employeeId === bonus.employeeId
            ? bonus
            : null,
      ),
      find: jest.fn(async () => [bonus]),
      getRepository: jest.fn(() => ({ createQueryBuilder: () => query })),
      query: jest.fn(async (_sql, [id]) => [
        { amount: runs.find((run) => run.id === id)!.netPayable },
      ]),
      save: jest.fn(async (_entity, value) => value),
      softRemove: jest.fn(async (_entity, value) => value),
    };
    ledger = { post: jest.fn() };
    service = new EmployeesService(
      {} as EmployeesRepository,
      { transaction: async (fn: any) => fn(manager) } as unknown as DataSource,
      ledger as LedgerService,
    );
  });
  const edit = (amount: number, bonusDate = '2026-09-30') => ({
    amount,
    bonusDate,
    reason: 'Corrected',
  });
  it('updates a processed bonus and reverses only the difference while retaining deductions', async () => {
    await service.changeBonus('e', 'b', edit(300), 'admin');
    expect(bonus).toMatchObject({
      amount: '300.00',
      reason: 'Corrected',
      updatedBy: 'admin',
    });
    expect(runs[0]).toMatchObject({
      totalBonuses: '300.00',
      netPayable: '30300.00',
      manualDeduction: '5000.00',
    });
    expect(ledger.post).toHaveBeenCalledWith(
      expect.arrayContaining([
        expect.objectContaining({
          accountCode: 'employee_salary_payable',
          entryType: 'debit',
          amount: '200.00',
        }),
      ]),
      manager,
    );
  });
  it('deletes a processed bonus with an auditable reversal', async () => {
    await service.changeBonus('e', 'b', null, 'admin');
    expect(runs[0].netPayable).toBe('30000.00');
    expect(manager.softRemove).toHaveBeenCalledWith(EmployeeBonus, bonus);
    expect(ledger.post).toHaveBeenCalledWith(
      expect.arrayContaining([
        expect.objectContaining({
          accountCode: 'employee_salary_payable',
          entryType: 'debit',
          amount: '500.00',
        }),
      ]),
      manager,
    );
  });
  it('rejects a reduction below salary already withdrawn before any writes', async () => {
    runs[0].amountPaid = '30400.00';
    await expect(
      service.changeBonus('e', 'b', edit(300), 'admin'),
    ).rejects.toThrow('withdrawn');
    expect(manager.save).not.toHaveBeenCalled();
    expect(manager.softRemove).not.toHaveBeenCalled();
    expect(ledger.post).not.toHaveBeenCalled();
  });
  it('rejects a reduction that makes payroll deductions exceed gross salary', async () => {
    runs[0].netPayable = '100.00';
    await expect(service.changeBonus('e', 'b', null, 'admin')).rejects.toThrow(
      'deductions',
    );
    expect(manager.save).not.toHaveBeenCalled();
  });
  it('moves a bonus to another month and adjusts both payroll balances', async () => {
    runs.push({
      ...runs[0],
      id: 'oct',
      periodMonth: 10,
      totalBonuses: '0.00',
      netPayable: '30000.00',
    });
    await service.changeBonus('e', 'b', edit(500, '2026-10-01'), 'admin');
    expect(runs.map((run) => run.netPayable)).toEqual(['30000.00', '30500.00']);
    expect(ledger.post).toHaveBeenCalledTimes(2);
  });
  it('edits and deletes a bonus before payroll without touching the ledger', async () => {
    runs = [];
    await service.changeBonus('e', 'b', edit(250), 'admin');
    await service.changeBonus('e', 'b', null, 'admin');
    expect(ledger.post).not.toHaveBeenCalled();
  });
  it('adds a late bonus once when correcting its amount', async () => {
    runs[0].totalBonuses = '0.00';
    runs[0].netPayable = '30000.00';
    await service.changeBonus('e', 'b', edit(600), 'admin');
    expect(runs[0]).toMatchObject({
      totalBonuses: '600.00',
      netPayable: '30600.00',
    });
    expect(ledger.post).toHaveBeenCalledWith(
      expect.arrayContaining([
        expect.objectContaining({
          accountCode: 'employee_salary_payable',
          entryType: 'credit',
          amount: '600.00',
        }),
      ]),
      manager,
    );
  });
  it('rejects a bonus belonging to another employee', async () => {
    await expect(
      service.changeBonus('another', 'b', edit(300), 'admin'),
    ).rejects.toThrow('bonus not found');
    expect(manager.save).not.toHaveBeenCalled();
  });
  it('validates monetary precision and positive amounts', async () => {
    for (const amount of [0, -1, 0.001])
      expect(
        (await validate(Object.assign(new CreateBonusDto(), edit(amount)))).map(
          (error) => error.property,
        ),
      ).toContain('amount');
  });
});
