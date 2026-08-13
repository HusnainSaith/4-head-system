import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddPartyDepartmentsAndSalaryAccounts1785800000000 implements MigrationInterface {
  name = 'AddPartyDepartmentsAndSalaryAccounts1785800000000';
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`CREATE TABLE "party_departments" (
      "party_id" uuid NOT NULL, "department_id" uuid NOT NULL,
      CONSTRAINT "PK_party_departments" PRIMARY KEY ("party_id","department_id"),
      CONSTRAINT "FK_party_departments_party" FOREIGN KEY ("party_id") REFERENCES "parties"("id") ON DELETE CASCADE,
      CONSTRAINT "FK_party_departments_department" FOREIGN KEY ("department_id") REFERENCES "departments"("id") ON DELETE RESTRICT)`);
    await queryRunner.query(
      `CREATE INDEX "IDX_party_departments_department" ON "party_departments" ("department_id","party_id")`,
    );
    await queryRunner.query(
      `INSERT INTO "party_departments" SELECT "id","primary_department_id" FROM "parties" WHERE "primary_department_id" IS NOT NULL ON CONFLICT DO NOTHING`,
    );
    await queryRunner.query(
      `INSERT INTO "party_departments" SELECT "id","linked_department_id" FROM "parties" WHERE "linked_department_id" IS NOT NULL ON CONFLICT DO NOTHING`,
    );
    await queryRunner.query(
      `ALTER TABLE "chart_of_accounts" ALTER COLUMN "code" TYPE varchar USING "code"::text`,
    );
    await queryRunner.query(`DROP TYPE "chart_of_accounts_code_enum"`);
    await queryRunner.query(
      `CREATE TYPE "chart_of_accounts_code_enum" AS ENUM ('cash','bank','accounts_receivable','accounts_payable','revenue','cogs','operating_expense','payroll_expense','employee_advance','inventory','employee_salary_payable')`,
    );
    await queryRunner.query(
      `ALTER TABLE "chart_of_accounts" ALTER COLUMN "code" TYPE "chart_of_accounts_code_enum" USING "code"::"chart_of_accounts_code_enum"`,
    );
    await queryRunner.query(
      `INSERT INTO "chart_of_accounts" ("id","code","name","account_nature") VALUES (uuid_generate_v4(),'employee_salary_payable','Employee Salary Payable','liability') ON CONFLICT ("code") DO NOTHING`,
    );
    await queryRunner.query(
      `ALTER TABLE "salary_runs" ALTER COLUMN "payment_status" DROP DEFAULT`,
    );
    await queryRunner.query(
      `ALTER TABLE "salary_runs" ALTER COLUMN "payment_status" TYPE varchar USING "payment_status"::text`,
    );
    await queryRunner.query(`DROP TYPE "salary_runs_payment_status_enum"`);
    await queryRunner.query(
      `CREATE TYPE "salary_runs_payment_status_enum" AS ENUM ('pending','partially_paid','paid')`,
    );
    await queryRunner.query(
      `ALTER TABLE "salary_runs" ALTER COLUMN "payment_status" TYPE "salary_runs_payment_status_enum" USING "payment_status"::"salary_runs_payment_status_enum"`,
    );
    await queryRunner.query(
      `ALTER TABLE "salary_runs" ALTER COLUMN "payment_status" SET DEFAULT 'pending'`,
    );
    await queryRunner.query(
      `ALTER TABLE "salary_runs" ADD COLUMN "amount_paid" numeric(14,2) NOT NULL DEFAULT 0`,
    );
    await queryRunner.query(
      `UPDATE "salary_runs" SET "amount_paid"="net_payable" WHERE "payment_status"='paid'`,
    );
    await queryRunner.query(
      `ALTER TABLE "ledger_entries" ALTER COLUMN "source_type" TYPE varchar USING "source_type"::text`,
    );
    await queryRunner.query(`DROP TYPE "ledger_entries_source_type_enum"`);
    await queryRunner.query(
      `CREATE TYPE "ledger_entries_source_type_enum" AS ENUM ('purchase','sale','internal_transfer','payment','expense','salary','advance','bonus','stock_writeoff','opening_balance','salary_withdrawal')`,
    );
    await queryRunner.query(
      `ALTER TABLE "ledger_entries" ALTER COLUMN "source_type" TYPE "ledger_entries_source_type_enum" USING "source_type"::"ledger_entries_source_type_enum"`,
    );
    await queryRunner.query(`CREATE TABLE "employee_salary_withdrawals" (
      "created_at" timestamptz NOT NULL DEFAULT now(), "updated_at" timestamptz NOT NULL DEFAULT now(), "deleted_at" timestamptz,
      "created_by" uuid, "updated_by" uuid, "id" uuid NOT NULL DEFAULT uuid_generate_v4(), "employee_id" uuid NOT NULL,
      "amount" numeric(14,2) NOT NULL CHECK ("amount">0), "withdrawal_date" date NOT NULL,
      "payment_method" "salary_runs_payment_method_enum" NOT NULL, "notes" varchar(255),
      CONSTRAINT "PK_employee_salary_withdrawals" PRIMARY KEY ("id"),
      CONSTRAINT "FK_employee_salary_withdrawals_employee" FOREIGN KEY ("employee_id") REFERENCES "employees"("id") ON DELETE RESTRICT)`);
    await queryRunner.query(
      `CREATE INDEX "IDX_employee_salary_withdrawals_employee_date" ON "employee_salary_withdrawals" ("employee_id","withdrawal_date")`,
    );
    await queryRunner.query(`CREATE TABLE "employee_salary_withdrawal_allocations" (
      "created_at" timestamptz NOT NULL DEFAULT now(), "updated_at" timestamptz NOT NULL DEFAULT now(), "deleted_at" timestamptz,
      "created_by" uuid, "updated_by" uuid, "id" uuid NOT NULL DEFAULT uuid_generate_v4(), "withdrawal_id" uuid NOT NULL,
      "salary_run_id" uuid NOT NULL, "amount" numeric(14,2) NOT NULL CHECK ("amount">0),
      CONSTRAINT "PK_employee_salary_withdrawal_allocations" PRIMARY KEY ("id"),
      CONSTRAINT "UQ_salary_withdrawal_allocation" UNIQUE ("withdrawal_id","salary_run_id"),
      CONSTRAINT "FK_salary_withdrawal_allocation_withdrawal" FOREIGN KEY ("withdrawal_id") REFERENCES "employee_salary_withdrawals"("id") ON DELETE CASCADE,
      CONSTRAINT "FK_salary_withdrawal_allocation_run" FOREIGN KEY ("salary_run_id") REFERENCES "salary_runs"("id") ON DELETE RESTRICT)`);
  }
  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `DELETE FROM "ledger_entries" WHERE "source_type"='salary_withdrawal'`,
    );
    await queryRunner.query(
      `DROP TABLE IF EXISTS "employee_salary_withdrawal_allocations"`,
    );
    await queryRunner.query(
      `DROP TABLE IF EXISTS "employee_salary_withdrawals"`,
    );
    await queryRunner.query(
      `ALTER TABLE "salary_runs" DROP COLUMN IF EXISTS "amount_paid"`,
    );
    await queryRunner.query(`DROP TABLE IF EXISTS "party_departments"`);
  }
}
