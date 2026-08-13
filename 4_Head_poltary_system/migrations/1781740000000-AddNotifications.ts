import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddNotifications1781740000000 implements MigrationInterface {
  name = 'AddNotifications1781740000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TYPE notification_type_enum AS ENUM (
        'LOW_STOCK',
        'EXPIRY',
        'MAINTENANCE_DUE',
        'PAYMENT_DUE',
        'APPROVAL_PENDING',
        'OVER_BUDGET',
        'CREDIT_LIMIT_EXCEEDED',
        'SYSTEM'
      )
    `);

    await queryRunner.query(`
      CREATE TABLE notifications (
        id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
        user_id uuid NULL,
        type notification_type_enum NOT NULL,
        title varchar NOT NULL,
        message text NOT NULL,
        entity_type varchar NULL,
        entity_id varchar NULL,
        is_read boolean NOT NULL DEFAULT false,
        read_at timestamp NULL,
        sent_at timestamp NOT NULL DEFAULT now(),
        created_at timestamp NOT NULL DEFAULT now(),
        updated_at timestamp NOT NULL DEFAULT now(),
        CONSTRAINT fk_notifications_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL
      )
    `);

    await queryRunner.query(
      `CREATE INDEX idx_notifications_user_read ON notifications (user_id, is_read)`,
    );
    await queryRunner.query(
      `CREATE INDEX idx_notifications_type ON notifications (type)`,
    );
    await queryRunner.query(
      `CREATE INDEX idx_notifications_entity ON notifications (entity_type, entity_id)`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP INDEX IF EXISTS idx_notifications_entity`);
    await queryRunner.query(`DROP INDEX IF EXISTS idx_notifications_type`);
    await queryRunner.query(`DROP INDEX IF EXISTS idx_notifications_user_read`);
    await queryRunner.query(`DROP TABLE IF EXISTS notifications`);
    await queryRunner.query(`DROP TYPE IF EXISTS notification_type_enum`);
  }
}
