import { MigrationInterface, QueryRunner } from 'typeorm';

export class CompleteSupplyContracts1784100000000 implements MigrationInterface {
  name = 'CompleteSupplyContracts1784100000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "supply_purchases" ADD COLUMN IF NOT EXISTS "outstanding_amount" numeric(14,2) NOT NULL DEFAULT 0`,
    );
    await queryRunner.query(
      `ALTER TABLE "supply_purchases" ADD COLUMN IF NOT EXISTS "status" varchar(20) NOT NULL DEFAULT 'posted'`,
    );
    await queryRunner.query(
      `ALTER TABLE "supply_purchases" ADD COLUMN IF NOT EXISTS "cancelled_at" timestamptz`,
    );
    await queryRunner.query(
      `ALTER TABLE "supply_purchases" ADD COLUMN IF NOT EXISTS "cancelled_by" uuid`,
    );
    await queryRunner.query(
      `UPDATE "supply_purchases" SET "outstanding_amount" = GREATEST("total_amount" - "amount_paid", 0)`,
    );
    await queryRunner.query(
      `ALTER TABLE "supply_sales" ADD COLUMN IF NOT EXISTS "outstanding_amount" numeric(14,2) NOT NULL DEFAULT 0`,
    );
    await queryRunner.query(
      `ALTER TABLE "supply_sales" ADD COLUMN IF NOT EXISTS "status" varchar(20) NOT NULL DEFAULT 'posted'`,
    );
    await queryRunner.query(
      `ALTER TABLE "supply_sales" ADD COLUMN IF NOT EXISTS "cancelled_at" timestamptz`,
    );
    await queryRunner.query(
      `ALTER TABLE "supply_sales" ADD COLUMN IF NOT EXISTS "cancelled_by" uuid`,
    );
    await queryRunner.query(
      `UPDATE "supply_sales" SET "outstanding_amount" = GREATEST("total_amount" - "amount_received", 0)`,
    );
    await queryRunner.query(
      `ALTER TABLE "internal_transfers" ADD COLUMN IF NOT EXISTS "remaining_balance" numeric(14,2) NOT NULL DEFAULT 0`,
    );
    await queryRunner.query(
      `UPDATE "internal_transfers" SET "remaining_balance" = GREATEST("total_amount" - "amount_settled", 0)`,
    );
    await queryRunner.query(
      `ALTER TABLE "supply_purchases" ADD CONSTRAINT "CHK_supply_purchase_payment" CHECK ("amount_paid" >= 0 AND "amount_paid" <= "total_amount" AND "outstanding_amount" = "total_amount" - "amount_paid")`,
    );
    await queryRunner.query(
      `ALTER TABLE "supply_sales" ADD CONSTRAINT "CHK_supply_sale_payment" CHECK ("amount_received" >= 0 AND "amount_received" <= "total_amount" AND "outstanding_amount" = "total_amount" - "amount_received")`,
    );
    await queryRunner.query(
      `ALTER TABLE "internal_transfers" ADD CONSTRAINT "CHK_internal_transfer_settlement" CHECK ("amount_settled" >= 0 AND "amount_settled" <= "total_amount" AND "remaining_balance" = "total_amount" - "amount_settled")`,
    );
    await queryRunner.query(
      `CREATE INDEX IF NOT EXISTS "IDX_supply_purchases_filters" ON "supply_purchases" ("department_id", "purchase_date", "payment_method", "status")`,
    );
    await queryRunner.query(
      `CREATE INDEX IF NOT EXISTS "IDX_supply_sales_filters" ON "supply_sales" ("department_id", "sale_date", "payment_method", "status")`,
    );
    await queryRunner.query(
      `CREATE INDEX IF NOT EXISTS "IDX_internal_transfers_filters" ON "internal_transfers" ("from_department_id", "transfer_date", "settlement_status")`,
    );
    await queryRunner.query(
      `ALTER TABLE "supply_purchases" ADD CONSTRAINT "FK_supply_purchase_vehicle" FOREIGN KEY ("vehicle_id") REFERENCES "vehicles"("id")`,
    );
    await queryRunner.query(
      `ALTER TABLE "supply_sales" ADD CONSTRAINT "FK_supply_sale_vehicle" FOREIGN KEY ("vehicle_id") REFERENCES "vehicles"("id")`,
    );
    await queryRunner.query(
      `ALTER TABLE "internal_transfers" ADD CONSTRAINT "FK_internal_transfer_vehicle" FOREIGN KEY ("vehicle_id") REFERENCES "vehicles"("id")`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "internal_transfers" DROP CONSTRAINT IF EXISTS "FK_internal_transfer_vehicle"`,
    );
    await queryRunner.query(
      `ALTER TABLE "supply_sales" DROP CONSTRAINT IF EXISTS "FK_supply_sale_vehicle"`,
    );
    await queryRunner.query(
      `ALTER TABLE "supply_purchases" DROP CONSTRAINT IF EXISTS "FK_supply_purchase_vehicle"`,
    );
    await queryRunner.query(
      `DROP INDEX IF EXISTS "IDX_internal_transfers_filters"`,
    );
    await queryRunner.query(`DROP INDEX IF EXISTS "IDX_supply_sales_filters"`);
    await queryRunner.query(
      `DROP INDEX IF EXISTS "IDX_supply_purchases_filters"`,
    );
    await queryRunner.query(
      `ALTER TABLE "internal_transfers" DROP CONSTRAINT IF EXISTS "CHK_internal_transfer_settlement"`,
    );
    await queryRunner.query(
      `ALTER TABLE "supply_sales" DROP CONSTRAINT IF EXISTS "CHK_supply_sale_payment"`,
    );
    await queryRunner.query(
      `ALTER TABLE "supply_purchases" DROP CONSTRAINT IF EXISTS "CHK_supply_purchase_payment"`,
    );
    await queryRunner.query(
      `ALTER TABLE "internal_transfers" DROP COLUMN IF EXISTS "remaining_balance"`,
    );
    await queryRunner.query(
      `ALTER TABLE "supply_sales" DROP COLUMN IF EXISTS "cancelled_by", DROP COLUMN IF EXISTS "cancelled_at", DROP COLUMN IF EXISTS "status", DROP COLUMN IF EXISTS "outstanding_amount"`,
    );
    await queryRunner.query(
      `ALTER TABLE "supply_purchases" DROP COLUMN IF EXISTS "cancelled_by", DROP COLUMN IF EXISTS "cancelled_at", DROP COLUMN IF EXISTS "status", DROP COLUMN IF EXISTS "outstanding_amount"`,
    );
  }
}
