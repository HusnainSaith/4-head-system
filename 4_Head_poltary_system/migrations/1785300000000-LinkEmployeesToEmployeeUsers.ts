import { MigrationInterface, QueryRunner } from 'typeorm';

export class LinkEmployeesToEmployeeUsers1785300000000 implements MigrationInterface {
  name = 'LinkEmployeesToEmployeeUsers1785300000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `CREATE UNIQUE INDEX IF NOT EXISTS "IDX_employees_user_id" ON "employees" ("user_id") WHERE "user_id" IS NOT NULL`,
    );
    await queryRunner.query(
      `INSERT INTO "roles" ("id", "name", "description", "created_at", "updated_at") SELECT uuid_generate_v4(), 'EMPLOYEE', 'Employee user', now(), now() WHERE NOT EXISTS (SELECT 1 FROM "roles" WHERE upper("name") = 'EMPLOYEE')`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP INDEX IF EXISTS "IDX_employees_user_id"`);
  }
}
