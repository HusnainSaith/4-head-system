import { MigrationInterface, QueryRunner, TableForeignKey } from 'typeorm';

export class AddVehiclesAndRecords1782040000000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    // Create enums if they don't exist
    await queryRunner.query(`
      DO $$ BEGIN
        IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'vehicle_department_enum') THEN
          CREATE TYPE vehicle_department_enum AS ENUM ('BROKERAGE','SUPPLY','WASTAGE');
        END IF;
        IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'vehicle_type_enum') THEN
          CREATE TYPE vehicle_type_enum AS ENUM ('TRUCK','VAN','CAR','MOTORCYCLE','OTHER');
        END IF;
      END $$;
    `);

    // vehicles table
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS vehicles (
        id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
        registration_number varchar NOT NULL UNIQUE,
        type vehicle_type_enum NOT NULL,
        model varchar NOT NULL,
        year int NOT NULL,
        department vehicle_department_enum NOT NULL,
        is_active boolean NOT NULL DEFAULT true,
        created_by uuid NULL,
        created_at timestamp NOT NULL DEFAULT now(),
        updated_at timestamp NOT NULL DEFAULT now(),
        deleted_at timestamp NULL
      )
    `);

    // fuel_records table
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS fuel_records (
        id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
        vehicle_id uuid NOT NULL,
        date date NOT NULL,
        liters decimal(15,2) NOT NULL,
        price_per_liter decimal(15,2) NOT NULL,
        total decimal(15,2) NOT NULL,
        odometer_reading decimal(15,2) NULL,
        filled_by uuid NULL,
        created_by uuid NULL,
        created_at timestamp NOT NULL DEFAULT now(),
        updated_at timestamp NOT NULL DEFAULT now(),
        deleted_at timestamp NULL
      )
    `);

    // maintenance_records table
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS maintenance_records (
        id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
        vehicle_id uuid NOT NULL,
        date date NOT NULL,
        description text NOT NULL,
        cost decimal(15,2) NOT NULL,
        vendor varchar NULL,
        next_maintenance_date date NULL,
        performed_by uuid NULL,
        created_by uuid NULL,
        created_at timestamp NOT NULL DEFAULT now(),
        updated_at timestamp NOT NULL DEFAULT now(),
        deleted_at timestamp NULL
      )
    `);

    // foreign keys
    const hasFuelFk = await queryRunner.hasTable('fuel_records');
    if (hasFuelFk) {
      await queryRunner.query(`ALTER TABLE fuel_records DROP CONSTRAINT IF EXISTS fk_fuel_vehicle`);
      await queryRunner.query(`ALTER TABLE maintenance_records DROP CONSTRAINT IF EXISTS fk_maint_vehicle`);
      await queryRunner.createForeignKey('fuel_records', new TableForeignKey({
        columnNames: ['vehicle_id'],
        referencedTableName: 'vehicles',
        referencedColumnNames: ['id'],
        onDelete: 'CASCADE',
        name: 'fk_fuel_vehicle',
      }));

      await queryRunner.createForeignKey('maintenance_records', new TableForeignKey({
        columnNames: ['vehicle_id'],
        referencedTableName: 'vehicles',
        referencedColumnNames: ['id'],
        onDelete: 'CASCADE',
        name: 'fk_maint_vehicle',
      }));
    }

    // indexes
    await queryRunner.query(`CREATE INDEX IF NOT EXISTS idx_fuel_vehicle_id ON fuel_records(vehicle_id)`);
    await queryRunner.query(`CREATE INDEX IF NOT EXISTS idx_fuel_date ON fuel_records(date)`);
    await queryRunner.query(`CREATE INDEX IF NOT EXISTS idx_maint_vehicle_id ON maintenance_records(vehicle_id)`);
    await queryRunner.query(`CREATE INDEX IF NOT EXISTS idx_maint_date ON maintenance_records(date)`);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE maintenance_records DROP CONSTRAINT IF EXISTS fk_maint_vehicle`);
    await queryRunner.query(`ALTER TABLE fuel_records DROP CONSTRAINT IF EXISTS fk_fuel_vehicle`);
    await queryRunner.query(`DROP TABLE IF EXISTS maintenance_records`);
    await queryRunner.query(`DROP TABLE IF EXISTS fuel_records`);
    await queryRunner.query(`DROP TABLE IF EXISTS vehicles`);
    await queryRunner.query(`DROP TYPE IF EXISTS vehicle_department_enum`);
    await queryRunner.query(`DROP TYPE IF EXISTS vehicle_type_enum`);
  }
}
