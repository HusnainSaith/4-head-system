import { BadRequestException } from '@nestjs/common';
import { ZakatFundAllocationMethod } from './entities/zakat-fund-settlement.entity';
import { ZakatFundsService } from './zakat-funds.service';

describe('ZakatFundsService allocation', () => {
  const service = new ZakatFundsService(
    {} as never,
    {} as never,
    {} as never,
    {} as never,
  );

  it('allocates every cent exactly for equal shares', () => {
    const result = service['allocate'](
      10_000,
      ZakatFundAllocationMethod.EQUAL,
      [{ partyId: 'a' }, { partyId: 'b' }, { partyId: 'c' }],
    );

    expect(result.map(({ cents }) => cents)).toEqual([3333, 3333, 3334]);
    expect(result.reduce((sum, row) => sum + row.cents, 0)).toBe(10_000);
  });

  it('allocates exact percentages and gives rounding remainder to the last party', () => {
    const result = service['allocate'](
      10_001,
      ZakatFundAllocationMethod.PERCENTAGE,
      [
        { partyId: 'a', percentage: '33.3333' },
        { partyId: 'b', percentage: '33.3333' },
        { partyId: 'c', percentage: '33.3334' },
      ],
    );

    expect(result.reduce((sum, row) => sum + row.cents, 0)).toBe(10_001);
  });

  it('rejects percentages which do not total exactly 100 percent', () => {
    expect(() =>
      service['allocate'](10_000, ZakatFundAllocationMethod.PERCENTAGE, [
        { partyId: 'a', percentage: '60' },
        { partyId: 'b', percentage: '30' },
      ]),
    ).toThrow('Party percentages must total exactly 100%');
  });

  it('rejects manual amounts that do not equal the outstanding balance', () => {
    expect(() =>
      service['allocate'](10_000, ZakatFundAllocationMethod.MANUAL, [
        { partyId: 'a', amount: '40.00' },
        { partyId: 'b', amount: '50.00' },
      ]),
    ).toThrow('Manual party amounts must total 100.00');
  });

  it('rejects a split that would create zero-value rows', () => {
    expect(() =>
      service['allocate'](1, ZakatFundAllocationMethod.EQUAL, [
        { partyId: 'a' },
        { partyId: 'b' },
      ]),
    ).toThrow(BadRequestException);
  });
});
