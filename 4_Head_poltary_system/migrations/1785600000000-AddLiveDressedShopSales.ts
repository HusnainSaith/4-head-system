import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddLiveDressedShopSales1785600000000 implements MigrationInterface {
  name = 'AddLiveDressedShopSales1785600000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TYPE chart_of_accounts_code_enum RENAME TO chart_of_accounts_code_enum_old
    `);
    await queryRunner.query(`
      CREATE TYPE chart_of_accounts_code_enum AS ENUM
        ('cash','bank','accounts_receivable','accounts_payable','revenue','cogs',
         'operating_expense','payroll_expense','employee_advance','inventory')
    `);
    await queryRunner.query(`
      ALTER TABLE chart_of_accounts
      ALTER COLUMN code TYPE chart_of_accounts_code_enum
      USING code::text::chart_of_accounts_code_enum
    `);
    await queryRunner.query(`DROP TYPE chart_of_accounts_code_enum_old`);

    await queryRunner.query(`
      INSERT INTO chart_of_accounts (id, code, name, account_nature)
      VALUES (uuid_generate_v4(), 'inventory', 'Inventory', 'asset')
      ON CONFLICT (code) DO NOTHING
    `);
    await queryRunner.query(`
      INSERT INTO expense_categories
        (id, name, description, category_type, is_active, is_system_generated)
      VALUES
        (uuid_generate_v4(), 'Processing Loss',
         'Automatic live-to-dressed weight processing loss',
         'operational', true, true)
      ON CONFLICT (name) DO UPDATE
      SET is_system_generated = true, is_active = true
    `);

    await queryRunner.query(
      `ALTER TABLE shop_sales ADD COLUMN live_weight_kg numeric(12,3)`,
    );
    await queryRunner.query(
      `ALTER TABLE shop_sales ADD COLUMN dressed_weight_kg numeric(12,3)`,
    );
    await queryRunner.query(
      `ALTER TABLE shop_sales ADD COLUMN wac_at_sale numeric(16,4)`,
    );
    await queryRunner.query(
      `ALTER TABLE shop_sales ADD COLUMN cogs_amount numeric(14,2)`,
    );
    await queryRunner.query(
      `ALTER TABLE shop_sales ADD COLUMN processing_loss_amount numeric(14,2)`,
    );
    await queryRunner.query(
      `ALTER TABLE shop_sales ADD COLUMN gross_profit_amount numeric(14,2)`,
    );
    await queryRunner.query(`
      UPDATE shop_sales
      SET live_weight_kg = quantity_kg,
          dressed_weight_kg = quantity_kg,
          wac_at_sale = GREATEST(rate_per_kg - profit_margin_per_kg, 0),
          cogs_amount = ROUND(quantity_kg * GREATEST(rate_per_kg - profit_margin_per_kg, 0), 2),
          processing_loss_amount = 0,
          gross_profit_amount = total_amount - ROUND(quantity_kg * GREATEST(rate_per_kg - profit_margin_per_kg, 0), 2)
    `);
    for (const column of [
      'live_weight_kg',
      'dressed_weight_kg',
      'wac_at_sale',
      'cogs_amount',
      'processing_loss_amount',
      'gross_profit_amount',
    ]) {
      await queryRunner.query(
        `ALTER TABLE shop_sales ALTER COLUMN ${column} SET NOT NULL`,
      );
    }
    await queryRunner.query(`
      ALTER TABLE shop_sales
      ADD COLUMN shrinkage_kg numeric(12,3)
      GENERATED ALWAYS AS (live_weight_kg - dressed_weight_kg) STORED
    `);
    await queryRunner.query(`
      ALTER TABLE shop_sales
      ADD CONSTRAINT chk_shop_sales_live_weight_positive CHECK (live_weight_kg > 0),
      ADD CONSTRAINT chk_shop_sales_dressed_weight_valid CHECK (dressed_weight_kg > 0 AND dressed_weight_kg <= live_weight_kg),
      ADD CONSTRAINT chk_shop_sales_rate_positive CHECK (rate_per_kg > 0),
      ADD CONSTRAINT chk_shop_sales_amounts_nonnegative CHECK (cogs_amount >= 0 AND processing_loss_amount >= 0)
    `);
    await queryRunner.query(
      `ALTER TABLE shop_sales DROP COLUMN profit_margin_per_kg`,
    );
    await queryRunner.query(`ALTER TABLE shop_sales DROP COLUMN quantity_kg`);

    await queryRunner.query(`
      ALTER TYPE stock_movements_movement_type_enum RENAME TO stock_movements_movement_type_enum_old
    `);
    await queryRunner.query(`
      CREATE TYPE stock_movements_movement_type_enum AS ENUM
        ('purchase_in','sale_out','transfer_in','transfer_out','writeoff_out','opening_stock','processing_loss_out')
    `);
    await queryRunner.query(`
      ALTER TABLE stock_movements
      ALTER COLUMN movement_type TYPE stock_movements_movement_type_enum
      USING movement_type::text::stock_movements_movement_type_enum
    `);
    await queryRunner.query(`DROP TYPE stock_movements_movement_type_enum_old`);

    // A Shop transfer creates inventory; expense recognition happens when sold.
    await queryRunner.query(`
      UPDATE ledger_entries le
      SET account_id = inventory.id
      FROM internal_transfers transfer,
           chart_of_accounts inventory,
           chart_of_accounts cogs
      WHERE inventory.code = 'inventory'
        AND cogs.code = 'cogs'
        AND le.source_type = 'internal_transfer'
        AND le.source_id = transfer.id
        AND le.department_id = transfer.to_department_id
        AND le.account_id = cogs.id
        AND le.entry_type = 'debit'
    `);

    // Preserve reporting for pre-migration Shop sales, whose live and dressed
    // weights are equal and therefore have no processing loss.
    await queryRunner.query(`
      INSERT INTO ledger_entries
        (id, department_id, account_id, entry_type, amount, entry_date,
         source_type, source_id, description, created_by)
      SELECT uuid_generate_v4(), sale.department_id, account.id,
             posting.entry_type::ledger_entries_entry_type_enum,
             sale.cogs_amount, sale.sale_date, 'sale', sale.id,
             'Migrated Shop sale cost recognition', sale.created_by
      FROM shop_sales sale
      CROSS JOIN (VALUES ('cogs', 'debit'), ('inventory', 'credit')) AS posting(code, entry_type)
      JOIN chart_of_accounts account ON account.code::text = posting.code
      WHERE sale.deleted_at IS NULL AND sale.cogs_amount > 0
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `DELETE FROM ledger_entries WHERE description = 'Migrated Shop sale cost recognition'`,
    );
    await queryRunner.query(`
      UPDATE ledger_entries le
      SET account_id = cogs.id
      FROM internal_transfers transfer,
           chart_of_accounts inventory,
           chart_of_accounts cogs
      WHERE inventory.code = 'inventory'
        AND cogs.code = 'cogs'
        AND le.source_type = 'internal_transfer'
        AND le.source_id = transfer.id
        AND le.department_id = transfer.to_department_id
        AND le.account_id = inventory.id
        AND le.entry_type = 'debit'
    `);
    await queryRunner.query(`
      ALTER TYPE stock_movements_movement_type_enum RENAME TO stock_movements_movement_type_enum_new
    `);
    await queryRunner.query(`
      CREATE TYPE stock_movements_movement_type_enum AS ENUM
        ('purchase_in','sale_out','transfer_in','transfer_out','writeoff_out','opening_stock')
    `);
    await queryRunner.query(`
      ALTER TABLE stock_movements
      ALTER COLUMN movement_type TYPE stock_movements_movement_type_enum
      USING movement_type::text::stock_movements_movement_type_enum
    `);
    await queryRunner.query(`DROP TYPE stock_movements_movement_type_enum_new`);

    await queryRunner.query(
      `ALTER TABLE shop_sales ADD COLUMN quantity_kg numeric(12,3)`,
    );
    await queryRunner.query(
      `ALTER TABLE shop_sales ADD COLUMN profit_margin_per_kg numeric(14,2)`,
    );
    await queryRunner.query(`
      UPDATE shop_sales
      SET quantity_kg = dressed_weight_kg,
          profit_margin_per_kg = rate_per_kg - wac_at_sale
    `);
    await queryRunner.query(
      `ALTER TABLE shop_sales ALTER COLUMN quantity_kg SET NOT NULL`,
    );
    await queryRunner.query(
      `ALTER TABLE shop_sales ALTER COLUMN profit_margin_per_kg SET NOT NULL`,
    );
    await queryRunner.query(
      `ALTER TABLE shop_sales DROP CONSTRAINT chk_shop_sales_live_weight_positive`,
    );
    await queryRunner.query(
      `ALTER TABLE shop_sales DROP CONSTRAINT chk_shop_sales_dressed_weight_valid`,
    );
    await queryRunner.query(
      `ALTER TABLE shop_sales DROP CONSTRAINT chk_shop_sales_rate_positive`,
    );
    await queryRunner.query(
      `ALTER TABLE shop_sales DROP CONSTRAINT chk_shop_sales_amounts_nonnegative`,
    );
    for (const column of [
      'shrinkage_kg',
      'gross_profit_amount',
      'processing_loss_amount',
      'cogs_amount',
      'wac_at_sale',
      'dressed_weight_kg',
      'live_weight_kg',
    ]) {
      await queryRunner.query(`ALTER TABLE shop_sales DROP COLUMN ${column}`);
    }
  }
}
