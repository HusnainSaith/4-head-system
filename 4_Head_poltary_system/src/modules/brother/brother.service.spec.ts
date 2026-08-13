import { DataSource } from 'typeorm';
import { PartyTypeEnum } from '../../common/types/party-type.enum';
import { LedgerService } from '../ledger/ledger.service';
import { Party } from '../parties/entities/party.entity';
import { BrotherService } from './brother.service';
import { BrotherAccount } from './entities/brother-account.entity';
import { BrotherPayment } from './entities/brother-payment.entity';
import {
  BrotherAdjustmentType,
  BrotherFarmAdjustment,
} from './entities/brother-farm-adjustment.entity';

describe('BrotherService', () => {
  function setup(farmBalance = '-200000.00', brotherBalance = '20000.00') {
    const account = {
      id: 'brother-account',
      partyId: 'brother-party',
      isActive: true,
    } as BrotherAccount;
    const farm = {
      id: 'farm-party',
      name: 'Farm A',
      partyType: PartyTypeEnum.FARM,
    } as Party;
    const qb = {
      select: jest.fn(),
      where: jest.fn(),
      andWhere: jest.fn(),
      getOne: jest.fn().mockResolvedValue(null),
      getRawOne: jest.fn().mockResolvedValue({ balance: brotherBalance }),
    };
    qb.select.mockReturnValue(qb);
    qb.where.mockReturnValue(qb);
    qb.andWhere.mockReturnValue(qb);
    const adjustmentRepository = {
      createQueryBuilder: jest.fn(() => qb),
      findOne: jest.fn(async ({ where }: any) => ({ id: where.id })),
    };
    const paymentQb = {
      select: jest.fn(),
      where: jest.fn(),
      andWhere: jest.fn(),
      getOne: jest.fn().mockResolvedValue(null),
      getRawOne: jest.fn().mockResolvedValue({ total: '0.00' }),
    };
    paymentQb.select.mockReturnValue(paymentQb);
    paymentQb.where.mockReturnValue(paymentQb);
    paymentQb.andWhere.mockReturnValue(paymentQb);
    const paymentRepository = {
      createQueryBuilder: jest.fn(() => paymentQb),
    };
    const manager = {
      findOne: jest.fn(async (entity: unknown) => {
        if (entity === BrotherAccount) return account;
        if (entity === Party) return farm;
        return null;
      }),
      getRepository: jest.fn((entity: unknown) =>
        entity === BrotherPayment ? paymentRepository : adjustmentRepository,
      ),
      query: jest
        .fn()
        .mockResolvedValue([
          { departmentId: 'department-id', balance: farmBalance },
        ]),
      create: jest.fn((_entity: unknown, value: unknown) => value),
      save: jest.fn(async (_entity: unknown, value: any) => ({
        id: 'adjustment-id',
        ...value,
      })),
    };
    const dataSource = {
      transaction: jest.fn(
        async (_isolation: string, callback: (m: typeof manager) => unknown) =>
          callback(manager),
      ),
      manager,
    } as unknown as DataSource;
    const ledger = { post: jest.fn() } as unknown as jest.Mocked<LedgerService>;
    return {
      service: new BrotherService(dataSource, ledger),
      ledger,
      manager,
    };
  }

  it('moves the exact selected amount from a farm payable to Brother', async () => {
    const { service, ledger, manager } = setup();
    await service.createAdjustment(
      {
        farmPartyId: 'farm-party',
        amount: '50000.00',
        transactionDate: '2026-08-08',
      },
      'owner-id',
    );
    expect(manager.save).toHaveBeenCalledWith(
      BrotherFarmAdjustment,
      expect.objectContaining({
        transactionType: BrotherAdjustmentType.FARM_ADJUSTMENT,
        farmBalanceBefore: '-200000.00',
        farmBalanceAfter: '-150000.00',
        brotherBalanceBefore: '20000.00',
        brotherBalanceAfter: '70000.00',
      }),
    );
    expect(ledger.post).toHaveBeenCalledWith(
      [
        expect.objectContaining({
          partyId: 'farm-party',
          entryType: 'debit',
          amount: '50000.00',
        }),
        expect.objectContaining({
          partyId: 'brother-party',
          entryType: 'credit',
          amount: '50000.00',
        }),
      ],
      manager,
    );
  });

  it('rejects an adjustment above the farm payable', async () => {
    const { service, ledger } = setup('-30000.00');
    await expect(
      service.createAdjustment(
        {
          farmPartyId: 'farm-party',
          amount: '50000.00',
          transactionDate: '2026-08-08',
        },
        'owner-id',
      ),
    ).rejects.toThrow('exceeds the available farm payable balance');
    expect(ledger.post).not.toHaveBeenCalled();
  });

  it('allows a partial payment without mixing the investor account', async () => {
    const { service, ledger, manager } = setup('-200000.00', '70000.00');
    const payment = await service.recordPayment(
      {
        departmentId: 'department-id',
        amount: '35000.00',
        paymentMethod: 'cash',
        cashAccountId: '3d1000f8-22b6-4d57-8ec2-7a467592d7d1',
        paymentDate: '2026-08-09',
      },
      'owner-id',
    );
    expect(payment).toMatchObject({
      amount: '35000.00',
      balanceBefore: '70000.00',
      balanceAfter: '35000.00',
    });
    expect(ledger.post).toHaveBeenCalledWith(
      [
        expect.objectContaining({
          accountCode: 'accounts_payable',
          partyId: 'brother-party',
          entryType: 'debit',
        }),
        expect.objectContaining({
          accountCode: 'cash',
          entryType: 'credit',
        }),
      ],
      manager,
    );
  });
});
