import { MigrationInterface, QueryRunner } from 'typeorm';

export class SynchronizeInvestorPartyBalances1787400000000 implements MigrationInterface {
  name = 'SynchronizeInvestorPartyBalances1787400000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "investor_capital_transactions" DROP CONSTRAINT "CHK_investor_capital_positive"`,
    );
    await queryRunner.query(
      `ALTER TABLE "investor_capital_transactions" ADD CONSTRAINT "CHK_investor_capital_positive" CHECK (amount > 0)`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "investor_capital_transactions" DROP CONSTRAINT "CHK_investor_capital_positive"`,
    );
    await queryRunner.query(
      `ALTER TABLE "investor_capital_transactions" ADD CONSTRAINT "CHK_investor_capital_positive" CHECK (amount > 0 AND balance_before >= 0 AND balance_after >= 0)`,
    );
  }
}
