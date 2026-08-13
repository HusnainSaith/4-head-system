import { INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { DataSource } from 'typeorm';
import * as request from 'supertest';
import { AppModule } from '../../src/app.module';
import { CashAccount } from '../../src/modules/accounts/entities/cash-account.entity';
import { BankAccount } from '../../src/modules/accounts/entities/bank-account.entity';
import { Department } from '../../src/modules/departments/entities/department.entity';

interface Envelope<T> {
  data: T;
}
interface Stock {
  quantityKg: string;
}
interface Transfer {
  id: string;
  totalAmount: string;
  amountSettled: string;
  remainingBalance: string;
  settlementStatus: string;
}
interface ReportView {
  revenue: string;
  cogs: string;
  grossProfit: string;
  operatingExpenses: string;
  payroll: string;
  netProfit: string;
}

describe('Supply internal transfer persisted cycle', () => {
  let app: INestApplication;
  let agent: ReturnType<typeof request.agent>;
  let dataSource: DataSource;

  beforeAll(async () => {
    const module = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();
    app = module.createNestApplication();
    await app.init();
    dataSource = app.get(DataSource);
    agent = request.agent(app.getHttpServer());
    await agent
      .post('/auth/login')
      .send({ email: 'admin@poultry.local', password: 'Admin@123' })
      .expect(200);
  });

  afterAll(async () => {
    await app.close();
  });

  it('decreases stock exactly once and moves through partial and full settlement', async () => {
    const supplyDepartment = await dataSource
      .getRepository(Department)
      .findOneByOrFail({ type: 'SUPPLY' });
    const supplyCashAccount = await dataSource
      .getRepository(CashAccount)
      .findOneByOrFail({ departmentId: supplyDepartment.id });
    const bankAccount = await dataSource
      .getRepository(BankAccount)
      .findOneByOrFail({ isActive: true });
    await agent
      .post('/supply/purchases')
      .send({
        quantityKg: 100,
        ratePerKg: 200,
        paymentMethod: 'cash',
        cashAccountId: supplyCashAccount.id,
        amountPaid: 20000,
        purchaseDate: '2026-07-01',
      })
      .expect(201);
    const beforeResponse = await agent.get('/supply/stock').expect(200);
    const before = Number(
      (beforeResponse.body as Envelope<Stock>).data.quantityKg,
    );

    const createdResponse = await agent
      .post('/supply/internal-transfers')
      .send({
        quantityKg: 100,
        internalRatePerKg: 300,
        transferDate: '2026-07-02',
        notes: 'Disposable e2e transfer',
      })
      .expect(201);
    const created = (createdResponse.body as Envelope<Transfer>).data;
    const afterCreateResponse = await agent.get('/supply/stock').expect(200);
    const afterCreate = Number(
      (afterCreateResponse.body as Envelope<Stock>).data.quantityKg,
    );
    expect(before - afterCreate).toBe(100);
    expect(created).toEqual(
      expect.objectContaining({
        totalAmount: '30000.00',
        amountSettled: '0.00',
        remainingBalance: '30000.00',
        settlementStatus: 'unsettled',
      }),
    );

    const partialResponse = await agent
      .post(`/supply/internal-transfers/${created.id}/settle`)
      .send({
        amount: 10000,
        settlementDate: '2026-07-03',
        paymentMethod: 'bank',
        bankAccountId: bankAccount.id,
        bankTransactionMethod: 'app',
      })
      .expect(201);
    const partial = (partialResponse.body as Envelope<Transfer>).data;
    expect(partial).toEqual(
      expect.objectContaining({
        amountSettled: '10000.00',
        remainingBalance: '20000.00',
        settlementStatus: 'partially_settled',
      }),
    );

    const finalResponse = await agent
      .post(`/supply/internal-transfers/${created.id}/settle`)
      .send({
        amount: 20000,
        settlementDate: '2026-07-04',
        paymentMethod: 'bank',
        bankAccountId: bankAccount.id,
        bankTransactionMethod: 'app',
      })
      .expect(201);
    const settled = (finalResponse.body as Envelope<Transfer>).data;
    expect(settled).toEqual(
      expect.objectContaining({
        amountSettled: '30000.00',
        remainingBalance: '0.00',
        settlementStatus: 'settled',
      }),
    );
    const afterSettlementResponse = await agent
      .get('/supply/stock')
      .expect(200);
    const afterSettlement = Number(
      (afterSettlementResponse.body as Envelope<Stock>).data.quantityKg,
    );
    expect(afterSettlement).toBe(afterCreate);

    const reportResponse = await agent
      .get('/supply/reports/profit-loss?from=2026-07-01&to=2026-07-31')
      .expect(200);
    const report = (
      reportResponse.body as Envelope<{
        externalOnly: ReportView;
        includingInternalTransfers: ReportView;
      }>
    ).data;
    expect(report.externalOnly).not.toEqual(report.includingInternalTransfers);

    process.stdout.write(
      `SUPPLY_TRANSFER_E2E ${JSON.stringify({ before, transferred: 100, afterCreate, created, partial, settled, afterSettlement, report })}\n`,
    );
  });
});
