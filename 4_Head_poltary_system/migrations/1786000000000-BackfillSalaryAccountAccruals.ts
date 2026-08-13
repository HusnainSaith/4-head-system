import { MigrationInterface, QueryRunner } from 'typeorm';

/** Backfills pre-account-book pending runs without duplicating newer accruals. */
export class BackfillSalaryAccountAccruals1786000000000 implements MigrationInterface {
  name = 'BackfillSalaryAccountAccruals1786000000000';

  async up(queryRunner: QueryRunner): Promise<void> {
    const baseFrom = `
      FROM "salary_runs" sr
      JOIN "employees" employee ON employee."id" = sr."employee_id"`;
    const missingAccrual = (accountCode: string) => `NOT EXISTS (
      SELECT 1 FROM "ledger_entries" existing
      JOIN "chart_of_accounts" existing_account ON existing_account."id" = existing."account_id"
      WHERE existing."source_type" = 'salary' AND existing."source_id" = sr."id"
        AND existing_account."code" = '${accountCode}'
    )`;
    const accrualDate = `(make_date(sr."period_year", sr."period_month", 1) + interval '1 month - 1 day')::date`;

    await queryRunner.query(`
      INSERT INTO "ledger_entries"
        ("id", "department_id", "account_id", "entry_type", "amount", "entry_date", "source_type", "source_id", "description", "created_at", "created_by")
      SELECT uuid_generate_v4(), employee."department_id", account."id", 'debit',
        (sr."base_salary" + sr."total_bonuses"), ${accrualDate}, 'salary', sr."id",
        'Historical payroll accrual', now(), sr."created_by"
      ${baseFrom}
      JOIN "chart_of_accounts" account ON account."code" = 'payroll_expense'
      WHERE ${missingAccrual('payroll_expense')}
    `);
    await queryRunner.query(`
      INSERT INTO "ledger_entries"
        ("id", "department_id", "account_id", "entry_type", "amount", "entry_date", "source_type", "source_id", "description", "created_at", "created_by")
      SELECT uuid_generate_v4(), employee."department_id", account."id", 'credit',
        sr."total_advances_deducted", ${accrualDate}, 'salary', sr."id",
        'Historical advance recovery', now(), sr."created_by"
      ${baseFrom}
      JOIN "chart_of_accounts" account ON account."code" = 'employee_advance'
      WHERE ${missingAccrual('employee_advance')} AND sr."total_advances_deducted" > 0
    `);
    await queryRunner.query(`
      INSERT INTO "ledger_entries"
        ("id", "department_id", "account_id", "entry_type", "amount", "entry_date", "source_type", "source_id", "description", "created_at", "created_by")
      SELECT uuid_generate_v4(), employee."department_id", account."id", 'credit',
        sr."net_payable", ${accrualDate}, 'salary', sr."id",
        'Historical salary payable accrual', now(), sr."created_by"
      ${baseFrom}
      JOIN "chart_of_accounts" account ON account."code" = 'employee_salary_payable'
      WHERE ${missingAccrual('employee_salary_payable')} AND sr."net_payable" > 0
    `);
  }

  async down(): Promise<void> {
    // Accounting history is append-only. Reversing these entries automatically
    // would destroy valid salary liabilities, so rollback is intentionally safe.
  }
}
