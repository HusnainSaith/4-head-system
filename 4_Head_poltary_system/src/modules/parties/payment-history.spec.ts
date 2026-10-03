import { DataSource, Between, MoreThanOrEqual, LessThanOrEqual } from 'typeorm';
import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';
import { PartiesService } from './parties.service';
import { PartyPayment } from './entities/party-payment.entity';
import { ListPartyPaymentsDto } from './dto/list-party-payments.dto';

describe('Department payment history', () => {
  it('reads one department and page, preserving notes for receipts and payments', async () => {
    const payments = [
      {
        id: 'paid',
        partyId: 'p1',
        direction: 'paid',
        notes: 'Paid\non account',
      },
      { id: 'received', partyId: 'p2', direction: 'received', notes: null },
    ];
    const findAndCount = jest.fn().mockResolvedValue([payments, 12]);
    const find = jest.fn().mockResolvedValue([{ id: 'p1', name: 'Supplier' }]);
    const dataSource = {
      getRepository: jest.fn((entity) =>
        entity === PartyPayment ? { findAndCount } : { find },
      ),
    };
    const service = new PartiesService(
      null as any,
      null as any,
      dataSource as unknown as DataSource,
    );
    const result = await service.listPayments({
      departmentId: 'department',
      page: 2,
      limit: 10,
    });
    expect(findAndCount).toHaveBeenCalledWith({
      where: { departmentId: 'department' },
      skip: 10,
      take: 10,
      order: { paymentDate: 'DESC', createdAt: 'DESC', id: 'DESC' },
    });
    expect(result.items[0]).toMatchObject({
      notes: 'Paid\non account',
      partyName: 'Supplier',
      direction: 'paid',
    });
    expect(result.items[1]).toMatchObject({
      notes: null,
      partyName: 'Unknown party',
      direction: 'received',
    });
    expect(result.pagination.total).toBe(12);
  });

  it.each([
    { departmentId: 'invalid' },
    { page: 0 },
    { limit: 101 },
    { page: 1.5 },
  ])('rejects invalid query %p', async (invalid) => {
    const query = plainToInstance(ListPartyPaymentsDto, {
      departmentId: 'd8a86ff7-f240-4cd0-bb82-e1ad95b2caaf',
      ...invalid,
    });
    expect((await validate(query)).length).toBeGreaterThan(0);
  });
});

describe('payment history date ranges', () => {
  const findAndCount = jest.fn().mockResolvedValue([[], 0]);
  const service = new PartiesService(
    null as any,
    null as any,
    { getRepository: () => ({ findAndCount }) } as unknown as DataSource,
  );
  it.each([
    [
      { from: '2026-09-01', to: '2026-09-30' },
      Between('2026-09-01', '2026-09-30'),
    ],
    [{ from: '2026-09-01' }, MoreThanOrEqual('2026-09-01')],
    [{ to: '2026-09-30' }, LessThanOrEqual('2026-09-30')],
  ])(
    'applies inclusive range %p to the paginated database query',
    async (range, paymentDate) => {
      await service.listPayments({
        departmentId: 'd',
        page: 2,
        limit: 10,
        ...range,
      });
      expect(findAndCount).toHaveBeenLastCalledWith(
        expect.objectContaining({
          where: { departmentId: 'd', paymentDate },
          skip: 10,
          take: 10,
        }),
      );
    },
  );
  it('rejects reversed dates', async () => {
    await expect(
      service.listPayments({
        departmentId: 'd',
        page: 1,
        limit: 10,
        from: '2026-09-30',
        to: '2026-09-01',
      }),
    ).rejects.toThrow('Starting date');
  });
  it.each(['invalid', '2026-02-30', '2026-09-01T12:00:00Z'])(
    'rejects invalid date %s',
    async (from) => {
      const dto = plainToInstance(ListPartyPaymentsDto, {
        departmentId: 'd8a86ff7-f240-4cd0-bb82-e1ad95b2caaf',
        from,
      });
      expect(
        (await validate(dto)).some((error) => error.property === 'from'),
      ).toBe(true);
    },
  );
});
