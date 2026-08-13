import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddCommitteeAccounting1786500000000 implements MigrationInterface {
  name = 'AddCommitteeAccounting1786500000000';
  async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE "chart_of_accounts" ALTER COLUMN "code" TYPE varchar USING "code"::text`);
    await queryRunner.query(`DROP TYPE "chart_of_accounts_code_enum"`);
    await queryRunner.query(`CREATE TYPE "chart_of_accounts_code_enum" AS ENUM
      ('cash','bank','accounts_receivable','accounts_payable','revenue','cogs','operating_expense','payroll_expense','employee_advance','inventory','employee_salary_payable','committee_advance','other_income')`);
    await queryRunner.query(`ALTER TABLE "chart_of_accounts" ALTER COLUMN "code" TYPE "chart_of_accounts_code_enum" USING "code"::"chart_of_accounts_code_enum"`);
    await queryRunner.query(`ALTER TABLE "ledger_entries" ALTER COLUMN "source_type" TYPE varchar USING "source_type"::text`);
    await queryRunner.query(`DROP TYPE "ledger_entries_source_type_enum"`);
    await queryRunner.query(`CREATE TYPE "ledger_entries_source_type_enum" AS ENUM
      ('purchase','sale','internal_transfer','payment','expense','salary','advance','bonus','stock_writeoff','opening_balance','salary_withdrawal','committee')`);
    await queryRunner.query(`ALTER TABLE "ledger_entries" ALTER COLUMN "source_type" TYPE "ledger_entries_source_type_enum" USING "source_type"::"ledger_entries_source_type_enum"`);
    await queryRunner.query(`INSERT INTO "chart_of_accounts" (id, code, name, account_nature) VALUES
      (uuid_generate_v4(), 'committee_advance', 'Committee Advance', 'asset'),
      (uuid_generate_v4(), 'other_income', 'Other Income', 'income') ON CONFLICT (code) DO NOTHING`);
    await queryRunner.query(`CREATE TYPE "committees_status_enum" AS ENUM ('active','completed','defaulted')`);
    await queryRunner.query(`CREATE TABLE "committees" (
      "created_at" timestamptz NOT NULL DEFAULT now(), "updated_at" timestamptz NOT NULL DEFAULT now(), "deleted_at" timestamptz,
      "created_by" uuid, "updated_by" uuid, "id" uuid PRIMARY KEY DEFAULT uuid_generate_v4(), "department_id" uuid NOT NULL,
      "name" varchar(150) NOT NULL, "installment_amount" numeric(14,2) NOT NULL, "total_members" smallint NOT NULL,
      "payout_position" smallint NOT NULL, "start_date" date NOT NULL, "status" "committees_status_enum" NOT NULL DEFAULT 'active',
      CONSTRAINT "chk_committee_installment_positive" CHECK (installment_amount > 0),
      CONSTRAINT "chk_committee_members_positive" CHECK (total_members > 0),
      CONSTRAINT "chk_committee_position_valid" CHECK (payout_position > 0 AND payout_position <= total_members),
      CONSTRAINT "fk_committees_department_restrict" FOREIGN KEY (department_id) REFERENCES departments(id) ON DELETE RESTRICT)`);
    await queryRunner.query(`CREATE TABLE "committee_installments" (
      "created_at" timestamptz NOT NULL DEFAULT now(), "updated_at" timestamptz NOT NULL DEFAULT now(), "deleted_at" timestamptz,
      "created_by" uuid, "updated_by" uuid, "id" uuid PRIMARY KEY DEFAULT uuid_generate_v4(), "committee_id" uuid NOT NULL,
      "amount" numeric(14,2) NOT NULL CHECK (amount > 0), "installment_date" date NOT NULL,
      CONSTRAINT "fk_committee_installments_committee_restrict" FOREIGN KEY (committee_id) REFERENCES committees(id) ON DELETE RESTRICT)`);
    await queryRunner.query(`CREATE TABLE "committee_payouts" (
      "created_at" timestamptz NOT NULL DEFAULT now(), "updated_at" timestamptz NOT NULL DEFAULT now(), "deleted_at" timestamptz,
      "created_by" uuid, "updated_by" uuid, "id" uuid PRIMARY KEY DEFAULT uuid_generate_v4(), "committee_id" uuid NOT NULL UNIQUE,
      "payout_amount" numeric(14,2) NOT NULL CHECK (payout_amount > 0), "total_contributed" numeric(14,2) NOT NULL,
      "excess_amount" numeric(14,2) GENERATED ALWAYS AS (payout_amount - total_contributed) STORED,
      "payout_date" date NOT NULL, CONSTRAINT "chk_committee_payout_excess_nonnegative" CHECK (excess_amount >= 0),
      CONSTRAINT "fk_committee_payouts_committee_restrict" FOREIGN KEY (committee_id) REFERENCES committees(id) ON DELETE RESTRICT)`);
  }
  async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE IF EXISTS "committee_payouts"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "committee_installments"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "committees"`);
    await queryRunner.query(`DROP TYPE IF EXISTS "committees_status_enum"`);
    await queryRunner.query(`DELETE FROM "chart_of_accounts" WHERE code::text IN ('committee_advance','other_income')`);
  }
}
