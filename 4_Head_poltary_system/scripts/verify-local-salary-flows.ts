import 'reflect-metadata';
import * as assert from 'node:assert/strict';
import { AppDataSource } from '../src/config/data-source';
import { EmployeesService } from '../src/modules/employees/employees.service';
import { EmployeesRepository } from '../src/modules/employees/employees.repository';
import { Employee } from '../src/modules/employees/entities/employee.entity';
import { EmployeeAdvance } from '../src/modules/employees/entities/employee-advance.entity';
import { EmployeeBonus } from '../src/modules/employees/entities/employee-bonus.entity';
import { SalaryRun } from '../src/modules/employees/entities/salary-run.entity';
import { SalaryWithdrawal } from '../src/modules/employees/entities/salary-withdrawal.entity';
import { LedgerService } from '../src/modules/ledger/ledger.service';
import { LedgerRepository } from '../src/modules/ledger/ledger.repository';
import { LedgerEntry } from '../src/modules/ledger/entities/ledger-entry.entity';
import { ChartOfAccount } from '../src/modules/ledger/entities/chart-of-account.entity';
import { CashAccount } from '../src/modules/accounts/entities/cash-account.entity';
import { BankAccount } from '../src/modules/accounts/entities/bank-account.entity';
import { DataSource } from 'typeorm';

async function main() {
  AppDataSource.setOptions({ logging: false });
  AppDataSource.logger.logQuery = () => {};
  await AppDataSource.initialize();
  const runner = AppDataSource.createQueryRunner();
  await runner.connect();
  const [identity] = await runner.query(
    'SELECT current_database() AS name, inet_server_port() AS port',
  );
  assert.equal(identity.name, '4head');
  assert.equal(identity.port, 5432);
  await runner.startTransaction();
  try {
    const m = runner.manager;
    const [department] = await m.query(
      'SELECT id FROM departments WHERE is_active = true LIMIT 1',
    );
    const [user] = await m.query(
      'SELECT id FROM users WHERE deleted_at IS NULL LIMIT 1',
    );
    const employee = await m.save(
      Employee,
      m.create(Employee, {
        fullName: 'Salary verification (rolled back)',
        designation: 'QA',
        baseSalary: '35000.00',
        joiningDate: new Date('2026-10-01'),
        departmentId: department.id,
      }),
    );
    const cash = await m.save(
      CashAccount,
      m.create(CashAccount, {
        accountName: 'QA rollback drawer',
        openingBalance: '0.00',
        isActive: true,
        isShared: true,
      }),
    );
    const bank = await m.save(
      BankAccount,
      m.create(BankAccount, {
        bankName: 'QA',
        accountTitle: 'Rollback account',
        openingBalance: '0.00',
        isActive: true,
      }),
    );
    const ledger = new LedgerService(
      new LedgerRepository(
        m.getRepository(LedgerEntry),
        m.getRepository(ChartOfAccount),
      ),
    );
    const repository = new EmployeesRepository(
      m.getRepository(Employee),
      m.getRepository(EmployeeAdvance),
      m.getRepository(EmployeeBonus),
      m.getRepository(SalaryRun),
    );
    const service = new EmployeesService(
      repository,
      {
        transaction: (fn: (manager: typeof m) => unknown) => fn(m),
      } as unknown as DataSource,
      ledger,
    );
    const run = await service.runPayroll(
      {
        employeeId: employee.id,
        periodMonth: 10,
        periodYear: 2026,
        manualDeduction: 5000,
        deductionReason: 'Leave charges',
      },
      user.id,
    );
    assert.equal(run.netPayable, '30000.00');
    assert.equal(run.manualDeduction, '5000.00');
    const entries = await ledger.findBySource('salary', run.id, m);
    assert.equal(
      entries.find((e) => e.entryType === 'debit')?.amount,
      '30000.00',
    );
    const dto = {
      amount: 12000,
      withdrawalDate: '2026-10-01',
      paymentMethod: 'cash' as const,
      cashAccountId: cash.id,
    };
    await assert.rejects(
      service.withdrawSalary(employee.id, dto, user.id),
      /Insufficient cash/,
    );
    await assert.rejects(
      service.markSalaryPaid(
        run.id,
        dto.withdrawalDate,
        'cash',
        user.id,
        undefined,
        { cashAccountId: cash.id },
      ),
      /Insufficient cash/,
    );
    await assert.rejects(
      service.withdrawSalary(
        employee.id,
        {
          amount: 100,
          withdrawalDate: dto.withdrawalDate,
          paymentMethod: 'bank',
          bankAccountId: bank.id,
          bankTransactionMethod: 'app',
        },
        user.id,
      ),
      /Insufficient bank/,
    );
    assert.equal(
      await m.count(SalaryWithdrawal, { where: { employeeId: employee.id } }),
      0,
    );
    cash.openingBalance = '15000.00';
    await m.save(CashAccount, cash);
    const withdrawal = (await service.withdrawSalary(employee.id, dto, user.id))
      .data;
    assert.equal(
      (await m.findOneByOrFail(SalaryRun, { id: run.id })).amountPaid,
      '12000.00',
    );
    // A failed edit must roll back the reversal and allocation changes.
    await m.query('SAVEPOINT failed_edit');
    await assert.rejects(
      service.changeSalaryWithdrawal(
        employee.id,
        withdrawal.id,
        { ...dto, amount: 16000 },
        user.id,
      ),
      /Insufficient cash/,
    );
    await m.query('ROLLBACK TO SAVEPOINT failed_edit');
    assert.equal(
      (await m.findOneByOrFail(SalaryRun, { id: run.id })).amountPaid,
      '12000.00',
    );
    const edited = (
      await service.changeSalaryWithdrawal(
        employee.id,
        withdrawal.id,
        { ...dto, amount: 5000, notes: 'Corrected' },
        user.id,
      )
    ).data!;
    assert.equal(
      (await m.findOneByOrFail(SalaryRun, { id: run.id })).amountPaid,
      '5000.00',
    );
    await service.changeSalaryWithdrawal(employee.id, edited.id, null, user.id);
    const restored = await m.findOneByOrFail(SalaryRun, { id: run.id });
    assert.equal(restored.amountPaid, '0.00');
    assert.equal(restored.paymentStatus, 'pending');
    const [balance] = await m.query(
      "SELECT COALESCE(SUM(CASE WHEN entry_type='debit' THEN amount ELSE -amount END),0)::text AS net FROM ledger_entries WHERE cash_account_id=$1",
      [cash.id],
    );
    assert.equal(Number(balance.net), 0);
    assert.equal(
      await m.count(SalaryWithdrawal, { where: { employeeId: employee.id } }),
      0,
    );
    const november = await service.runPayroll(
      { employeeId: employee.id, periodMonth: 11, periodYear: 2026 },
      user.id,
    );
    cash.openingBalance = '50000.00';
    await m.save(CashAccount, cash);
    const spanning = (
      await service.withdrawSalary(
        employee.id,
        { ...dto, amount: 35000 },
        user.id,
      )
    ).data;
    assert.equal(spanning.allocations.length, 2);
    assert.equal(
      (await m.findOneByOrFail(SalaryRun, { id: run.id })).amountPaid,
      '30000.00',
    );
    assert.equal(
      (await m.findOneByOrFail(SalaryRun, { id: november.id })).amountPaid,
      '5000.00',
    );
    bank.openingBalance = '40000.00';
    await m.save(BankAccount, bank);
    const switched = (
      await service.changeSalaryWithdrawal(
        employee.id,
        spanning.id,
        {
          amount: 40000,
          withdrawalDate: dto.withdrawalDate,
          paymentMethod: 'bank',
          bankAccountId: bank.id,
          bankTransactionMethod: 'app',
          appReference: 'QA',
        },
        user.id,
      )
    ).data!;
    assert.equal(
      (await m.findOneByOrFail(SalaryRun, { id: november.id })).amountPaid,
      '10000.00',
    );
    const [cashNet] = await m.query(
      "SELECT COALESCE(SUM(CASE WHEN entry_type='debit' THEN amount ELSE -amount END),0)::text AS net FROM ledger_entries WHERE cash_account_id=$1",
      [cash.id],
    );
    assert.equal(Number(cashNet.net), 0);
    await service.changeSalaryWithdrawal(
      employee.id,
      switched.id,
      null,
      user.id,
    );
    assert.equal(
      (await m.findOneByOrFail(SalaryRun, { id: run.id })).amountPaid,
      '0.00',
    );
    assert.equal(
      (await m.findOneByOrFail(SalaryRun, { id: november.id })).amountPaid,
      '0.00',
    );
    await assert.rejects(
      service.changeSalaryWithdrawal(employee.id, switched.id, null, user.id),
      /not found/,
    );
    const cancelPayment = (
      await service.withdrawSalary(
        employee.id,
        { ...dto, amount: 35000 },
        user.id,
      )
    ).data;
    await service.cancelPayroll(employee.id, run.id, user.id);
    assert.equal(await m.findOneBy(SalaryRun, { id: run.id }), null);
    assert.equal(
      (await m.findOneByOrFail(SalaryWithdrawal, { id: cancelPayment.id }))
        .amount,
      '5000.00',
    );
    assert.equal(
      (await m.findOneByOrFail(SalaryRun, { id: november.id })).amountPaid,
      '5000.00',
    );
    await assert.rejects(
      service.cancelPayroll(employee.id, run.id, user.id),
      /already cancelled/,
    );
    await service.cancelPayroll(employee.id, november.id, user.id);
    assert.equal(
      await m.count(SalaryWithdrawal, { where: { employeeId: employee.id } }),
      0,
    );
    const advance = (
      await service.createAdvance(
        employee.id,
        { amount: 1000, advanceDate: '2026-10-01' },
        user.id,
      )
    ).data;
    await service.confirmAdvance(employee.id, advance.id, 'cash', user.id, {
      cashAccountId: cash.id,
    });
    const rerun = await service.runPayroll(
      {
        employeeId: employee.id,
        periodMonth: 10,
        periodYear: 2026,
        recoverAdvances: true,
      },
      user.id,
    );
    assert.equal(rerun.totalAdvancesDeducted, '1000.00');
    await service.cancelPayroll(employee.id, rerun.id, user.id);
    assert.equal(
      (await m.findOneByOrFail(EmployeeAdvance, { id: advance.id }))
        .amountRecovered,
      '0.00',
    );
    const lastRun = await service.runPayroll(
      {
        employeeId: employee.id,
        periodMonth: 10,
        periodYear: 2026,
        recoverAdvances: true,
      },
      user.id,
    );
    await m.query('SAVEPOINT legacy_recovery');
    await m.query(
      "UPDATE ledger_entries SET description = NULL WHERE source_type='salary' AND source_id=$1",
      [lastRun.id],
    );
    await assert.rejects(
      service.cancelPayroll(employee.id, lastRun.id, user.id),
      /older payroll/,
    );
    await m.query('ROLLBACK TO SAVEPOINT legacy_recovery');
    assert.equal(
      (await m.findOneByOrFail(EmployeeAdvance, { id: advance.id }))
        .amountRecovered,
      '1000.00',
    );
    console.log(
      'PASS: deduction, cash/bank rejection, direct salary payment, edit rollback, edit, delete, salary allocation restoration and ledger balance. All fixtures rolled back.',
    );
  } finally {
    await runner.rollbackTransaction();
    await runner.release();
    await AppDataSource.destroy();
  }
}
main().catch(async (error) => {
  console.error(error.message);
  if (AppDataSource.isInitialized) await AppDataSource.destroy();
  process.exitCode = 1;
});
