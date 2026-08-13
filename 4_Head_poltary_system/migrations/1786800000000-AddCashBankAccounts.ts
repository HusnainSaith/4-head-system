import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddCashBankAccounts1786800000000 implements MigrationInterface {
  name = 'AddCashBankAccounts1786800000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`CREATE TYPE "public"."bank_transaction_method_enum" AS ENUM ('cheque', 'app')`);
    await queryRunner.query(`
      CREATE TABLE "cash_accounts" (
        "created_at" timestamptz NOT NULL DEFAULT now(), "updated_at" timestamptz NOT NULL DEFAULT now(),
        "deleted_at" timestamptz, "created_by" uuid, "updated_by" uuid,
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(), "department_id" uuid NOT NULL,
        "account_name" varchar NOT NULL, "opening_balance" numeric(14,2) NOT NULL DEFAULT 0,
        "is_active" boolean NOT NULL DEFAULT true,
        CONSTRAINT "PK_cash_accounts" PRIMARY KEY ("id"),
        CONSTRAINT "UQ_cash_accounts_department" UNIQUE ("department_id"),
        CONSTRAINT "FK_cash_accounts_department" FOREIGN KEY ("department_id") REFERENCES "departments"("id") ON DELETE RESTRICT
      )`);
    await queryRunner.query(`
      CREATE TABLE "bank_accounts" (
        "created_at" timestamptz NOT NULL DEFAULT now(), "updated_at" timestamptz NOT NULL DEFAULT now(),
        "deleted_at" timestamptz, "created_by" uuid, "updated_by" uuid,
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(), "bank_name" varchar NOT NULL,
        "account_title" varchar NOT NULL, "account_number" varchar, "branch_name" varchar,
        "opening_balance" numeric(14,2) NOT NULL DEFAULT 0, "opening_balance_date" date,
        "is_active" boolean NOT NULL DEFAULT true, CONSTRAINT "PK_bank_accounts" PRIMARY KEY ("id")
      )`);
    await queryRunner.query(`ALTER TYPE "public"."brokerage_purchases_payment_method_enum" ADD VALUE IF NOT EXISTS 'bank'`);
    await queryRunner.query(`ALTER TYPE "public"."brokerage_sales_payment_method_enum" ADD VALUE IF NOT EXISTS 'bank'`);
    await queryRunner.query(`CREATE TYPE "public"."expenses_payment_method_enum" AS ENUM ('cash', 'bank')`);
    await queryRunner.query(`ALTER TABLE "expenses" ADD COLUMN "payment_method" "public"."expenses_payment_method_enum" NOT NULL DEFAULT 'cash'`);

    const tables = [
      'brokerage_purchases', 'brokerage_sales', 'supply_purchases', 'supply_sales',
      'wastage_purchases', 'wastage_sales', 'shop_sales', 'internal_transfers',
      'expenses', 'salary_runs', 'employee_advances', 'employee_bonuses', 'party_payments',
    ];
    for (const table of tables) {
      await queryRunner.query(`ALTER TABLE "${table}" ADD COLUMN "cash_account_id" uuid`);
      await queryRunner.query(`ALTER TABLE "${table}" ADD COLUMN "bank_account_id" uuid`);
      await queryRunner.query(`ALTER TABLE "${table}" ADD COLUMN "bank_transaction_method" "public"."bank_transaction_method_enum"`);
      await queryRunner.query(`ALTER TABLE "${table}" ADD COLUMN "cheque_number" varchar`);
      await queryRunner.query(`ALTER TABLE "${table}" ADD COLUMN "app_reference" varchar`);
      await queryRunner.query(`ALTER TABLE "${table}" ADD CONSTRAINT "FK_${table}_cash_account" FOREIGN KEY ("cash_account_id") REFERENCES "cash_accounts"("id") ON DELETE RESTRICT`);
      await queryRunner.query(`ALTER TABLE "${table}" ADD CONSTRAINT "FK_${table}_bank_account" FOREIGN KEY ("bank_account_id") REFERENCES "bank_accounts"("id") ON DELETE RESTRICT`);
      await queryRunner.query(`CREATE INDEX "IDX_${table}_cash_account" ON "${table}" ("cash_account_id")`);
      await queryRunner.query(`CREATE INDEX "IDX_${table}_bank_account" ON "${table}" ("bank_account_id")`);
    }
    await queryRunner.query(`ALTER TABLE "ledger_entries" ADD COLUMN "cash_account_id" uuid`);
    await queryRunner.query(`ALTER TABLE "ledger_entries" ADD COLUMN "bank_account_id" uuid`);
    await queryRunner.query(`ALTER TABLE "ledger_entries" ADD COLUMN "bank_transaction_method" "public"."bank_transaction_method_enum"`);
    await queryRunner.query(`ALTER TABLE "ledger_entries" ADD COLUMN "cheque_number" varchar`);
    await queryRunner.query(`ALTER TABLE "ledger_entries" ADD COLUMN "app_reference" varchar`);
    await queryRunner.query(`ALTER TABLE "ledger_entries" ADD CONSTRAINT "FK_ledger_cash_account" FOREIGN KEY ("cash_account_id") REFERENCES "cash_accounts"("id") ON DELETE RESTRICT`);
    await queryRunner.query(`ALTER TABLE "ledger_entries" ADD CONSTRAINT "FK_ledger_bank_account" FOREIGN KEY ("bank_account_id") REFERENCES "bank_accounts"("id") ON DELETE RESTRICT`);
    await queryRunner.query(`CREATE INDEX "IDX_ledger_cash_account_date" ON "ledger_entries" ("cash_account_id", "entry_date")`);
    await queryRunner.query(`CREATE INDEX "IDX_ledger_bank_account_date" ON "ledger_entries" ("bank_account_id", "entry_date")`);

    await queryRunner.query(`
      INSERT INTO "cash_accounts" ("department_id", "account_name", "opening_balance", "is_active")
      SELECT d.id, d.name || ' Cash Drawer', 0, true FROM "departments" d
      ON CONFLICT ("department_id") DO NOTHING`);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP INDEX "IDX_ledger_bank_account_date"`);
    await queryRunner.query(`DROP INDEX "IDX_ledger_cash_account_date"`);
    await queryRunner.query(`ALTER TABLE "ledger_entries" DROP CONSTRAINT "FK_ledger_bank_account"`);
    await queryRunner.query(`ALTER TABLE "ledger_entries" DROP CONSTRAINT "FK_ledger_cash_account"`);
    for (const column of ['app_reference', 'cheque_number', 'bank_transaction_method', 'bank_account_id', 'cash_account_id'])
      await queryRunner.query(`ALTER TABLE "ledger_entries" DROP COLUMN "${column}"`);
    const tables = ['party_payments', 'employee_bonuses', 'employee_advances', 'salary_runs', 'expenses', 'internal_transfers', 'shop_sales', 'wastage_sales', 'wastage_purchases', 'supply_sales', 'supply_purchases', 'brokerage_sales', 'brokerage_purchases'];
    for (const table of tables) {
      await queryRunner.query(`DROP INDEX "IDX_${table}_bank_account"`);
      await queryRunner.query(`DROP INDEX "IDX_${table}_cash_account"`);
      await queryRunner.query(`ALTER TABLE "${table}" DROP CONSTRAINT "FK_${table}_bank_account"`);
      await queryRunner.query(`ALTER TABLE "${table}" DROP CONSTRAINT "FK_${table}_cash_account"`);
      for (const column of ['app_reference', 'cheque_number', 'bank_transaction_method', 'bank_account_id', 'cash_account_id'])
        await queryRunner.query(`ALTER TABLE "${table}" DROP COLUMN "${column}"`);
    }
    await queryRunner.query(`DROP TABLE "bank_accounts"`);
    await queryRunner.query(`DROP TABLE "cash_accounts"`);
    await queryRunner.query(`DROP TYPE "public"."bank_transaction_method_enum"`);
    await queryRunner.query(`ALTER TABLE "expenses" DROP COLUMN "payment_method"`);
    await queryRunner.query(`DROP TYPE "public"."expenses_payment_method_enum"`);
  }
}
