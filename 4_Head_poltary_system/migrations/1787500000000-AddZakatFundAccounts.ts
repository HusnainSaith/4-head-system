import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddZakatFundAccounts1787500000000 implements MigrationInterface {
  name = 'AddZakatFundAccounts1787500000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "chart_of_accounts" ALTER COLUMN "code" TYPE varchar USING "code"::text`,
    );
    await queryRunner.query(`DROP TYPE "chart_of_accounts_code_enum"`);
    await queryRunner.query(
      `CREATE TYPE "chart_of_accounts_code_enum" AS ENUM ('cash','bank','accounts_receivable','accounts_payable','revenue','cogs','operating_expense','payroll_expense','employee_advance','inventory','employee_salary_payable','committee_advance','other_income','investor_capital','investor_profit_payable','retained_earnings','zakat_fund_clearing')`,
    );
    await queryRunner.query(
      `ALTER TABLE "chart_of_accounts" ALTER COLUMN "code" TYPE "chart_of_accounts_code_enum" USING "code"::"chart_of_accounts_code_enum"`,
    );
    await queryRunner.query(
      `INSERT INTO "chart_of_accounts" (id, code, name, account_nature) VALUES (uuid_generate_v4(), 'zakat_fund_clearing', 'Zakat and Fund Clearing', 'asset') ON CONFLICT (code) DO NOTHING`,
    );

    await queryRunner.query(
      `ALTER TABLE "ledger_entries" ALTER COLUMN "source_type" TYPE varchar USING "source_type"::text`,
    );
    await queryRunner.query(`DROP TYPE "ledger_entries_source_type_enum"`);
    await queryRunner.query(
      `CREATE TYPE "ledger_entries_source_type_enum" AS ENUM ('purchase','sale','internal_transfer','payment','expense','salary','advance','bonus','stock_writeoff','opening_balance','salary_withdrawal','committee','investment','brother_adjustment','investor_capital','investor_profit','zakat_fund')`,
    );
    await queryRunner.query(
      `ALTER TABLE "ledger_entries" ALTER COLUMN "source_type" TYPE "ledger_entries_source_type_enum" USING "source_type"::"ledger_entries_source_type_enum"`,
    );

    await queryRunner.query(
      `CREATE TYPE "zakat_fund_type_enum" AS ENUM ('zakat','fund')`,
    );
    await queryRunner.query(
      `CREATE TYPE "zakat_fund_status_enum" AS ENUM ('active','reversed')`,
    );
    await queryRunner.query(
      `CREATE TYPE "zakat_fund_payment_method_enum" AS ENUM ('cash','bank')`,
    );
    await queryRunner.query(`CREATE TABLE "zakat_fund_payments" (
      "created_at" timestamptz NOT NULL DEFAULT now(), "updated_at" timestamptz NOT NULL DEFAULT now(), "deleted_at" timestamptz,
      "created_by" uuid, "updated_by" uuid, "id" uuid NOT NULL DEFAULT uuid_generate_v4(), "department_id" uuid NOT NULL,
      "account_type" "zakat_fund_type_enum" NOT NULL, "calendar_year" integer NOT NULL, "amount" numeric(18,2) NOT NULL,
      "payment_date" date NOT NULL, "payment_method" "zakat_fund_payment_method_enum" NOT NULL, "cash_account_id" uuid, "bank_account_id" uuid,
      "bank_transaction_method" "bank_transaction_method_enum", "cheque_number" varchar, "app_reference" varchar,
      "recipient_name" varchar(150) NOT NULL, "reference" varchar(100), "notes" varchar(500),
      "status" "zakat_fund_status_enum" NOT NULL DEFAULT 'active', "reversal_reason" varchar(500), "reversed_at" timestamptz, "reversed_by" uuid,
      CONSTRAINT "PK_zakat_fund_payments" PRIMARY KEY ("id"),
      CONSTRAINT "CHK_zakat_fund_payment_amount" CHECK (amount > 0),
      CONSTRAINT "CHK_zakat_fund_payment_year" CHECK (calendar_year BETWEEN 2000 AND 2100),
      CONSTRAINT "CHK_zakat_fund_payment_account" CHECK ((payment_method='cash' AND cash_account_id IS NOT NULL AND bank_account_id IS NULL) OR (payment_method='bank' AND bank_account_id IS NOT NULL AND cash_account_id IS NULL)),
      CONSTRAINT "FK_zakat_fund_payment_department" FOREIGN KEY ("department_id") REFERENCES "departments"("id") ON DELETE RESTRICT,
      CONSTRAINT "FK_zakat_fund_payment_cash" FOREIGN KEY ("cash_account_id") REFERENCES "cash_accounts"("id") ON DELETE RESTRICT,
      CONSTRAINT "FK_zakat_fund_payment_bank" FOREIGN KEY ("bank_account_id") REFERENCES "bank_accounts"("id") ON DELETE RESTRICT)`);
    await queryRunner.query(
      `CREATE INDEX "IDX_zakat_fund_payment_period" ON "zakat_fund_payments" ("department_id","calendar_year","account_type","status")`,
    );
    await queryRunner.query(
      `CREATE UNIQUE INDEX "UQ_zakat_fund_payment_reference" ON "zakat_fund_payments" (lower(reference)) WHERE reference IS NOT NULL AND deleted_at IS NULL`,
    );

    await queryRunner.query(
      `CREATE TYPE "zakat_fund_allocation_method_enum" AS ENUM ('equal','percentage','manual')`,
    );
    await queryRunner.query(`CREATE TABLE "zakat_fund_settlements" (
      "created_at" timestamptz NOT NULL DEFAULT now(), "updated_at" timestamptz NOT NULL DEFAULT now(), "deleted_at" timestamptz,
      "created_by" uuid, "updated_by" uuid, "id" uuid NOT NULL DEFAULT uuid_generate_v4(), "department_id" uuid NOT NULL,
      "account_type" "zakat_fund_type_enum" NOT NULL, "calendar_year" integer NOT NULL, "total_amount" numeric(18,2) NOT NULL,
      "settlement_date" date NOT NULL, "allocation_method" "zakat_fund_allocation_method_enum" NOT NULL,
      "reference" varchar(100), "notes" varchar(500), "status" "zakat_fund_status_enum" NOT NULL DEFAULT 'active',
      "reversal_reason" varchar(500), "reversed_at" timestamptz, "reversed_by" uuid,
      CONSTRAINT "PK_zakat_fund_settlements" PRIMARY KEY ("id"),
      CONSTRAINT "CHK_zakat_fund_settlement_amount" CHECK (total_amount > 0),
      CONSTRAINT "CHK_zakat_fund_settlement_year" CHECK (calendar_year BETWEEN 2000 AND 2100),
      CONSTRAINT "FK_zakat_fund_settlement_department" FOREIGN KEY ("department_id") REFERENCES "departments"("id") ON DELETE RESTRICT)`);
    await queryRunner.query(
      `CREATE INDEX "IDX_zakat_fund_settlement_period" ON "zakat_fund_settlements" ("department_id","calendar_year","account_type","status")`,
    );
    await queryRunner.query(
      `CREATE UNIQUE INDEX "UQ_zakat_fund_settlement_reference" ON "zakat_fund_settlements" (lower(reference)) WHERE reference IS NOT NULL AND deleted_at IS NULL`,
    );

    await queryRunner.query(`CREATE TABLE "zakat_fund_settlement_splits" (
      "id" uuid NOT NULL DEFAULT uuid_generate_v4(), "settlement_id" uuid NOT NULL, "party_id" uuid NOT NULL,
      "amount" numeric(18,2) NOT NULL, "percentage" numeric(7,4),
      CONSTRAINT "PK_zakat_fund_settlement_splits" PRIMARY KEY ("id"),
      CONSTRAINT "UQ_zakat_fund_settlement_party" UNIQUE ("settlement_id","party_id"),
      CONSTRAINT "CHK_zakat_fund_split_amount" CHECK (amount > 0),
      CONSTRAINT "CHK_zakat_fund_split_percentage" CHECK (percentage IS NULL OR (percentage > 0 AND percentage <= 100)),
      CONSTRAINT "FK_zakat_fund_split_settlement" FOREIGN KEY ("settlement_id") REFERENCES "zakat_fund_settlements"("id") ON DELETE RESTRICT,
      CONSTRAINT "FK_zakat_fund_split_party" FOREIGN KEY ("party_id") REFERENCES "parties"("id") ON DELETE RESTRICT)`);
    await queryRunner.query(
      `CREATE INDEX "IDX_zakat_fund_split_party" ON "zakat_fund_settlement_splits" ("party_id")`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE "zakat_fund_settlement_splits"`);
    await queryRunner.query(`DROP TABLE "zakat_fund_settlements"`);
    await queryRunner.query(`DROP TABLE "zakat_fund_payments"`);
    await queryRunner.query(`DROP TYPE "zakat_fund_allocation_method_enum"`);
    await queryRunner.query(`DROP TYPE "zakat_fund_payment_method_enum"`);
    await queryRunner.query(`DROP TYPE "zakat_fund_status_enum"`);
    await queryRunner.query(`DROP TYPE "zakat_fund_type_enum"`);
    // Account/source enum values and ledger rows are intentionally retained.
  }
}
