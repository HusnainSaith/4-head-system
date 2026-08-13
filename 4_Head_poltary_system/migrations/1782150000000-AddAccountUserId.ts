import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddAccountUserId1782150000000 implements MigrationInterface {
  name = 'AddAccountUserId1782150000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      DO $$ BEGIN
        IF to_regclass('public.accounts') IS NOT NULL THEN
          ALTER TABLE accounts ADD COLUMN IF NOT EXISTS user_id uuid;

          IF NOT EXISTS (
            SELECT 1 FROM pg_indexes
            WHERE schemaname = 'public'
              AND indexname = 'idx_accounts_user_id'
          ) THEN
            CREATE INDEX idx_accounts_user_id ON accounts(user_id);
          END IF;

          IF NOT EXISTS (
            SELECT 1 FROM information_schema.table_constraints
            WHERE constraint_name = 'fk_accounts_user'
              AND table_name = 'accounts'
          ) THEN
            ALTER TABLE accounts
            ADD CONSTRAINT fk_accounts_user
            FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL;
          END IF;
        END IF;
      END $$;
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      DO $$ BEGIN
        IF to_regclass('public.accounts') IS NOT NULL THEN
          ALTER TABLE accounts DROP CONSTRAINT IF EXISTS fk_accounts_user;
          DROP INDEX IF EXISTS idx_accounts_user_id;
          ALTER TABLE accounts DROP COLUMN IF EXISTS user_id;
        END IF;
      END $$;
    `);
  }
}
