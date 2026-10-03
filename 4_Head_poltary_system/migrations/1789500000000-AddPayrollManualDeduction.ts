import { MigrationInterface, QueryRunner } from 'typeorm';
export class AddPayrollManualDeduction1789500000000 implements MigrationInterface {
  async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      'ALTER TABLE salary_runs ADD COLUMN manual_deduction numeric(14,2) NOT NULL DEFAULT 0 CHECK (manual_deduction >= 0), ADD COLUMN deduction_reason varchar(255)',
    );
  }
  async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      'ALTER TABLE salary_runs DROP COLUMN deduction_reason, DROP COLUMN manual_deduction',
    );
  }
}
