import { MigrationInterface, QueryRunner } from 'typeorm';

export class CompleteVehicleContracts1784200000000 implements MigrationInterface {
  name = 'CompleteVehicleContracts1784200000000';
  async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "vehicles" ALTER COLUMN "model" DROP NOT NULL`,
    );
    await queryRunner.query(
      `ALTER TABLE "vehicles" ALTER COLUMN "year" DROP NOT NULL`,
    );
    await queryRunner.query(
      `ALTER TABLE "vehicles" ADD COLUMN IF NOT EXISTS "driver_name" varchar`,
    );
    await queryRunner.query(
      `ALTER TABLE "vehicles" ADD COLUMN IF NOT EXISTS "notes" varchar(255)`,
    );
    await queryRunner.query(
      `CREATE INDEX IF NOT EXISTS "IDX_vehicles_department_active" ON "vehicles" ("department_id", "is_active") WHERE "deleted_at" IS NULL`,
    );
  }
  async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `DROP INDEX IF EXISTS "IDX_vehicles_department_active"`,
    );
    await queryRunner.query(
      `ALTER TABLE "vehicles" DROP COLUMN IF EXISTS "notes"`,
    );
    await queryRunner.query(
      `ALTER TABLE "vehicles" DROP COLUMN IF EXISTS "driver_name"`,
    );
  }
}
