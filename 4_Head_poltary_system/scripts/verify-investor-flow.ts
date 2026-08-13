import { randomUUID } from 'crypto';
import * as assert from 'node:assert/strict';
import { DataSource, EntityManager } from 'typeorm';
import { AppDataSource } from '../src/config/data-source';
import {
  InvestorAccountAction,
  RecordInvestorAccountTransactionDto,
} from '../src/modules/investor-management/dto/investor.dto';
import { InvestorCapitalTransaction } from '../src/modules/investor-management/entities/investor-capital-transaction.entity';
import {
  Investor,
  InvestorType,
} from '../src/modules/investor-management/entities/investor.entity';
import { InvestorManagementService } from '../src/modules/investor-management/investor-management.service';
import { ChartOfAccount } from '../src/modules/ledger/entities/chart-of-account.entity';
import { LedgerEntry } from '../src/modules/ledger/entities/ledger-entry.entity';
import { LedgerRepository } from '../src/modules/ledger/ledger.repository';
import { LedgerService } from '../src/modules/ledger/ledger.service';
import { Party } from '../src/modules/parties/entities/party.entity';
import { ReportsService } from '../src/modules/reports/reports.service';

const DEPARTMENT_ID = '9941ecd2-7e9b-4d33-a3e5-d3c341869020';
const CASH_ACCOUNT_ID = '0a9f272a-fb71-4a76-b29c-9421b05ec080';
const FARM_ID = '47c5a5ef-7815-4862-ba3c-251ffc635416';
const DATE = '2026-08-12';

function scopedDataSource(source: DataSource, manager: EntityManager) {
  return {
    manager,
    query: (query: string, parameters?: unknown[]) =>
      manager.query(query, parameters),
    transaction: async (
      isolationOrCallback:
        string | ((transactionManager: EntityManager) => unknown),
      callback?: (transactionManager: EntityManager) => unknown,
    ) =>
      typeof isolationOrCallback === 'function'
        ? isolationOrCallback(manager)
        : callback!(manager),
    getRepository: source.getRepository.bind(source),
  } as unknown as DataSource;
}

async function balance(manager: EntityManager, investorId: string) {
  const row = await manager.query(
    `SELECT COALESCE(SUM(CASE WHEN transaction_type::text IN ('investment','additional_investment','manual_profit','farm_transfer') THEN amount ELSE -amount END),0)::text AS balance
       FROM investor_capital_transactions WHERE investor_id=$1 AND deleted_at IS NULL`,
    [investorId],
  );
  return Number(row[0].balance);
}

async function synchronizedPartyBalance(
  manager: EntityManager,
  investorId: string,
) {
  const row = await manager.query(
    `SELECT COALESCE(SUM(CASE WHEN entry.entry_type='credit' THEN entry.amount ELSE -entry.amount END),0)::text AS balance
       FROM investors investor LEFT JOIN ledger_entries entry ON entry.party_id=investor.party_id
      WHERE investor.id=$1`,
    [investorId],
  );
  return Number(row[0].balance);
}

async function farmPayable(manager: EntityManager) {
  const row = await manager.query(
    `SELECT COALESCE(SUM(CASE WHEN entry.entry_type='credit' THEN entry.amount ELSE -entry.amount END),0)::text AS balance
       FROM ledger_entries entry JOIN chart_of_accounts account ON account.id=entry.account_id
      WHERE entry.party_id=$1 AND entry.department_id=$2 AND account.code::text='accounts_payable'`,
    [FARM_ID, DEPARTMENT_ID],
  );
  return Number(row[0].balance);
}

async function main() {
  await AppDataSource.initialize();
  const runner = AppDataSource.createQueryRunner();
  await runner.connect();
  await runner.startTransaction('SERIALIZABLE');
  try {
    const manager = runner.manager;
    const ledger = new LedgerService(
      new LedgerRepository(
        AppDataSource.getRepository(LedgerEntry),
        AppDataSource.getRepository(ChartOfAccount),
      ),
    );
    const service = new InvestorManagementService(
      scopedDataSource(AppDataSource, manager),
      ledger,
      {} as ReportsService,
    );
    const investors = await manager.find(Investor);
    const standard = investors.find(
      (item) => item.investorType === InvestorType.STANDARD,
    );
    const brother = investors.find(
      (item) => item.investorType === InvestorType.BROTHER,
    );
    assert(standard, 'A standard investor is required');
    assert(brother, 'A Brother investor is required');
    assert(await manager.findOne(Party, { where: { id: FARM_ID } }));

    const actor =
      (
        await manager.query(`SELECT id FROM users ORDER BY created_at LIMIT 1`)
      )[0]?.id ?? randomUUID();
    const reference = `VERIFY-${Date.now()}`;
    const record = (
      investorId: string,
      dto: RecordInvestorAccountTransactionDto,
    ) => service.recordAccountTransaction(investorId, dto, actor);

    const standardOpening = await balance(manager, standard.id);
    const standardPartyOpening = await synchronizedPartyBalance(
      manager,
      standard.id,
    );
    await record(standard.id, {
      action: InvestorAccountAction.DEPOSIT,
      departmentId: DEPARTMENT_ID,
      amount: '100000.00',
      transactionDate: DATE,
      paymentMethod: 'cash',
      cashAccountId: CASH_ACCOUNT_ID,
      reference: `${reference}-STD-DEPOSIT`,
    });
    await record(standard.id, {
      action: InvestorAccountAction.PROFIT,
      departmentId: DEPARTMENT_ID,
      amount: '10000.00',
      transactionDate: DATE,
      reference: `${reference}-STD-PROFIT`,
    });
    await record(standard.id, {
      action: InvestorAccountAction.LOSS,
      departmentId: DEPARTMENT_ID,
      amount: '5000.00',
      transactionDate: DATE,
      reference: `${reference}-STD-LOSS`,
    });
    await record(standard.id, {
      action: InvestorAccountAction.WITHDRAWAL,
      departmentId: DEPARTMENT_ID,
      amount: '25000.00',
      transactionDate: DATE,
      paymentMethod: 'cash',
      cashAccountId: CASH_ACCOUNT_ID,
      reference: `${reference}-STD-WITHDRAW`,
    });
    assert.equal(await balance(manager, standard.id), standardOpening + 80000);
    assert.equal(
      await synchronizedPartyBalance(manager, standard.id),
      standardPartyOpening + 80000,
    );
    const standardCurrent = await synchronizedPartyBalance(
      manager,
      standard.id,
    );
    await assert.rejects(
      record(standard.id, {
        action: InvestorAccountAction.WITHDRAWAL,
        departmentId: DEPARTMENT_ID,
        amount: `${standardCurrent + 1}.00`,
        transactionDate: DATE,
        paymentMethod: 'cash',
        cashAccountId: CASH_ACCOUNT_ID,
      }),
      /exceeds the current principal/,
    );
    await assert.rejects(
      record(standard.id, {
        action: InvestorAccountAction.PROFIT,
        departmentId: DEPARTMENT_ID,
        amount: '1.00',
        transactionDate: DATE,
        reference: `${reference}-STD-PROFIT`,
      }),
      /reference already exists/,
    );

    const payableOpening = await farmPayable(manager);
    await ledger.post(
      [
        {
          departmentId: DEPARTMENT_ID,
          accountCode: 'inventory',
          entryType: 'debit',
          amount: '200000.00',
          entryDate: new Date(DATE),
          sourceType: 'purchase',
          sourceId: randomUUID(),
          createdBy: actor,
        },
        {
          departmentId: DEPARTMENT_ID,
          accountCode: 'accounts_payable',
          partyId: FARM_ID,
          entryType: 'credit',
          amount: '200000.00',
          entryDate: new Date(DATE),
          sourceType: 'purchase',
          sourceId: randomUUID(),
          createdBy: actor,
        },
      ],
      manager,
    );
    const brotherOpening = await balance(manager, brother.id);
    const brotherPartyOpening = await synchronizedPartyBalance(
      manager,
      brother.id,
    );
    await record(brother.id, {
      action: InvestorAccountAction.FARM_TRANSFER,
      departmentId: DEPARTMENT_ID,
      farmPartyId: FARM_ID,
      amount: '50000.00',
      transactionDate: DATE,
      reference: `${reference}-BROTHER-FARM`,
    });
    assert.equal(await farmPayable(manager), payableOpening + 150000);
    await record(brother.id, {
      action: InvestorAccountAction.DEPOSIT,
      departmentId: DEPARTMENT_ID,
      amount: '100000.00',
      transactionDate: DATE,
      paymentMethod: 'cash',
      cashAccountId: CASH_ACCOUNT_ID,
      reference: `${reference}-BROTHER-DEPOSIT`,
    });
    await record(brother.id, {
      action: InvestorAccountAction.PROFIT,
      departmentId: DEPARTMENT_ID,
      amount: '2000.00',
      transactionDate: DATE,
      reference: `${reference}-BROTHER-PROFIT`,
    });
    await record(brother.id, {
      action: InvestorAccountAction.WITHDRAWAL,
      departmentId: DEPARTMENT_ID,
      amount: '30000.00',
      transactionDate: DATE,
      paymentMethod: 'cash',
      cashAccountId: CASH_ACCOUNT_ID,
      reference: `${reference}-BROTHER-WITHDRAW`,
    });
    assert.equal(await balance(manager, brother.id), brotherOpening + 122000);
    assert.equal(
      await synchronizedPartyBalance(manager, brother.id),
      brotherPartyOpening + 122000,
    );
    await assert.rejects(
      record(standard.id, {
        action: InvestorAccountAction.FARM_TRANSFER,
        departmentId: DEPARTMENT_ID,
        farmPartyId: FARM_ID,
        amount: '1.00',
        transactionDate: DATE,
      }),
      /only for the Brother/,
    );
    await assert.rejects(
      record(brother.id, {
        action: InvestorAccountAction.FARM_TRANSFER,
        departmentId: DEPARTMENT_ID,
        farmPartyId: FARM_ID,
        amount: `${payableOpening + 150001}.00`,
        transactionDate: DATE,
      }),
      /exceeds this farm payable balance/,
    );

    const rows = await manager.find(InvestorCapitalTransaction, {
      where: { investorId: brother.id },
    });
    assert(rows.some((item) => item.transactionType === 'farm_transfer'));
    console.log(
      'PASS standard investor and party balances both changed by +Rs 80,000',
    );
    console.log(
      'PASS standard validations: over-withdrawal and duplicate reference rejected',
    );
    console.log(
      'PASS Shafique investor and party balances both changed by +Rs 122,000',
    );
    console.log(
      'PASS Shafique validations: standard-account transfer and over-transfer rejected',
    );
    console.log(
      'PASS verification transaction rolled back; database balances were not changed',
    );
  } finally {
    await runner.rollbackTransaction();
    await runner.release();
    await AppDataSource.destroy();
  }
}

void main();
