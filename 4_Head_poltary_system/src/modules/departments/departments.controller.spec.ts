import { BadRequestException } from '@nestjs/common';
import { parseDepartmentRouteType } from './departments.controller';

describe('parseDepartmentRouteType', () => {
  it.each([
    ['brokerage', 'BROKERAGE'],
    ['supply', 'SUPPLY'],
    ['wastage', 'WASTAGE'],
    ['fresh_chicken_shop', 'FRESH_CHICKEN_SHOP'],
    ['fresh-chicken-shop', 'FRESH_CHICKEN_SHOP'],
    ['BROKERAGE', 'BROKERAGE'],
  ])('maps route value %s to database enum %s', (routeValue, expected) => {
    expect(parseDepartmentRouteType(routeValue)).toBe(expected);
  });

  it('rejects unknown department values before querying PostgreSQL', () => {
    expect(() => parseDepartmentRouteType('unknown')).toThrow(
      new BadRequestException('Unsupported department type: unknown'),
    );
  });
});
