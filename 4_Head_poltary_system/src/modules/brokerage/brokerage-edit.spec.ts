import { BrokerageService } from './brokerage.service';
import { BrokeragePurchase } from './entities/brokerage-purchase.entity';
import { BrokerageSale } from './entities/brokerage-sale.entity';

describe('Brokerage transaction amendments', () => {
  let service: BrokerageService,
    row: any,
    manager: any,
    ledger: any,
    inventory: any;
  beforeEach(async () => {
    row = {
      id: 'record',
      departmentId: 'brokerage',
      partyId: 'party',
      quantityKg: '10.000',
      ratePerKg: '100.00',
      totalAmount: '1000.00',
      amountPaid: '400.00',
      amountReceived: '400.00',
      paymentMethod: 'cash',
      cashAccountId: 'admin',
      purchaseDate: '2026-10-01',
      saleDate: '2026-10-01',
      status: 'active',
      commissionPerKg: '20.00',
      commissionAmount: '200.00',
      destinationType: 'external',
    };
    manager = {
      findOne: jest.fn(async (entity) =>
        [BrokeragePurchase, BrokerageSale].includes(entity) ? row : null,
      ),
      update: jest.fn(),
      delete: jest.fn(),
      save: jest.fn(async (_entity, value) => value),
    };
    ledger = { reverseSource: jest.fn(), post: jest.fn(), getAdminCashAccountId: jest.fn().mockResolvedValue('admin') };
    inventory = {
      reverseSourceMovement: jest.fn(),
      applyPurchaseIn: jest.fn(),
      applySaleOut: jest.fn().mockResolvedValue({ currentWac: 80 }),
    };
    service = new BrokerageService(
      {} as any,
      {
        findByType: jest.fn(async (type) => ({
          id: type === 'BROKERAGE' ? 'brokerage' : 'supply',
        })),
      } as any,
      inventory,
      ledger,
      { transaction: jest.fn(async (work) => work(manager)) } as any,
    );
    await service.onModuleInit();
  });
  it('recalculates totals, outstanding payable and ledger for a purchase edit', async () => {
    await service.updatePurchase(
      'record',
      { ratePerKg: 120, amountPaid: 500, cashAccountId: 'admin' },
      'actor',
    );
    expect(row).toMatchObject({
      totalAmount: '1200.00',
      amountPaid: '500.00',
      outstandingAmount: '700.00',
      updatedBy: 'actor',
    });
    expect(ledger.reverseSource).toHaveBeenCalledWith(
      'purchase',
      'record',
      'actor',
      manager,
    );
    expect(ledger.post).toHaveBeenCalledWith(
      [
        expect.objectContaining({
          accountCode: 'cogs',
          entryType: 'debit',
          amount: '1200.00',
        }),
        expect.objectContaining({
          accountCode: 'cash',
          cashAccountId: 'admin',
          entryType: 'credit',
          amount: '500.00',
        }),
        expect.objectContaining({
          accountCode: 'accounts_payable',
          partyId: 'party',
          amount: '700.00',
        }),
      ],
      manager,
    );
    expect(inventory.applyPurchaseIn).toHaveBeenCalled();
  });
  it('updates sales and bank receipts without retaining a stale cash account', async () => {
    await service.updateSale(
      'record',
      {
        ratePerKg: 120,
        amountReceived: 600,
        paymentMethod: 'bank',
        bankAccountId: 'bank',
        bankTransactionMethod: 'app',
      },
      'actor',
    );
    expect(row).toMatchObject({
      totalAmount: '1200.00',
      amountReceived: '600.00',
      outstandingAmount: '600.00',
      cashAccountId: null,
      bankAccountId: 'bank',
      commissionPerKg: '40.00',
      commissionAmount: '400.00',
    });
    expect(ledger.post).toHaveBeenCalledWith(
      expect.arrayContaining([
        expect.objectContaining({
          accountCode: 'bank',
          entryType: 'debit',
          amount: '600.00',
          bankAccountId: 'bank',
        }),
      ]),
      manager,
    );
  });
  it('moves only dates without reversing funds or requiring legacy account selections', async () => {
    row.cashAccountId = null;
    await service.updatePurchase(
      'record',
      { purchaseDate: '2026-10-11' },
      'actor',
    );
    expect(ledger.reverseSource).not.toHaveBeenCalled();
    expect(inventory.reverseSourceMovement).not.toHaveBeenCalled();
    expect(row.cashAccountId).toBeNull();
  });
  it('rejects cancelled transactions and overpayments before posting', async () => {
    row.status = 'cancelled';
    await expect(
      service.updateSale('record', { amountReceived: 100 }),
    ).rejects.toThrow('Cancelled');
    row.status = 'active';
    await expect(
      service.updatePurchase('record', { amountPaid: 2000 }),
    ).rejects.toThrow('cannot exceed');
    expect(ledger.post).not.toHaveBeenCalled();
  });
  it('cancels sales using the original source ledger and stock', async () => {
    await service.deleteSale('record', 'actor');
    expect(ledger.reverseSource).toHaveBeenCalledWith(
      'sale',
      'record',
      'actor',
      manager,
    );
    expect(manager.update).toHaveBeenCalledWith(
      BrokerageSale,
      'record',
      expect.objectContaining({ status: 'cancelled', cancelledBy: 'actor' }),
    );
  });
});
