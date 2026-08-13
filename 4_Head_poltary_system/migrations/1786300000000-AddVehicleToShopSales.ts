import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddVehicleToShopSales1786300000000 implements MigrationInterface {
  name = 'AddVehicleToShopSales1786300000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      'ALTER TABLE "shop_sales" ADD COLUMN IF NOT EXISTS "vehicle_id" uuid',
    );
    await queryRunner.query(`
      DO $$ BEGIN
        ALTER TABLE "shop_sales"
          ADD CONSTRAINT "FK_shop_sales_vehicle"
          FOREIGN KEY ("vehicle_id") REFERENCES "vehicles"("id")
          ON DELETE SET NULL;
      EXCEPTION WHEN duplicate_object THEN NULL;
      END $$;
    `);
    await queryRunner.query(
      'CREATE INDEX IF NOT EXISTS "IDX_shop_sales_vehicle_id" ON "shop_sales" ("vehicle_id")',
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query('DROP INDEX IF EXISTS "IDX_shop_sales_vehicle_id"');
    await queryRunner.query(
      'ALTER TABLE "shop_sales" DROP CONSTRAINT IF EXISTS "FK_shop_sales_vehicle"',
    );
    await queryRunner.query(
      'ALTER TABLE "shop_sales" DROP COLUMN IF EXISTS "vehicle_id"',
    );
  }
}
