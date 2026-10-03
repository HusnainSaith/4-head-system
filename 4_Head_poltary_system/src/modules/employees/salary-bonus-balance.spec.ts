import { salaryBalancesWithBonuses } from './salary-bonus-balance';
import { SalaryRun } from './entities/salary-run.entity';
import { EmployeeBonus } from './entities/employee-bonus.entity';

const run = (values: Partial<SalaryRun> = {}) =>
  ({
    id: 'run',
    employeeId: 'employee',
    periodMonth: 9,
    periodYear: 2026,
    netPayable: '34667.00',
    totalBonuses: '0.00',
    amountPaid: '0.00',
    paymentStatus: 'pending',
    ...values,
  }) as SalaryRun;
const bonus = (values: Partial<EmployeeBonus> = {}) =>
  ({
    employeeId: 'employee',
    amount: '14999.00',
    bonusDate: '2026-09-30',
    ...values,
  }) as unknown as EmployeeBonus;

describe('salary bonus balance projection', () => {
  it('includes a bonus recorded after payroll without changing saved objects', () => {
    const original = run();
    const saved = { ...original };
    expect(salaryBalancesWithBonuses([original], [bonus()])[0]).toMatchObject({
      netPayable: '49666.00',
      totalBonuses: '14999.00',
    });
    expect(original).toEqual(saved);
  });
  it('counts bonuses already included by payroll exactly once', () => {
    expect(
      salaryBalancesWithBonuses(
        [run({ netPayable: '49666.00', totalBonuses: '14999.00' })],
        [bonus()],
      )[0].netPayable,
    ).toBe('49666.00');
  });
  it('adds only the new bonus and retains deductions and advance recovery', () => {
    expect(
      salaryBalancesWithBonuses(
        [
          run({
            netPayable: '30000.00',
            totalBonuses: '1000.00',
            manualDeduction: '5000.00',
            totalAdvancesDeducted: '1667.00',
          }),
        ],
        [bonus({ amount: '1000.00' }), bonus({ amount: '2000.00' })],
      )[0],
    ).toMatchObject({
      netPayable: '32000.00',
      manualDeduction: '5000.00',
      totalAdvancesDeducted: '1667.00',
    });
  });
  it('keeps employee, year and month balances separate and excludes deleted bonuses', () => {
    expect(
      salaryBalancesWithBonuses(
        [run()],
        [
          bonus({ employeeId: 'another' }),
          bonus({ bonusDate: new Date('2026-10-01T00:00:00Z') }),
          bonus({ bonusDate: new Date('2025-09-30T00:00:00Z') }),
          bonus({ deletedAt: new Date() }),
        ],
      )[0].netPayable,
    ).toBe('34667.00');
  });
  it('uses exact cents and reopens a fully paid month for a late bonus', () => {
    expect(
      salaryBalancesWithBonuses(
        [
          run({
            netPayable: '0.10',
            amountPaid: '0.10',
            paymentStatus: 'paid',
          }),
        ],
        [bonus({ amount: '0.20' })],
      )[0],
    ).toMatchObject({ netPayable: '0.30', paymentStatus: 'partially_paid' });
  });
  it('preserves historical bonus credit if old bonus details are unavailable', () => {
    expect(
      salaryBalancesWithBonuses([run({ totalBonuses: '1000.00' })], [])[0]
        .netPayable,
    ).toBe('34667.00');
  });
});
