import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddLinkedUsersRolesAndAdvanceConfirmation1785200000000 implements MigrationInterface {
  name = 'AddLinkedUsersRolesAndAdvanceConfirmation1785200000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "roles" ADD COLUMN IF NOT EXISTS "created_at" timestamptz NOT NULL DEFAULT now()`,
    );
    await queryRunner.query(
      `ALTER TABLE "roles" ADD COLUMN IF NOT EXISTS "updated_at" timestamptz NOT NULL DEFAULT now()`,
    );
    await queryRunner.query(
      `ALTER TABLE "roles" ADD COLUMN IF NOT EXISTS "deleted_at" timestamptz`,
    );
    await queryRunner.query(
      `ALTER TABLE "roles" ADD COLUMN IF NOT EXISTS "created_by" uuid`,
    );
    await queryRunner.query(
      `ALTER TABLE "roles" ADD COLUMN IF NOT EXISTS "updated_by" uuid`,
    );

    await queryRunner.query(
      `ALTER TABLE "vehicles" ADD COLUMN IF NOT EXISTS "driver_user_id" uuid`,
    );
    await queryRunner.query(
      `ALTER TABLE "parties" ADD COLUMN IF NOT EXISTS "user_id" uuid`,
    );
    await queryRunner.query(
      `CREATE UNIQUE INDEX IF NOT EXISTS "IDX_parties_user_id" ON "parties" ("user_id") WHERE "user_id" IS NOT NULL`,
    );
    await queryRunner.query(
      `DO $$ BEGIN ALTER TABLE "vehicles" ADD CONSTRAINT "FK_vehicles_driver_user" FOREIGN KEY ("driver_user_id") REFERENCES "users"("id") ON DELETE SET NULL; EXCEPTION WHEN duplicate_object THEN NULL; END $$`,
    );
    await queryRunner.query(
      `DO $$ BEGIN ALTER TABLE "parties" ADD CONSTRAINT "FK_parties_user" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE SET NULL; EXCEPTION WHEN duplicate_object THEN NULL; END $$`,
    );

    await queryRunner.query(
      `DO $$ BEGIN CREATE TYPE "employee_advances_disbursement_status_enum" AS ENUM ('pending', 'confirmed'); EXCEPTION WHEN duplicate_object THEN NULL; END $$`,
    );
    await queryRunner.query(
      `ALTER TABLE "employee_advances" ADD COLUMN IF NOT EXISTS "disbursement_status" "employee_advances_disbursement_status_enum" NOT NULL DEFAULT 'pending'`,
    );
    await queryRunner.query(
      `ALTER TABLE "employee_advances" ADD COLUMN IF NOT EXISTS "confirmed_at" timestamptz`,
    );
    await queryRunner.query(
      `DO $$ BEGIN CREATE TYPE "employee_advances_payment_method_enum" AS ENUM ('cash', 'bank'); EXCEPTION WHEN duplicate_object THEN NULL; END $$`,
    );
    await queryRunner.query(
      `ALTER TABLE "employee_advances" ADD COLUMN IF NOT EXISTS "payment_method" "employee_advances_payment_method_enum"`,
    );
    await queryRunner.query(
      `UPDATE "employee_advances" SET "disbursement_status" = 'confirmed', "confirmed_at" = COALESCE("created_at", now()), "payment_method" = 'cash' WHERE "disbursement_status" = 'pending'`,
    );

    await queryRunner.query(
      `INSERT INTO "roles" ("id", "name", "description", "created_at", "updated_at") SELECT uuid_generate_v4(), role_name, description, now(), now() FROM (VALUES ('DRIVER', 'Vehicle driver'), ('PARTY', 'External business party'), ('FARM', 'Farm party'), ('BROKER', 'Broker party'), ('SHOP_OWNER', 'Shop owner party'), ('CUSTOMER', 'Customer party'), ('FACTORY', 'Factory party')) AS defaults(role_name, description) WHERE NOT EXISTS (SELECT 1 FROM "roles" r WHERE upper(r."name") = defaults.role_name)`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "parties" DROP CONSTRAINT IF EXISTS "FK_parties_user"`,
    );
    await queryRunner.query(
      `ALTER TABLE "vehicles" DROP CONSTRAINT IF EXISTS "FK_vehicles_driver_user"`,
    );
    await queryRunner.query(`DROP INDEX IF EXISTS "IDX_parties_user_id"`);
    await queryRunner.query(
      `ALTER TABLE "parties" DROP COLUMN IF EXISTS "user_id"`,
    );
    await queryRunner.query(
      `ALTER TABLE "vehicles" DROP COLUMN IF EXISTS "driver_user_id"`,
    );
    await queryRunner.query(
      `ALTER TABLE "employee_advances" DROP COLUMN IF EXISTS "payment_method"`,
    );
    await queryRunner.query(
      `ALTER TABLE "employee_advances" DROP COLUMN IF EXISTS "confirmed_at"`,
    );
    await queryRunner.query(
      `ALTER TABLE "employee_advances" DROP COLUMN IF EXISTS "disbursement_status"`,
    );
    await queryRunner.query(
      `DROP TYPE IF EXISTS "employee_advances_payment_method_enum"`,
    );
    await queryRunner.query(
      `DROP TYPE IF EXISTS "employee_advances_disbursement_status_enum"`,
    );
  }
}
