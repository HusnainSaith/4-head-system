import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddInvestmentAssignments1786900000000 implements MigrationInterface {
  name = 'AddInvestmentAssignments1786900000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TYPE "public"."parties_party_type_enum" ADD VALUE IF NOT EXISTS 'investor'`,
    );
    await queryRunner.query(
      `ALTER TYPE "public"."ledger_entries_source_type_enum" ADD VALUE IF NOT EXISTS 'investment'`,
    );
    await queryRunner.query(
      `ALTER TABLE "brokerage_purchases" ADD COLUMN "financed_amount" numeric(14,2) NOT NULL DEFAULT 0`,
    );
    await queryRunner.query(
      `CREATE TYPE "public"."investment_assignments_assignment_type_enum" AS ENUM ('farm_settlement','investment')`,
    );
    await queryRunner.query(
      `CREATE TYPE "public"."investment_assignments_outcome_enum" AS ENUM ('profit','loss')`,
    );
    await queryRunner.query(
      `CREATE TYPE "public"."investment_assignments_status_enum" AS ENUM ('active','settled','cancelled')`,
    );
    await queryRunner.query(`CREATE TABLE "investment_assignments" (
      "created_at" timestamptz NOT NULL DEFAULT now(), "updated_at" timestamptz NOT NULL DEFAULT now(),
      "deleted_at" timestamptz, "created_by" uuid, "updated_by" uuid,
      "id" uuid NOT NULL DEFAULT uuid_generate_v4(), "department_id" uuid NOT NULL,
      "purchase_id" uuid NOT NULL, "farm_party_id" uuid NOT NULL, "investor_party_id" uuid NOT NULL,
      "assignment_type" "public"."investment_assignments_assignment_type_enum" NOT NULL,
      "outcome" "public"."investment_assignments_outcome_enum" NOT NULL DEFAULT 'profit',
      "principal_amount" numeric(14,2) NOT NULL, "return_rate" numeric(7,4) NOT NULL,
      "return_amount" numeric(14,2) NOT NULL, "total_payable" numeric(14,2) NOT NULL,
      "amount_paid" numeric(14,2) NOT NULL DEFAULT 0, "outstanding_amount" numeric(14,2) NOT NULL,
      "assignment_date" date NOT NULL, "external_reference" varchar(100), "notes" varchar(500),
      "status" "public"."investment_assignments_status_enum" NOT NULL DEFAULT 'active',
      "cancelled_at" timestamptz, "cancelled_by" uuid, "cancellation_reason" varchar(500),
      CONSTRAINT "PK_investment_assignments" PRIMARY KEY ("id"),
      CONSTRAINT "CHK_investment_principal_positive" CHECK (principal_amount > 0),
      CONSTRAINT "CHK_investment_rate" CHECK (return_rate >= 0 AND return_rate <= 100),
      CONSTRAINT "CHK_investment_amounts" CHECK (return_amount >= 0 AND total_payable >= 0 AND amount_paid >= 0 AND outstanding_amount >= 0),
      CONSTRAINT "FK_investment_department" FOREIGN KEY ("department_id") REFERENCES "departments"("id") ON DELETE RESTRICT,
      CONSTRAINT "FK_investment_purchase" FOREIGN KEY ("purchase_id") REFERENCES "brokerage_purchases"("id") ON DELETE RESTRICT,
      CONSTRAINT "FK_investment_farm" FOREIGN KEY ("farm_party_id") REFERENCES "parties"("id") ON DELETE RESTRICT,
      CONSTRAINT "FK_investment_investor" FOREIGN KEY ("investor_party_id") REFERENCES "parties"("id") ON DELETE RESTRICT
    )`);
    await queryRunner.query(
      `CREATE UNIQUE INDEX "UQ_investment_active_purchase" ON "investment_assignments" ("purchase_id") WHERE status <> 'cancelled' AND deleted_at IS NULL`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_investment_investor_status" ON "investment_assignments" ("investor_party_id", "status")`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_investment_assignment_date" ON "investment_assignments" ("assignment_date")`,
    );
    await queryRunner.query(
      `CREATE TYPE "public"."investment_payments_payment_method_enum" AS ENUM ('cash','bank')`,
    );
    await queryRunner.query(`CREATE TABLE "investment_payments" (
      "created_at" timestamptz NOT NULL DEFAULT now(), "updated_at" timestamptz NOT NULL DEFAULT now(),
      "deleted_at" timestamptz, "created_by" uuid, "updated_by" uuid,
      "id" uuid NOT NULL DEFAULT uuid_generate_v4(), "assignment_id" uuid NOT NULL,
      "amount" numeric(14,2) NOT NULL, "payment_method" "public"."investment_payments_payment_method_enum" NOT NULL,
      "payment_date" date NOT NULL, "cash_account_id" uuid, "bank_account_id" uuid,
      "bank_transaction_method" "public"."bank_transaction_method_enum", "cheque_number" varchar,
      "app_reference" varchar, "notes" varchar(255),
      CONSTRAINT "PK_investment_payments" PRIMARY KEY ("id"),
      CONSTRAINT "CHK_investment_payment_positive" CHECK (amount > 0),
      CONSTRAINT "FK_investment_payment_assignment" FOREIGN KEY ("assignment_id") REFERENCES "investment_assignments"("id") ON DELETE RESTRICT,
      CONSTRAINT "FK_investment_payment_cash" FOREIGN KEY ("cash_account_id") REFERENCES "cash_accounts"("id") ON DELETE RESTRICT,
      CONSTRAINT "FK_investment_payment_bank" FOREIGN KEY ("bank_account_id") REFERENCES "bank_accounts"("id") ON DELETE RESTRICT
    )`);
    await queryRunner.query(
      `CREATE INDEX "IDX_investment_payment_assignment" ON "investment_payments" ("assignment_id", "payment_date")`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE "investment_payments"`);
    await queryRunner.query(
      `DROP TYPE "public"."investment_payments_payment_method_enum"`,
    );
    await queryRunner.query(`DROP TABLE "investment_assignments"`);
    await queryRunner.query(
      `DROP TYPE "public"."investment_assignments_status_enum"`,
    );
    await queryRunner.query(
      `DROP TYPE "public"."investment_assignments_outcome_enum"`,
    );
    await queryRunner.query(
      `DROP TYPE "public"."investment_assignments_assignment_type_enum"`,
    );
    await queryRunner.query(
      `ALTER TABLE "brokerage_purchases" DROP COLUMN "financed_amount"`,
    );
    // PostgreSQL enum values are intentionally retained on rollback to avoid unsafe type recreation.
  }
}
