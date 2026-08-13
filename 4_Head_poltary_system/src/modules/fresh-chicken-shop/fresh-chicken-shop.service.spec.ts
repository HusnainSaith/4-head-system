import { BadRequestException } from '@nestjs/common';
import { FreshChickenShopService } from './fresh-chicken-shop.service';
import { StockMovementSourceEnum } from '../inventory/enums/stock-movement.enum';
import { StockType } from '../inventory/enums/stock-type.enum';

describe('FreshChickenShopService batch model', () => {
  const manager = {
    create: jest.fn((_entity, value) => ({
      ...value,
      id: value.id ?? (value.quantityKg ? 'sale-1' : 'batch-1'),
    })),
    save: jest.fn(async (_entity, value) => value),
  };
  const inventoryService = {
    applySaleOut: jest.fn(),
    applyDressingBatch: jest.fn(),
  };
  const ledgerService = { post: jest.fn() };
  const dataSource = {
    transaction: jest.fn(async (work: (value: typeof manager) => unknown) =>
      work(manager),
    ),
  };
  const service = new FreshChickenShopService(
    {} as any,
    {} as any,
    inventoryService as any,
    ledgerService as any,
    dataSource as any,
  );

  beforeEach(() => {
    jest.clearAllMocks();
    (service as any).shopDeptId = 'shop-dept';
    inventoryService.applySaleOut.mockResolvedValue({ currentWac: 410 });
    inventoryService.applyDressingBatch.mockResolvedValue({
      liveWac: 410,
      dressedWac: 410,
      shrinkageKg: 60,
      processingLossAmount: 24_600,
    });
  });

  it('sells only dressed stock and persists backend-derived margin', async () => {
    const result = await service.createSale(
      {
        customerPartyId: '4c131a75-839d-4e2e-99e8-9f85a7931272',
        quantityKg: 45,
        ratePerKg: 480,
        amountReceived: 21_600,
        paymentMethod: 'cash',
        cashAccountId: '00000000-0000-4000-8000-000000000020',
        saleDate: '2026-07-15',
      },
      'user-1',
    );
    expect(inventoryService.applySaleOut).toHaveBeenCalledWith(
      'shop-dept',
      45,
      StockMovementSourceEnum.SALE,
      'sale-1',
      new Date('2026-07-15'),
      manager,
      StockType.DRESSED,
    );
    expect(result).toEqual(
      expect.objectContaining({
        quantityKg: '45.000',
        totalAmount: '21600.00',
        wacAtSale: '410.0000',
        profitMarginPerKg: '70.00',
      }),
    );
    expect(ledgerService.post).toHaveBeenCalledWith(
      expect.arrayContaining([
        expect.objectContaining({ accountCode: 'revenue', amount: '21600.00' }),
        expect.objectContaining({ accountCode: 'cogs', amount: '18450.00' }),
      ]),
      manager,
    );
  });

  it('creates a separate dressing batch and snapshots processing loss', async () => {
    const result = await service.createDressingBatch(
      {
        liveWeightKg: 250,
        dressedWeightKg: 190,
        batchDate: '2026-07-15',
      },
      'user-1',
    );
    expect(inventoryService.applyDressingBatch).toHaveBeenCalledWith(
      'shop-dept',
      250,
      190,
      'batch-1',
      new Date('2026-07-15'),
      'user-1',
      manager,
    );
    expect(result).toEqual(
      expect.objectContaining({
        liveWacAtProcessing: '410.0000',
        dressedCostPerKg: '410.0000',
        processingLossAmount: '24600.00',
      }),
    );
  });

  it('rejects a batch with dressed weight above live weight', async () => {
    await expect(
      service.createDressingBatch(
        {
          liveWeightKg: 45,
          dressedWeightKg: 46,
          batchDate: '2026-07-15',
        },
        'user-1',
      ),
    ).rejects.toBeInstanceOf(BadRequestException);
    expect(dataSource.transaction).not.toHaveBeenCalled();
  });
});
