import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddPartnerEmployeePartyTypes1787700000000
  implements MigrationInterface
{
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TYPE parties_party_type_enum ADD VALUE IF NOT EXISTS 'partner'`,
    );
    await queryRunner.query(
      `ALTER TYPE parties_party_type_enum ADD VALUE IF NOT EXISTS 'employee'`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // PostgreSQL does not support removing enum values without recreating the type.
  }
}
