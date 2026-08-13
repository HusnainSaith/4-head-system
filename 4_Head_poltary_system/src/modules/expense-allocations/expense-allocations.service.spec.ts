import { BadRequestException } from '@nestjs/common';
import { ExpenseAllocationsService } from './expense-allocations.service';

describe('ExpenseAllocationsService split calculation', () => {
  const service = new ExpenseAllocationsService({} as any, {} as any);
  const departments = ['d1', 'd2', 'd3', 'd4'].map((departmentId) => ({
    departmentId,
  }));

  it('splits equally and assigns the rounding remainder to the last department', () => {
    expect(
      service.calculateSplits({
        totalAmount: 100,
        allocationMethod: 'equal',
        splits: departments,
      }),
    ).toEqual([
      { departmentId: 'd1', splitAmount: '25.00' },
      { departmentId: 'd2', splitAmount: '25.00' },
      { departmentId: 'd3', splitAmount: '25.00' },
      { departmentId: 'd4', splitAmount: '25.00' },
    ]);
    const thirds = service.calculateSplits({
      totalAmount: 10,
      allocationMethod: 'equal',
      splits: departments.slice(0, 3),
    });
    expect(thirds.map((x) => x.splitAmount)).toEqual(['3.33', '3.33', '3.34']);
  });

  it('calculates percentage splits and requires exactly 100 percent', () => {
    expect(
      service
        .calculateSplits({
          totalAmount: 100,
          allocationMethod: 'percentage',
          splits: [
            { departmentId: 'd1', percentage: 10 },
            { departmentId: 'd2', percentage: 90 },
          ],
        })
        .map((x) => x.splitAmount),
    ).toEqual(['10.00', '90.00']);
    expect(() =>
      service.calculateSplits({
        totalAmount: 100,
        allocationMethod: 'percentage',
        splits: [{ departmentId: 'd1', percentage: 99 }],
      }),
    ).toThrow(BadRequestException);
  });

  it('accepts exact manual splits and rejects a mismatch', () => {
    expect(
      service
        .calculateSplits({
          totalAmount: 50,
          allocationMethod: 'manual',
          splits: [
            { departmentId: 'd1', amount: 20 },
            { departmentId: 'd2', amount: 30 },
          ],
        })
        .map((x) => x.splitAmount),
    ).toEqual(['20.00', '30.00']);
    expect(() =>
      service.calculateSplits({
        totalAmount: 50,
        allocationMethod: 'manual',
        splits: [{ departmentId: 'd1', amount: 49 }],
      }),
    ).toThrow(BadRequestException);
  });
});
