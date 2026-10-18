import { FreshChickenShopService } from './fresh-chicken-shop.service';
import { LedgerEntry } from '../ledger/entities/ledger-entry.entity';
import { StockMovement } from '../inventory/entities/stock-movement.entity';

describe('Shop purchase statement date and note editing', () => {
  let service: FreshChickenShopService, manager: any, purchase: any;
  beforeEach(() => {
    purchase = {
      id: 'purchase',
      purchaseDate: new Date('2026-10-01'),
      quantityKg: '10.000',
      totalAmount: '250.00',
      amountPaid: '100.00',
      notes: 'Old',
    };
    manager = {
      findOne: jest.fn().mockResolvedValue(purchase),
      update: jest.fn(),
      save: jest
        .fn()
        .mockImplementation(async (_entity: any, value: any) => value),
    };
    service = new FreshChickenShopService(
      {} as any,
      {} as any,
      {} as any,
      {} as any,
      { transaction: async (fn: any) => fn(manager) } as any,
    );
    (service as any).shopDeptId = 'shop';
  });
  it('moves ledger and stock dates together without changing financial amounts', async () => {
    await service.updatePurchase(
      'purchase',
      { purchaseDate: '2026-10-02', notes: 'Updated' },
      'actor',
    );
    expect(manager.update).toHaveBeenCalledWith(
      LedgerEntry,
      { sourceType: 'purchase', sourceId: 'purchase' },
      { entryDate: '2026-10-02' },
    );
    expect(manager.update).toHaveBeenCalledWith(
      StockMovement,
      expect.anything(),
      { movementDate: new Date('2026-10-02') },
    );
    expect(purchase).toMatchObject({
      quantityKg: '10.000',
      totalAmount: '250.00',
      amountPaid: '100.00',
      notes: 'Updated',
      updatedBy: 'actor',
    });
    expect(manager.findOne).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({
        where: expect.objectContaining({
          departmentId: 'shop',
          status: 'posted',
        }),
        lock: { mode: 'pessimistic_write' },
      }),
    );
  });
  it('refuses absent, cancelled, or other department purchases without writes', async () => {
    manager.findOne.mockResolvedValue(null);
    await expect(
      service.updatePurchase('missing', { notes: 'Updated' }, 'actor'),
    ).rejects.toThrow('not found');
    expect(manager.update).not.toHaveBeenCalled();
    expect(manager.save).not.toHaveBeenCalled();
  });
});
