import { centsToMoney, moneyToCents, percentageOf } from './money.util';

describe('financial decimal helpers', () => {
  it('calculates investor shares without floating-point arithmetic', () => {
    const profit = moneyToCents('1000000.00');
    expect(centsToMoney(percentageOf(profit, '5.0000'))).toBe('50000.00');
    expect(centsToMoney(percentageOf(profit, '3.0000'))).toBe('30000.00');
    expect(centsToMoney(percentageOf(profit, '2.0000'))).toBe('20000.00');
  });

  it('preserves cents exactly', () => {
    expect(centsToMoney(moneyToCents('999999999999.99'))).toBe(
      '999999999999.99',
    );
  });
});
