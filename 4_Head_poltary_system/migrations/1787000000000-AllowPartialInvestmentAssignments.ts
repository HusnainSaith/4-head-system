import { MigrationInterface, QueryRunner } from 'typeorm';

export class AllowPartialInvestmentAssignments1787000000000 implements MigrationInterface {
  name = 'AllowPartialInvestmentAssignments1787000000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `DROP INDEX IF EXISTS "public"."UQ_investment_active_purchase"`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_investment_active_purchase" ON "investment_assignments" ("purchase_id") WHERE status <> 'cancelled' AND deleted_at IS NULL`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `DROP INDEX IF EXISTS "IDX_investment_active_purchase"`,
    );
    await queryRunner.query(
      `CREATE UNIQUE INDEX "UQ_investment_active_purchase" ON "investment_assignments" ("purchase_id") WHERE status <> 'cancelled' AND deleted_at IS NULL`,
    );
  }
}
