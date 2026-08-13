import { MigrationInterface, QueryRunner } from 'typeorm';

export class StripUserExtraFieldsAndAddAccountId1782160000000 implements MigrationInterface {
  name = 'StripUserExtraFieldsAndAddAccountId1782160000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      DO $$ BEGIN
        IF to_regclass('public.users') IS NOT NULL THEN
          -- Add account_id column
          ALTER TABLE users ADD COLUMN IF NOT EXISTS account_id uuid;

          IF to_regclass('public.accounts') IS NOT NULL AND NOT EXISTS (
            SELECT 1 FROM pg_indexes
            WHERE schemaname = 'public'
              AND indexname = 'idx_users_account_id'
          ) THEN
            CREATE INDEX idx_users_account_id ON users(account_id);
          END IF;

          IF to_regclass('public.accounts') IS NOT NULL AND NOT EXISTS (
            SELECT 1 FROM information_schema.table_constraints
            WHERE constraint_name = 'fk_users_account'
              AND table_name = 'users'
          ) THEN
            ALTER TABLE users
            ADD CONSTRAINT fk_users_account
            FOREIGN KEY (account_id) REFERENCES accounts(id) ON DELETE SET NULL;
          END IF;

          -- Drop deprecated personnel columns
          ALTER TABLE users
            DROP COLUMN IF EXISTS employee_id,
            DROP COLUMN IF EXISTS designation,
            DROP COLUMN IF EXISTS joining_date,
            DROP COLUMN IF EXISTS resignation_date,
            DROP COLUMN IF EXISTS employment_type,
            DROP COLUMN IF EXISTS monthly_salary,
            DROP COLUMN IF EXISTS daily_wage,
            DROP COLUMN IF EXISTS bank_account_name,
            DROP COLUMN IF EXISTS bank_account_number,
            DROP COLUMN IF EXISTS bank_name,
            DROP COLUMN IF EXISTS bank_branch,
            DROP COLUMN IF EXISTS bank_ifsc_code,
            DROP COLUMN IF EXISTS street,
            DROP COLUMN IF EXISTS city,
            DROP COLUMN IF EXISTS state,
            DROP COLUMN IF EXISTS postal_code,
            DROP COLUMN IF EXISTS country,
            DROP COLUMN IF EXISTS emergency_contact_name,
            DROP COLUMN IF EXISTS emergency_contact_phone,
            DROP COLUMN IF EXISTS emergency_contact_relation,
            DROP COLUMN IF EXISTS national_id_number,
            DROP COLUMN IF EXISTS date_of_birth,
            DROP COLUMN IF EXISTS blood_group,
            DROP COLUMN IF EXISTS gender,
            DROP COLUMN IF EXISTS profile_picture;
        END IF;
      END $$;
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      DO $$ BEGIN
        IF to_regclass('public.users') IS NOT NULL THEN
          ALTER TABLE users DROP CONSTRAINT IF EXISTS fk_users_account;
          DROP INDEX IF EXISTS idx_users_account_id;
          ALTER TABLE users DROP COLUMN IF EXISTS account_id;

          -- Recreate dropped columns with conservative types (nullable)
          ALTER TABLE users
            ADD COLUMN IF NOT EXISTS employee_id VARCHAR(50),
            ADD COLUMN IF NOT EXISTS designation VARCHAR(100),
            ADD COLUMN IF NOT EXISTS joining_date DATE,
            ADD COLUMN IF NOT EXISTS resignation_date DATE,
            ADD COLUMN IF NOT EXISTS employment_type VARCHAR(20),
            ADD COLUMN IF NOT EXISTS monthly_salary DECIMAL(10,2),
            ADD COLUMN IF NOT EXISTS daily_wage DECIMAL(8,2),
            ADD COLUMN IF NOT EXISTS bank_account_name VARCHAR(100),
            ADD COLUMN IF NOT EXISTS bank_account_number VARCHAR(50),
            ADD COLUMN IF NOT EXISTS bank_name VARCHAR(100),
            ADD COLUMN IF NOT EXISTS bank_branch VARCHAR(100),
            ADD COLUMN IF NOT EXISTS bank_ifsc_code VARCHAR(20),
            ADD COLUMN IF NOT EXISTS street TEXT,
            ADD COLUMN IF NOT EXISTS city VARCHAR(100),
            ADD COLUMN IF NOT EXISTS state VARCHAR(100),
            ADD COLUMN IF NOT EXISTS postal_code VARCHAR(20),
            ADD COLUMN IF NOT EXISTS country VARCHAR(100),
            ADD COLUMN IF NOT EXISTS emergency_contact_name VARCHAR(100),
            ADD COLUMN IF NOT EXISTS emergency_contact_phone VARCHAR(20),
            ADD COLUMN IF NOT EXISTS emergency_contact_relation VARCHAR(50),
            ADD COLUMN IF NOT EXISTS national_id_number VARCHAR(50),
            ADD COLUMN IF NOT EXISTS date_of_birth DATE,
            ADD COLUMN IF NOT EXISTS blood_group VARCHAR(10),
            ADD COLUMN IF NOT EXISTS gender VARCHAR(20),
            ADD COLUMN IF NOT EXISTS profile_picture TEXT;
        END IF;
      END $$;
    `);
  }
}
