import { BadRequestException } from '@nestjs/common';
import { DataSource } from 'typeorm';
import { PartyTypeEnum } from '../../common/types/party-type.enum';
import { BrokeragePurchase } from '../brokerage/entities/brokerage-purchase.entity';
import { LedgerService } from '../ledger/ledger.service';
import { Party } from '../parties/entities/party.entity';
import {
  InvestmentAssignment,
  InvestmentAssignmentStatus,
  InvestmentAssignmentType,
  InvestmentOutcome,
} from './entities/investment-assignment.entity';
import { InvestmentsService } from './investments.service';
import { InvestmentPayment } from './entities/investment-payment.entity';

describe('InvestmentsService', () => {
  const farm = {
    id: 'farm-id',
    name: 'Farm',
    partyType: PartyTypeEnum.FARM,
  } as Party;
  const investor = {
    id: 'investor-id',
    name: 'Brother',
    partyType: PartyTypeEnum.INVESTOR,
  } as Party;
  const purchase = {
    id: 'purchase-id',
    departmentId: 'department-id',
    partyId: farm.id,
    party: farm,
    totalAmount: '100000.00',
    amountPaid: '0.00',
    outstandingAmount: '100000.00',
    financedAmount: '0.00',
    paymentMethod: 'credit',
    status: 'active',
  } as BrokeragePurchase;

  function setup(overrides: Partial<BrokeragePurchase> = {}) {
    const workingPurchase = { ...purchase, ...overrides } as BrokeragePurchase;
    let savedAssignment: InvestmentAssignment | undefined;
    const repository = { findOne: jest.fn(async () => savedAssignment) };
    const manager = {
      findOne: jest.fn(async (entity: unknown) => {
        if (entity === BrokeragePurchase) return workingPurchase;
        if (entity === InvestmentAssignment) return null;
        if (entity === Party) return investor;
        return null;
      }),
      create: jest.fn((_entity: unknown, value: unknown) => value),
      save: jest.fn(async (entity: unknown, value: any) => {
        if (entity === InvestmentAssignment) {
          savedAssignment = {
            id: 'assignment-id',
            ...value,
          } as InvestmentAssignment;
          return savedAssignment;
        }
        return value;
      }),
      getRepository: jest.fn(() => repository),
    };
    const dataSource = {
      transaction: jest.fn(
        async (callback: (value: typeof manager) => unknown) =>
          callback(manager),
      ),
      manager,
    } as unknown as DataSource;
    const ledger = {
      post: jest.fn(),
      reverseSource: jest.fn(),
    } as unknown as jest.Mocked<LedgerService>;
    return {
      service: new InvestmentsService(dataSource, ledger),
      ledger,
      manager,
      workingPurchase,
      assignment: () => savedAssignment,
    };
  }

  it('rejects legacy percentage-based farm settlements', async () => {
    const { service, ledger } = setup();
    await expect(
      service.create(
        {
          purchaseId: purchase.id,
          investorPartyId: investor.id,
          principalAmount: 40000,
          assignmentType: InvestmentAssignmentType.FARM_SETTLEMENT,
          assignmentDate: '2026-08-07',
        },
        'owner-id',
      ),
    ).rejects.toThrow('explicit Brother farm-adjustment workflow');
    expect(ledger.post).not.toHaveBeenCalled();
  });

  it('posts a fixed investor loss as other income and reduces the investor payable', async () => {
    const { service, ledger, assignment } = setup();
    await service.create(
      {
        purchaseId: purchase.id,
        investorPartyId: investor.id,
        principalAmount: 100000,
        assignmentType: InvestmentAssignmentType.INVESTMENT,
        outcome: InvestmentOutcome.LOSS,
        returnRate: 5,
        assignmentDate: '2026-08-07',
      },
      'owner-id',
    );
    expect(assignment()).toMatchObject({
      returnAmount: '5000.00',
      totalPayable: '95000.00',
    });
    expect(ledger.post).toHaveBeenCalledWith(
      expect.arrayContaining([
        expect.objectContaining({
          accountCode: 'other_income',
          entryType: 'credit',
          amount: '5000.00',
        }),
      ]),
      expect.anything(),
    );
  });

  it('allows remaining credit balances and rejects funding above the balance', async () => {
    const { service, ledger } = setup({
      amountPaid: '1000.00',
      outstandingAmount: '99000.00',
    });
    await expect(
      service.create(
        {
          purchaseId: purchase.id,
          investorPartyId: investor.id,
          principalAmount: 100000,
          assignmentType: InvestmentAssignmentType.INVESTMENT,
          outcome: InvestmentOutcome.PROFIT,
          returnRate: 2,
          assignmentDate: '2026-08-07',
        },
        'owner-id',
      ),
    ).rejects.toThrow('cannot exceed the remaining purchase balance');
    expect(ledger.post).not.toHaveBeenCalled();
  });

  it('does not allow a rate to revive legacy farm settlements', async () => {
    const { service } = setup();
    await expect(
      service.create(
        {
          purchaseId: purchase.id,
          investorPartyId: investor.id,
          principalAmount: 100000,
          assignmentType: InvestmentAssignmentType.FARM_SETTLEMENT,
          returnRate: 3,
          assignmentDate: '2026-08-07',
        },
        'owner-id',
      ),
    ).rejects.toThrow('no automatic percentage is applied');
  });

  it('does not cancel an assignment after an investor payment', async () => {
    const { service, manager } = setup();
    (manager.findOne as jest.Mock).mockResolvedValueOnce({
      id: 'assignment-id',
      amountPaid: '1.00',
      status: InvestmentAssignmentStatus.ACTIVE,
    } as InvestmentAssignment);
    await expect(
      service.cancel('assignment-id', 'Incorrect entry', 'owner-id'),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it('accepts a partial investor payment and leaves the remaining balance active', async () => {
    const { service, manager, ledger } = setup();
    const active = {
      id: 'assignment-id',
      departmentId: 'department-id',
      investorPartyId: investor.id,
      amountPaid: '0.00',
      outstandingAmount: '102000.00',
      status: InvestmentAssignmentStatus.ACTIVE,
    } as InvestmentAssignment;
    (manager.findOne as jest.Mock).mockResolvedValueOnce(active);
    manager.save.mockImplementation(async (entity: unknown, value: any) => {
      if (entity === InvestmentPayment) return { id: 'payment-id', ...value };
      return value;
    });

    await service.recordPayment(
      'assignment-id',
      {
        amount: 51000,
        paymentMethod: 'cash',
        cashAccountId: '3d1000f8-22b6-4d57-8ec2-7a467592d7d1',
        paymentDate: '2026-08-08',
      },
      'owner-id',
    );

    expect(active).toMatchObject({
      amountPaid: '51000.00',
      outstandingAmount: '51000.00',
      status: InvestmentAssignmentStatus.ACTIVE,
    });
    expect(ledger.post).toHaveBeenCalledWith(
      [
        expect.objectContaining({
          accountCode: 'accounts_payable',
          partyId: investor.id,
          entryType: 'debit',
          amount: '51000.00',
        }),
        expect.objectContaining({
          accountCode: 'cash',
          cashAccountId: '3d1000f8-22b6-4d57-8ec2-7a467592d7d1',
          entryType: 'credit',
        }),
      ],
      expect.anything(),
    );
  });

  it('uses entity property paths when paginating the joined assignment list', async () => {
    const builder = {
      leftJoinAndSelect: jest.fn(),
      where: jest.fn(),
      orderBy: jest.fn(),
      addOrderBy: jest.fn(),
      skip: jest.fn(),
      take: jest.fn(),
      getManyAndCount: jest.fn().mockResolvedValue([[], 0]),
    };
    for (const method of [
      'leftJoinAndSelect',
      'where',
      'orderBy',
      'addOrderBy',
      'skip',
      'take',
    ] as const) {
      builder[method].mockReturnValue(builder);
    }
    const dataSource = {
      getRepository: jest.fn(() => ({
        createQueryBuilder: jest.fn(() => builder),
      })),
    } as unknown as DataSource;
    const service = new InvestmentsService(dataSource, {} as LedgerService);

    await service.list({ page: 1, limit: 20 });

    expect(builder.orderBy).toHaveBeenCalledWith(
      'assignment.assignmentDate',
      'DESC',
    );
    expect(builder.addOrderBy).toHaveBeenCalledWith(
      'assignment.createdAt',
      'DESC',
    );
  });
});
