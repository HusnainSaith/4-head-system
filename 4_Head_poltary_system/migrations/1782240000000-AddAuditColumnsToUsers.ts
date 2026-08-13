import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddAuditColumnsToUsers1782240000000
  implements MigrationInterface
{
  name = 'AddAuditColumnsToUsers1782240000000';

  async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      'ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "created_by" uuid NULL',
    );
    await queryRunner.query(
      'ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "updated_by" uuid NULL',
    );
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      'ALTER TABLE "users" DROP COLUMN IF EXISTS "updated_by"',
    );
    await queryRunner.query(
      'ALTER TABLE "users" DROP COLUMN IF EXISTS "created_by"',
    );
  }
}
