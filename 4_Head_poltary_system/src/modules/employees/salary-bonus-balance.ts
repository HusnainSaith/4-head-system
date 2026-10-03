import { centsToMoney, moneyToCents } from '../../common/utils/money.util';
import { EmployeeBonus } from './entities/employee-bonus.entity';
import { SalaryRun } from './entities/salary-run.entity';

// Payroll amounts are historical snapshots. Project later bonuses without
// rewriting those snapshots, and never count bonuses already included twice.
export function salaryBalancesWithBonuses(
  runs: SalaryRun[],
  bonuses: EmployeeBonus[],
): SalaryRun[] {
  const totals = new Map<string, bigint>();
  for (const bonus of bonuses) {
    if (bonus.deletedAt) continue;
    const date =
      bonus.bonusDate instanceof Date
        ? bonus.bonusDate.toISOString()
        : String(bonus.bonusDate);
    const key = `${bonus.employeeId}:${date.slice(0, 7)}`;
    totals.set(key, (totals.get(key) ?? 0n) + moneyToCents(bonus.amount));
  }
  return runs.map((run) => {
    const key = `${run.employeeId}:${run.periodYear}-${String(run.periodMonth).padStart(2, '0')}`;
    const recorded = moneyToCents(run.totalBonuses ?? '0');
    const current = totals.get(key) ?? 0n;
    const additional = current > recorded ? current - recorded : 0n;
    const net = moneyToCents(run.netPayable) + additional;
    const paid = moneyToCents(run.amountPaid ?? '0');
    return {
      ...run,
      totalBonuses: centsToMoney(recorded + additional),
      netPayable: centsToMoney(net),
      paymentStatus:
        paid >= net ? 'paid' : paid > 0n ? 'partially_paid' : 'pending',
    };
  });
}
