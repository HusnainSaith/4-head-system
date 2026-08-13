import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddRandomUserPartyType1786700000000 implements MigrationInterface {
  name = 'AddRandomUserPartyType1786700000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      DO $$ BEGIN
        IF EXISTS (SELECT 1 FROM pg_type WHERE typname = 'parties_party_type_enum') THEN
          ALTER TYPE parties_party_type_enum ADD VALUE IF NOT EXISTS 'random_user';
        ELSIF EXISTS (SELECT 1 FROM pg_type WHERE typname = 'party_type_enum') THEN
          ALTER TYPE party_type_enum ADD VALUE IF NOT EXISTS 'random_user';
        END IF;
      END $$
    `);
  }

  public async down(): Promise<void> {
    // PostgreSQL enum values are retained to preserve stored party data.
  }
}