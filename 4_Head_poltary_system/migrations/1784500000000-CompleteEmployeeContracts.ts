import { MigrationInterface, QueryRunner } from 'typeorm';

export class CompleteEmployeeContracts1784500000000 implements MigrationInterface {
  name = 'CompleteEmployeeContracts1784500000000';
  async up(q: QueryRunner): Promise<void> {
    await q.query(`ALTER TABLE "employees" ADD COLUMN IF NOT EXISTS "full_name" varchar(200)`);
    await q.query(`ALTER TABLE "employees" ADD COLUMN IF NOT EXISTS "designation" varchar(120)`);
    await q.query(`ALTER TABLE "employees" ADD COLUMN IF NOT EXISTS "phone" varchar(50)`);
    await q.query(`ALTER TABLE "employees" ADD COLUMN IF NOT EXISTS "cnic_or_id_number" varchar(100)`);
    await q.query(`ALTER TABLE "employees" ADD COLUMN IF NOT EXISTS "base_salary" numeric(14,2)`);
    await q.query(`ALTER TABLE "employees" ADD COLUMN IF NOT EXISTS "joining_date" date`);
    await q.query(`UPDATE "employees" SET "full_name"=trim(concat_ws(' ',"first_name","last_name")), "designation"=COALESCE("designation",'Employee'), "base_salary"=COALESCE("monthly_salary",0), "joining_date"=COALESCE("join_date",CURRENT_DATE) WHERE "full_name" IS NULL OR "designation" IS NULL OR "base_salary" IS NULL OR "joining_date" IS NULL`);
    await q.query(`ALTER TABLE "employees" ALTER COLUMN "full_name" SET NOT NULL`);
    await q.query(`ALTER TABLE "employees" ALTER COLUMN "designation" SET NOT NULL`);
    await q.query(`ALTER TABLE "employees" ALTER COLUMN "base_salary" SET NOT NULL`);
    await q.query(`ALTER TABLE "employees" ALTER COLUMN "joining_date" SET NOT NULL`);
    await q.query(`ALTER TABLE "employees" ALTER COLUMN "first_name" DROP NOT NULL`);
    await q.query(`ALTER TABLE "employees" ALTER COLUMN "last_name" DROP NOT NULL`);
  }
  async down(): Promise<void> {}
}
