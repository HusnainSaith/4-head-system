import { MigrationInterface, QueryRunner } from 'typeorm';

/** Adds the durable one-to-one link for an atomic Brokerage -> Supply flow. */
export class AddBrokerageSupplyFlow1786100000000 implements MigrationInterface {
  name = 'AddBrokerageSupplyFlow1786100000000';

  async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "brokerage_sales"
      ADD COLUMN IF NOT EXISTS "destination_type" varchar(20) NOT NULL DEFAULT 'external'
    `);
    await queryRunner.query(`
      DO $$ BEGIN
        IF NOT EXISTS (
          SELECT 1 FROM pg_constraint
          WHERE conname = 'CHK_brokerage_sales_destination_type'
        ) THEN
          ALTER TABLE "brokerage_sales"
          ADD CONSTRAINT "CHK_brokerage_sales_destination_type"
          CHECK ("destination_type" IN ('external', 'supply'));
        END IF;
      END $$
    `);
    await queryRunner.query(`
      ALTER TABLE "supply_purchases"
      ADD COLUMN IF NOT EXISTS "source_brokerage_sale_id" uuid NULL
    `);
    await queryRunner.query(`
      CREATE UNIQUE INDEX IF NOT EXISTS "UQ_supply_purchase_source_brokerage_sale"
      ON "supply_purchases" ("source_brokerage_sale_id")
      WHERE "source_brokerage_sale_id" IS NOT NULL
    `);
    await queryRunner.query(`
      DO $$ BEGIN
        IF NOT EXISTS (
          SELECT 1 FROM pg_constraint
          WHERE conname = 'FK_supply_purchase_source_brokerage_sale'
        ) THEN
          ALTER TABLE "supply_purchases"
          ADD CONSTRAINT "FK_supply_purchase_source_brokerage_sale"
          FOREIGN KEY ("source_brokerage_sale_id") REFERENCES "brokerage_sales"("id")
          ON DELETE RESTRICT;
        END IF;
      END $$
    `);
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      'ALTER TABLE "supply_purchases" DROP CONSTRAINT IF EXISTS "FK_supply_purchase_source_brokerage_sale"',
    );
    await queryRunner.query(
      'DROP INDEX IF EXISTS "UQ_supply_purchase_source_brokerage_sale"',
    );
    await queryRunner.query(
      'ALTER TABLE "supply_purchases" DROP COLUMN IF EXISTS "source_brokerage_sale_id"',
    );
    await queryRunner.query(
      'ALTER TABLE "brokerage_sales" DROP CONSTRAINT IF EXISTS "CHK_brokerage_sales_destination_type"',
    );
    await queryRunner.query(
      'ALTER TABLE "brokerage_sales" DROP COLUMN IF EXISTS "destination_type"',
    );
  }
}
