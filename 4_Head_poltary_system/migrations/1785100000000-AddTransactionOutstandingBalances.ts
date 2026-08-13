import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddTransactionOutstandingBalances1785100000000 implements MigrationInterface {
  name = 'AddTransactionOutstandingBalances1785100000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    for (const table of [
      'brokerage_purchases',
      'brokerage_sales',
      'wastage_purchases',
      'wastage_sales',
      'shop_sales',
    ]) {
      await queryRunner.query(
        `ALTER TABLE "${table}" ADD COLUMN IF NOT EXISTS "outstanding_amount" numeric(14,2) NOT NULL DEFAULT 0`,
      );
    }

    // Older services posted cash/bank transactions as fully settled but left
    // their amount field at zero. Reconcile those historical rows first.
    await queryRunner.query(
      `UPDATE "brokerage_purchases" SET "amount_paid" = "total_amount" WHERE "payment_method" = 'cash' AND "amount_paid" = 0`,
    );
    await queryRunner.query(
      `UPDATE "brokerage_sales" SET "amount_received" = "total_amount" WHERE "payment_method" = 'cash' AND "amount_received" = 0`,
    );
    await queryRunner.query(
      `UPDATE "wastage_purchases" SET "amount_paid" = "total_amount" WHERE "payment_method" IN ('cash', 'bank') AND "amount_paid" = 0`,
    );
    await queryRunner.query(
      `UPDATE "wastage_sales" SET "amount_received" = "total_amount" WHERE "payment_method" IN ('cash', 'bank') AND "amount_received" = 0`,
    );

    const balances: Array<[string, string]> = [
      ['brokerage_purchases', 'amount_paid'],
      ['brokerage_sales', 'amount_received'],
      ['wastage_purchases', 'amount_paid'],
      ['wastage_sales', 'amount_received'],
      ['shop_sales', 'amount_received'],
    ];
    for (const [table, settledColumn] of balances) {
      await queryRunner.query(
        `UPDATE "${table}" SET "outstanding_amount" = GREATEST("total_amount" - "${settledColumn}", 0)`,
      );
    }
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    for (const table of [
      'shop_sales',
      'wastage_sales',
      'wastage_purchases',
      'brokerage_sales',
      'brokerage_purchases',
    ]) {
      await queryRunner.query(
        `ALTER TABLE "${table}" DROP COLUMN IF EXISTS "outstanding_amount"`,
      );
    }
  }
}
