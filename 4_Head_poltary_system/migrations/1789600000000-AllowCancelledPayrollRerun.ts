import { MigrationInterface, QueryRunner } from 'typeorm';
export class AllowCancelledPayrollRerun1789600000000 implements MigrationInterface {
  async up(queryRunner: QueryRunner): Promise<void> {
    const constraints: { conname: string }[] = await queryRunner.query(
      "SELECT conname FROM pg_constraint WHERE conrelid = 'salary_runs'::regclass AND contype = 'u' AND pg_get_constraintdef(oid) = 'UNIQUE (employee_id, period_month, period_year)'",
    );
    for (const constraint of constraints)
      await queryRunner.query(
        'ALTER TABLE salary_runs DROP CONSTRAINT "' +
          constraint.conname.replace(/"/g, '""') +
          '"',
      );
    await queryRunner.query(
      'CREATE UNIQUE INDEX salary_runs_active_period_unique ON salary_runs (employee_id, period_month, period_year) WHERE deleted_at IS NULL',
    );
  }
  async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      'ALTER TABLE salary_runs ADD CONSTRAINT salary_runs_period_unique UNIQUE (employee_id, period_month, period_year)',
    );
    await queryRunner.query('DROP INDEX salary_runs_active_period_unique');
  }
}
