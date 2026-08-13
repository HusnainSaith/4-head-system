import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddMissingTransactionTables1781900000000
  implements MigrationInterface
{
  name = 'AddMissingTransactionTables1781900000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // transfers table
    await queryRunner.query(`
      DO $$ BEGIN
        IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'transfer_status_enum') THEN
          CREATE TYPE transfer_status_enum AS ENUM ('DRAFT','SUBMITTED','APPROVED','DISPATCHED','RECEIVED','CANCELLED');
        END IF;
      END $$;
    `);
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS transfers (
        id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
        voucher_number varchar NOT NULL UNIQUE,
        source_department_id uuid NOT NULL,
        destination_department_id uuid NOT NULL,
        product_id uuid NOT NULL,
        quantity numeric(12,2) NOT NULL,
        transfer_rate numeric(12,2) NOT NULL,
        transfer_value numeric(14,2) NOT NULL,
        transfer_date date NOT NULL,
        vehicle_id uuid NULL,
        driver_user_id uuid NULL,
        status transfer_status_enum NOT NULL DEFAULT 'DRAFT',
        dispatched_at timestamp NULL,
        received_at timestamp NULL,
        approver_user_id varchar NULL,
        receiver_user_id varchar NULL,
        reason varchar NULL,
        notes varchar NULL,
        created_at timestamp NOT NULL DEFAULT now(),
        updated_at timestamp NOT NULL DEFAULT now(),
        deleted_at timestamp NULL,
        CONSTRAINT fk_transfer_src_dept FOREIGN KEY (source_department_id) REFERENCES departments(id),
        CONSTRAINT fk_transfer_dst_dept FOREIGN KEY (destination_department_id) REFERENCES departments(id),
        CONSTRAINT fk_transfer_product FOREIGN KEY (product_id) REFERENCES products(id)
      )
    `);

    // credit_notes table
    await queryRunner.query(`
      DO $$ BEGIN
        IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'credit_note_type_enum') THEN
          CREATE TYPE credit_note_type_enum AS ENUM ('SALES_RETURN','PRICE_ADJUSTMENT','DISCOUNT','OTHER');
        END IF;
        IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'credit_note_status_enum') THEN
          CREATE TYPE credit_note_status_enum AS ENUM ('DRAFT','POSTED','CANCELLED');
        END IF;
      END $$;
    `);
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS credit_notes (
        id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
        voucher_number varchar NOT NULL UNIQUE,
        department_id uuid NOT NULL,
        sale_id uuid NULL,
        customer_id varchar NULL,
        credit_note_type credit_note_type_enum NOT NULL,
        credit_amount numeric(14,2) NOT NULL,
        credit_note_date date NOT NULL,
        reason varchar NULL,
        status credit_note_status_enum NOT NULL DEFAULT 'DRAFT',
        approver_user_id varchar NULL,
        notes varchar NULL,
        created_at timestamp NOT NULL DEFAULT now(),
        updated_at timestamp NOT NULL DEFAULT now(),
        deleted_at timestamp NULL,
        CONSTRAINT fk_credit_note_dept FOREIGN KEY (department_id) REFERENCES departments(id)
      )
    `);

    // debit_notes table
    await queryRunner.query(`
      DO $$ BEGIN
        IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'debit_note_type_enum') THEN
          CREATE TYPE debit_note_type_enum AS ENUM ('PURCHASE_RETURN','PRICE_ADJUSTMENT','DISCOUNT','OTHER');
        END IF;
        IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'debit_note_status_enum') THEN
          CREATE TYPE debit_note_status_enum AS ENUM ('DRAFT','POSTED','CANCELLED');
        END IF;
      END $$;
    `);
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS debit_notes (
        id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
        voucher_number varchar NOT NULL UNIQUE,
        department_id uuid NOT NULL,
        purchase_id uuid NULL,
        supplier_id varchar NULL,
        debit_note_type debit_note_type_enum NOT NULL,
        debit_amount numeric(14,2) NOT NULL,
        debit_note_date date NOT NULL,
        reason varchar NULL,
        status debit_note_status_enum NOT NULL DEFAULT 'DRAFT',
        approver_user_id varchar NULL,
        notes varchar NULL,
        created_at timestamp NOT NULL DEFAULT now(),
        updated_at timestamp NOT NULL DEFAULT now(),
        deleted_at timestamp NULL,
        CONSTRAINT fk_debit_note_dept FOREIGN KEY (department_id) REFERENCES departments(id)
      )
    `);

    // batches table (needed by phase8 / notifications)
    await queryRunner.query(`
      DO $$ BEGIN
        IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'batch_status_enum') THEN
          CREATE TYPE batch_status_enum AS ENUM ('AVAILABLE','QUARANTINED','CONSUMED','EXPIRED','DISPOSED');
        END IF;
      END $$;
    `);
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS batches (
        id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
        batch_number varchar NOT NULL UNIQUE,
        product_id uuid NOT NULL,
        department_id uuid NOT NULL,
        quantity numeric(12,2) NOT NULL DEFAULT 0,
        manufacturing_date date NULL,
        expiry_date date NULL,
        status batch_status_enum NOT NULL DEFAULT 'AVAILABLE',
        notes varchar NULL,
        created_at timestamp NOT NULL DEFAULT now(),
        updated_at timestamp NOT NULL DEFAULT now(),
        deleted_at timestamp NULL,
        CONSTRAINT fk_batch_product FOREIGN KEY (product_id) REFERENCES products(id),
        CONSTRAINT fk_batch_dept FOREIGN KEY (department_id) REFERENCES departments(id)
      )
    `);

    // insurance_policies table
    await queryRunner.query(`
      DO $$ BEGIN
        IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'insurance_status_enum') THEN
          CREATE TYPE insurance_status_enum AS ENUM ('ACTIVE','EXPIRED','CANCELLED','PENDING');
        END IF;
      END $$;
    `);
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS insurance_policies (
        id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
        vehicle_id uuid NOT NULL,
        policy_number varchar NOT NULL,
        provider varchar NOT NULL,
        start_date date NOT NULL,
        end_date date NOT NULL,
        premium numeric(12,2) NULL,
        status insurance_status_enum NOT NULL DEFAULT 'ACTIVE',
        notes varchar NULL,
        created_at timestamp NOT NULL DEFAULT now(),
        updated_at timestamp NOT NULL DEFAULT now(),
        deleted_at timestamp NULL,
        CONSTRAINT fk_insurance_vehicle FOREIGN KEY (vehicle_id) REFERENCES vehicles(id)
      )
    `);

    // vehicle_documents table
    await queryRunner.query(`
      DO $$ BEGIN
        IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'vehicle_doc_status_enum') THEN
          CREATE TYPE vehicle_doc_status_enum AS ENUM ('VALID','EXPIRING_SOON','EXPIRED','CANCELLED');
        END IF;
      END $$;
    `);
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS vehicle_documents (
        id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
        vehicle_id uuid NOT NULL,
        document_type varchar NOT NULL,
        document_number varchar NOT NULL,
        issue_date date NULL,
        expiry_date date NULL,
        status vehicle_doc_status_enum NOT NULL DEFAULT 'VALID',
        notes varchar NULL,
        created_at timestamp NOT NULL DEFAULT now(),
        updated_at timestamp NOT NULL DEFAULT now(),
        deleted_at timestamp NULL,
        CONSTRAINT fk_vdoc_vehicle FOREIGN KEY (vehicle_id) REFERENCES vehicles(id)
      )
    `);

    // driver_licenses table
    await queryRunner.query(`
      DO $$ BEGIN
        IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'license_status_enum') THEN
          CREATE TYPE license_status_enum AS ENUM ('VALID','EXPIRING_SOON','EXPIRED','SUSPENDED');
        END IF;
      END $$;
    `);
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS driver_licenses (
        id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
        user_id uuid NOT NULL,
        license_number varchar NOT NULL,
        license_type varchar NOT NULL,
        issue_date date NULL,
        expiry_date date NULL,
        status license_status_enum NOT NULL DEFAULT 'VALID',
        notes varchar NULL,
        created_at timestamp NOT NULL DEFAULT now(),
        updated_at timestamp NOT NULL DEFAULT now(),
        deleted_at timestamp NULL,
        CONSTRAINT fk_license_user FOREIGN KEY (user_id) REFERENCES users(id)
      )
    `);

    // salary tables
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS salary_configurations (
        id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
        user_id uuid NOT NULL,
        effective_date date NOT NULL,
        amount numeric(12,2) NOT NULL,
        currency varchar NOT NULL DEFAULT 'PKR',
        employment_type varchar NOT NULL DEFAULT 'SALARY',
        created_at timestamp NOT NULL DEFAULT now(),
        updated_at timestamp NOT NULL DEFAULT now(),
        deleted_at timestamp NULL,
        CONSTRAINT fk_salary_config_user FOREIGN KEY (user_id) REFERENCES users(id)
      )
    `);
    await queryRunner.query(`
      DO $$ BEGIN
        IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'salary_payment_status_enum') THEN
          CREATE TYPE salary_payment_status_enum AS ENUM ('PENDING','PAID','CANCELLED');
        END IF;
      END $$;
    `);
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS salary_payments (
        id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
        user_id uuid NOT NULL,
        period varchar NOT NULL,
        amount numeric(12,2) NOT NULL,
        payment_date date NULL,
        status salary_payment_status_enum NOT NULL DEFAULT 'PENDING',
        notes varchar NULL,
        created_at timestamp NOT NULL DEFAULT now(),
        updated_at timestamp NOT NULL DEFAULT now(),
        deleted_at timestamp NULL,
        CONSTRAINT fk_salary_payment_user FOREIGN KEY (user_id) REFERENCES users(id)
      )
    `);
    await queryRunner.query(`
      DO $$ BEGIN
        IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'salary_advance_status_enum') THEN
          CREATE TYPE salary_advance_status_enum AS ENUM ('PENDING','APPROVED','REJECTED','RECOVERED');
        END IF;
      END $$;
    `);
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS salary_advances (
        id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
        user_id uuid NOT NULL,
        amount numeric(12,2) NOT NULL,
        reason varchar NULL,
        status salary_advance_status_enum NOT NULL DEFAULT 'PENDING',
        recovery_schedule varchar NULL,
        created_at timestamp NOT NULL DEFAULT now(),
        updated_at timestamp NOT NULL DEFAULT now(),
        deleted_at timestamp NULL,
        CONSTRAINT fk_salary_advance_user FOREIGN KEY (user_id) REFERENCES users(id)
      )
    `);
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS salary_deductions (
        id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
        user_id uuid NOT NULL,
        type varchar NOT NULL,
        amount numeric(12,2) NOT NULL,
        reason varchar NULL,
        created_at timestamp NOT NULL DEFAULT now(),
        updated_at timestamp NOT NULL DEFAULT now(),
        deleted_at timestamp NULL,
        CONSTRAINT fk_salary_deduction_user FOREIGN KEY (user_id) REFERENCES users(id)
      )
    `);

    // period_close table
    await queryRunner.query(`
      DO $$ BEGIN
        IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'period_close_status_enum') THEN
          CREATE TYPE period_close_status_enum AS ENUM ('OPEN','CLOSING','CLOSED','REOPENED');
        END IF;
      END $$;
    `);
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS period_closes (
        id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
        period varchar NOT NULL,
        year int NOT NULL,
        month int NOT NULL,
        status period_close_status_enum NOT NULL DEFAULT 'OPEN',
        closed_by varchar NULL,
        closed_at timestamp NULL,
        notes varchar NULL,
        created_at timestamp NOT NULL DEFAULT now(),
        updated_at timestamp NOT NULL DEFAULT now()
      )
    `);

    // temperature_logs table
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS temperature_logs (
        id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
        stock_movement_id uuid NULL,
        recorded_temp numeric(5,2) NOT NULL,
        threshold numeric(5,2) NULL,
        status varchar NOT NULL DEFAULT 'NORMAL',
        recorded_at timestamp NOT NULL DEFAULT now(),
        created_at timestamp NOT NULL DEFAULT now()
      )
    `);

    // quality_inspections table
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS quality_inspections (
        id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
        batch_id uuid NULL,
        inspector_user_id uuid NULL,
        status varchar NOT NULL DEFAULT 'PENDING',
        remarks varchar NULL,
        inspected_at timestamp NULL,
        created_at timestamp NOT NULL DEFAULT now(),
        updated_at timestamp NOT NULL DEFAULT now()
      )
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE IF EXISTS quality_inspections`);
    await queryRunner.query(`DROP TABLE IF EXISTS temperature_logs`);
    await queryRunner.query(`DROP TABLE IF EXISTS period_closes`);
    await queryRunner.query(`DROP TABLE IF EXISTS salary_deductions`);
    await queryRunner.query(`DROP TABLE IF EXISTS salary_advances`);
    await queryRunner.query(`DROP TABLE IF EXISTS salary_payments`);
    await queryRunner.query(`DROP TABLE IF EXISTS salary_configurations`);
    await queryRunner.query(`DROP TABLE IF EXISTS driver_licenses`);
    await queryRunner.query(`DROP TABLE IF EXISTS vehicle_documents`);
    await queryRunner.query(`DROP TABLE IF EXISTS insurance_policies`);
    await queryRunner.query(`DROP TABLE IF EXISTS batches`);
    await queryRunner.query(`DROP TABLE IF EXISTS debit_notes`);
    await queryRunner.query(`DROP TABLE IF EXISTS credit_notes`);
    await queryRunner.query(`DROP TABLE IF EXISTS transfers`);
    await queryRunner.query(`DROP TYPE IF EXISTS transfer_status_enum`);
    await queryRunner.query(`DROP TYPE IF EXISTS credit_note_type_enum`);
    await queryRunner.query(`DROP TYPE IF EXISTS credit_note_status_enum`);
    await queryRunner.query(`DROP TYPE IF EXISTS debit_note_type_enum`);
    await queryRunner.query(`DROP TYPE IF EXISTS debit_note_status_enum`);
    await queryRunner.query(`DROP TYPE IF EXISTS batch_status_enum`);
    await queryRunner.query(`DROP TYPE IF EXISTS insurance_status_enum`);
    await queryRunner.query(`DROP TYPE IF EXISTS vehicle_doc_status_enum`);
    await queryRunner.query(`DROP TYPE IF EXISTS license_status_enum`);
    await queryRunner.query(`DROP TYPE IF EXISTS salary_payment_status_enum`);
    await queryRunner.query(`DROP TYPE IF EXISTS salary_advance_status_enum`);
    await queryRunner.query(`DROP TYPE IF EXISTS period_close_status_enum`);
  }
}
