import { INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { DataSource } from 'typeorm';
import * as request from 'supertest';
import { AppModule } from '../../src/app.module';
import { Department } from '../../src/modules/departments/entities/department.entity';
import { SupplyPurchase } from '../../src/modules/supply/entities/supply-purchase.entity';
import { BrokerageSale } from '../../src/modules/brokerage/entities/brokerage-sale.entity';
import { CashAccount } from '../../src/modules/accounts/entities/cash-account.entity';

interface Envelope<T> {
  data: T;
}
interface Stock {
  quantityKg: string;
  wac: string;
}

describe('Atomic Brokerage to Supply flow', () => {
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

  afterAll(async () => app.close());

  it('creates the mirrored purchase, transfers stock, and supports different shop-owner rates', async () => {
    const date = '2026-07-17';
    const brokerageDepartment = await dataSource
      .getRepository(Department)
      .findOneByOrFail({ type: 'BROKERAGE' });
    const brokerageCashAccount = await dataSource
      .getRepository(CashAccount)
      .findOneByOrFail({ departmentId: brokerageDepartment.id });
    const supplyDepartment = await dataSource
      .getRepository(Department)
      .findOneByOrFail({ type: 'SUPPLY' });
    const supplyCashAccount = await dataSource
      .getRepository(CashAccount)
      .findOneByOrFail({ departmentId: supplyDepartment.id });
    const brokerageBeforeResponse = await agent.get('/brokerage/stock');
    if (brokerageBeforeResponse.status !== 200)
      throw new Error(
        `Brokerage stock failed (${brokerageBeforeResponse.status}): ${JSON.stringify(brokerageBeforeResponse.body)}`,
      );
    const brokerageBefore = (brokerageBeforeResponse.body as Envelope<Stock>)
      .data;
    const supplyBefore = (
      (await agent.get('/supply/stock').expect(200)).body as Envelope<Stock>
    ).data;
    const consolidatedBefore = (
      (
        await agent
          .get(`/reports/consolidated-profit-loss?from=${date}&to=${date}`)
          .expect(200)
      ).body as Envelope<{ externalRevenue: string }>
    ).data;

    await agent
      .post('/brokerage/purchases')
      .send({
        quantityKg: 30,
        ratePerKg: 300,
        paymentMethod: 'cash',
        cashAccountId: brokerageCashAccount.id,
        amountPaid: 9000,
        purchaseDate: date,
        description: 'Brokerage to Supply e2e farm purchase',
      })
      .expect(201);
    const brokerageAfterFarmPurchase = (
      (await agent.get('/brokerage/stock').expect(200)).body as Envelope<Stock>
    ).data;

    const transferResponse = await agent
      .post('/brokerage/sales')
      .send({
        destinationType: 'supply',
        quantityKg: 30,
        ratePerKg: 320,
        paymentMethod: 'credit',
        amountReceived: 1600,
        saleDate: date,
        description: 'Automatic Brokerage to Supply e2e transfer',
      })
      .expect(201);
    const brokerageSale = (transferResponse.body as Envelope<any>).data;
    const brokerageAfterTransfer = (
      (await agent.get('/brokerage/stock').expect(200)).body as Envelope<Stock>
    ).data;
    const supplyAfterTransfer = (
      (await agent.get('/supply/stock').expect(200)).body as Envelope<Stock>
    ).data;

    expect(
      Number(brokerageAfterFarmPurchase.quantityKg) -
        Number(brokerageBefore.quantityKg),
    ).toBe(30);
    expect(
      Number(brokerageAfterFarmPurchase.quantityKg) -
        Number(brokerageAfterTransfer.quantityKg),
    ).toBe(30);
    expect(
      Number(supplyAfterTransfer.quantityKg) - Number(supplyBefore.quantityKg),
    ).toBe(30);
    expect(brokerageSale.destinationType).toBe('supply');
    const consolidatedAfterTransfer = (
      (
        await agent
          .get(`/reports/consolidated-profit-loss?from=${date}&to=${date}`)
          .expect(200)
      ).body as Envelope<{ externalRevenue: string }>
    ).data;
    expect(consolidatedAfterTransfer.externalRevenue).toBe(
      consolidatedBefore.externalRevenue,
    );

    const mirroredPurchase = await dataSource
      .getRepository(SupplyPurchase)
      .findOneByOrFail({ sourceBrokerageSaleId: brokerageSale.id });
    expect(mirroredPurchase).toEqual(
      expect.objectContaining({
        quantityKg: '30.000',
        ratePerKg: '320.00',
        totalAmount: '9600.00',
        amountPaid: '1600.00',
        outstandingAmount: '8000.00',
        paymentMethod: 'credit',
        status: 'posted',
      }),
    );
    const supplyPurchases = (
      (await agent.get('/supply/purchases?page=1&limit=100').expect(200))
        .body as Envelope<{ items: SupplyPurchase[] }>
    ).data.items;
    expect(
      supplyPurchases.some((purchase) => purchase.id === mirroredPurchase.id),
    ).toBe(true);

    const autoPurchasesBeforePayment = await dataSource
      .getRepository(SupplyPurchase)
      .createQueryBuilder('purchase')
      .where('purchase.source_brokerage_sale_id IS NOT NULL')
      .andWhere('purchase.status = :status', { status: 'posted' })
      .getMany();
    const linkedSaleIds = autoPurchasesBeforePayment.map(
      (purchase) => purchase.sourceBrokerageSaleId as string,
    );
    const linkedSalesBeforePayment = await dataSource
      .getRepository(BrokerageSale)
      .createQueryBuilder('sale')
      .where('sale.id IN (:...ids)', { ids: linkedSaleIds })
      .getMany();
    const paidBefore = autoPurchasesBeforePayment.reduce(
      (sum, purchase) => sum + Number(purchase.amountPaid),
      0,
    );
    const purchaseOutstandingBefore = autoPurchasesBeforePayment.reduce(
      (sum, purchase) => sum + Number(purchase.outstandingAmount),
      0,
    );
    const receivedBefore = linkedSalesBeforePayment.reduce(
      (sum, sale) => sum + Number(sale.amountReceived),
      0,
    );
    const saleOutstandingBefore = linkedSalesBeforePayment.reduce(
      (sum, sale) => sum + Number(sale.outstandingAmount),
      0,
    );

    await agent
      .post(`/parties/${mirroredPurchase.partyId}/payments`)
      .send({
        departmentId: mirroredPurchase.departmentId,
        amount: 8000,
        direction: 'paid',
        paymentDate: date,
        paymentMethod: 'cash',
        cashAccountId: supplyCashAccount.id,
        notes: 'Full settlement of automatic Brokerage purchase',
      })
      .expect(201);
    const autoPurchasesAfterPayment = await dataSource
      .getRepository(SupplyPurchase)
      .createQueryBuilder('purchase')
      .where('purchase.source_brokerage_sale_id IS NOT NULL')
      .andWhere('purchase.status = :status', { status: 'posted' })
      .getMany();
    const linkedSalesAfterPayment = await dataSource
      .getRepository(BrokerageSale)
      .createQueryBuilder('sale')
      .where('sale.id IN (:...ids)', { ids: linkedSaleIds })
      .getMany();
    const paidAfter = autoPurchasesAfterPayment.reduce(
      (sum, purchase) => sum + Number(purchase.amountPaid),
      0,
    );
    const purchaseOutstandingAfter = autoPurchasesAfterPayment.reduce(
      (sum, purchase) => sum + Number(purchase.outstandingAmount),
      0,
    );
    const receivedAfter = linkedSalesAfterPayment.reduce(
      (sum, sale) => sum + Number(sale.amountReceived),
      0,
    );
    const saleOutstandingAfter = linkedSalesAfterPayment.reduce(
      (sum, sale) => sum + Number(sale.outstandingAmount),
      0,
    );
    expect(paidAfter - paidBefore).toBe(8000);
    expect(purchaseOutstandingBefore - purchaseOutstandingAfter).toBe(8000);
    expect(receivedAfter - receivedBefore).toBe(8000);
    expect(saleOutstandingBefore - saleOutstandingAfter).toBe(8000);

    const stamp = Date.now();
    const ownerAResponse = await agent
      .post('/parties')
      .send({
        partyType: 'shop_owner',
        name: `Supply flow Shop Owner A ${stamp}`,
        departmentIds: [supplyDepartment.id],
      })
      .expect(201);
    const ownerBResponse = await agent
      .post('/parties')
      .send({
        partyType: 'shop_owner',
        name: `Supply flow Shop Owner B ${stamp}`,
        departmentIds: [supplyDepartment.id],
      })
      .expect(201);
    const ownerA = (ownerAResponse.body as Envelope<any>).data;
    const ownerB = (ownerBResponse.body as Envelope<any>).data;

    const saleAResponse = await agent
      .post('/supply/sales')
      .send({
        partyId: ownerA.id,
        quantityKg: 10,
        ratePerKg: 350,
        paymentMethod: 'credit',
        amountReceived: 0,
        saleDate: date,
      })
      .expect(201);
    const saleBResponse = await agent
      .post('/supply/sales')
      .send({
        partyId: ownerB.id,
        quantityKg: 20,
        ratePerKg: 365,
        paymentMethod: 'credit',
        amountReceived: 0,
        saleDate: date,
      })
      .expect(201);
    const saleA = (saleAResponse.body as Envelope<any>).data;
    const saleB = (saleBResponse.body as Envelope<any>).data;
    const supplyAfterShopSales = (
      (await agent.get('/supply/stock').expect(200)).body as Envelope<Stock>
    ).data;

    expect(
      Number(supplyAfterTransfer.quantityKg) -
        Number(supplyAfterShopSales.quantityKg),
    ).toBe(30);
    expect(saleA).toEqual(
      expect.objectContaining({
        partyId: ownerA.id,
        quantityKg: '10.000',
        ratePerKg: '350.00',
        totalAmount: '3500.00',
      }),
    );
    expect(saleB).toEqual(
      expect.objectContaining({
        partyId: ownerB.id,
        quantityKg: '20.000',
        ratePerKg: '365.00',
        totalAmount: '7300.00',
      }),
    );

    console.log(
      'BROKERAGE_SUPPLY_E2E',
      JSON.stringify({
        brokerageStock: {
          before: brokerageBefore.quantityKg,
          afterFarmPurchase: brokerageAfterFarmPurchase.quantityKg,
          afterTransfer: brokerageAfterTransfer.quantityKg,
        },
        supplyStock: {
          before: supplyBefore.quantityKg,
          afterTransfer: supplyAfterTransfer.quantityKg,
          afterShopSales: supplyAfterShopSales.quantityKg,
        },
        mirroredPurchase: {
          id: mirroredPurchase.id,
          sourceBrokerageSaleId: mirroredPurchase.sourceBrokerageSaleId,
          quantityKg: mirroredPurchase.quantityKg,
          ratePerKg: mirroredPurchase.ratePerKg,
          totalAmount: mirroredPurchase.totalAmount,
        },
        consolidatedExternalRevenue: {
          beforeTransfer: consolidatedBefore.externalRevenue,
          afterTransfer: consolidatedAfterTransfer.externalRevenue,
        },
        shopOwnerSales: [
          {
            owner: ownerA.name,
            ratePerKg: saleA.ratePerKg,
            total: saleA.totalAmount,
          },
          {
            owner: ownerB.name,
            ratePerKg: saleB.ratePerKg,
            total: saleB.totalAmount,
          },
        ],
      }),
    );
  });
});
