import { INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { DataSource } from 'typeorm';
import * as request from 'supertest';
import { AppModule } from '../../src/app.module';
import { StockMovement } from '../../src/modules/inventory/entities/stock-movement.entity';
import { Expense } from '../../src/modules/expenses/entities/expense.entity';
import { CashAccount } from '../../src/modules/accounts/entities/cash-account.entity';
import { Department } from '../../src/modules/departments/entities/department.entity';

interface Envelope<T> {
  data: T;
}
interface Stock {
  quantityKg: string;
  wac: string;
}
interface StockPools {
  live: Stock;
  dressed: Stock;
}

describe('Shop live-to-dressed and Wastage shrinkage persisted flow', () => {
  let app: INestApplication;
  let agent: ReturnType<typeof request.agent>;
  let dataSource: DataSource;

  async function cashAccountId(
    departmentType: Department['type'],
  ): Promise<string> {
    const department = await dataSource
      .getRepository(Department)
      .findOneByOrFail({ type: departmentType });
    const account = await dataSource
      .getRepository(CashAccount)
      .findOneByOrFail({ departmentId: department.id });
    return account.id;
  }

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
      .send({
        email: 'admin@poultry.local',
        password: 'Admin@123',
      })
      .expect(200);
  });

  afterAll(async () => app.close());

  it('persists exact stock, movement, expense, and snapshot values', async () => {
    const supplyCashAccountId = await cashAccountId('SUPPLY');
    const shopCashAccountId = await cashAccountId('FRESH_CHICKEN_SHOP');
    const wastageCashAccountId = await cashAccountId('WASTAGE');
    await agent
      .post('/supply/purchases')
      .send({
        quantityKg: 400,
        ratePerKg: 410,
        paymentMethod: 'cash',
        cashAccountId: supplyCashAccountId,
        amountPaid: 164000,
        purchaseDate: '2026-07-16',
      })
      .expect(201);
    await agent
      .post('/supply/internal-transfers')
      .send({
        quantityKg: 400,
        internalRatePerKg: 410,
        transferDate: '2026-07-16',
        notes: 'Live-to-dressed e2e fixture',
      })
      .expect(201);

    const beforeResponse = await agent.get('/shop/stock').expect(200);
    const before = (beforeResponse.body as Envelope<StockPools>).data;
    const batchResponse = await agent.post('/shop/dressing-batches').send({
      liveWeightKg: 250,
      dressedWeightKg: 190,
      batchDate: '2026-07-16',
      notes: 'Separate dressing batch e2e fixture',
    });
    if (batchResponse.status !== 201) {
      throw new Error(
        `Dressing batch failed: ${JSON.stringify(batchResponse.body)}`,
      );
    }
    const batch = (batchResponse.body as Envelope<any>).data;
    expect(batch).toEqual(
      expect.objectContaining({
        liveWeightKg: '250.000',
        dressedWeightKg: '190.000',
        shrinkageKg: '60.000',
      }),
    );
    const lockedWac = Number(batch.liveWacAtProcessing);
    expect(Number(batch.processingLossAmount)).toBeCloseTo(60 * lockedWac, 2);
    const afterBatchResponse = await agent.get('/shop/stock').expect(200);
    const afterBatch = (afterBatchResponse.body as Envelope<StockPools>).data;
    expect(
      Number(before.live.quantityKg) - Number(afterBatch.live.quantityKg),
    ).toBe(250);
    expect(
      Number(afterBatch.dressed.quantityKg) - Number(before.dressed.quantityKg),
    ).toBe(190);

    const saleResponse = await agent
      .post('/shop/sales')
      .send({
        quantityKg: 190,
        ratePerKg: 480,
        paymentMethod: 'cash',
        cashAccountId: shopCashAccountId,
        amountReceived: 91200,
        saleDate: '2026-07-16',
        notes: 'Dressed stock e2e sale',
      })
      .expect(201);
    const sale = (saleResponse.body as Envelope<any>).data;
    expect(sale).toEqual(
      expect.objectContaining({
        quantityKg: '190.000',
        totalAmount: '91200.00',
      }),
    );
    const afterSaleResponse = await agent.get('/shop/stock').expect(200);
    const afterSale = (afterSaleResponse.body as Envelope<StockPools>).data;
    expect(
      Number(afterBatch.dressed.quantityKg) -
        Number(afterSale.dressed.quantityKg),
    ).toBe(190);

    const movements = await dataSource.getRepository(StockMovement).find({
      where: { sourceType: 'dressing_batch' as any, sourceId: batch.id },
      order: { movementType: 'ASC' },
    });
    expect(movements).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          movementType: 'dressing_out',
          quantityKg: '250.000',
          stockType: 'live',
        }),
        expect.objectContaining({
          movementType: 'dressing_in',
          quantityKg: '190.000',
          stockType: 'dressed',
        }),
      ]),
    );
    const lossExpense = await dataSource
      .getRepository(Expense)
      .findOneByOrFail({
        sourceType: 'processing_loss',
        sourceId: batch.id,
      } as any);
    expect(Number(lossExpense.amount)).toBeCloseTo(60 * lockedWac, 2);

    await agent
      .post('/wastage/purchases')
      .send({
        quantityKg: 5,
        ratePerKg: 40,
        paymentMethod: 'cash',
        cashAccountId: wastageCashAccountId,
        amountPaid: 200,
        purchaseDate: '2026-07-15',
      })
      .expect(201);
    const wastageBeforeResponse = await agent.get('/wastage/stock').expect(200);
    const wastageBefore = Number(
      (wastageBeforeResponse.body as Envelope<Stock>).data.quantityKg,
    );
    const writeoffResponse = await agent
      .post('/wastage/stock/writeoffs')
      .send({
        quantityKg: 2,
        reason: 'spoilage',
        note: 'Wastage shrinkage e2e fixture',
        writeoffDate: '2026-07-15',
      })
      .expect(201);
    const writeoff = (writeoffResponse.body as Envelope<any>).data;
    expect(Number(writeoff.valuationAmount)).toBeCloseTo(
      2 * Number((wastageBeforeResponse.body as Envelope<Stock>).data.wac),
      2,
    );
    const wastageAfterResponse = await agent.get('/wastage/stock').expect(200);
    const wastageAfter = Number(
      (wastageAfterResponse.body as Envelope<Stock>).data.quantityKg,
    );
    expect(wastageBefore - wastageAfter).toBe(2);
    const writeoffMovement = await dataSource
      .getRepository(StockMovement)
      .findOneByOrFail({
        sourceType: 'stock_writeoff' as any,
        sourceId: writeoff.id,
      });
    expect(writeoffMovement.movementType).toBe('writeoff_out');
    console.log(
      'SHOP_LIVE_DRESSED_E2E',
      JSON.stringify({
        liveStockBefore: before.live.quantityKg,
        liveStockAfterBatch: afterBatch.live.quantityKg,
        dressedStockBefore: before.dressed.quantityKg,
        dressedStockAfterBatch: afterBatch.dressed.quantityKg,
        dressedStockAfterSale: afterSale.dressed.quantityKg,
        batch,
        sale: {
          quantityKg: sale.quantityKg,
          ratePerKg: sale.ratePerKg,
          wacAtSale: sale.wacAtSale,
          totalAmount: sale.totalAmount,
          cogsAmount: sale.cogsAmount,
          profitMarginPerKg: sale.profitMarginPerKg,
        },
        movements: movements.map((movement) => ({
          type: movement.movementType,
          quantityKg: movement.quantityKg,
          ratePerKg: movement.ratePerKg,
        })),
        expenseAmount: lossExpense.amount,
        wastage: {
          stockBefore: wastageBefore,
          stockAfter: wastageAfter,
          quantityKg: writeoff.quantityKg,
          valuationAmount: writeoff.valuationAmount,
          movementType: writeoffMovement.movementType,
        },
      }),
    );
  });

  it('accepts the same shrinkage flow for Brokerage, Supply, and Shop', async () => {
    const brokerageCashAccountId = await cashAccountId('BROKERAGE');
    const supplyCashAccountId = await cashAccountId('SUPPLY');
    await agent
      .post('/brokerage/purchases')
      .send({
        quantityKg: 1,
        ratePerKg: 100,
        paymentMethod: 'cash',
        cashAccountId: brokerageCashAccountId,
        amountPaid: 100,
        purchaseDate: '2026-07-15',
      })
      .expect(201);
    await agent
      .post('/supply/purchases')
      .send({
        quantityKg: 2,
        ratePerKg: 100,
        paymentMethod: 'cash',
        cashAccountId: supplyCashAccountId,
        amountPaid: 200,
        purchaseDate: '2026-07-15',
      })
      .expect(201);
    await agent
      .post('/supply/internal-transfers')
      .send({
        quantityKg: 1,
        internalRatePerKg: 100,
        transferDate: '2026-07-15',
        notes: 'Universal shrinkage e2e fixture',
      })
      .expect(201);

    for (const department of ['brokerage', 'supply', 'shop']) {
      const beforeResponse = await agent
        .get(`/${department}/stock`)
        .expect(200);
      const beforeData = (beforeResponse.body as Envelope<Stock | StockPools>)
        .data;
      const before = Number(
        department === 'shop'
          ? (beforeData as StockPools).live.quantityKg
          : (beforeData as Stock).quantityKg,
      );
      const response = await agent
        .post(`/${department}/stock/writeoffs`)
        .send({
          quantityKg: 0.5,
          reason: 'other',
          note: `Universal shrinkage ${department} e2e fixture`,
          writeoffDate: '2026-07-15',
          ...(department === 'shop' ? { stockType: 'live' } : {}),
        })
        .expect(201);
      const writeoff = (response.body as Envelope<any>).data;
      const afterResponse = await agent.get(`/${department}/stock`).expect(200);
      const afterData = (afterResponse.body as Envelope<Stock | StockPools>)
        .data;
      const after = Number(
        department === 'shop'
          ? (afterData as StockPools).live.quantityKg
          : (afterData as Stock).quantityKg,
      );
      expect(before - after).toBe(0.5);
      const movement = await dataSource
        .getRepository(StockMovement)
        .findOneByOrFail({
          sourceType: 'stock_writeoff' as any,
          sourceId: writeoff.id,
        });
      expect(movement.movementType).toBe('writeoff_out');
    }
  });
});
