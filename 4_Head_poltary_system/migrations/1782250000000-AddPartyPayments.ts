import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddPartyPayments1782250000000 implements MigrationInterface {
  name = 'AddPartyPayments1782250000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    if (await queryRunner.hasTable('party_payments')) return;
    await queryRunner.query(`CREATE TYPE "party_payments_direction_enum" AS ENUM ('received', 'paid')`);
    await queryRunner.query(`CREATE TYPE "party_payments_payment_method_enum" AS ENUM ('cash', 'bank')`);
    await queryRunner.query(`CREATE TABLE "party_payments" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "party_id" uuid NOT NULL, "department_id" uuid NOT NULL, "amount" numeric(14,2) NOT NULL, "direction" "party_payments_direction_enum" NOT NULL, "payment_method" "party_payments_payment_method_enum" NOT NULL, "payment_date" date NOT NULL, "notes" character varying(255), "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), CONSTRAINT "PK_party_payments" PRIMARY KEY ("id"), CONSTRAINT "FK_party_payments_party" FOREIGN KEY ("party_id") REFERENCES "parties"("id") ON DELETE RESTRICT, CONSTRAINT "FK_party_payments_department" FOREIGN KEY ("department_id") REFERENCES "departments"("id") ON DELETE RESTRICT)`);
    await queryRunner.query(`CREATE INDEX "IDX_party_payments_party_date" ON "party_payments" ("party_id", "payment_date")`);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE "party_payments"`);
    await queryRunner.query(`DROP TYPE "party_payments_payment_method_enum"`);
    await queryRunner.query(`DROP TYPE "party_payments_direction_enum"`);
  }
}
