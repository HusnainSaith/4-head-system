import { ReportsRepository } from './reports.repository';
import { ReportsService } from './reports.service';

describe('ReportsService department profit and loss', () => {
  it.each(['1000000.00', '-1000000.00', '0.01', '-0.01'])(
    'splits %s into exact thirds with only paisa rounding',
    async (amount) => {
      const repository = {
        getDepartmentProfitLoss: jest
          .fn()
          .mockResolvedValue([{ departmentId: 'a', netProfit: amount }]),
        getDepartmentPartners: jest.fn().mockResolvedValue(
          ['1', '2', '3'].map((id) => ({
            userId: id,
            departmentId: 'a',
            percentage: '0.0000',
            equalShare: true,
            partyId: `p${id}`,
          })),
        ),
      } as unknown as ReportsRepository;
      const result = await new ReportsService(
        repository,
      ).getPartnerProfitShare();
      const partners = result.departments[0].partners;
      const cents = partners.map((p) =>
        Math.round(Number(p.profitShare) * 100),
      );
      expect(result.departments[0].configured).toBe(true);
      expect(result.departments[0].allocationMode).toBe('equal');
      expect(
        partners.every((p) => p.ownershipLabel === '1/3 (equal share)'),
      ).toBe(true);
      expect(cents.reduce((sum, value) => sum + value, 0)).toBe(
        Math.round(Number(amount) * 100),
      );
      expect(Math.max(...cents) - Math.min(...cents)).toBeLessThanOrEqual(1);
    },
  );
  it('leaves incomplete ownership unallocated instead of silently distributing it', async () => {
    const repository = {
      getDepartmentProfitLoss: jest
        .fn()
        .mockResolvedValue([{ departmentId: 'a', netProfit: '100.00' }]),
      getDepartmentPartners: jest.fn().mockResolvedValue([
        {
          userId: '1',
          departmentId: 'a',
          percentage: '50.0000',
          partyId: 'p1',
        },
      ]),
    } as unknown as ReportsRepository;
    const result = await new ReportsService(repository).getPartnerProfitShare();
    expect(result.unallocatedProfit).toBe('100.00');
    expect(result.departments[0].configured).toBe(false);
    expect(result.departments[0].partners[0].profitShare).toBe('0.00');
  });

  it.each([
    ['2026-02-30', undefined],
    ['2026-02-10', '2026-02-01'],
  ])('rejects invalid report dates %s %s', async (from, to) => {
    await expect(
      new ReportsService({} as ReportsRepository).getPartnerProfitShare(
        from,
        to,
      ),
    ).rejects.toThrow();
  });

  it.each(['100.01', '-100.01'])(
    'allocates %s exactly within its department',
    async (amount) => {
      const repository = {
        getDepartmentProfitLoss: jest.fn().mockResolvedValue([
          { departmentId: 'a', netProfit: amount },
          { departmentId: 'b', netProfit: '20.00' },
          { departmentId: 'c', netProfit: '-5.00' },
        ]),
        getDepartmentPartners: jest.fn().mockResolvedValue([
          {
            userId: '1',
            partnerName: 'One',
            departmentId: 'a',
            percentage: '75.0000',
            partyId: 'p1',
          },
          {
            userId: '2',
            partnerName: 'Two',
            departmentId: 'a',
            percentage: '25.0000',
            partyId: 'p2',
          },
          {
            userId: '3',
            partnerName: 'Three',
            departmentId: 'b',
            percentage: '100.0000',
            partyId: 'p3',
          },
        ]),
      } as unknown as ReportsRepository;
      const result = await new ReportsService(
        repository,
      ).getPartnerProfitShare();
      const sign = amount.startsWith('-') ? '-' : '';
      expect(result.departments[0].partners.map((p) => p.profitShare)).toEqual([
        `${sign}75.01`,
        `${sign}25.00`,
      ]);
      expect(result.departments[1].partners[0].profitShare).toBe('20.00');
      expect(result.departments[2].partners).toEqual([]);
      expect(result.unallocatedProfit).toBe('-5.00');
      expect(result.netProfit).toBe(sign ? '-85.01' : '115.01');
      expect(result.allocatedProfit).toBe(sign ? '-80.01' : '120.01');
    },
  );

  it('returns the repository department breakdown for the requested period', async () => {
    const repository = {
      getDepartmentProfitLoss: jest.fn().mockResolvedValue([
        {
          departmentId: 'department-1',
          departmentName: 'Brokerage',
          departmentType: 'BROKERAGE',
          revenue: '200000.00',
          cogs: '190000.00',
          grossProfit: '10000.00',
        },
      ]),
    } as unknown as jest.Mocked<ReportsRepository>;
    const service = new ReportsService(repository);

    await expect(
      service.getDepartmentProfitLoss('2026-07-01', '2026-07-31'),
    ).resolves.toEqual([
      expect.objectContaining({
        departmentName: 'Brokerage',
        grossProfit: '10000.00',
      }),
    ]);
    expect(repository.getDepartmentProfitLoss).toHaveBeenCalledWith(
      new Date('2026-07-01'),
      new Date('2026-08-01'),
    );
  });

  it('includes the whole selected day by using the next day as an exclusive end', async () => {
    const repository = {
      sumExternalSales: jest.fn().mockResolvedValue(100),
      sumInternalTransferRevenue: jest.fn().mockResolvedValue(0),
      sumLedgerAccount: jest.fn().mockResolvedValue(0),
    } as unknown as jest.Mocked<ReportsRepository>;
    const service = new ReportsService(repository);

    await service.getConsolidatedProfitLoss('2026-07-02', '2026-07-02');

    expect(repository.sumExternalSales).toHaveBeenCalledWith(
      new Date('2026-07-02T00:00:00.000Z'),
      new Date('2026-07-03T00:00:00.000Z'),
    );
  });
});
