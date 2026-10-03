import { ConflictException } from '@nestjs/common';
import { DataSource, EntityManager } from 'typeorm';
import { SupplyService } from './supply.service';
import { SupplyRepository } from './supply.repository';
import { DepartmentsService } from '../departments/departments.service';
import { InventoryService } from '../inventory/inventory.service';
import { LedgerService } from '../ledger/ledger.service';
import { InternalTransfer } from './entities/internal-transfer.entity';

describe('SupplyService', () => {
  const manager = {
    update: jest.fn(),
    getRepository: jest.fn(() => ({
      find: jest.fn().mockResolvedValue([]),
      save: jest.fn(),
    })),
  } as unknown as EntityManager;
  const repository = {
    findTransferById: jest.fn(),
    findSaleById: jest.fn(),
    updateTransfer: jest.fn(),
    sumActivePurchaseQuantity: jest.fn().mockResolvedValue('100.000'),
    sumActiveSaleQuantity: jest.fn().mockResolvedValue('80.000'),
    sumActiveTransferQuantity: jest.fn().mockResolvedValue('20.000'),
    sumActiveSaleTotal: jest.fn().mockResolvedValue('1000.00'),
    sumActiveTransferTotal: jest.fn().mockResolvedValue('500.00'),
    sumActivePurchaseTotal: jest.fn().mockResolvedValue('900.00'),
    sumShrinkageExpenses: jest.fn().mockResolvedValue('0.00'),
  };
  const ledger = { post: jest.fn(), sumByAccount: jest.fn() };
  const dataSource = {
    transaction: jest.fn((work: (entityManager: EntityManager) => unknown) =>
      work(manager),
    ),
  };
  const inventory = {
    sumMovementQuantity: jest.fn().mockResolvedValue('10.000'),
    sumWriteoffQuantity: jest.fn().mockResolvedValue('1.000'),
    reverseSourceMovement: jest.fn(),
    applySaleOut: jest.fn(),
  };
  const service = new SupplyService(
    repository as unknown as SupplyRepository,
    {} as DepartmentsService,
    inventory as unknown as InventoryService,
    ledger as unknown as LedgerService,
    dataSource as unknown as DataSource,
  );

  beforeEach(() => {
    jest.clearAllMocks();
    Object.assign(service, {
      supplyDeptId: '00000000-0000-4000-8000-000000000001',
      shopDeptId: '00000000-0000-4000-8000-000000000002',
      shopInternalPartyId: '00000000-0000-4000-8000-000000000003',
    });
  });
  it('displays shrinkage in expenses without deducting it again from gross profit', async () => {
    repository.sumActiveSaleTotal.mockResolvedValueOnce('1342740.00').mockResolvedValueOnce('1342740.00');
    repository.sumActivePurchaseTotal.mockResolvedValueOnce('1311400.00').mockResolvedValueOnce('1311400.00');
    repository.sumShrinkageExpenses.mockResolvedValueOnce('2730.00').mockResolvedValueOnce('2730.00');
    ledger.sumByAccount.mockResolvedValueOnce('6640.00').mockResolvedValueOnce('0.00').mockResolvedValueOnce('6640.00').mockResolvedValueOnce('0.00');
    const report = await service.getProfitLoss('2026-09-05', '2026-09-05');
    expect(report.externalOnly).toEqual(expect.objectContaining({ grossProfit: '31340.00', operatingExpenses: '6640.00', shrinkageExpenses: '2730.00', otherExpenses: '3910.00', netProfit: '27430.00' }));
    expect(repository.sumShrinkageExpenses).toHaveBeenCalledWith('00000000-0000-4000-8000-000000000001', '2026-09-05', '2026-09-05');
    expect(report.includingInternalTransfers.netProfit).toBe('27930.00');
  });

  it('settles a transfer under a row lock and returns authoritative balances', async () => {
    const transfer = {
      id: '00000000-0000-4000-8000-000000000010',
      totalAmount: '30000.00',
      amountSettled: '0.00',
      remainingBalance: '30000.00',
      settlementStatus: 'unsettled',
    } as InternalTransfer;
    repository.findTransferById.mockResolvedValue(transfer);
    repository.updateTransfer.mockImplementation(
      (_id: string, changes: Partial<InternalTransfer>) =>
        Promise.resolve({ ...transfer, ...changes }),
    );
    const result = await service.settleTransfer(
      transfer.id,
      {
        amount: 10000,
        settlementDate: '2026-07-12',
        paymentMethod: 'bank',
        bankAccountId: '00000000-0000-4000-8000-000000000020',
        bankTransactionMethod: 'app',
      },
      '00000000-0000-4000-8000-000000000099',
    );
    expect(repository.findTransferById).toHaveBeenCalledWith(
      transfer.id,
      manager,
      true,
    );
    expect(repository.updateTransfer).toHaveBeenCalledWith(
      transfer.id,
      expect.objectContaining({
        amountSettled: '10000.00',
        remainingBalance: '20000.00',
        settlementStatus: 'partially_settled',
      }),
      manager,
    );
    expect(ledger.post).toHaveBeenCalledWith(
      expect.arrayContaining([
        expect.objectContaining({ sourceType: 'payment', amount: '10000.00' }),
      ]),
      manager,
    );
    expect(result.remainingBalance).toBe('20000.00');
  });

  it('rejects another settlement after the transfer is settled', async () => {
    repository.findTransferById.mockResolvedValue({
      id: 't1',
      settlementStatus: 'settled',
    });
    await expect(
      service.settleTransfer(
        't1',
        { amount: 1, settlementDate: '2026-07-12', paymentMethod: 'cash' },
        '00000000-0000-4000-8000-000000000099',
      ),
    ).rejects.toBeInstanceOf(ConflictException);
  });

  it('reverses the old stock movement before applying the updated sale quantity', async () => {
    const sale = {
      id: 'sale-1',
      quantityKg: '62.900',
      ratePerKg: '150.00',
      amountReceived: '0.00',
      outstandingAmount: '0.00',
      saleDate: new Date('2026-09-20'),
      status: 'posted',
    };
    repository.findSaleById.mockResolvedValueOnce(sale).mockResolvedValueOnce({
      ...sale,
      quantityKg: '52.900',
      ratePerKg: '150.00',
      totalAmount: '7935.00',
      amountReceived: '0.00',
      outstandingAmount: '7935.00',
    });
    inventory.reverseSourceMovement.mockResolvedValue(undefined);
    inventory.applySaleOut.mockResolvedValue({ currentWac: 120 });

    await service.updateSale('sale-1', {
      saleDate: '2026-09-21',
      quantityKg: 52.9,
      ratePerKg: 150,
      amountReceived: 0,
    });

    expect(inventory.reverseSourceMovement).toHaveBeenCalledWith(
      '00000000-0000-4000-8000-000000000001',
      'sale',
      'sale-1',
      manager,
    );
    expect(inventory.applySaleOut).toHaveBeenCalledWith(
      '00000000-0000-4000-8000-000000000001',
      52.9,
      'sale',
      'sale-1',
      new Date('2026-09-21'),
      manager,
    );
  });

  it('returns separate external-only and including-transfer report views', async () => {
    jest
      .spyOn(service as any, 'sumOutboundCogs')
      .mockImplementation((_from: Date, _to: Date, includeInternal: boolean) =>
        Promise.resolve(includeInternal ? '800.00' : '600.00'),
      );
    ledger.sumByAccount.mockImplementation(
      (
        _department: string,
        account: string,
        _from: Date,
        _to: Date,
        _entry: string,
        excluded?: string,
      ) => {
        const external: Record<string, string> = {
          revenue: '1000.00',
          cogs: '600.00',
          operating_expense: '50.00',
          payroll_expense: '100.00',
        };
        const total: Record<string, string> = {
          revenue: '1500.00',
          cogs: '800.00',
          operating_expense: '50.00',
          payroll_expense: '100.00',
        };
        return Promise.resolve((excluded ? external : total)[account]);
      },
    );
    const report = await service.getProfitLoss('2026-01-01', '2026-12-31');
    expect(report.externalOnly).toEqual(
      expect.objectContaining({
        revenue: '1000.00',
        cogs: '900.00',
        grossProfit: '100.00',
        netProfit: '-50.00',
        purchaseQuantityKg: '100.000',
        saleQuantityKg: '80.000',
      }),
    );
    expect(report.includingInternalTransfers).toEqual(
      expect.objectContaining({
        revenue: '1500.00',
        cogs: '900.00',
        grossProfit: '600.00',
        netProfit: '450.00',
        saleQuantityKg: '100.000',
      }),
    );
  });
});
