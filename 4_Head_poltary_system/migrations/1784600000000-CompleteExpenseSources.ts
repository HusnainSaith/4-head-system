import { MigrationInterface, QueryRunner } from 'typeorm';
export class CompleteExpenseSources1784600000000 implements MigrationInterface {
  name='CompleteExpenseSources1784600000000';
  async up(q:QueryRunner):Promise<void>{
    await q.query(`ALTER TABLE "expenses" ADD COLUMN IF NOT EXISTS "source_type" varchar(40) NOT NULL DEFAULT 'manual'`);
    await q.query(`ALTER TABLE "expenses" ADD COLUMN IF NOT EXISTS "source_id" uuid`);
    await q.query(`CREATE INDEX IF NOT EXISTS "IDX_expenses_source" ON "expenses" ("source_type","source_id")`);
  }
  async down():Promise<void>{}
}
