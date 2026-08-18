import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddSharedCashDrawer1787900000000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    // Drop the unique constraint so department_id can be null or shared
    await queryRunner.query(
      `ALTER TABLE cash_accounts DROP CONSTRAINT IF EXISTS "UQ_cash_accounts_department"`,
    );
    // Make department_id nullable
    await queryRunner.query(
      `ALTER TABLE cash_accounts ALTER COLUMN department_id DROP NOT NULL`,
    );
    // Add is_shared flag
    await queryRunner.query(
      `ALTER TABLE cash_accounts ADD COLUMN IF NOT EXISTS is_shared boolean NOT NULL DEFAULT false`,
    );
    // Seed the one shared admin cash drawer (idempotent)
    await queryRunner.query(
      `INSERT INTO cash_accounts (account_name, opening_balance, is_active, is_shared)
       SELECT 'Admin Cash Drawer', 0, true, true
       WHERE NOT EXISTS (SELECT 1 FROM cash_accounts WHERE is_shared = true)`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `DELETE FROM cash_accounts WHERE is_shared = true`,
    );
    await queryRunner.query(
      `ALTER TABLE cash_accounts DROP COLUMN IF EXISTS is_shared`,
    );
    await queryRunner.query(
      `ALTER TABLE cash_accounts ALTER COLUMN department_id SET NOT NULL`,
    );
    await queryRunner.query(
      `ALTER TABLE cash_accounts ADD CONSTRAINT "UQ_cash_accounts_department" UNIQUE (department_id)`,
    );
  }
}
