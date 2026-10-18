import { FreshChickenShopService } from './fresh-chicken-shop.service';
import { StockType } from '../inventory/enums/stock-type.enum';
import { ShopPurchase } from './entities/shop-purchase.entity';

describe('Shop external live chicken purchases', () => {
  let service: FreshChickenShopService;
  let manager: any;
  let inventory: any;
  let ledger: any;
  beforeEach(() => {
    manager = {
      findOne: jest.fn(async () => ({ id: 'supplier', status: 'posted' })),
      create: jest.fn((_entity, value) => ({ id: 'purchase', ...value })),
      save: jest.fn(async (_entity, value) => value),
      softRemove: jest.fn(),
    };
    inventory = {
      applyPurchaseIn: jest.fn(),
      reverseSourceMovement: jest.fn(),
    };
    ledger = { post: jest.fn(), reverseSource: jest.fn() };
    service = new FreshChickenShopService(
      {} as any,
      {} as any,
      inventory,
      ledger,
      { transaction: async (work: any) => work(manager) } as any,
    );
    (service as any).shopDeptId = 'shop';
  });
  const dto = {
    partyId: 'supplier',
    quantityKg: 100,
    ratePerKg: 320,
    paymentMethod: 'credit' as const,
    amountPaid: 0,
    purchaseDate: '2026-10-04',
  };
  it.each([
    ['credit', 0, '32000.00'],
    ['cash', 10000, '22000.00'],
    ['bank', 32000, '0.00'],
  ])(
    'posts %s purchases to live inventory with correct payment balances',
    async (method, amount, outstanding) => {
      const account =
        method === 'cash'
          ? { cashAccountId: 'cash' }
          : method === 'bank'
            ? {
                bankAccountId: 'bank',
                bankTransactionMethod: 'app',
                appReference: 'reference',
              }
            : {};
      const result = await service.createPurchase(
        {
          ...dto,
          paymentMethod: method,
          amountPaid: amount,
          ...account,
        } as any,
        'actor',
      );
      expect(result).toMatchObject({
        departmentId: 'shop',
        totalAmount: '32000.00',
        outstandingAmount: outstanding,
      });
      expect(inventory.applyPurchaseIn).toHaveBeenCalledWith(
        'shop',
        100,
        320,
        'purchase',
        'purchase',
        new Date(dto.purchaseDate),
        manager,
        StockType.LIVE,
      );
      const entries = ledger.post.mock.calls[0][0];
      expect(
        entries.find((entry: any) => entry.accountCode === 'inventory'),
      ).toMatchObject({ entryType: 'debit', amount: '32000.00' });
      const debit = entries
        .filter((entry: any) => entry.entryType === 'debit')
        .reduce((sum: number, entry: any) => sum + Number(entry.amount), 0);
      const credit = entries
        .filter((entry: any) => entry.entryType === 'credit')
        .reduce((sum: number, entry: any) => sum + Number(entry.amount), 0);
      expect(debit).toBe(credit);
    },
  );
  it('rejects credit without a supplier and overpayments', async () => {
    await expect(
      service.createPurchase({ ...dto, partyId: undefined }, 'actor'),
    ).rejects.toThrow();
    await expect(
      service.createPurchase({ ...dto, amountPaid: 32001 }, 'actor'),
    ).rejects.toThrow();
    expect(manager.save).not.toHaveBeenCalled();
  });
  it('cancels purchases atomically and scopes the lookup to the shop', async () => {
    await service.deletePurchase('purchase', 'actor');
    expect(manager.findOne).toHaveBeenCalledWith(
      ShopPurchase,
      expect.objectContaining({
        where: expect.objectContaining({
          id: 'purchase',
          departmentId: 'shop',
          status: 'posted',
        }),
        lock: { mode: 'pessimistic_write' },
      }),
    );
    expect(inventory.reverseSourceMovement).toHaveBeenCalledWith(
      'shop',
      'purchase',
      'purchase',
      manager,
    );
    expect(ledger.reverseSource).toHaveBeenCalledWith(
      'purchase',
      'purchase',
      'actor',
      manager,
    );
    expect(manager.softRemove).toHaveBeenCalled();
  });
  it('does not cancel a purchase when its stock has already been consumed', async () => {
    inventory.reverseSourceMovement.mockRejectedValue(
      new Error('Insufficient stock'),
    );
    await expect(service.deletePurchase('purchase', 'actor')).rejects.toThrow(
      'Insufficient stock',
    );
    expect(ledger.reverseSource).not.toHaveBeenCalled();
    expect(manager.save).not.toHaveBeenCalled();
    expect(manager.softRemove).not.toHaveBeenCalled();
  });
});
