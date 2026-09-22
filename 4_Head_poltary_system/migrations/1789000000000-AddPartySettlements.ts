import { MigrationInterface, QueryRunner, Table, TableIndex } from 'typeorm';

export class AddPartySettlements1789000000000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    // Create party_settlements table
    await queryRunner.createTable(
      new Table({
        name: 'party_settlements',
        columns: [
          {
            name: 'id',
            type: 'uuid',
            isPrimary: true,
            default: 'gen_random_uuid()',
          },
          {
            name: 'payable_party_id',
            type: 'uuid',
            isNullable: false,
          },
          {
            name: 'receivable_party_id',
            type: 'uuid',
            isNullable: false,
          },
          {
            name: 'department_id',
            type: 'uuid',
            isNullable: false,
          },
          {
            name: 'settlement_amount',
            type: 'decimal',
            precision: 14,
            scale: 2,
            isNullable: false,
          },
          {
            name: 'settlement_date',
            type: 'date',
            isNullable: false,
          },
          {
            name: 'reference',
            type: 'varchar',
            length: '255',
            isNullable: true,
          },
          {
            name: 'notes',
            type: 'varchar',
            length: '500',
            isNullable: true,
          },
          {
            name: 'status',
            type: 'enum',
            enum: ['active', 'reversed'],
            default: "'active'",
            isNullable: false,
          },
          {
            name: 'reversed_at',
            type: 'timestamptz',
            isNullable: true,
          },
          {
            name: 'reversed_by',
            type: 'uuid',
            isNullable: true,
          },
          {
            name: 'reversal_reason',
            type: 'varchar',
            length: '500',
            isNullable: true,
          },
          {
            name: 'created_at',
            type: 'timestamptz',
            default: 'now()',
            isNullable: false,
          },
          {
            name: 'updated_at',
            type: 'timestamptz',
            default: 'now()',
            isNullable: false,
          },
          {
            name: 'deleted_at',
            type: 'timestamptz',
            isNullable: true,
          },
          {
            name: 'created_by',
            type: 'uuid',
            isNullable: true,
          },
          {
            name: 'updated_by',
            type: 'uuid',
            isNullable: true,
          },
        ],
        foreignKeys: [
          {
            columnNames: ['payable_party_id'],
            referencedTableName: 'parties',
            referencedColumnNames: ['id'],
            onDelete: 'RESTRICT',
          },
          {
            columnNames: ['receivable_party_id'],
            referencedTableName: 'parties',
            referencedColumnNames: ['id'],
            onDelete: 'RESTRICT',
          },
          {
            columnNames: ['department_id'],
            referencedTableName: 'departments',
            referencedColumnNames: ['id'],
            onDelete: 'RESTRICT',
          },
        ],
      }),
      true,
    );

    // Create indexes for performance
    await queryRunner.createIndex(
      'party_settlements',
      new TableIndex({
        name: 'idx_party_settlements_payable_receivable',
        columnNames: ['payable_party_id', 'receivable_party_id'],
      }),
    );

    await queryRunner.createIndex(
      'party_settlements',
      new TableIndex({
        name: 'idx_party_settlements_department_date',
        columnNames: ['department_id', 'settlement_date'],
      }),
    );

    await queryRunner.createIndex(
      'party_settlements',
      new TableIndex({
        name: 'idx_party_settlements_payable_department',
        columnNames: ['payable_party_id', 'department_id'],
      }),
    );

    await queryRunner.createIndex(
      'party_settlements',
      new TableIndex({
        name: 'idx_party_settlements_receivable_department',
        columnNames: ['receivable_party_id', 'department_id'],
      }),
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Drop indexes
    await queryRunner.dropIndex(
      'party_settlements',
      'idx_party_settlements_receivable_department',
    );
    await queryRunner.dropIndex(
      'party_settlements',
      'idx_party_settlements_payable_department',
    );
    await queryRunner.dropIndex(
      'party_settlements',
      'idx_party_settlements_department_date',
    );
    await queryRunner.dropIndex(
      'party_settlements',
      'idx_party_settlements_payable_receivable',
    );

    // Drop table
    await queryRunner.dropTable('party_settlements');
  }
}
