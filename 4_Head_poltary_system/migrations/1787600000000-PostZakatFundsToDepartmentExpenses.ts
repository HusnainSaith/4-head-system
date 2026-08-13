import { MigrationInterface, QueryRunner } from 'typeorm';

export class PostZakatFundsToDepartmentExpenses1787600000000 implements MigrationInterface {
  name = 'PostZakatFundsToDepartmentExpenses1787600000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      UPDATE ledger_entries le
         SET account_id = expense.id
        FROM chart_of_accounts clearing, chart_of_accounts expense
       WHERE le.source_type = 'zakat_fund'
         AND le.account_id = clearing.id
         AND clearing.code = 'zakat_fund_clearing'
         AND expense.code = 'operating_expense'
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      UPDATE ledger_entries le
         SET account_id = clearing.id
        FROM chart_of_accounts clearing, chart_of_accounts expense
       WHERE le.source_type = 'zakat_fund'
         AND le.account_id = expense.id
         AND expense.code = 'operating_expense'
         AND clearing.code = 'zakat_fund_clearing'
    `);
  }
}
