import { MigrationInterface, QueryRunner } from 'typeorm';

export class LinkPersonnelReferencesToUsers1782020000000
  implements MigrationInterface
{
  name = 'LinkPersonnelReferencesToUsers1782020000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      DO $$ BEGIN
        IF to_regclass('public.drivers') IS NOT NULL THEN
          ALTER TABLE drivers ADD COLUMN IF NOT EXISTS user_id uuid;

          IF NOT EXISTS (
            SELECT 1 FROM pg_indexes
            WHERE schemaname = 'public'
              AND indexname = 'idx_drivers_user_id'
          ) THEN
            CREATE INDEX idx_drivers_user_id ON drivers(user_id);
          END IF;

          IF NOT EXISTS (
            SELECT 1 FROM information_schema.table_constraints
            WHERE constraint_name = 'fk_drivers_user'
              AND table_name = 'drivers'
          ) THEN
            ALTER TABLE drivers
            ADD CONSTRAINT fk_drivers_user
            FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL;
          END IF;
        END IF;
      END $$;
    `);

    await queryRunner.query(`
      DO $$ BEGIN
        IF to_regclass('public.expenses') IS NOT NULL THEN
          ALTER TABLE expenses ADD COLUMN IF NOT EXISTS employee_user_id uuid;
          ALTER TABLE expenses ADD COLUMN IF NOT EXISTS approver_user_id uuid;

          IF NOT EXISTS (
            SELECT 1 FROM information_schema.table_constraints
            WHERE constraint_name = 'fk_expenses_employee_user'
              AND table_name = 'expenses'
          ) THEN
            ALTER TABLE expenses
            ADD CONSTRAINT fk_expenses_employee_user
            FOREIGN KEY (employee_user_id) REFERENCES users(id) ON DELETE SET NULL;
          END IF;

          IF NOT EXISTS (
            SELECT 1 FROM information_schema.table_constraints
            WHERE constraint_name = 'fk_expenses_approver_user'
              AND table_name = 'expenses'
          ) THEN
            ALTER TABLE expenses
            ADD CONSTRAINT fk_expenses_approver_user
            FOREIGN KEY (approver_user_id) REFERENCES users(id) ON DELETE SET NULL;
          END IF;
        END IF;
      END $$;
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      DO $$ BEGIN
        IF to_regclass('public.expenses') IS NOT NULL THEN
          ALTER TABLE expenses DROP CONSTRAINT IF EXISTS fk_expenses_approver_user;
          ALTER TABLE expenses DROP CONSTRAINT IF EXISTS fk_expenses_employee_user;
          ALTER TABLE expenses DROP COLUMN IF EXISTS approver_user_id;
          ALTER TABLE expenses DROP COLUMN IF EXISTS employee_user_id;
        END IF;
      END $$;
    `);

    await queryRunner.query(`
      DO $$ BEGIN
        IF to_regclass('public.drivers') IS NOT NULL THEN
          ALTER TABLE drivers DROP CONSTRAINT IF EXISTS fk_drivers_user;
          DROP INDEX IF EXISTS idx_drivers_user_id;
          ALTER TABLE drivers DROP COLUMN IF EXISTS user_id;
        END IF;
      END $$;
    `);
  }
}
