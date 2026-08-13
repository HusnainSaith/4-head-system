import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddUniqueConstraintToPartiesName1782230000000 implements MigrationInterface {
  name = 'AddUniqueConstraintToPartiesName1782230000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    const hasPartiesTable = await queryRunner.hasTable('parties');

    if (hasPartiesTable) {
      // Check if unique constraint exists
      const result = await queryRunner.query(`
        SELECT constraint_name 
        FROM information_schema.table_constraints 
        WHERE table_name = 'parties' 
        AND constraint_type = 'UNIQUE'
        AND constraint_name LIKE '%name%'
      `);

      if (result.length === 0) {
        // Add unique constraint on name
        await queryRunner.query(`
          ALTER TABLE parties 
          ADD CONSTRAINT uk_parties_name UNIQUE (name)
        `);
      }
    }
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Remove the constraint on rollback
    const hasConstraint = await queryRunner.query(`
      SELECT constraint_name 
      FROM information_schema.table_constraints 
      WHERE table_name = 'parties' 
      AND constraint_name = 'uk_parties_name'
    `);

    if (hasConstraint.length > 0) {
      await queryRunner.query(`
        ALTER TABLE parties 
        DROP CONSTRAINT uk_parties_name
      `);
    }
  }
}
