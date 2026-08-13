import { ConflictException } from '@nestjs/common';
import { DataSource, EntityManager } from 'typeorm';
import { SupplyService } from './supply.service';
import { SupplyRepository } from './supply.repository';
import { DepartmentsService } from '../departments/departments.service';
import { InventoryService } from '../inventory/inventory.service';
import { LedgerService } from '../ledger/ledger.service';
import { InternalTransfer } from './entities/internal-transfer.entity';

describe('SupplyService', () => {
  const manager = {} as EntityManager;
  const repository = {
    findTransferById: jest.fn(),
    updateTransfer: jest.fn(),
  };
  const ledger = { post: jest.fn(), sumByAccount: jest.fn() };
  const dataSource = {
    transaction: jest.fn((work: (entityManager: EntityManager) => unknown) =>
      work(manager),
    ),
  };
  const service = new SupplyService(
    repository as unknown as SupplyRepository,
    {} as DepartmentsService,
    {} as InventoryService,
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
        grossProfit: '400.00',
        netProfit: '250.00',
      }),
    );
    expect(report.includingInternalTransfers).toEqual(
      expect.objectContaining({
        revenue: '1500.00',
        grossProfit: '700.00',
        netProfit: '550.00',
      }),
    );
  });
});
