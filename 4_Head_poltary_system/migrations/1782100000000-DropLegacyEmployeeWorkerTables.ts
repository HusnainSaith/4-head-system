import { MigrationInterface } from 'typeorm';

/**
 * Compatibility marker retained for databases that already applied the old
 * migration. The application still maps the employees table, so dropping it
 * would destroy active personnel and payroll relationships.
 */
export class DropLegacyEmployeeWorkerTables1782100000000
  implements MigrationInterface
{
  name = 'DropLegacyEmployeeWorkerTables1782100000000';

  public async up(): Promise<void> {
    // Preserve both legacy and current personnel data.
  }

  public async down(): Promise<void> {
    // No schema change was made.
  }
}
