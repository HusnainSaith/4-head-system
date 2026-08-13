import { MigrationInterface, QueryRunner } from 'typeorm';

export class FinancialIntegrityAndAudit1786400000000
  implements MigrationInterface
{
  name = 'FinancialIntegrityAndAudit1786400000000';

  async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "stock_balances"
        ADD COLUMN IF NOT EXISTS "updated_at" timestamptz NOT NULL DEFAULT now(),
        ADD COLUMN IF NOT EXISTS "updated_by" uuid NULL;
      ALTER TABLE "party_payments"
        ADD COLUMN IF NOT EXISTS "updated_at" timestamptz NOT NULL DEFAULT now(),
        ADD COLUMN IF NOT EXISTS "deleted_at" timestamptz NULL,
        ADD COLUMN IF NOT EXISTS "created_by" uuid NULL,
        ADD COLUMN IF NOT EXISTS "updated_by" uuid NULL;
    `);

    const checks: Array<[string, string, string]> = [
      ['brokerage_purchases', 'chk_brokerage_purchases_financial_values', 'quantity_kg > 0 AND rate_per_kg > 0 AND total_amount > 0 AND amount_paid >= 0 AND amount_paid <= total_amount'],
      ['brokerage_sales', 'chk_brokerage_sales_financial_values', 'quantity_kg > 0 AND rate_per_kg > 0 AND total_amount > 0 AND amount_received >= 0 AND amount_received <= total_amount'],
      ['supply_purchases', 'chk_supply_purchases_financial_values', 'quantity_kg > 0 AND rate_per_kg > 0 AND total_amount > 0 AND amount_paid >= 0 AND amount_paid <= total_amount'],
      ['supply_sales', 'chk_supply_sales_financial_values', 'quantity_kg > 0 AND rate_per_kg > 0 AND total_amount > 0 AND amount_received >= 0 AND amount_received <= total_amount'],
      ['wastage_purchases', 'chk_wastage_purchases_financial_values', 'quantity_kg > 0 AND rate_per_kg > 0 AND total_amount > 0 AND amount_paid >= 0 AND amount_paid <= total_amount'],
      ['wastage_sales', 'chk_wastage_sales_financial_values', 'quantity_kg > 0 AND rate_per_kg > 0 AND total_amount > 0 AND amount_received >= 0 AND amount_received <= total_amount'],
      ['shop_sales', 'chk_shop_sales_financial_values', 'quantity_kg > 0 AND rate_per_kg > 0 AND total_amount > 0 AND amount_received >= 0 AND amount_received <= total_amount'],
      ['internal_transfers', 'chk_internal_transfers_financial_values', 'quantity_kg > 0 AND internal_rate_per_kg > 0 AND total_amount > 0 AND amount_settled >= 0 AND amount_settled <= total_amount'],
      ['stock_writeoffs', 'chk_stock_writeoffs_financial_values', 'quantity_kg > 0 AND valuation_amount >= 0'],
      ['stock_movements', 'chk_stock_movements_financial_values', 'quantity_kg > 0 AND rate_per_kg >= 0'],
      ['party_payments', 'chk_party_payments_amount_positive', 'amount > 0'],
      ['expenses', 'chk_expenses_amount_positive', 'amount > 0'],
    ];

    for (const [table, name, condition] of checks) {
      const [{ count }] = await queryRunner.query(
        `SELECT count(*)::int AS count FROM "${table}" WHERE NOT (${condition})`,
      );
      if (Number(count) > 0) {
        throw new Error(
          `Cannot add ${name}: ${count} existing row(s) in ${table} violate ${condition}`,
        );
      }
      await queryRunner.query(
        `ALTER TABLE "${table}" ADD CONSTRAINT "${name}" CHECK (${condition})`,
      );
    }

    const financialFks: Array<[string, string, string, string]> = [
      ['brokerage_purchases', 'department_id', 'departments', 'id'],
      ['brokerage_purchases', 'party_id', 'parties', 'id'],
      ['brokerage_sales', 'department_id', 'departments', 'id'],
      ['brokerage_sales', 'party_id', 'parties', 'id'],
      ['supply_purchases', 'department_id', 'departments', 'id'],
      ['supply_purchases', 'party_id', 'parties', 'id'],
      ['supply_sales', 'department_id', 'departments', 'id'],
      ['supply_sales', 'party_id', 'parties', 'id'],
      ['wastage_purchases', 'department_id', 'departments', 'id'],
      ['wastage_purchases', 'party_id', 'parties', 'id'],
      ['wastage_sales', 'department_id', 'departments', 'id'],
      ['wastage_sales', 'party_id', 'parties', 'id'],
      ['shop_sales', 'department_id', 'departments', 'id'],
      ['shop_sales', 'customer_party_id', 'parties', 'id'],
      ['internal_transfers', 'from_department_id', 'departments', 'id'],
      ['internal_transfers', 'to_department_id', 'departments', 'id'],
      ['stock_writeoffs', 'department_id', 'departments', 'id'],
      ['stock_movements', 'department_id', 'departments', 'id'],
      ['ledger_entries', 'department_id', 'departments', 'id'],
      ['ledger_entries', 'party_id', 'parties', 'id'],
      ['expenses', 'department_id', 'departments', 'id'],
      ['party_payments', 'department_id', 'departments', 'id'],
      ['party_payments', 'party_id', 'parties', 'id'],
    ];
    for (const [table, column, target, targetColumn] of financialFks) {
      await queryRunner.query(`DO $$ DECLARE fk record; BEGIN
        FOR fk IN
          SELECT c.conname FROM pg_constraint c
          JOIN pg_attribute a ON a.attrelid = c.conrelid AND a.attnum = ANY(c.conkey)
          WHERE c.contype = 'f' AND c.conrelid = '${table}'::regclass AND a.attname = '${column}'
        LOOP EXECUTE format('ALTER TABLE ${table} DROP CONSTRAINT %I', fk.conname); END LOOP;
        ALTER TABLE "${table}" ADD CONSTRAINT "fk_${table}_${column}_restrict"
          FOREIGN KEY ("${column}") REFERENCES "${target}"("${targetColumn}") ON DELETE RESTRICT;
      END $$`);
    }
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    const checks = [
      'chk_brokerage_purchases_financial_values','chk_brokerage_sales_financial_values',
      'chk_supply_purchases_financial_values','chk_supply_sales_financial_values',
      'chk_wastage_purchases_financial_values','chk_wastage_sales_financial_values',
      'chk_shop_sales_financial_values','chk_internal_transfers_financial_values',
      'chk_stock_writeoffs_financial_values','chk_stock_movements_financial_values',
      'chk_party_payments_amount_positive','chk_expenses_amount_positive',
    ];
    for (const name of checks) {
      await queryRunner.query(`DO $$ DECLARE t text; BEGIN SELECT conrelid::regclass::text INTO t FROM pg_constraint WHERE conname='${name}'; IF t IS NOT NULL THEN EXECUTE format('ALTER TABLE %s DROP CONSTRAINT %I', t, '${name}'); END IF; END $$`);
    }
    await queryRunner.query(`ALTER TABLE "stock_balances" DROP COLUMN IF EXISTS "updated_by", DROP COLUMN IF EXISTS "updated_at"`);
    await queryRunner.query(`ALTER TABLE "party_payments" DROP COLUMN IF EXISTS "updated_by", DROP COLUMN IF EXISTS "created_by", DROP COLUMN IF EXISTS "deleted_at", DROP COLUMN IF EXISTS "updated_at"`);
  }
}
