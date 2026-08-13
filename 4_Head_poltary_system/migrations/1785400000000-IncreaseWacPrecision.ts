import { MigrationInterface, QueryRunner } from 'typeorm';

export class IncreaseWacPrecision1785400000000 implements MigrationInterface {
  name = 'IncreaseWacPrecision1785400000000';

  async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      'ALTER TABLE "stock_balances" ALTER COLUMN "wac" TYPE numeric(16,4)',
    );
    await queryRunner.query(
      'ALTER TABLE "stock_movements" ALTER COLUMN "rate_per_kg" TYPE numeric(16,4)',
    );
    await queryRunner.query(
      'ALTER TABLE "stock_movements" ALTER COLUMN "resulting_wac" TYPE numeric(16,4)',
    );
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      'ALTER TABLE "stock_movements" ALTER COLUMN "resulting_wac" TYPE numeric(14,2)',
    );
    await queryRunner.query(
      'ALTER TABLE "stock_movements" ALTER COLUMN "rate_per_kg" TYPE numeric(14,2)',
    );
    await queryRunner.query(
      'ALTER TABLE "stock_balances" ALTER COLUMN "wac" TYPE numeric(14,2)',
    );
  }
}
