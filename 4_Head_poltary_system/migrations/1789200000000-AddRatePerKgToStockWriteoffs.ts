import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddRatePerKgToStockWriteoffs1789200000000
  implements MigrationInterface
{
  name = 'AddRatePerKgToStockWriteoffs1789200000000';

  async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "stock_writeoffs" ADD COLUMN IF NOT EXISTS "rate_per_kg" numeric(14,2) NOT NULL DEFAULT 0`,
    );
    await queryRunner.query(
      `UPDATE "stock_writeoffs" SET "rate_per_kg" = CASE WHEN "quantity_kg" > 0 THEN ROUND("valuation_amount" / "quantity_kg", 2) ELSE 0 END WHERE "rate_per_kg" = 0`,
    );
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "stock_writeoffs" DROP COLUMN IF EXISTS "rate_per_kg"`,
    );
  }
}