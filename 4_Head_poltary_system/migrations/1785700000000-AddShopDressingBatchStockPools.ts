import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddShopDressingBatchStockPools1785700000000 implements MigrationInterface {
  name = 'AddShopDressingBatchStockPools1785700000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    for (const table of [
      'stock_balances',
      'stock_movements',
      'stock_writeoffs',
    ]) {
      await queryRunner.query(
        `CREATE TYPE "${table}_stock_type_enum" AS ENUM ('standard','live','dressed')`,
      );
      await queryRunner.query(
        `ALTER TABLE "${table}" ADD COLUMN "stock_type" "${table}_stock_type_enum" NOT NULL DEFAULT 'standard'`,
      );
    }
    await queryRunner.query(
      `ALTER TABLE "stock_balances" DROP CONSTRAINT "UQ_3e52924e83de23db3f163d91161"`,
    );
    await queryRunner.query(
      `ALTER TABLE "stock_balances" ADD CONSTRAINT "UQ_stock_balance_department_type" UNIQUE ("department_id", "stock_type")`,
    );
    await queryRunner.query(`
      UPDATE "stock_balances" balance SET "stock_type" = 'live'
      FROM "departments" department
      WHERE department."id" = balance."department_id"
        AND department."type" = 'FRESH_CHICKEN_SHOP'
    `);
    await queryRunner.query(`
      INSERT INTO "stock_balances"
        ("id", "product_id", "department_id", "stock_type", "quantity_kg", "wac")
      SELECT uuid_generate_v4(), balance."product_id", balance."department_id",
        'dressed', 0, 0
      FROM "stock_balances" balance
      WHERE balance."stock_type" = 'live'
      ON CONFLICT ("department_id", "stock_type") DO NOTHING
    `);
    await queryRunner.query(`
      UPDATE "stock_movements" movement SET "stock_type" = 'live'
      FROM "departments" department
      WHERE department."id" = movement."department_id"
        AND department."type" = 'FRESH_CHICKEN_SHOP'
    `);
    await queryRunner.query(`
      UPDATE "stock_writeoffs" writeoff SET "stock_type" = 'live'
      FROM "departments" department
      WHERE department."id" = writeoff."department_id"
        AND department."type" = 'FRESH_CHICKEN_SHOP'
    `);

    await queryRunner.query(
      `ALTER TABLE "stock_movements" ALTER COLUMN "source_type" TYPE varchar USING "source_type"::text`,
    );
    await queryRunner.query(`DROP TYPE "stock_movements_source_type_enum"`);
    await queryRunner.query(`
      CREATE TYPE "stock_movements_source_type_enum" AS ENUM
        ('purchase','sale','internal_transfer','stock_writeoff','opening_balance',
         'bonus','advance','salary','expense','vehicle_fuel','vehicle_maintenance','dressing_batch')
    `);
    await queryRunner.query(`
      ALTER TABLE "stock_movements" ALTER COLUMN "source_type"
      TYPE "stock_movements_source_type_enum"
      USING "source_type"::"stock_movements_source_type_enum"
    `);
    await queryRunner.query(
      `ALTER TABLE "stock_movements" ALTER COLUMN "movement_type" TYPE varchar USING "movement_type"::text`,
    );
    await queryRunner.query(`DROP TYPE "stock_movements_movement_type_enum"`);
    await queryRunner.query(`
      CREATE TYPE "stock_movements_movement_type_enum" AS ENUM
        ('purchase_in','sale_out','transfer_in','transfer_out','writeoff_out',
         'opening_stock','processing_loss_out','dressing_out','dressing_in')
    `);
    await queryRunner.query(`
      ALTER TABLE "stock_movements" ALTER COLUMN "movement_type"
      TYPE "stock_movements_movement_type_enum"
      USING "movement_type"::"stock_movements_movement_type_enum"
    `);

    await queryRunner.query(
      `ALTER TABLE "shop_sales" ADD COLUMN "quantity_kg" numeric(12,3)`,
    );
    await queryRunner.query(
      `ALTER TABLE "shop_sales" ADD COLUMN "profit_margin_per_kg" numeric(14,2)`,
    );
    await queryRunner.query(`
      UPDATE "shop_sales"
      SET "quantity_kg" = "dressed_weight_kg",
          "profit_margin_per_kg" = "rate_per_kg" - "wac_at_sale"
    `);
    await queryRunner.query(
      `ALTER TABLE "shop_sales" ALTER COLUMN "quantity_kg" SET NOT NULL`,
    );
    await queryRunner.query(
      `ALTER TABLE "shop_sales" ALTER COLUMN "profit_margin_per_kg" SET NOT NULL`,
    );
    for (const constraint of [
      'chk_shop_sales_live_weight_positive',
      'chk_shop_sales_dressed_weight_valid',
      'chk_shop_sales_rate_positive',
      'chk_shop_sales_amounts_nonnegative',
    ]) {
      await queryRunner.query(
        `ALTER TABLE "shop_sales" DROP CONSTRAINT IF EXISTS "${constraint}"`,
      );
    }
    for (const column of [
      'shrinkage_kg',
      'gross_profit_amount',
      'processing_loss_amount',
      'cogs_amount',
      'dressed_weight_kg',
      'live_weight_kg',
    ]) {
      await queryRunner.query(
        `ALTER TABLE "shop_sales" DROP COLUMN IF EXISTS "${column}"`,
      );
    }

    await queryRunner.query(`
      CREATE TABLE "shop_dressing_batches" (
        "created_at" timestamptz NOT NULL DEFAULT now(),
        "updated_at" timestamptz NOT NULL DEFAULT now(),
        "deleted_at" timestamptz,
        "created_by" uuid,
        "updated_by" uuid,
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "department_id" uuid NOT NULL,
        "live_weight_kg" numeric(12,3) NOT NULL,
        "dressed_weight_kg" numeric(12,3) NOT NULL,
        "shrinkage_kg" numeric(12,3) GENERATED ALWAYS AS (live_weight_kg - dressed_weight_kg) STORED,
        "live_wac_at_processing" numeric(16,4) NOT NULL,
        "dressed_cost_per_kg" numeric(16,4) NOT NULL,
        "processing_loss_amount" numeric(14,2) NOT NULL,
        "batch_date" date NOT NULL,
        "notes" varchar(255),
        CONSTRAINT "PK_shop_dressing_batches" PRIMARY KEY ("id"),
        CONSTRAINT "CHK_shop_dressing_batch_live_positive" CHECK (live_weight_kg > 0),
        CONSTRAINT "CHK_shop_dressing_batch_dressed_valid" CHECK (dressed_weight_kg > 0 AND dressed_weight_kg <= live_weight_kg),
        CONSTRAINT "FK_shop_dressing_batch_department" FOREIGN KEY ("department_id") REFERENCES "departments"("id") ON DELETE RESTRICT
      )
    `);
    await queryRunner.query(
      `CREATE INDEX "IDX_shop_dressing_batches_date" ON "shop_dressing_batches" ("department_id", "batch_date")`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE IF EXISTS "shop_dressing_batches"`);
    await queryRunner.query(
      `ALTER TABLE "stock_balances" DROP CONSTRAINT IF EXISTS "UQ_stock_balance_department_type"`,
    );
    for (const table of [
      'stock_writeoffs',
      'stock_movements',
      'stock_balances',
    ]) {
      await queryRunner.query(
        `ALTER TABLE "${table}" DROP COLUMN IF EXISTS "stock_type"`,
      );
      await queryRunner.query(`DROP TYPE IF EXISTS "${table}_stock_type_enum"`);
    }
    await queryRunner.query(
      `ALTER TABLE "stock_balances" ADD CONSTRAINT "UQ_3e52924e83de23db3f163d91161" UNIQUE ("department_id")`,
    );
  }
}
