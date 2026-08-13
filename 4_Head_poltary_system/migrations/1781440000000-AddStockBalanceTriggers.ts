import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Removes obsolete synchronization-era triggers. StockBalance now uses
 * quantity_kg/wac and is updated transactionally by InventoryService; the
 * legacy triggers referenced camelCase columns and would double-post stock.
 */
export class AddStockBalanceTriggers1781440000000 implements MigrationInterface {
  name = 'AddStockBalanceTriggers1781440000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    if (await queryRunner.hasTable('stock_movements')) {
      await queryRunner.query(
        'DROP TRIGGER IF EXISTS trigger_update_stock_balance ON stock_movements',
      );
    }
    if (await queryRunner.hasTable('stock_balances')) {
      await queryRunner.query(
        'DROP TRIGGER IF EXISTS trigger_check_minimum_stock ON stock_balances',
      );
    }
    await queryRunner.query(
      'DROP FUNCTION IF EXISTS update_stock_balance_on_movement()',
    );
    await queryRunner.query(
      'DROP FUNCTION IF EXISTS check_minimum_stock_level()',
    );
  }

  public async down(): Promise<void> {
    // Obsolete triggers are intentionally not restored.
  }
}
