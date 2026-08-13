import { MigrationInterface, QueryRunner } from 'typeorm';

export class ReconcileVehicleColumns1784400000000
  implements MigrationInterface
{
  name = 'ReconcileVehicleColumns1784400000000';

  async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "vehicles" ADD COLUMN IF NOT EXISTS "driver_name" varchar`,
    );
    await queryRunner.query(
      `ALTER TABLE "vehicles" ADD COLUMN IF NOT EXISTS "notes" varchar(255)`,
    );
    await queryRunner.query(
      `ALTER TABLE "vehicles" ALTER COLUMN "model" DROP NOT NULL`,
    );
    await queryRunner.query(
      `ALTER TABLE "vehicles" ALTER COLUMN "year" DROP NOT NULL`,
    );
    await queryRunner.query(
      `CREATE INDEX IF NOT EXISTS "IDX_vehicles_department_active" ON "vehicles" ("department_id", "is_active") WHERE "deleted_at" IS NULL`,
    );
  }

  async down(): Promise<void> {
    // Reconciliation migrations intentionally do not remove live columns.
  }
}
