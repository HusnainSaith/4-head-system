import { BadRequestException } from '@nestjs/common';
import { CommitteesService } from './committees.service';
import { Committee } from './entities/committee.entity';
import { CommitteeInstallment } from './entities/committee-installment.entity';
import { CommitteePayout } from './entities/committee-payout.entity';

describe('CommitteesService accounting', () => {
  const committee = {
    id: 'c1',
    departmentId: 'd1',
    status: 'active',
    installmentAmount: '100.00',
    totalMembers: 5,
    updatedBy: undefined,
  } as any;
  const ledger = { post: jest.fn() };

  function serviceFor(total: string, payoutExists = false) {
    const committeeRepo = {
      findOne: jest.fn().mockResolvedValue({ ...committee }),
    };
    const payoutRepo = {
      exist: jest.fn().mockResolvedValue(payoutExists),
      create: jest.fn((value) => ({ id: 'p1', ...value })),
      save: jest.fn(async (value) => value),
    };
    const installmentsRepo = {
      count: jest.fn().mockResolvedValue(0),
      create: jest.fn((value) => ({ id: 'i1', ...value })),
      save: jest.fn(async (value) => value),
      createQueryBuilder: jest.fn(() => ({
        select: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        andWhere: jest.fn().mockReturnThis(),
        getRawOne: jest.fn().mockResolvedValue({ total }),
      })),
    };
    const manager = {
      getRepository: jest.fn((entity) =>
        entity === Committee
          ? committeeRepo
          : entity === CommitteePayout
            ? payoutRepo
            : installmentsRepo,
      ),
      save: jest.fn(async (_entity, value) => value),
    };
    const dataSource = {
      manager,
      transaction: jest.fn(async (callback) => callback(manager)),
    };
    return {
      service: new CommitteesService(dataSource as any, ledger as any),
      manager,
    };
  }

  beforeEach(() => jest.clearAllMocks());

  it('shows installment count and derives amount as payouts minus installments', async () => {
    const aggregateQuery = (rows: any[]) => ({
      select: jest.fn().mockReturnThis(),
      addSelect: jest.fn().mockReturnThis(),
      where: jest.fn().mockReturnThis(),
      groupBy: jest.fn().mockReturnThis(),
      getRawMany: jest.fn().mockResolvedValue(rows),
    });
    const committeeRepo = {
      find: jest
        .fn()
        .mockResolvedValue([
          { ...committee, totalMembers: 5, startDate: '2026-08-01' },
        ]),
    };
    const installmentRepo = {
      createQueryBuilder: jest.fn(() =>
        aggregateQuery([
          {
            committeeId: 'c1',
            installmentCount: '2',
            totalContributed: '200.00',
          },
        ]),
      ),
    };
    const payoutRepo = {
      createQueryBuilder: jest.fn(() =>
        aggregateQuery([{ committeeId: 'c1', totalPayout: '500.00' }]),
      ),
    };
    const dataSource = {
      getRepository: jest.fn((entity) =>
        entity === Committee
          ? committeeRepo
          : entity === CommitteeInstallment
            ? installmentRepo
            : payoutRepo,
      ),
    };
    const service = new CommitteesService(dataSource as any, ledger as any);

    await expect(service.list()).resolves.toEqual([
      expect.objectContaining({
        installmentCount: 2,
        remainingInstallments: 3,
        totalContributed: '200.00',
        totalPayout: '500.00',
        currentAmount: '300.00',
      }),
    ]);
  });

  it('clears the asset with no income for a normal payout', async () => {
    const { service } = serviceFor('300.00');
    await service.recordPayout(
      'c1',
      {
        payoutAmount: 300,
        payoutDate: '2026-08-01',
        totalContributed: 300,
        paymentMethod: 'cash',
      },
      'u1',
    );
    const entries = ledger.post.mock.calls[0][0];
    expect(entries).toHaveLength(2);
    expect(entries.map((entry: any) => entry.accountCode)).toEqual([
      'cash',
      'committee_advance',
    ]);
    expect(entries[0]).toMatchObject({
      accountCode: 'cash',
      entryType: 'debit',
      amount: '300.00',
    });
    expect(
      entries.some(
        (entry: any) =>
          entry.accountCode === 'revenue' ||
          entry.accountCode === 'operating_expense',
      ),
    ).toBe(false);
  });

  it('decreases the selected payment account for an installment', async () => {
    const { service } = serviceFor('0.00');

    await service.recordInstallment(
      'c1',
      {
        amount: 100,
        installmentDate: '2026-08-01',
        paymentMethod: 'bank',
      },
      'u1',
    );

    expect(ledger.post.mock.calls[0][0]).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          accountCode: 'bank',
          entryType: 'credit',
          amount: '100.00',
        }),
      ]),
    );
  });

  it('credits only other_income for an excess payout', async () => {
    const { service } = serviceFor('300.00');
    await service.recordPayout(
      'c1',
      { payoutAmount: 325, payoutDate: '2026-08-01', paymentMethod: 'bank' },
      'u1',
    );
    const entries = ledger.post.mock.calls[0][0];
    expect(
      entries.find((entry: any) => entry.accountCode === 'other_income').amount,
    ).toBe('25.00');
    expect(entries.some((entry: any) => entry.accountCode === 'revenue')).toBe(
      false,
    );
  });

  it('rejects a client contribution total that differs from recorded installments', async () => {
    const { service } = serviceFor('300.00');
    await expect(
      service.recordPayout(
        'c1',
        {
          payoutAmount: 325,
          payoutDate: '2026-08-01',
          totalContributed: 299,
          paymentMethod: 'cash',
        },
        'u1',
      ),
    ).rejects.toBeInstanceOf(BadRequestException);
    expect(ledger.post).not.toHaveBeenCalled();
  });
});
