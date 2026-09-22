import { ReportsRepository } from './reports.repository';
import { ReportsService } from './reports.service';

describe('ReportsService department profit and loss', () => {
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
