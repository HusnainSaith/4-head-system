import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddVehicleDriverNameNotes1784300000000
  implements MigrationInterface
{
  name = 'AddVehicleDriverNameNotes1784300000000';

  async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "vehicles" ADD COLUMN IF NOT EXISTS "driver_name" varchar`,
    );
    await queryRunner.query(
      `ALTER TABLE "vehicles" ADD COLUMN IF NOT EXISTS "notes" varchar(255)`,
    );
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "vehicles" DROP COLUMN IF EXISTS "notes"`,
    );
    await queryRunner.query(
      `ALTER TABLE "vehicles" DROP COLUMN IF EXISTS "driver_name"`,
    );
  }
}
