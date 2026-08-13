import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddBrotherAndInvestorManagement1787100000000 implements MigrationInterface {
  name = 'AddBrotherAndInvestorManagement1787100000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "chart_of_accounts" ALTER COLUMN "code" TYPE varchar USING "code"::text`,
    );
    await queryRunner.query(`DROP TYPE "chart_of_accounts_code_enum"`);
    await queryRunner.query(
      `CREATE TYPE "chart_of_accounts_code_enum" AS ENUM ('cash','bank','accounts_receivable','accounts_payable','revenue','cogs','operating_expense','payroll_expense','employee_advance','inventory','employee_salary_payable','committee_advance','other_income','investor_capital','investor_profit_payable','retained_earnings')`,
    );
    await queryRunner.query(
      `ALTER TABLE "chart_of_accounts" ALTER COLUMN "code" TYPE "chart_of_accounts_code_enum" USING "code"::"chart_of_accounts_code_enum"`,
    );
    await queryRunner.query(`INSERT INTO "chart_of_accounts" (id,code,name,account_nature) VALUES
      (uuid_generate_v4(),'investor_capital','Investor Capital','liability'),
      (uuid_generate_v4(),'investor_profit_payable','Investor Profit Payable','liability'),
      (uuid_generate_v4(),'retained_earnings','Retained Earnings','liability') ON CONFLICT (code) DO NOTHING`);

    await queryRunner.query(
      `ALTER TABLE "ledger_entries" ALTER COLUMN "source_type" TYPE varchar USING "source_type"::text`,
    );
    await queryRunner.query(`DROP TYPE "ledger_entries_source_type_enum"`);
    await queryRunner.query(
      `CREATE TYPE "ledger_entries_source_type_enum" AS ENUM ('purchase','sale','internal_transfer','payment','expense','salary','advance','bonus','stock_writeoff','opening_balance','salary_withdrawal','committee','investment','brother_adjustment','investor_capital','investor_profit')`,
    );
    await queryRunner.query(
      `ALTER TABLE "ledger_entries" ALTER COLUMN "source_type" TYPE "ledger_entries_source_type_enum" USING "source_type"::"ledger_entries_source_type_enum"`,
    );

    await queryRunner.query(`CREATE TABLE "brother_accounts" (
      "created_at" timestamptz NOT NULL DEFAULT now(), "updated_at" timestamptz NOT NULL DEFAULT now(), "deleted_at" timestamptz,
      "created_by" uuid, "updated_by" uuid, "id" uuid NOT NULL DEFAULT uuid_generate_v4(), "party_id" uuid NOT NULL, "is_active" boolean NOT NULL DEFAULT true,
      CONSTRAINT "PK_brother_accounts" PRIMARY KEY ("id"), CONSTRAINT "UQ_brother_account_party" UNIQUE ("party_id"),
      CONSTRAINT "FK_brother_account_party" FOREIGN KEY ("party_id") REFERENCES "parties"("id") ON DELETE RESTRICT)`);
    await queryRunner.query(
      `CREATE UNIQUE INDEX "UQ_active_brother_account" ON "brother_accounts" ((is_active)) WHERE is_active = true AND deleted_at IS NULL`,
    );
    await queryRunner.query(
      `CREATE TYPE "brother_adjustment_type_enum" AS ENUM ('farm_adjustment','reversal')`,
    );
    await queryRunner.query(
      `CREATE TYPE "brother_adjustment_status_enum" AS ENUM ('active','reversed')`,
    );
    await queryRunner.query(`CREATE TABLE "brother_farm_adjustments" (
      "created_at" timestamptz NOT NULL DEFAULT now(), "updated_at" timestamptz NOT NULL DEFAULT now(), "deleted_at" timestamptz, "created_by" uuid, "updated_by" uuid,
      "id" uuid NOT NULL DEFAULT uuid_generate_v4(), "brother_account_id" uuid NOT NULL, "farm_party_id" uuid NOT NULL, "department_id" uuid NOT NULL,
      "transaction_type" "brother_adjustment_type_enum" NOT NULL, "amount" numeric(18,2) NOT NULL,
      "brother_balance_before" numeric(18,2) NOT NULL, "brother_balance_after" numeric(18,2) NOT NULL,
      "farm_balance_before" numeric(18,2) NOT NULL, "farm_balance_after" numeric(18,2) NOT NULL,
      "transaction_date" date NOT NULL, "reference" varchar(100), "notes" varchar(500), "status" "brother_adjustment_status_enum" NOT NULL DEFAULT 'active',
      "original_transaction_id" uuid, "reversal_transaction_id" uuid, "reversal_reason" varchar(500), "reversed_at" timestamptz, "reversed_by" uuid,
      CONSTRAINT "PK_brother_farm_adjustments" PRIMARY KEY ("id"), CONSTRAINT "CHK_brother_adjustment_positive" CHECK (amount > 0),
      CONSTRAINT "FK_brother_adjustment_account" FOREIGN KEY ("brother_account_id") REFERENCES "brother_accounts"("id") ON DELETE RESTRICT,
      CONSTRAINT "FK_brother_adjustment_farm" FOREIGN KEY ("farm_party_id") REFERENCES "parties"("id") ON DELETE RESTRICT,
      CONSTRAINT "FK_brother_adjustment_department" FOREIGN KEY ("department_id") REFERENCES "departments"("id") ON DELETE RESTRICT,
      CONSTRAINT "FK_brother_adjustment_original" FOREIGN KEY ("original_transaction_id") REFERENCES "brother_farm_adjustments"("id") ON DELETE RESTRICT)`);
    await queryRunner.query(
      `CREATE INDEX "IDX_brother_adjustment_farm_date" ON "brother_farm_adjustments" ("farm_party_id","transaction_date")`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_brother_adjustment_account_date" ON "brother_farm_adjustments" ("brother_account_id","transaction_date")`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_brother_adjustment_status" ON "brother_farm_adjustments" ("status")`,
    );
    await queryRunner.query(
      `CREATE UNIQUE INDEX "UQ_brother_adjustment_reference" ON "brother_farm_adjustments" (lower(reference)) WHERE reference IS NOT NULL`,
    );
    await queryRunner.query(
      `CREATE UNIQUE INDEX "UQ_brother_adjustment_reversal" ON "brother_farm_adjustments" ("original_transaction_id") WHERE transaction_type = 'reversal'`,
    );

    await queryRunner.query(
      `CREATE TYPE "investor_type_enum" AS ENUM ('standard','brother')`,
    );
    await queryRunner.query(
      `CREATE TYPE "investor_status_enum" AS ENUM ('active','inactive')`,
    );
    await queryRunner.query(`CREATE TABLE "investors" (
      "created_at" timestamptz NOT NULL DEFAULT now(), "updated_at" timestamptz NOT NULL DEFAULT now(), "deleted_at" timestamptz, "created_by" uuid, "updated_by" uuid,
      "id" uuid NOT NULL DEFAULT uuid_generate_v4(), "party_id" uuid NOT NULL, "investor_type" "investor_type_enum" NOT NULL DEFAULT 'standard',
      "profit_share_percentage" numeric(7,4) NOT NULL, "status" "investor_status_enum" NOT NULL DEFAULT 'active', "notes" varchar(500),
      CONSTRAINT "PK_investors" PRIMARY KEY ("id"), CONSTRAINT "UQ_investor_party" UNIQUE ("party_id"), CONSTRAINT "CHK_investor_percentage" CHECK (profit_share_percentage >= 0 AND profit_share_percentage <= 100),
      CONSTRAINT "FK_investor_party" FOREIGN KEY ("party_id") REFERENCES "parties"("id") ON DELETE RESTRICT)`);
    await queryRunner.query(
      `CREATE INDEX "IDX_investor_status" ON "investors" ("status")`,
    );
    await queryRunner.query(
      `CREATE UNIQUE INDEX "UQ_brother_investor" ON "investors" ("investor_type") WHERE investor_type='brother' AND deleted_at IS NULL`,
    );

    await queryRunner.query(
      `CREATE TYPE "investor_capital_transaction_type_enum" AS ENUM ('investment','additional_investment','capital_withdrawal','capital_refund')`,
    );
    await queryRunner.query(
      `CREATE TYPE "investor_payment_method_enum" AS ENUM ('cash','bank')`,
    );
    await queryRunner.query(`CREATE TABLE "investor_capital_transactions" (
      "created_at" timestamptz NOT NULL DEFAULT now(), "updated_at" timestamptz NOT NULL DEFAULT now(), "deleted_at" timestamptz, "created_by" uuid, "updated_by" uuid,
      "id" uuid NOT NULL DEFAULT uuid_generate_v4(), "investor_id" uuid NOT NULL, "department_id" uuid NOT NULL,
      "transaction_type" "investor_capital_transaction_type_enum" NOT NULL, "amount" numeric(18,2) NOT NULL, "balance_before" numeric(18,2) NOT NULL, "balance_after" numeric(18,2) NOT NULL,
      "transaction_date" date NOT NULL, "payment_method" "investor_payment_method_enum" NOT NULL, "cash_account_id" uuid, "bank_account_id" uuid,
      "bank_transaction_method" "bank_transaction_method_enum", "cheque_number" varchar, "app_reference" varchar, "reference" varchar(100), "notes" varchar(500),
      CONSTRAINT "PK_investor_capital_transactions" PRIMARY KEY ("id"), CONSTRAINT "CHK_investor_capital_positive" CHECK (amount > 0 AND balance_before >= 0 AND balance_after >= 0),
      CONSTRAINT "FK_investor_capital_investor" FOREIGN KEY ("investor_id") REFERENCES "investors"("id") ON DELETE RESTRICT,
      CONSTRAINT "FK_investor_capital_department" FOREIGN KEY ("department_id") REFERENCES "departments"("id") ON DELETE RESTRICT,
      CONSTRAINT "FK_investor_capital_cash" FOREIGN KEY ("cash_account_id") REFERENCES "cash_accounts"("id") ON DELETE RESTRICT,
      CONSTRAINT "FK_investor_capital_bank" FOREIGN KEY ("bank_account_id") REFERENCES "bank_accounts"("id") ON DELETE RESTRICT)`);
    await queryRunner.query(
      `CREATE INDEX "IDX_investor_capital_investor_date" ON "investor_capital_transactions" ("investor_id","transaction_date")`,
    );
    await queryRunner.query(
      `CREATE UNIQUE INDEX "UQ_investor_capital_reference" ON "investor_capital_transactions" (lower(reference)) WHERE reference IS NOT NULL`,
    );

    await queryRunner.query(
      `CREATE TYPE "investor_profit_period_type_enum" AS ENUM ('monthly','yearly','custom')`,
    );
    await queryRunner.query(
      `CREATE TYPE "investor_profit_period_status_enum" AS ENUM ('calculated','finalized','distributed')`,
    );
    await queryRunner.query(`CREATE TABLE "investor_profit_periods" (
      "created_at" timestamptz NOT NULL DEFAULT now(), "updated_at" timestamptz NOT NULL DEFAULT now(), "deleted_at" timestamptz, "created_by" uuid, "updated_by" uuid,
      "id" uuid NOT NULL DEFAULT uuid_generate_v4(), "department_id" uuid NOT NULL, "period_type" "investor_profit_period_type_enum" NOT NULL,
      "start_date" date NOT NULL, "end_date" date NOT NULL, "gross_profit" numeric(18,2) NOT NULL, "eligible_expenses" numeric(18,2) NOT NULL, "net_profit" numeric(18,2) NOT NULL,
      "status" "investor_profit_period_status_enum" NOT NULL DEFAULT 'calculated', "calculated_at" timestamptz NOT NULL, "calculated_by" uuid NOT NULL,
      "finalized_at" timestamptz, "finalized_by" uuid,
      CONSTRAINT "PK_investor_profit_periods" PRIMARY KEY ("id"), CONSTRAINT "CHK_investor_profit_period_dates" CHECK (start_date <= end_date),
      CONSTRAINT "UQ_investor_profit_period_dates" UNIQUE ("start_date","end_date"), CONSTRAINT "FK_investor_profit_period_department" FOREIGN KEY ("department_id") REFERENCES "departments"("id") ON DELETE RESTRICT)`);
    await queryRunner.query(
      `CREATE INDEX "IDX_investor_profit_period_status" ON "investor_profit_periods" ("status")`,
    );

    await queryRunner.query(
      `CREATE TYPE "investor_profit_allocation_status_enum" AS ENUM ('pending','partially_distributed','distributed')`,
    );
    await queryRunner.query(`CREATE TABLE "investor_profit_allocations" (
      "created_at" timestamptz NOT NULL DEFAULT now(), "updated_at" timestamptz NOT NULL DEFAULT now(), "deleted_at" timestamptz, "created_by" uuid, "updated_by" uuid,
      "id" uuid NOT NULL DEFAULT uuid_generate_v4(), "profit_period_id" uuid NOT NULL, "investor_id" uuid NOT NULL,
      "net_profit_snapshot" numeric(18,2) NOT NULL, "profit_share_percentage_snapshot" numeric(7,4) NOT NULL,
      "profit_amount" numeric(18,2) NOT NULL, "distributed_amount" numeric(18,2) NOT NULL DEFAULT 0, "remaining_amount" numeric(18,2) NOT NULL,
      "status" "investor_profit_allocation_status_enum" NOT NULL DEFAULT 'pending',
      CONSTRAINT "PK_investor_profit_allocations" PRIMARY KEY ("id"), CONSTRAINT "UQ_profit_period_investor" UNIQUE ("profit_period_id","investor_id"),
      CONSTRAINT "CHK_profit_allocation_amounts" CHECK (profit_amount >= 0 AND distributed_amount >= 0 AND remaining_amount >= 0 AND distributed_amount + remaining_amount = profit_amount),
      CONSTRAINT "FK_profit_allocation_period" FOREIGN KEY ("profit_period_id") REFERENCES "investor_profit_periods"("id") ON DELETE RESTRICT,
      CONSTRAINT "FK_profit_allocation_investor" FOREIGN KEY ("investor_id") REFERENCES "investors"("id") ON DELETE RESTRICT)`);
    await queryRunner.query(
      `CREATE INDEX "IDX_profit_allocation_investor_status" ON "investor_profit_allocations" ("investor_id","status")`,
    );

    await queryRunner.query(`CREATE TABLE "investor_profit_distributions" (
      "created_at" timestamptz NOT NULL DEFAULT now(), "updated_at" timestamptz NOT NULL DEFAULT now(), "deleted_at" timestamptz, "created_by" uuid, "updated_by" uuid,
      "id" uuid NOT NULL DEFAULT uuid_generate_v4(), "allocation_id" uuid NOT NULL, "department_id" uuid NOT NULL, "amount" numeric(18,2) NOT NULL,
      "payment_method" "investor_payment_method_enum" NOT NULL, "cash_account_id" uuid, "bank_account_id" uuid, "bank_transaction_method" "bank_transaction_method_enum",
      "cheque_number" varchar, "app_reference" varchar, "transaction_date" date NOT NULL, "reference" varchar(100), "notes" varchar(500),
      CONSTRAINT "PK_investor_profit_distributions" PRIMARY KEY ("id"), CONSTRAINT "CHK_profit_distribution_positive" CHECK (amount > 0),
      CONSTRAINT "FK_profit_distribution_allocation" FOREIGN KEY ("allocation_id") REFERENCES "investor_profit_allocations"("id") ON DELETE RESTRICT,
      CONSTRAINT "FK_profit_distribution_department" FOREIGN KEY ("department_id") REFERENCES "departments"("id") ON DELETE RESTRICT,
      CONSTRAINT "FK_profit_distribution_cash" FOREIGN KEY ("cash_account_id") REFERENCES "cash_accounts"("id") ON DELETE RESTRICT,
      CONSTRAINT "FK_profit_distribution_bank" FOREIGN KEY ("bank_account_id") REFERENCES "bank_accounts"("id") ON DELETE RESTRICT)`);
    await queryRunner.query(
      `CREATE INDEX "IDX_profit_distribution_allocation_date" ON "investor_profit_distributions" ("allocation_id","transaction_date")`,
    );
    await queryRunner.query(
      `CREATE UNIQUE INDEX "UQ_profit_distribution_reference" ON "investor_profit_distributions" (lower(reference)) WHERE reference IS NOT NULL`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE "investor_profit_distributions"`);
    await queryRunner.query(`DROP TABLE "investor_profit_allocations"`);
    await queryRunner.query(
      `DROP TYPE "investor_profit_allocation_status_enum"`,
    );
    await queryRunner.query(`DROP TABLE "investor_profit_periods"`);
    await queryRunner.query(`DROP TYPE "investor_profit_period_status_enum"`);
    await queryRunner.query(`DROP TYPE "investor_profit_period_type_enum"`);
    await queryRunner.query(`DROP TABLE "investor_capital_transactions"`);
    await queryRunner.query(`DROP TYPE "investor_payment_method_enum"`);
    await queryRunner.query(
      `DROP TYPE "investor_capital_transaction_type_enum"`,
    );
    await queryRunner.query(`DROP TABLE "investors"`);
    await queryRunner.query(`DROP TYPE "investor_status_enum"`);
    await queryRunner.query(`DROP TYPE "investor_type_enum"`);
    await queryRunner.query(`DROP TABLE "brother_farm_adjustments"`);
    await queryRunner.query(`DROP TYPE "brother_adjustment_status_enum"`);
    await queryRunner.query(`DROP TYPE "brother_adjustment_type_enum"`);
    await queryRunner.query(`DROP TABLE "brother_accounts"`);
    await queryRunner.query(
      `DELETE FROM "chart_of_accounts" WHERE code::text IN ('investor_capital','investor_profit_payable','retained_earnings')`,
    );
    // Enum values are intentionally retained on rollback to avoid unsafe enum recreation with live ledger rows.
  }
}
