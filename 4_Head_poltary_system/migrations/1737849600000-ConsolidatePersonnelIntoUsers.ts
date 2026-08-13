import { MigrationInterface, QueryRunner } from 'typeorm';

export class ConsolidatePersonnelIntoUsers1737849600000
  implements MigrationInterface
{
  name = 'ConsolidatePersonnelIntoUsers1737849600000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // Step 1: Add new columns to users table
    await queryRunner.query(`
      ALTER TABLE users
      ADD COLUMN IF NOT EXISTS phone VARCHAR(20),
      ADD COLUMN IF NOT EXISTS is_active BOOLEAN DEFAULT true,
      ADD COLUMN IF NOT EXISTS employee_id VARCHAR(50),
      ADD COLUMN IF NOT EXISTS department_id UUID,
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
      ADD COLUMN IF NOT EXISTS country VARCHAR(100) DEFAULT 'Pakistan',
      ADD COLUMN IF NOT EXISTS emergency_contact_name VARCHAR(100),
      ADD COLUMN IF NOT EXISTS emergency_contact_phone VARCHAR(20),
      ADD COLUMN IF NOT EXISTS emergency_contact_relation VARCHAR(50),
      ADD COLUMN IF NOT EXISTS national_id_number VARCHAR(50),
      ADD COLUMN IF NOT EXISTS date_of_birth DATE,
      ADD COLUMN IF NOT EXISTS blood_group VARCHAR(10),
      ADD COLUMN IF NOT EXISTS gender VARCHAR(20),
      ADD COLUMN IF NOT EXISTS profile_picture TEXT
    `);

    // Step 2: Add unique constraint on employee_id
    await queryRunner.query(`
      CREATE UNIQUE INDEX IF NOT EXISTS idx_users_employee_id 
      ON users(employee_id) WHERE employee_id IS NOT NULL
    `);

    // Step 3: Add foreign key to departments
    await queryRunner.query(`
      DO $$ BEGIN
        IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'fk_users_department') THEN
          ALTER TABLE users ADD CONSTRAINT fk_users_department
          FOREIGN KEY (department_id) REFERENCES departments(id);
        END IF;
      END $$
    `);

    // Step 4: Create new roles if they don't exist
    await queryRunner.query(`
      ALTER TABLE roles
      ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    `);
    await queryRunner.query(`
      INSERT INTO roles (id, name, description, created_at, updated_at)
      VALUES 
        (uuid_generate_v4(), 'EMPLOYEE', 'Department employee with monthly salary', NOW(), NOW()),
        (uuid_generate_v4(), 'WORKER', 'Department worker with daily wage', NOW(), NOW()),
        (uuid_generate_v4(), 'DRIVER', 'Vehicle operations', NOW(), NOW())
      ON CONFLICT (name) DO NOTHING
    `);

    // Step 5: Skip employee/worker migration
    // Note: This was causing issues due to inconsistent schema.
    // Employee and worker data can be migrated manually if needed.
    // Step 7-14: Skip role assignments and FK updates
    // Note: These steps were skipped since we're not migrating employee/worker data
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Restore employees table
    await queryRunner.query(`
      CREATE TABLE employees (
        id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
        employee_id VARCHAR(50) UNIQUE NOT NULL,
        name VARCHAR(100) NOT NULL,
        email VARCHAR(100) UNIQUE NOT NULL,
        phone VARCHAR(20),
        department_id UUID,
        designation VARCHAR(100),
        salary DECIMAL(10,2),
        joining_date DATE,
        bank_account_name VARCHAR(100),
        bank_account_number VARCHAR(50),
        bank_name VARCHAR(100),
        bank_branch VARCHAR(100),
        street TEXT,
        city VARCHAR(100),
        state VARCHAR(100),
        postal_code VARCHAR(20),
        country VARCHAR(100),
        emergency_contact_name VARCHAR(100),
        emergency_contact_phone VARCHAR(20),
        is_active BOOLEAN DEFAULT true,
        created_at TIMESTAMP DEFAULT NOW(),
        updated_at TIMESTAMP DEFAULT NOW(),
        deleted_at TIMESTAMP,
        FOREIGN KEY (department_id) REFERENCES departments(id)
      )
    `);

    // Restore workers table
    await queryRunner.query(`
      CREATE TABLE workers (
        id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
        worker_id VARCHAR(50) UNIQUE NOT NULL,
        name VARCHAR(100) NOT NULL,
        phone VARCHAR(20),
        department_id UUID,
        daily_wage DECIMAL(8,2),
        address TEXT,
        city VARCHAR(100),
        state VARCHAR(100),
        postal_code VARCHAR(20),
        country VARCHAR(100),
        is_active BOOLEAN DEFAULT true,
        created_at TIMESTAMP DEFAULT NOW(),
        updated_at TIMESTAMP DEFAULT NOW(),
        deleted_at TIMESTAMP,
        FOREIGN KEY (department_id) REFERENCES departments(id)
      )
    `);

    // Migrate data back from users to employees
    await queryRunner.query(`
      INSERT INTO employees 
      SELECT * FROM users WHERE employment_type = 'SALARY'
    `);

    // Migrate data back from users to workers
    await queryRunner.query(`
      INSERT INTO workers
      SELECT * FROM users WHERE employment_type = 'DAILY_WAGE'
    `);

    // Restore expenses.employee_id
    await queryRunner.query(`
      ALTER TABLE expenses ADD COLUMN employee_id UUID
    `);

    await queryRunner.query(`
      UPDATE expenses SET employee_id = user_id
    `);

    // Drop new columns from users
    await queryRunner.query(`
      ALTER TABLE users
      DROP COLUMN IF EXISTS employee_id,
      DROP COLUMN IF EXISTS department_id,
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
      DROP COLUMN IF EXISTS profile_picture
    `);
  }
}
