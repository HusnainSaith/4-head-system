import { MigrationInterface, QueryRunner } from 'typeorm';

export class UnifyInvestorAccounts1787300000000 implements MigrationInterface {
  name = 'UnifyInvestorAccounts1787300000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TYPE "investor_capital_transaction_type_enum" ADD VALUE IF NOT EXISTS 'manual_profit'`,
    );
    await queryRunner.query(
      `ALTER TYPE "investor_capital_transaction_type_enum" ADD VALUE IF NOT EXISTS 'manual_loss'`,
    );
    await queryRunner.query(
      `ALTER TYPE "investor_capital_transaction_type_enum" ADD VALUE IF NOT EXISTS 'farm_transfer'`,
    );
    await queryRunner.query(
      `ALTER TABLE "investor_capital_transactions" ALTER COLUMN "payment_method" DROP NOT NULL`,
    );
    await queryRunner.query(
      `ALTER TABLE "investor_capital_transactions" ADD COLUMN "farm_party_id" uuid`,
    );
    await queryRunner.query(
      `ALTER TABLE "investor_capital_transactions" ADD CONSTRAINT "FK_investor_transaction_farm" FOREIGN KEY ("farm_party_id") REFERENCES "parties"("id") ON DELETE RESTRICT`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_investor_transaction_farm" ON "investor_capital_transactions" ("farm_party_id")`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `DELETE FROM "investor_capital_transactions" WHERE "transaction_type"::text IN ('manual_profit','manual_loss','farm_transfer')`,
    );
    await queryRunner.query(`DROP INDEX "IDX_investor_transaction_farm"`);
    await queryRunner.query(
      `ALTER TABLE "investor_capital_transactions" DROP CONSTRAINT "FK_investor_transaction_farm"`,
    );
    await queryRunner.query(
      `ALTER TABLE "investor_capital_transactions" DROP COLUMN "farm_party_id"`,
    );
    await queryRunner.query(
      `ALTER TABLE "investor_capital_transactions" ALTER COLUMN "payment_method" SET NOT NULL`,
    );
  }
}
