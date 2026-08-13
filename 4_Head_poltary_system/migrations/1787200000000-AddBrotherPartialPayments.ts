import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddBrotherPartialPayments1787200000000 implements MigrationInterface {
  name = 'AddBrotherPartialPayments1787200000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `CREATE TYPE "brother_payment_method_enum" AS ENUM ('cash','bank')`,
    );
    await queryRunner.query(`CREATE TABLE "brother_payments" (
      "created_at" timestamptz NOT NULL DEFAULT now(), "updated_at" timestamptz NOT NULL DEFAULT now(), "deleted_at" timestamptz,
      "created_by" uuid, "updated_by" uuid, "id" uuid NOT NULL DEFAULT uuid_generate_v4(), "brother_account_id" uuid NOT NULL,
      "department_id" uuid NOT NULL, "amount" numeric(18,2) NOT NULL, "balance_before" numeric(18,2) NOT NULL, "balance_after" numeric(18,2) NOT NULL,
      "payment_method" "brother_payment_method_enum" NOT NULL, "cash_account_id" uuid, "bank_account_id" uuid,
      "bank_transaction_method" "bank_transaction_method_enum", "cheque_number" varchar, "app_reference" varchar,
      "payment_date" date NOT NULL, "reference" varchar(100), "notes" varchar(500),
      CONSTRAINT "PK_brother_payments" PRIMARY KEY ("id"), CONSTRAINT "CHK_brother_payment_positive" CHECK (amount > 0 AND balance_before >= 0 AND balance_after >= 0),
      CONSTRAINT "FK_brother_payment_account" FOREIGN KEY ("brother_account_id") REFERENCES "brother_accounts"("id") ON DELETE RESTRICT,
      CONSTRAINT "FK_brother_payment_department" FOREIGN KEY ("department_id") REFERENCES "departments"("id") ON DELETE RESTRICT,
      CONSTRAINT "FK_brother_payment_cash" FOREIGN KEY ("cash_account_id") REFERENCES "cash_accounts"("id") ON DELETE RESTRICT,
      CONSTRAINT "FK_brother_payment_bank" FOREIGN KEY ("bank_account_id") REFERENCES "bank_accounts"("id") ON DELETE RESTRICT)`);
    await queryRunner.query(
      `CREATE INDEX "IDX_brother_payment_account_date" ON "brother_payments" ("brother_account_id","payment_date")`,
    );
    await queryRunner.query(
      `CREATE UNIQUE INDEX "UQ_brother_payment_reference" ON "brother_payments" (lower(reference)) WHERE reference IS NOT NULL`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE "brother_payments"`);
    await queryRunner.query(`DROP TYPE "brother_payment_method_enum"`);
  }
}
