import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Align the legacy users.password column with the explicit entity mapping.
 * Renaming preserves every existing bcrypt hash, including seeded accounts.
 */
export class RenameUserPasswordColumn1782241000000
  implements MigrationInterface
{
  name = 'RenameUserPasswordColumn1782241000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    if (
      (await queryRunner.hasColumn('users', 'password')) &&
      !(await queryRunner.hasColumn('users', 'password_hash'))
    ) {
      await queryRunner.renameColumn('users', 'password', 'password_hash');
    }
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    if (
      (await queryRunner.hasColumn('users', 'password_hash')) &&
      !(await queryRunner.hasColumn('users', 'password'))
    ) {
      await queryRunner.renameColumn('users', 'password_hash', 'password');
    }
  }
}
