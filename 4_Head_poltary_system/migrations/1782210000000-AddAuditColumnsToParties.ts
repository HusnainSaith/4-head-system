import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddAuditColumnsToParties1782210000000 implements MigrationInterface {
  name = 'AddAuditColumnsToParties1782210000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    const hasPartiesTable = await queryRunner.hasTable('parties');

    if (hasPartiesTable) {
      // Get the list of existing columns
      const columns = await queryRunner.query(`
        SELECT column_name 
        FROM information_schema.columns 
        WHERE table_name = 'parties'
      `);
      
      const columnNames = columns.map((c: any) => c.column_name);

      // Build dynamic ALTER TABLE statement
      const alterStatements = [];
      
      if (!columnNames.includes('created_at')) {
        alterStatements.push('ADD COLUMN created_at TIMESTAMPTZ DEFAULT NOW()');
      }
      if (!columnNames.includes('updated_at')) {
        alterStatements.push('ADD COLUMN updated_at TIMESTAMPTZ DEFAULT NOW()');
      }
      if (!columnNames.includes('deleted_at')) {
        alterStatements.push('ADD COLUMN deleted_at TIMESTAMPTZ');
      }
      if (!columnNames.includes('created_by')) {
        alterStatements.push('ADD COLUMN created_by UUID');
      }
      if (!columnNames.includes('updated_by')) {
        alterStatements.push('ADD COLUMN updated_by UUID');
      }

      // Execute combined ALTER TABLE if there are columns to add
      if (alterStatements.length > 0) {
        await queryRunner.query(`
          ALTER TABLE parties 
          ${alterStatements.join(', ')}
        `);
      }
    }
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // This would remove the columns, but we'll keep them for safety
    // Users can manually clean up if needed
  }
}
