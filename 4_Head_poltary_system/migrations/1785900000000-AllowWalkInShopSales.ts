import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Walk-in Shop sales intentionally have no customer party. Keep the database
 * constraint aligned with the nullable DTO/entity contract.
 */
export class AllowWalkInShopSales1785900000000 implements MigrationInterface {
  name = 'AllowWalkInShopSales1785900000000';

  async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "shop_sales" ALTER COLUMN "customer_party_id" DROP NOT NULL`,
    );
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    const nullRows: Array<{ count: string }> = await queryRunner.query(
      `SELECT COUNT(*)::text AS count FROM "shop_sales" WHERE "customer_party_id" IS NULL`,
    );
    if (Number(nullRows[0]?.count ?? 0) > 0) {
      throw new Error(
        'Cannot restore NOT NULL while walk-in Shop sales exist; assign customer parties first',
      );
    }
    await queryRunner.query(
      `ALTER TABLE "shop_sales" ALTER COLUMN "customer_party_id" SET NOT NULL`,
    );
  }
}
