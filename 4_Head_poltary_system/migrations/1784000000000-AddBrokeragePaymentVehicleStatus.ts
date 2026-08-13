import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddBrokeragePaymentVehicleStatus1784000000000
  implements MigrationInterface
{
  name = 'AddBrokeragePaymentVehicleStatus1784000000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // ── brokerage_purchases: amountPaid, vehicleId, status, cancellation ──
    const purchaseCols = await queryRunner.query(
      `SELECT column_name FROM information_schema.columns WHERE table_name='brokerage_purchases'`,
    );
    const purchaseColNames = purchaseCols.map(
      (c: { column_name: string }) => c.column_name,
    );

    if (!purchaseColNames.includes('amount_paid')) {
      await queryRunner.query(
        `ALTER TABLE "brokerage_purchases" ADD "amount_paid" numeric(14,2) NOT NULL DEFAULT '0'`,
      );
      await queryRunner.query(
        `ALTER TABLE "brokerage_purchases" ADD CONSTRAINT "CHK_bp_amount_paid_non_negative" CHECK ("amount_paid" >= 0)`,
      );
    }

    if (!purchaseColNames.includes('vehicle_id')) {
      await queryRunner.query(
        `ALTER TABLE "brokerage_purchases" ADD "vehicle_id" uuid`,
      );
      await queryRunner.query(
        `CREATE INDEX "IDX_bp_vehicle_id" ON "brokerage_purchases" ("vehicle_id")`,
      );
      await queryRunner.query(
        `ALTER TABLE "brokerage_purchases" ADD CONSTRAINT "FK_bp_vehicle_id" FOREIGN KEY ("vehicle_id") REFERENCES "vehicles"("id") ON DELETE SET NULL`,
      );
    }

    if (!purchaseColNames.includes('status')) {
      await queryRunner.query(
        `CREATE TYPE "public"."brokerage_purchases_status_enum" AS ENUM('active', 'cancelled')`,
      );
      await queryRunner.query(
        `ALTER TABLE "brokerage_purchases" ADD "status" "public"."brokerage_purchases_status_enum" NOT NULL DEFAULT 'active'`,
      );
    }

    if (!purchaseColNames.includes('cancelled_at')) {
      await queryRunner.query(
        `ALTER TABLE "brokerage_purchases" ADD "cancelled_at" TIMESTAMP WITH TIME ZONE`,
      );
    }

    if (!purchaseColNames.includes('cancelled_by')) {
      await queryRunner.query(
        `ALTER TABLE "brokerage_purchases" ADD "cancelled_by" uuid`,
      );
    }

    if (!purchaseColNames.includes('cancellation_reason')) {
      await queryRunner.query(
        `ALTER TABLE "brokerage_purchases" ADD "cancellation_reason" character varying(500)`,
      );
    }

    // Backfill: cash purchases → amountPaid = totalAmount; credit → 0 (already default)
    await queryRunner.query(
      `UPDATE "brokerage_purchases" SET "amount_paid" = "total_amount" WHERE "payment_method" = 'cash' AND "amount_paid" = 0`,
    );

    // ── brokerage_sales: amountReceived, vehicleId, status, cancellation ──
    const saleCols = await queryRunner.query(
      `SELECT column_name FROM information_schema.columns WHERE table_name='brokerage_sales'`,
    );
    const saleColNames = saleCols.map(
      (c: { column_name: string }) => c.column_name,
    );

    if (!saleColNames.includes('amount_received')) {
      await queryRunner.query(
        `ALTER TABLE "brokerage_sales" ADD "amount_received" numeric(14,2) NOT NULL DEFAULT '0'`,
      );
      await queryRunner.query(
        `ALTER TABLE "brokerage_sales" ADD CONSTRAINT "CHK_bs_amount_received_non_negative" CHECK ("amount_received" >= 0)`,
      );
    }

    if (!saleColNames.includes('vehicle_id')) {
      await queryRunner.query(
        `ALTER TABLE "brokerage_sales" ADD "vehicle_id" uuid`,
      );
      await queryRunner.query(
        `CREATE INDEX "IDX_bs_vehicle_id" ON "brokerage_sales" ("vehicle_id")`,
      );
      await queryRunner.query(
        `ALTER TABLE "brokerage_sales" ADD CONSTRAINT "FK_bs_vehicle_id" FOREIGN KEY ("vehicle_id") REFERENCES "vehicles"("id") ON DELETE SET NULL`,
      );
    }

    if (!saleColNames.includes('status')) {
      await queryRunner.query(
        `CREATE TYPE "public"."brokerage_sales_status_enum" AS ENUM('active', 'cancelled')`,
      );
      await queryRunner.query(
        `ALTER TABLE "brokerage_sales" ADD "status" "public"."brokerage_sales_status_enum" NOT NULL DEFAULT 'active'`,
      );
    }

    if (!saleColNames.includes('cancelled_at')) {
      await queryRunner.query(
        `ALTER TABLE "brokerage_sales" ADD "cancelled_at" TIMESTAMP WITH TIME ZONE`,
      );
    }

    if (!saleColNames.includes('cancelled_by')) {
      await queryRunner.query(
        `ALTER TABLE "brokerage_sales" ADD "cancelled_by" uuid`,
      );
    }

    if (!saleColNames.includes('cancellation_reason')) {
      await queryRunner.query(
        `ALTER TABLE "brokerage_sales" ADD "cancellation_reason" character varying(500)`,
      );
    }

    // Backfill: cash sales → amountReceived = totalAmount
    await queryRunner.query(
      `UPDATE "brokerage_sales" SET "amount_received" = "total_amount" WHERE "payment_method" = 'cash' AND "amount_received" = 0`,
    );

    // ── Indexes for list queries ──
    await queryRunner.query(
      `CREATE INDEX IF NOT EXISTS "IDX_bp_purchase_date" ON "brokerage_purchases" ("purchase_date" DESC)`,
    );
    await queryRunner.query(
      `CREATE INDEX IF NOT EXISTS "IDX_bp_status" ON "brokerage_purchases" ("status")`,
    );
    await queryRunner.query(
      `CREATE INDEX IF NOT EXISTS "IDX_bs_sale_date" ON "brokerage_sales" ("sale_date" DESC)`,
    );
    await queryRunner.query(
      `CREATE INDEX IF NOT EXISTS "IDX_bs_status" ON "brokerage_sales" ("status")`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP INDEX IF EXISTS "IDX_bs_status"`);
    await queryRunner.query(`DROP INDEX IF EXISTS "IDX_bs_sale_date"`);
    await queryRunner.query(`DROP INDEX IF EXISTS "IDX_bp_status"`);
    await queryRunner.query(`DROP INDEX IF EXISTS "IDX_bp_purchase_date"`);

    await queryRunner.query(
      `ALTER TABLE "brokerage_sales" DROP COLUMN IF EXISTS "cancellation_reason"`,
    );
    await queryRunner.query(
      `ALTER TABLE "brokerage_sales" DROP COLUMN IF EXISTS "cancelled_by"`,
    );
    await queryRunner.query(
      `ALTER TABLE "brokerage_sales" DROP COLUMN IF EXISTS "cancelled_at"`,
    );
    await queryRunner.query(
      `ALTER TABLE "brokerage_sales" DROP COLUMN IF EXISTS "status"`,
    );
    await queryRunner.query(
      `DROP TYPE IF EXISTS "public"."brokerage_sales_status_enum"`,
    );
    await queryRunner.query(
      `ALTER TABLE "brokerage_sales" DROP CONSTRAINT IF EXISTS "FK_bs_vehicle_id"`,
    );
    await queryRunner.query(`DROP INDEX IF EXISTS "IDX_bs_vehicle_id"`);
    await queryRunner.query(
      `ALTER TABLE "brokerage_sales" DROP COLUMN IF EXISTS "vehicle_id"`,
    );
    await queryRunner.query(
      `ALTER TABLE "brokerage_sales" DROP CONSTRAINT IF EXISTS "CHK_bs_amount_received_non_negative"`,
    );
    await queryRunner.query(
      `ALTER TABLE "brokerage_sales" DROP COLUMN IF EXISTS "amount_received"`,
    );

    await queryRunner.query(
      `ALTER TABLE "brokerage_purchases" DROP COLUMN IF EXISTS "cancellation_reason"`,
    );
    await queryRunner.query(
      `ALTER TABLE "brokerage_purchases" DROP COLUMN IF EXISTS "cancelled_by"`,
    );
    await queryRunner.query(
      `ALTER TABLE "brokerage_purchases" DROP COLUMN IF EXISTS "cancelled_at"`,
    );
    await queryRunner.query(
      `ALTER TABLE "brokerage_purchases" DROP COLUMN IF EXISTS "status"`,
    );
    await queryRunner.query(
      `DROP TYPE IF EXISTS "public"."brokerage_purchases_status_enum"`,
    );
    await queryRunner.query(
      `ALTER TABLE "brokerage_purchases" DROP CONSTRAINT IF EXISTS "FK_bp_vehicle_id"`,
    );
    await queryRunner.query(`DROP INDEX IF EXISTS "IDX_bp_vehicle_id"`);
    await queryRunner.query(
      `ALTER TABLE "brokerage_purchases" DROP COLUMN IF EXISTS "vehicle_id"`,
    );
    await queryRunner.query(
      `ALTER TABLE "brokerage_purchases" DROP CONSTRAINT IF EXISTS "CHK_bp_amount_paid_non_negative"`,
    );
    await queryRunner.query(
      `ALTER TABLE "brokerage_purchases" DROP COLUMN IF EXISTS "amount_paid"`,
    );
  }
}
