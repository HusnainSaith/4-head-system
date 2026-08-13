import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddBatchIdToTemperatureLogs1782010000000
  implements MigrationInterface
{
  name = 'AddBatchIdToTemperatureLogs1782010000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE temperature_logs
      ADD COLUMN IF NOT EXISTS batch_id uuid NULL
    `);

    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS idx_temperature_logs_batch_id
      ON temperature_logs(batch_id)
    `);

    await queryRunner.query(`
      DO $$ BEGIN
        IF NOT EXISTS (
          SELECT 1
          FROM information_schema.table_constraints
          WHERE constraint_name = 'fk_temperature_logs_batch'
            AND table_name = 'temperature_logs'
        ) THEN
          ALTER TABLE temperature_logs
          ADD CONSTRAINT fk_temperature_logs_batch
          FOREIGN KEY (batch_id) REFERENCES batches(id) ON DELETE SET NULL;
        END IF;
      END $$;
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE temperature_logs
      DROP CONSTRAINT IF EXISTS fk_temperature_logs_batch
    `);

    await queryRunner.query(`
      DROP INDEX IF EXISTS idx_temperature_logs_batch_id
    `);

    await queryRunner.query(`
      ALTER TABLE temperature_logs
      DROP COLUMN IF EXISTS batch_id
    `);
  }
}
