import { NestFactory } from '@nestjs/core';
import { DataSource } from 'typeorm';
import { AppModule } from '../src/app.module';
import { ZakatFundAllocationMethod } from '../src/modules/zakat-funds/entities/zakat-fund-settlement.entity';
import { ZakatFundType } from '../src/modules/zakat-funds/entities/zakat-fund-payment.entity';
import { ZakatFundsService } from '../src/modules/zakat-funds/zakat-funds.service';

function assert(condition: unknown, message: string): asserts condition {
  if (!condition) throw new Error(message);
}

async function main() {
  const app = await NestFactory.createApplicationContext(AppModule, {
    logger: false,
  });
  const dataSource = app.get(DataSource);
  const service = app.get(ZakatFundsService);
  const createdIds: string[] = [];
  try {
    const [department] = await dataSource.query(
      `SELECT d.id, ca.id AS cash_account_id
         FROM departments d JOIN cash_accounts ca ON ca.department_id=d.id
        WHERE d.is_active=true AND ca.is_active=true AND d.deleted_at IS NULL AND ca.deleted_at IS NULL
        ORDER BY d.created_at LIMIT 1`,
    );
    const [party] = await dataSource.query(
      `SELECT id FROM parties WHERE deleted_at IS NULL ORDER BY created_at LIMIT 1`,
    );
    const [actor] = await dataSource.query(
      `SELECT id FROM users WHERE deleted_at IS NULL ORDER BY created_at LIMIT 1`,
    );
    assert(
      department && party && actor,
      'Verification requires an active department cash account, party, and user',
    );
    const suffix = `${Date.now()}-${Math.random().toString(16).slice(2)}`;
    const payment = await service.recordPayment(
      {
        departmentId: department.id,
        accountType: ZakatFundType.FUND,
        amount: '123.45',
        paymentDate: '2099-08-12',
        paymentMethod: 'cash',
        cashAccountId: department.cash_account_id,
        recipientName: 'Automated verification recipient',
        reference: `ZF-PAY-${suffix}`,
      },
      actor.id,
    );
    createdIds.push(payment.id);
    let summary = await service.dashboard({
      departmentId: department.id,
      accountType: ZakatFundType.FUND,
      calendarYear: 2099,
    });
    assert(
      summary.outstanding === '123.45',
      `Expected 123.45 outstanding, received ${summary.outstanding}`,
    );
    const [cashPosting] = await dataSource.query(
      `SELECT entry_type, amount::numeric(18,2)::text AS amount
         FROM ledger_entries le JOIN chart_of_accounts coa ON coa.id=le.account_id
        WHERE le.source_type='zakat_fund' AND le.source_id=$1 AND coa.code='cash'`,
      [payment.id],
    );
    assert(
      cashPosting?.entry_type === 'credit' && cashPosting.amount === '123.45',
      'Payment did not reduce the selected department cash account',
    );
    const [expensePosting] = await dataSource.query(
      `SELECT entry_type, amount::numeric(18,2)::text AS amount
         FROM ledger_entries le JOIN chart_of_accounts coa ON coa.id=le.account_id
        WHERE le.source_type='zakat_fund' AND le.source_id=$1 AND coa.code='operating_expense'`,
      [payment.id],
    );
    assert(
      expensePosting?.entry_type === 'debit' &&
        expensePosting.amount === '123.45',
      'Payment did not increase the selected department operating expenses',
    );

    const settlement = await service.settle(
      {
        departmentId: department.id,
        accountType: ZakatFundType.FUND,
        calendarYear: 2099,
        settlementDate: '2099-12-31',
        allocationMethod: ZakatFundAllocationMethod.EQUAL,
        reference: `ZF-SET-${suffix}`,
        splits: [{ partyId: party.id }],
      },
      actor.id,
    );
    createdIds.push(settlement.id);
    summary = await service.dashboard({
      departmentId: department.id,
      accountType: ZakatFundType.FUND,
      calendarYear: 2099,
    });
    assert(
      summary.outstanding === '0.00' && summary.settled === '123.45',
      'Settlement did not clear the annual balance',
    );
    const [settledExpense] = await dataSource.query(
      `SELECT COALESCE(SUM(CASE WHEN entry_type='debit' THEN amount ELSE -amount END),0)::numeric(18,2)::text AS balance
         FROM ledger_entries le JOIN chart_of_accounts coa ON coa.id=le.account_id
        WHERE le.source_type='zakat_fund' AND le.source_id=ANY($1::uuid[]) AND coa.code='operating_expense'`,
      [createdIds],
    );
    assert(
      settledExpense.balance === '0.00',
      `Year-end allocation did not remove the department expense: ${settledExpense.balance}`,
    );

    const [partyRow] = await dataSource.query(
      `SELECT COALESCE(SUM(CASE WHEN entry_type='debit' THEN amount ELSE -amount END),0)::numeric(18,2)::text AS balance
         FROM ledger_entries WHERE source_type='zakat_fund' AND source_id=$1 AND party_id=$2`,
      [settlement.id, party.id],
    );
    assert(
      partyRow.balance === '123.45',
      `Expected party debit 123.45, received ${partyRow.balance}`,
    );

    await service.reverseSettlement(
      settlement.id,
      { reason: 'Automated lifecycle verification' },
      actor.id,
    );
    summary = await service.dashboard({
      departmentId: department.id,
      accountType: ZakatFundType.FUND,
      calendarYear: 2099,
    });
    assert(
      summary.outstanding === '123.45',
      'Settlement reversal did not restore outstanding balance',
    );
    await service.reversePayment(
      payment.id,
      { reason: 'Automated lifecycle verification' },
      actor.id,
    );
    summary = await service.dashboard({
      departmentId: department.id,
      accountType: ZakatFundType.FUND,
      calendarYear: 2099,
    });
    assert(
      summary.outstanding === '0.00' && summary.paid === '0.00',
      'Payment reversal did not clear the annual balance',
    );

    const [ledgerRow] = await dataSource.query(
      `SELECT COALESCE(SUM(CASE WHEN entry_type='debit' THEN amount ELSE -amount END),0)::numeric(18,2)::text AS balance
         FROM ledger_entries WHERE source_type='zakat_fund' AND source_id=ANY($1::uuid[])`,
      [createdIds],
    );
    assert(
      ledgerRow.balance === '0.00',
      `Lifecycle ledger is not balanced: ${ledgerRow.balance}`,
    );
    process.stdout.write('Zakat/fund lifecycle verification passed.\n');
  } finally {
    if (createdIds.length) {
      await dataSource.transaction(async (manager) => {
        await manager.query(
          `DELETE FROM ledger_entries WHERE source_type='zakat_fund' AND source_id=ANY($1::uuid[])`,
          [createdIds],
        );
        await manager.query(
          `DELETE FROM zakat_fund_settlement_splits WHERE settlement_id=ANY($1::uuid[])`,
          [createdIds],
        );
        await manager.query(
          `DELETE FROM zakat_fund_settlements WHERE id=ANY($1::uuid[])`,
          [createdIds],
        );
        await manager.query(
          `DELETE FROM zakat_fund_payments WHERE id=ANY($1::uuid[])`,
          [createdIds],
        );
      });
    }
    await app.close();
  }
}

void main().catch((error) => {
  process.stderr.write(
    `${error instanceof Error ? error.stack : String(error)}\n`,
  );
  process.exitCode = 1;
});
