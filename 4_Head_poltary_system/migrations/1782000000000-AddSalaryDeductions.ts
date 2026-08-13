import { MigrationInterface, QueryRunner, Table, TableForeignKey } from 'typeorm';

export class AddSalaryDeductions1782000000000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    const hasTable = await queryRunner.hasTable('salary_deductions');

    if (!hasTable) {
      await queryRunner.createTable(
        new Table({
          name: 'salary_deductions',
          columns: [
            {
              name: 'id',
              type: 'uuid',
              isPrimary: true,
              default: 'uuid_generate_v4()',
            },
            {
              name: 'user_id',
              type: 'uuid',
              isNullable: false,
            },
            {
              name: 'type',
              type: 'varchar',
              isNullable: false,
            },
            {
              name: 'amount',
              type: 'decimal',
              precision: 10,
              scale: 2,
              isNullable: false,
            },
            {
              name: 'reason',
              type: 'varchar',
              isNullable: false,
            },
            {
              name: 'effective_date',
              type: 'date',
              isNullable: false,
            },
            {
              name: 'period',
              type: 'varchar',
              length: '7',
              isNullable: true,
            },
            {
              name: 'status',
              type: 'enum',
              enum: ['ACTIVE', 'INACTIVE'],
              default: "'ACTIVE'",
              isNullable: false,
            },
            {
              name: 'salary_payment_id',
              type: 'uuid',
              isNullable: true,
            },
            {
              name: 'notes',
              type: 'varchar',
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
          ],
        }),
      );
    } else {
      await queryRunner.query(`
        ALTER TABLE salary_deductions
        ADD COLUMN IF NOT EXISTS effective_date date,
        ADD COLUMN IF NOT EXISTS period varchar(7),
        ADD COLUMN IF NOT EXISTS status varchar NOT NULL DEFAULT 'ACTIVE',
        ADD COLUMN IF NOT EXISTS salary_payment_id uuid,
        ADD COLUMN IF NOT EXISTS notes varchar,
        ADD COLUMN IF NOT EXISTS updated_at timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP
      `);
    }

    const table = await queryRunner.getTable('salary_deductions');
    const hasUserFk = table?.foreignKeys.some((fk) =>
      fk.columnNames.includes('user_id'),
    );
    const hasSalaryPaymentFk = table?.foreignKeys.some((fk) =>
      fk.columnNames.includes('salary_payment_id'),
    );

    if (!hasUserFk) {
      await queryRunner.createForeignKey(
        'salary_deductions',
        new TableForeignKey({
          name: 'fk_salary_deductions_user',
          columnNames: ['user_id'],
          referencedColumnNames: ['id'],
          referencedTableName: 'users',
          onDelete: 'CASCADE',
        }),
      );
    }

    if (!hasSalaryPaymentFk) {
      await queryRunner.createForeignKey(
        'salary_deductions',
        new TableForeignKey({
          name: 'fk_salary_deductions_salary_payment',
          columnNames: ['salary_payment_id'],
          referencedColumnNames: ['id'],
          referencedTableName: 'salary_payments',
          onDelete: 'SET NULL',
        }),
      );
    }
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.dropTable('salary_deductions', true);
  }
}
