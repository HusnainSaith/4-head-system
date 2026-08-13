import { MigrationInterface, QueryRunner } from 'typeorm';

export class CompleteProductBatchQualitySchema1785500000000 implements MigrationInterface {
  name = 'CompleteProductBatchQualitySchema1785500000000';

  async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "products"
        ADD COLUMN IF NOT EXISTS "sku" varchar(100),
        ADD COLUMN IF NOT EXISTS "name" varchar(200),
        ADD COLUMN IF NOT EXISTS "description" text,
        ADD COLUMN IF NOT EXISTS "unit" varchar(50) NOT NULL DEFAULT 'kg',
        ADD COLUMN IF NOT EXISTS "category" varchar(100),
        ADD COLUMN IF NOT EXISTS "is_active" boolean NOT NULL DEFAULT true,
        ADD COLUMN IF NOT EXISTS "min_price" numeric(14,2),
        ADD COLUMN IF NOT EXISTS "max_price" numeric(14,2),
        ADD COLUMN IF NOT EXISTS "status" varchar(50),
        ADD COLUMN IF NOT EXISTS "notes" text,
        ADD COLUMN IF NOT EXISTS "created_at" timestamptz NOT NULL DEFAULT now(),
        ADD COLUMN IF NOT EXISTS "updated_at" timestamptz NOT NULL DEFAULT now(),
        ADD COLUMN IF NOT EXISTS "deleted_at" timestamptz,
        ADD COLUMN IF NOT EXISTS "created_by" uuid,
        ADD COLUMN IF NOT EXISTS "updated_by" uuid
    `);
    await queryRunner.query(`
      UPDATE "products"
      SET "sku" = COALESCE("sku", 'PRODUCT-' || upper(substr("id"::text, 1, 8))),
          "name" = COALESCE("name", 'Poultry stock')
    `);
    await queryRunner.query(
      'ALTER TABLE "products" ALTER COLUMN "sku" SET NOT NULL, ALTER COLUMN "name" SET NOT NULL',
    );
    await queryRunner.query(
      'CREATE UNIQUE INDEX IF NOT EXISTS "IDX_products_sku" ON "products" ("sku")',
    );
    await queryRunner.query(
      'CREATE INDEX IF NOT EXISTS "IDX_products_name" ON "products" ("name")',
    );

    await queryRunner.query(`
      DO $$ BEGIN
        IF EXISTS (
          SELECT 1 FROM information_schema.columns
          WHERE table_name = 'batches' AND column_name = 'batch_code'
        ) AND NOT EXISTS (
          SELECT 1 FROM information_schema.columns
          WHERE table_name = 'batches' AND column_name = 'batch_number'
        ) THEN
          ALTER TABLE "batches" RENAME COLUMN "batch_code" TO "batch_number";
        END IF;
      END $$
    `);
    await queryRunner.query(`
      ALTER TABLE "batches"
        ADD COLUMN IF NOT EXISTS "batch_number" varchar(100),
        ADD COLUMN IF NOT EXISTS "department_id" uuid,
        ADD COLUMN IF NOT EXISTS "initial_quantity" numeric(12,3) NOT NULL DEFAULT 0,
        ADD COLUMN IF NOT EXISTS "current_quantity" numeric(12,3) NOT NULL DEFAULT 0,
        ADD COLUMN IF NOT EXISTS "cost_per_unit" numeric(16,4),
        ADD COLUMN IF NOT EXISTS "manufacturing_date" date,
        ADD COLUMN IF NOT EXISTS "expiry_date" date,
        ADD COLUMN IF NOT EXISTS "temperature_at_receipt" numeric(5,2),
        ADD COLUMN IF NOT EXISTS "notes" text,
        ADD COLUMN IF NOT EXISTS "created_at" timestamptz NOT NULL DEFAULT now(),
        ADD COLUMN IF NOT EXISTS "updated_at" timestamptz NOT NULL DEFAULT now(),
        ADD COLUMN IF NOT EXISTS "deleted_at" timestamptz,
        ADD COLUMN IF NOT EXISTS "created_by" uuid,
        ADD COLUMN IF NOT EXISTS "updated_by" uuid
    `);
    await queryRunner.query(`
      DO $$ BEGIN
        IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'batches_status_enum') THEN
          CREATE TYPE "batches_status_enum" AS ENUM
            ('AVAILABLE', 'QUARANTINED', 'CONSUMED', 'EXPIRED', 'DISPOSED');
        END IF;
      END $$
    `);
    await queryRunner.query(`
      ALTER TABLE "batches"
      ADD COLUMN IF NOT EXISTS "status" "batches_status_enum" NOT NULL DEFAULT 'AVAILABLE'
    `);
    await queryRunner.query(`
      UPDATE "batches"
      SET "batch_number" = COALESCE("batch_number", 'BATCH-' || upper(substr("id"::text, 1, 8)))
    `);
    await queryRunner.query(
      'ALTER TABLE "batches" ALTER COLUMN "batch_number" SET NOT NULL',
    );
    await queryRunner.query(
      'CREATE UNIQUE INDEX IF NOT EXISTS "IDX_batches_batch_number" ON "batches" ("batch_number")',
    );

    await queryRunner.query(`
      ALTER TABLE "quality_inspections"
        ADD COLUMN IF NOT EXISTS "temperature_reading" numeric(5,2),
        ADD COLUMN IF NOT EXISTS "quality_grade" varchar(20)
    `);
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      'ALTER TABLE "quality_inspections" DROP COLUMN IF EXISTS "quality_grade", DROP COLUMN IF EXISTS "temperature_reading"',
    );
    await queryRunner.query(`
      ALTER TABLE "batches"
        DROP COLUMN IF EXISTS "updated_by",
        DROP COLUMN IF EXISTS "created_by",
        DROP COLUMN IF EXISTS "deleted_at",
        DROP COLUMN IF EXISTS "updated_at",
        DROP COLUMN IF EXISTS "created_at",
        DROP COLUMN IF EXISTS "notes",
        DROP COLUMN IF EXISTS "temperature_at_receipt",
        DROP COLUMN IF EXISTS "status",
        DROP COLUMN IF EXISTS "expiry_date",
        DROP COLUMN IF EXISTS "manufacturing_date",
        DROP COLUMN IF EXISTS "cost_per_unit",
        DROP COLUMN IF EXISTS "current_quantity",
        DROP COLUMN IF EXISTS "initial_quantity",
        DROP COLUMN IF EXISTS "department_id"
    `);
    await queryRunner.query('DROP TYPE IF EXISTS "batches_status_enum"');
    await queryRunner.query(`
      ALTER TABLE "products"
        DROP COLUMN IF EXISTS "updated_by",
        DROP COLUMN IF EXISTS "created_by",
        DROP COLUMN IF EXISTS "deleted_at",
        DROP COLUMN IF EXISTS "updated_at",
        DROP COLUMN IF EXISTS "created_at",
        DROP COLUMN IF EXISTS "notes",
        DROP COLUMN IF EXISTS "status",
        DROP COLUMN IF EXISTS "max_price",
        DROP COLUMN IF EXISTS "min_price",
        DROP COLUMN IF EXISTS "is_active",
        DROP COLUMN IF EXISTS "category",
        DROP COLUMN IF EXISTS "unit",
        DROP COLUMN IF EXISTS "description",
        DROP COLUMN IF EXISTS "name",
        DROP COLUMN IF EXISTS "sku"
    `);
  }
}
