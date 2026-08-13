import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddDatabaseBackups1781840000000 implements MigrationInterface {
  name = 'AddDatabaseBackups1781840000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TYPE database_backup_status_enum AS ENUM (
        'PENDING',
        'COMPLETED',
        'FAILED',
        'RESTORED'
      )
    `);

    await queryRunner.query(`
      CREATE TABLE database_backups (
        id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
        file_name varchar NOT NULL UNIQUE,
        file_path text NOT NULL,
        file_size_bytes bigint NOT NULL DEFAULT 0,
        storage_provider varchar NOT NULL DEFAULT 'LOCAL',
        status database_backup_status_enum NOT NULL DEFAULT 'PENDING',
        table_count int NOT NULL DEFAULT 0,
        record_count int NOT NULL DEFAULT 0,
        started_at timestamp NULL,
        completed_at timestamp NULL,
        last_restore_validated_at timestamp NULL,
        error_message text NULL,
        created_at timestamp NOT NULL DEFAULT now(),
        updated_at timestamp NOT NULL DEFAULT now()
      )
    `);

    await queryRunner.query(
      `CREATE INDEX idx_database_backups_status ON database_backups (status)`,
    );
    await queryRunner.query(
      `CREATE INDEX idx_database_backups_created_at ON database_backups (created_at)`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `DROP INDEX IF EXISTS idx_database_backups_created_at`,
    );
    await queryRunner.query(`DROP INDEX IF EXISTS idx_database_backups_status`);
    await queryRunner.query(`DROP TABLE IF EXISTS database_backups`);
    await queryRunner.query(`DROP TYPE IF EXISTS database_backup_status_enum`);
  }
}
