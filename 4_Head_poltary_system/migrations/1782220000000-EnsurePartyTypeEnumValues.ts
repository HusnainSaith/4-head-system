import { MigrationInterface, QueryRunner } from 'typeorm';

export class EnsurePartyTypeEnumValues1782220000000 implements MigrationInterface {
  name = 'EnsurePartyTypeEnumValues1782220000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      DO $$ BEGIN
        IF EXISTS (SELECT 1 FROM pg_type WHERE typname = 'parties_party_type_enum') THEN
          ALTER TYPE parties_party_type_enum ADD VALUE IF NOT EXISTS 'internal_department';
        ELSIF EXISTS (SELECT 1 FROM pg_type WHERE typname = 'party_type_enum') THEN
          ALTER TYPE party_type_enum ADD VALUE IF NOT EXISTS 'internal_department';
        ELSE
          CREATE TYPE party_type_enum AS ENUM
            ('farm', 'broker', 'shop_owner', 'customer', 'factory', 'internal_department');
        END IF;
      END $$
    `);
  }

  public async down(): Promise<void> {
    // PostgreSQL enum values are retained to preserve stored party data.
  }
}
