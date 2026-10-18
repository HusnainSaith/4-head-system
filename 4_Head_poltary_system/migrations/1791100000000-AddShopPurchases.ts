import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddShopPurchases1791100000000 implements MigrationInterface {
  async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `CREATE TABLE shop_purchases (LIKE supply_purchases INCLUDING ALL)`,
    );
    await queryRunner.query(
      `ALTER TABLE shop_purchases DROP COLUMN IF EXISTS source_brokerage_sale_id`,
    );
    await queryRunner.query(`ALTER TABLE shop_purchases
      ADD FOREIGN KEY (department_id) REFERENCES departments(id) ON DELETE RESTRICT,
      ADD FOREIGN KEY (party_id) REFERENCES parties(id) ON DELETE RESTRICT,
      ADD FOREIGN KEY (vehicle_id) REFERENCES vehicles(id)`);
  }
  async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query('DROP TABLE shop_purchases');
  }
}
