import { TestingModule, Test } from '@nestjs/testing';
import { DataSource } from 'typeorm';
import { AppModule } from '../../src/app.module';
import { PartiesService } from '../../src/modules/parties/parties.service';
import { PartiesRepository } from '../../src/modules/parties/parties.repository';
import { LedgerService } from '../../src/modules/ledger/ledger.service';
import { Department } from '../../src/modules/departments/entities/department.entity';
import { ChartOfAccount } from '../../src/modules/ledger/entities/chart-of-account.entity';
import { Party } from '../../src/modules/parties/entities/party.entity';
import { PartyPayment } from '../../src/modules/parties/entities/party-payment.entity';
import { LedgerEntry } from '../../src/modules/ledger/entities/ledger-entry.entity';
import { PartyTypeEnum } from '../../src/common/types/party-type.enum';
import {
  PartyPaymentDirection,
  PartyPaymentMethod,
} from '../../src/modules/parties/dto/record-party-payment.dto';

describe('Parties database integration', () => {
  let module: TestingModule;
  let dataSource: DataSource;
  let service: PartiesService;
  let repository: PartiesRepository;
  let ledger: LedgerService;
  let departmentId: string;

  beforeAll(async () => {
    const database = process.env.DB_DATABASE ?? process.env.DB_NAME;
    if (!database?.toLowerCase().includes('test')) {
      throw new Error(
        'Parties integration tests require a disposable test database',
      );
    }
    module = await Test.createTestingModule({ imports: [AppModule] }).compile();
    dataSource = module.get(DataSource);
    service = module.get(PartiesService);
    repository = module.get(PartiesRepository);
    ledger = module.get(LedgerService);
  });

  beforeEach(async () => {
    await dataSource.query('DELETE FROM ledger_entries');
    await dataSource.query('DELETE FROM party_payments');
    await dataSource.query('DELETE FROM parties');
    await dataSource.query('DELETE FROM chart_of_accounts');
    await dataSource.query('DELETE FROM departments');
    const department = await dataSource.getRepository(Department).save({
      name: `Parties Test ${Date.now()}`,
      type: 'BROKERAGE',
      isActive: true,
    });
    departmentId = department.id;
    await dataSource.getRepository(ChartOfAccount).save([
      { code: 'cash', name: 'Cash', accountNature: 'asset' },
      { code: 'bank', name: 'Bank', accountNature: 'asset' },
      {
        code: 'accounts_receivable',
        name: 'Receivable',
        accountNature: 'asset',
      },
      { code: 'accounts_payable', name: 'Payable', accountNature: 'liability' },
    ]);
  });

  afterAll(async () => {
    await module.close();
  });

  it('paginates and filters persisted parties before counting', async () => {
    const partyRepo = dataSource.getRepository(Party);
    const fixtures = Array.from({ length: 25 }, (_, index) =>
      partyRepo.create({
        name: `Pagination ${String(index).padStart(2, '0')}`,
        partyType: index < 12 ? PartyTypeEnum.FARM : PartyTypeEnum.CUSTOMER,
        primaryDepartmentId: departmentId,
        openingBalance: '0.00',
      }),
    );
    await partyRepo.save(fixtures);

    const page = await repository.findAll({ page: 2, limit: 10 });
    expect(page.items).toHaveLength(10);
    expect(page.pagination).toEqual({
      page: 2,
      limit: 10,
      total: 25,
      totalPages: 3,
      hasNextPage: true,
      hasPreviousPage: true,
    });
    expect(new Set(page.items.map(({ id }) => id)).size).toBe(10);

    const farms = await repository.findAll({
      page: 1,
      limit: 10,
      type: PartyTypeEnum.FARM,
    });
    expect(farms.items).toHaveLength(10);
    expect(
      farms.items.every(({ partyType }) => partyType === PartyTypeEnum.FARM),
    ).toBe(true);
    expect(farms.pagination.total).toBe(12);
    expect(farms.pagination.totalPages).toBe(2);
  });

  it('persists received and paid payments with linked double entries', async () => {
    const receivable = (
      await service.create({
        name: 'INT-RECEIVABLE',
        partyType: PartyTypeEnum.CUSTOMER,
        primaryDepartmentId: departmentId,
        openingBalance: 1000,
      })
    ).data;
    const received = (
      await service.recordPayment(receivable.id, {
        amount: 250,
        direction: PartyPaymentDirection.RECEIVED,
        paymentMethod: PartyPaymentMethod.CASH,
        paymentDate: '2026-07-12',
      })
    ).data;
    const receivedEntries = await dataSource.getRepository(LedgerEntry).find({
      where: { sourceId: received.id },
      order: { entryType: 'ASC' },
    });
    expect(received.amount).toBe('250.00');
    expect(receivedEntries).toHaveLength(2);
    expect(
      receivedEntries.every(({ sourceId }) => sourceId === received.id),
    ).toBe(true);
    expect((await ledger.getPartyStatement(receivable.id)).closingBalance).toBe(
      '750.00',
    );

    const payable = (
      await service.create({
        name: 'INT-PAYABLE',
        partyType: PartyTypeEnum.FARM,
        primaryDepartmentId: departmentId,
        openingBalance: -600,
      })
    ).data;
    const paid = (
      await service.recordPayment(payable.id, {
        amount: 200,
        direction: PartyPaymentDirection.PAID,
        paymentMethod: PartyPaymentMethod.BANK,
        paymentDate: '2026-07-12',
      })
    ).data;
    const paidEntries = await dataSource.getRepository(LedgerEntry).find({
      where: { sourceId: paid.id },
    });
    expect(paidEntries).toHaveLength(2);
    expect(
      paidEntries.find(({ partyId }) => partyId === payable.id)?.entryType,
    ).toBe('debit');
    expect((await ledger.getPartyStatement(payable.id)).closingBalance).toBe(
      '-400.00',
    );
  });

  it('rolls payment and ledger writes back when account resolution fails', async () => {
    const party = (
      await service.create({
        name: 'INT-ROLLBACK',
        partyType: PartyTypeEnum.CUSTOMER,
        primaryDepartmentId: departmentId,
        openingBalance: 100,
      })
    ).data;
    await dataSource.getRepository(ChartOfAccount).delete({ code: 'cash' });
    const before = (await ledger.getPartyStatement(party.id)).closingBalance;

    await expect(
      service.recordPayment(party.id, {
        amount: 10,
        direction: PartyPaymentDirection.RECEIVED,
        paymentMethod: PartyPaymentMethod.CASH,
        paymentDate: '2026-07-12',
      }),
    ).rejects.toThrow();

    expect(
      await dataSource
        .getRepository(PartyPayment)
        .count({ where: { partyId: party.id } }),
    ).toBe(0);
    expect((await ledger.getPartyStatement(party.id)).closingBalance).toBe(
      before,
    );
  });

  it('calculates a deterministic persisted statement in integer cents', async () => {
    const party = (
      await service.create({
        name: 'INT-STATEMENT-1000-250-12550',
        partyType: PartyTypeEnum.CUSTOMER,
        primaryDepartmentId: departmentId,
        openingBalance: 1000,
      })
    ).data;
    await service.recordPayment(party.id, {
      amount: 250,
      direction: PartyPaymentDirection.RECEIVED,
      paymentMethod: PartyPaymentMethod.CASH,
      paymentDate: '2026-07-12',
    });
    await ledger.post([
      {
        departmentId,
        accountCode: 'accounts_receivable',
        partyId: party.id,
        entryType: 'debit',
        amount: '125.50',
        entryDate: new Date('2026-07-12'),
        sourceType: 'payment',
        sourceId: '00000000-0000-4000-8000-000000000125',
        description: 'Integration adjustment',
      },
    ]);
    const statement = await ledger.getPartyStatement(party.id);
    expect(
      statement.entries.map(({ runningBalance }) => runningBalance),
    ).toEqual(['1000.00', '750.00', '875.50']);
    expect(statement.closingBalance).toBe('875.50');
    process.stdout.write(
      `PARTY_STATEMENT_FIXTURE ${party.id} ${JSON.stringify(statement)}\n`,
    );
  });
});
