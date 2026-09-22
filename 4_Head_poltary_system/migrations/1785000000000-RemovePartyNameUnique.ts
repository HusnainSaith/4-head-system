import { MigrationInterface, QueryRunner } from 'typeorm';

export class RemovePartyNameUnique1785000000000 implements MigrationInterface {
  name = 'RemovePartyNameUnique1785000000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    const constraints = await queryRunner.query(
      `SELECT conname
       FROM pg_constraint
       WHERE conrelid = 'parties'::regclass
         AND contype = 'u'
         AND (
           pg_get_constraintdef(oid) ILIKE '%(name)%'
           OR pg_get_constraintdef(oid) ILIKE '%(user_id)%'
         )`,
    );

    for (const row of constraints) {
      await queryRunner.query(
        `ALTER TABLE "parties" DROP CONSTRAINT IF EXISTS "${row.conname}"`,
      );
    }

    const indexes = await queryRunner.query(
      `SELECT indexname
       FROM pg_indexes
       WHERE tablename = 'parties'
         AND (
           indexname ILIKE '%name%'
           OR indexname ILIKE '%user_id%'
           OR indexdef ILIKE '%(name)%'
           OR indexdef ILIKE '%(user_id)%'
         )`,
    );

    for (const row of indexes) {
      await queryRunner.query(
        `DROP INDEX IF EXISTS "${row.indexname}"`,
      );
    }
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    const hasUniqueNameConstraint = await queryRunner.query(
      `SELECT 1
       FROM pg_constraint
       WHERE conrelid = 'parties'::regclass
         AND contype = 'u'
         AND pg_get_constraintdef(oid) ILIKE '%(name)%'
       LIMIT 1`,
    );

    if (hasUniqueNameConstraint.length === 0) {
      await queryRunner.query(
        `ALTER TABLE "parties" ADD CONSTRAINT "UQ_parties_name" UNIQUE ("name")`,
      );
    }
  }
}
