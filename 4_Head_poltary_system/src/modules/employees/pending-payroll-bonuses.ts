import { EntityManager } from 'typeorm';

/** Include earned late bonuses, excluding amounts already accrued in the ledger. */
export async function pendingPayrollBonuses(
  manager: EntityManager,
  departmentId: string | null,
  from: Date,
  toExclusive: Date,
): Promise<number> {
  const [row] = await manager.query(
    `
    SELECT COALESCE(SUM(GREATEST(
      GREATEST(b.amount - COALESCE(sr.total_bonuses, 0), 0)
      - GREATEST(COALESCE(l.amount, sr.net_payable, 0) - COALESCE(sr.net_payable, 0), 0), 0)), 0)::text AS amount
    FROM (SELECT employee_id, EXTRACT(YEAR FROM bonus_date)::int AS year, EXTRACT(MONTH FROM bonus_date)::int AS month, SUM(amount) AS amount
      FROM employee_bonuses WHERE deleted_at IS NULL AND bonus_date >= $2::date AND bonus_date < $3::date GROUP BY employee_id, year, month) b
    JOIN employees e ON e.id = b.employee_id
    LEFT JOIN salary_runs sr ON sr.employee_id = b.employee_id AND sr.period_year = b.year AND sr.period_month = b.month AND sr.deleted_at IS NULL
    LEFT JOIN (SELECT entry.source_id, SUM(CASE WHEN entry.entry_type = 'credit' THEN entry.amount ELSE -entry.amount END) AS amount
      FROM ledger_entries entry JOIN chart_of_accounts account ON account.id = entry.account_id
      WHERE entry.source_type = 'salary' AND account.code = 'employee_salary_payable' GROUP BY entry.source_id) l ON l.source_id = sr.id
    WHERE ($1::uuid IS NULL OR e.department_id = $1)`,
    [
      departmentId,
      from.toISOString().slice(0, 10),
      toExclusive.toISOString().slice(0, 10),
    ],
  );
  return Number(row.amount);
}
