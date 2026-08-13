import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddExpenseAllocations1786600000000 implements MigrationInterface {
  name = 'AddExpenseAllocations1786600000000';
  async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`CREATE TYPE "expense_allocations_method_enum" AS ENUM ('equal','percentage','manual')`);
    await queryRunner.query(`CREATE TABLE "expense_allocations" (
      "created_at" timestamptz NOT NULL DEFAULT now(), "updated_at" timestamptz NOT NULL DEFAULT now(), "deleted_at" timestamptz,
      "created_by" uuid, "updated_by" uuid, "id" uuid PRIMARY KEY DEFAULT uuid_generate_v4(), "category_id" uuid NOT NULL,
      "total_amount" numeric(14,2) NOT NULL CHECK (total_amount > 0), "allocation_method" "expense_allocations_method_enum" NOT NULL,
      "expense_date" date NOT NULL, "description" varchar(255),
      CONSTRAINT "fk_expense_allocations_category_restrict" FOREIGN KEY (category_id) REFERENCES expense_categories(id) ON DELETE RESTRICT)`);
    await queryRunner.query(`CREATE TABLE "expense_allocation_splits" (
      "created_at" timestamptz NOT NULL DEFAULT now(), "updated_at" timestamptz NOT NULL DEFAULT now(), "deleted_at" timestamptz,
      "created_by" uuid, "updated_by" uuid, "id" uuid PRIMARY KEY DEFAULT uuid_generate_v4(), "allocation_id" uuid NOT NULL,
      "department_id" uuid NOT NULL, "split_amount" numeric(14,2) NOT NULL CHECK (split_amount > 0),
      CONSTRAINT "uq_expense_allocation_department" UNIQUE (allocation_id, department_id),
      CONSTRAINT "fk_expense_splits_allocation_restrict" FOREIGN KEY (allocation_id) REFERENCES expense_allocations(id) ON DELETE RESTRICT,
      CONSTRAINT "fk_expense_splits_department_restrict" FOREIGN KEY (department_id) REFERENCES departments(id) ON DELETE RESTRICT)`);
  }
  async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE IF EXISTS "expense_allocation_splits"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "expense_allocations"`);
    await queryRunner.query(`DROP TYPE IF EXISTS "expense_allocations_method_enum"`);
  }
}
