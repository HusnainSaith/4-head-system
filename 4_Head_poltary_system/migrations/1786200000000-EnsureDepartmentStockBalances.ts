import { MigrationInterface, QueryRunner } from 'typeorm';

/** Guarantees every active operating department has its required stock pools. */
export class EnsureDepartmentStockBalances1786200000000 implements MigrationInterface {
  name = 'EnsureDepartmentStockBalances1786200000000';

  async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      INSERT INTO "products" ("id", "sku", "name", "description", "unit", "category", "is_active")
      VALUES (uuid_generate_v4(), 'LIVE-CHICKEN-KG', 'Live Chicken', 'Primary poultry inventory measured in kilograms', 'kg', 'poultry', true)
      ON CONFLICT ("sku") DO NOTHING
    `);
    await queryRunner.query(`
      INSERT INTO "stock_balances"
        ("id", "product_id", "department_id", "stock_type", "quantity_kg", "wac")
      SELECT uuid_generate_v4(), product."id", department."id", 'standard', 0, 0
      FROM "departments" department
      CROSS JOIN LATERAL (
        SELECT "id" FROM "products" WHERE "sku" = 'LIVE-CHICKEN-KG' LIMIT 1
      ) product
      WHERE department."deleted_at" IS NULL
        AND department."is_active" = true
        AND department."type" != 'FRESH_CHICKEN_SHOP'
      ON CONFLICT ("department_id", "stock_type") DO NOTHING
    `);
    await queryRunner.query(`
      INSERT INTO "stock_balances"
        ("id", "product_id", "department_id", "stock_type", "quantity_kg", "wac")
      SELECT uuid_generate_v4(), product."id", department."id", pool."stock_type"::stock_balances_stock_type_enum, 0, 0
      FROM "departments" department
      CROSS JOIN LATERAL (
        SELECT "id" FROM "products" WHERE "sku" = 'LIVE-CHICKEN-KG' LIMIT 1
      ) product
      CROSS JOIN (VALUES ('live'), ('dressed')) pool("stock_type")
      WHERE department."deleted_at" IS NULL
        AND department."is_active" = true
        AND department."type" = 'FRESH_CHICKEN_SHOP'
      ON CONFLICT ("department_id", "stock_type") DO NOTHING
    `);
  }

  async down(): Promise<void> {
    // Stock balances may contain business history after creation and are never
    // deleted automatically by a rollback.
  }
}
