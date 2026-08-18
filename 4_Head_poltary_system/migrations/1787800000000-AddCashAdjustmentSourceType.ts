import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddCashAdjustmentSourceType1787800000000
  implements MigrationInterface
{
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TYPE ledger_entries_source_type_enum ADD VALUE IF NOT EXISTS 'cash_adjustment'`,
    );
  }

  public async down(_queryRunner: QueryRunner): Promise<void> {
    // PostgreSQL does not support removing enum values without recreating the type.
  }
}
