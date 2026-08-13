import { MigrationInterface, QueryRunner, Table, TableForeignKey } from 'typeorm';

export class AddBonusRecords1782030000000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    const hasTable = await queryRunner.hasTable('bonus_records');

    if (!hasTable) {
      await queryRunner.createTable(
        new Table({
          name: 'bonus_records',
          columns: [
            {
              name: 'id',
              type: 'uuid',
              isPrimary: true,
              default: 'uuid_generate_v4()',
            },
            {
              name: 'employee_id',
              type: 'uuid',
              isNullable: false,
            },
            {
              name: 'department',
              type: 'enum',
              enum: ['BROKERAGE', 'SUPPLY', 'WASTAGE', 'FRESH_SHOP'],
              isNullable: false,
            },
            {
              name: 'amount',
              type: 'decimal',
              precision: 15,
              scale: 2,
              isNullable: false,
            },
            {
              name: 'reason',
              type: 'text',
              isNullable: true,
            },
            {
              name: 'month',
              type: 'int',
              isNullable: false,
            },
            {
              name: 'year',
              type: 'int',
              isNullable: false,
            },
            {
              name: 'given_by',
              type: 'uuid',
              isNullable: true,
            },
            {
              name: 'created_by',
              type: 'uuid',
              isNullable: true,
            },
            {
              name: 'created_at',
              type: 'timestamp',
              default: 'CURRENT_TIMESTAMP',
              isNullable: false,
            },
            {
              name: 'updated_at',
              type: 'timestamp',
              default: 'CURRENT_TIMESTAMP',
              isNullable: false,
            },
            {
              name: 'deleted_at',
              type: 'timestamp',
              isNullable: true,
            },
          ],
        }),
      );
    } else {
      await queryRunner.query(`
        ALTER TABLE bonus_records
        ADD COLUMN IF NOT EXISTS department varchar,
        ADD COLUMN IF NOT EXISTS amount decimal(15,2),
        ADD COLUMN IF NOT EXISTS reason text,
        ADD COLUMN IF NOT EXISTS month int,
        ADD COLUMN IF NOT EXISTS year int,
        ADD COLUMN IF NOT EXISTS given_by uuid,
        ADD COLUMN IF NOT EXISTS created_by uuid,
        ADD COLUMN IF NOT EXISTS updated_at timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
        ADD COLUMN IF NOT EXISTS deleted_at timestamp
      `);
    }

    const table = await queryRunner.getTable('bonus_records');
    const hasEmployeeFk = table?.foreignKeys.some((fk) => fk.columnNames.includes('employee_id'));
    const hasGivenByFk = table?.foreignKeys.some((fk) => fk.columnNames.includes('given_by'));
    const hasCreatedByFk = table?.foreignKeys.some((fk) => fk.columnNames.includes('created_by'));

    if (!hasEmployeeFk) {
      await queryRunner.createForeignKey(
        'bonus_records',
        new TableForeignKey({
          name: 'fk_bonus_records_employee',
          columnNames: ['employee_id'],
          referencedColumnNames: ['id'],
          referencedTableName: 'users',
          onDelete: 'CASCADE',
        }),
      );
    }

    if (!hasGivenByFk) {
      await queryRunner.createForeignKey(
        'bonus_records',
        new TableForeignKey({
          name: 'fk_bonus_records_given_by',
          columnNames: ['given_by'],
          referencedColumnNames: ['id'],
          referencedTableName: 'users',
          onDelete: 'SET NULL',
        }),
      );
    }

    if (!hasCreatedByFk) {
      await queryRunner.createForeignKey(
        'bonus_records',
        new TableForeignKey({
          name: 'fk_bonus_records_created_by',
          columnNames: ['created_by'],
          referencedColumnNames: ['id'],
          referencedTableName: 'users',
          onDelete: 'SET NULL',
        }),
      );
    }
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.dropTable('bonus_records', true);
  }
}
