import { MigrationInterface, QueryRunner } from 'typeorm';

export class AlterDepartmentsTable1782200000000 implements MigrationInterface {
  name = 'AlterDepartmentsTable1782200000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // Check if departments table exists
    const hasDepartmentsTable = await queryRunner.hasTable('departments');
    
    if (!hasDepartmentsTable) {
      // Create departments table if it doesn't exist
      await queryRunner.query(`
        CREATE TABLE departments (
          id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
          name VARCHAR(100) UNIQUE NOT NULL,
          description TEXT,
          type VARCHAR(255) NOT NULL,
          head_name VARCHAR(100),
          cost_center VARCHAR(50),
          is_active BOOLEAN DEFAULT true NOT NULL,
          created_at TIMESTAMPTZ DEFAULT NOW(),
          updated_at TIMESTAMPTZ DEFAULT NOW(),
          deleted_at TIMESTAMPTZ
        )
      `);
    } else {
      // Get the list of existing columns
      const columns = await queryRunner.query(`
        SELECT column_name 
        FROM information_schema.columns 
        WHERE table_name = 'departments'
      `);
      
      const columnNames = columns.map((c: any) => c.column_name);

      // Build dynamic ALTER TABLE statement
      const alterStatements = [];
      
      if (!columnNames.includes('description')) {
        alterStatements.push('ADD COLUMN description TEXT');
      }
      if (!columnNames.includes('type')) {
        alterStatements.push('ADD COLUMN type VARCHAR(255)');
      }
      if (!columnNames.includes('head_name')) {
        alterStatements.push('ADD COLUMN head_name VARCHAR(100)');
      }
      if (!columnNames.includes('cost_center')) {
        alterStatements.push('ADD COLUMN cost_center VARCHAR(50)');
      }
      if (!columnNames.includes('is_active')) {
        alterStatements.push('ADD COLUMN is_active BOOLEAN DEFAULT true NOT NULL');
      }
      if (!columnNames.includes('updated_at')) {
        alterStatements.push('ADD COLUMN updated_at TIMESTAMPTZ DEFAULT NOW()');
      }
      if (!columnNames.includes('deleted_at')) {
        alterStatements.push('ADD COLUMN deleted_at TIMESTAMPTZ');
      }

      // Execute combined ALTER TABLE if there are columns to add
      if (alterStatements.length > 0) {
        await queryRunner.query(`
          ALTER TABLE departments 
          ${alterStatements.join(', ')}
        `);
      }

      // Update NULL type values to BROKERAGE (default)
      await queryRunner.query(`
        UPDATE departments SET type = 'BROKERAGE' WHERE type IS NULL
      `);

      // Set NOT NULL constraint on type if needed
      if (columnNames.includes('type')) {
        await queryRunner.query(`
          ALTER TABLE departments
          ALTER COLUMN type SET NOT NULL
        `);
      }

      // Drop old code column if it exists
      if (columnNames.includes('code')) {
        await queryRunner.query(`
          ALTER TABLE departments DROP COLUMN code
        `);
      }
    }
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Drop departments table on rollback
    await queryRunner.query(`DROP TABLE IF EXISTS departments CASCADE`);
  }
}


