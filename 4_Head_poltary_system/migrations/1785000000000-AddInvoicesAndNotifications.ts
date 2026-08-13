import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddInvoicesAndNotifications1785000000000 implements MigrationInterface {
  name = 'AddInvoicesAndNotifications1785000000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `CREATE TYPE "invoices_invoice_type_enum" AS ENUM ('purchase','sale','transfer','payment','salary','expense','writeoff')`,
    );
    await queryRunner.query(
      `CREATE TYPE "invoices_status_enum" AS ENUM ('draft','posted','cancelled')`,
    );
    await queryRunner.query(
      `CREATE TYPE "notifications_status_enum" AS ENUM ('pending','sent','failed')`,
    );
    await queryRunner.query(`
      CREATE TABLE "invoices" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "invoice_number" varchar(32) NOT NULL,
        "invoice_type" "invoices_invoice_type_enum" NOT NULL,
        "department_id" uuid NOT NULL,
        "source_type" varchar(50) NOT NULL,
        "source_id" uuid NOT NULL,
        "party_id" uuid,
        "party_name" varchar(150),
        "line_items" jsonb NOT NULL,
        "subtotal" numeric(14,2) NOT NULL,
        "tax_amount" numeric(14,2) NOT NULL DEFAULT 0,
        "total_amount" numeric(14,2) NOT NULL,
        "notes" text,
        "status" "invoices_status_enum" NOT NULL DEFAULT 'posted',
        "issued_at" timestamptz NOT NULL,
        "created_at" timestamptz NOT NULL DEFAULT now(),
        "updated_at" timestamptz NOT NULL DEFAULT now(),
        "deleted_at" timestamptz,
        "created_by" uuid,
        "updated_by" uuid,
        CONSTRAINT "PK_invoices" PRIMARY KEY ("id"),
        CONSTRAINT "UQ_invoices_number" UNIQUE ("invoice_number"),
        CONSTRAINT "FK_invoices_department" FOREIGN KEY ("department_id") REFERENCES "departments"("id") ON DELETE RESTRICT,
        CONSTRAINT "FK_invoices_party" FOREIGN KEY ("party_id") REFERENCES "parties"("id") ON DELETE SET NULL
      )
    `);
    await queryRunner.query(
      `CREATE UNIQUE INDEX "IDX_invoices_source" ON "invoices" ("source_type", "source_id") WHERE "deleted_at" IS NULL`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_invoices_department" ON "invoices" ("department_id")`,
    );
    if (!(await queryRunner.hasTable('notifications'))) {
      await queryRunner.query(`
        CREATE TABLE "notifications" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "type" varchar(50) NOT NULL,
        "title" varchar(255) NOT NULL,
        "message" text NOT NULL,
        "recipient_email" varchar(255),
        "recipient_user_id" uuid,
        "source_type" varchar(50) NOT NULL,
        "source_id" uuid NOT NULL,
        "status" "notifications_status_enum" NOT NULL DEFAULT 'pending',
        "error_message" text,
        "sent_at" timestamptz,
        "context" jsonb,
        "created_at" timestamptz NOT NULL DEFAULT now(),
        "updated_at" timestamptz NOT NULL DEFAULT now(),
        "deleted_at" timestamptz,
        "created_by" uuid,
        "updated_by" uuid,
        CONSTRAINT "PK_notifications" PRIMARY KEY ("id"),
        CONSTRAINT "FK_notifications_user" FOREIGN KEY ("recipient_user_id") REFERENCES "users"("id") ON DELETE SET NULL
        )
      `);
    } else {
      // Reconcile the legacy in-app notifications table without discarding its rows.
      await queryRunner.query(
        `ALTER TABLE "notifications" ALTER COLUMN "type" TYPE varchar(50) USING "type"::text`,
      );
      await queryRunner.query(
        `ALTER TABLE "notifications" RENAME COLUMN "user_id" TO "recipient_user_id"`,
      );
      await queryRunner.query(
        `ALTER TABLE "notifications" ALTER COLUMN "sent_at" DROP NOT NULL`,
      );
      await queryRunner.query(
        `ALTER TABLE "notifications" ALTER COLUMN "sent_at" DROP DEFAULT`,
      );
      await queryRunner.query(
        `ALTER TABLE "notifications" ALTER COLUMN "sent_at" TYPE timestamptz USING "sent_at" AT TIME ZONE 'UTC'`,
      );
      await queryRunner.query(
        `ALTER TABLE "notifications" ALTER COLUMN "created_at" TYPE timestamptz USING "created_at" AT TIME ZONE 'UTC'`,
      );
      await queryRunner.query(
        `ALTER TABLE "notifications" ALTER COLUMN "updated_at" TYPE timestamptz USING "updated_at" AT TIME ZONE 'UTC'`,
      );
      await queryRunner.query(
        `ALTER TABLE "notifications"
          ADD COLUMN "recipient_email" varchar(255),
          ADD COLUMN "source_type" varchar(50),
          ADD COLUMN "source_id" uuid,
          ADD COLUMN "status" "notifications_status_enum" NOT NULL DEFAULT 'pending',
          ADD COLUMN "error_message" text,
          ADD COLUMN "context" jsonb,
          ADD COLUMN "deleted_at" timestamptz,
          ADD COLUMN "created_by" uuid,
          ADD COLUMN "updated_by" uuid`,
      );
      await queryRunner.query(
        `UPDATE "notifications"
         SET "source_type" = COALESCE("entity_type", 'legacy'),
             "source_id" = CASE
               WHEN "entity_id" ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$'
               THEN "entity_id"::uuid ELSE "id" END,
             "status" = 'sent'`,
      );
      await queryRunner.query(
        `ALTER TABLE "notifications" ALTER COLUMN "source_type" SET NOT NULL, ALTER COLUMN "source_id" SET NOT NULL`,
      );
    }
    await queryRunner.query(
      `CREATE INDEX IF NOT EXISTS "IDX_notifications_recipient_status" ON "notifications" ("recipient_user_id", "status")`,
    );
    await queryRunner.query(
      `CREATE INDEX IF NOT EXISTS "IDX_notifications_source" ON "notifications" ("source_type", "source_id")`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP INDEX IF EXISTS "IDX_notifications_source"`);
    await queryRunner.query(
      `DROP INDEX IF EXISTS "IDX_notifications_recipient_status"`,
    );

    // The application already had an in-app notifications table before this
    // migration. Restore that table instead of deleting its historical rows.
    if (await queryRunner.hasColumn('notifications', 'entity_type')) {
      await queryRunner.query(
        `UPDATE "notifications" SET "type" = 'SYSTEM'
         WHERE "type" NOT IN (
           'LOW_STOCK', 'EXPIRY', 'MAINTENANCE_DUE', 'PAYMENT_DUE',
           'APPROVAL_PENDING', 'OVER_BUDGET', 'CREDIT_LIMIT_EXCEEDED', 'SYSTEM'
         )`,
      );
      await queryRunner.query(
        `ALTER TABLE "notifications" ALTER COLUMN "type" TYPE notification_type_enum USING "type"::notification_type_enum`,
      );
      await queryRunner.query(
        `UPDATE "notifications" SET "sent_at" = COALESCE("sent_at", "created_at", now())`,
      );
      await queryRunner.query(
        `ALTER TABLE "notifications" ALTER COLUMN "sent_at" TYPE timestamp USING "sent_at" AT TIME ZONE 'UTC'`,
      );
      await queryRunner.query(
        `ALTER TABLE "notifications" ALTER COLUMN "sent_at" SET DEFAULT now(), ALTER COLUMN "sent_at" SET NOT NULL`,
      );
      await queryRunner.query(
        `ALTER TABLE "notifications" ALTER COLUMN "created_at" TYPE timestamp USING "created_at" AT TIME ZONE 'UTC'`,
      );
      await queryRunner.query(
        `ALTER TABLE "notifications" ALTER COLUMN "updated_at" TYPE timestamp USING "updated_at" AT TIME ZONE 'UTC'`,
      );
      await queryRunner.query(
        `ALTER TABLE "notifications"
          DROP COLUMN "recipient_email",
          DROP COLUMN "source_type",
          DROP COLUMN "source_id",
          DROP COLUMN "status",
          DROP COLUMN "error_message",
          DROP COLUMN "context",
          DROP COLUMN "deleted_at",
          DROP COLUMN "created_by",
          DROP COLUMN "updated_by"`,
      );
      await queryRunner.query(
        `ALTER TABLE "notifications" RENAME COLUMN "recipient_user_id" TO "user_id"`,
      );
    } else {
      await queryRunner.query(`DROP TABLE "notifications"`);
    }
    await queryRunner.query(`DROP TABLE "invoices"`);
    await queryRunner.query(`DROP TYPE "notifications_status_enum"`);
    await queryRunner.query(`DROP TYPE "invoices_status_enum"`);
    await queryRunner.query(`DROP TYPE "invoices_invoice_type_enum"`);
  }
}
