import { BadRequestException } from '@nestjs/common';

const MONEY_PATTERN = /^-?\d+(?:\.\d{1,2})?$/;
const PERCENT_PATTERN = /^\d+(?:\.\d{1,4})?$/;

export function moneyToCents(value: string, field = 'amount'): bigint {
  if (!MONEY_PATTERN.test(value))
    throw new BadRequestException(`${field} must be a valid monetary amount`);
  const negative = value.startsWith('-');
  const [whole, fraction = ''] = value.replace('-', '').split('.');
  const cents = BigInt(whole) * 100n + BigInt(fraction.padEnd(2, '0'));
  return negative ? -cents : cents;
}

export function centsToMoney(cents: bigint): string {
  const negative = cents < 0n;
  const absolute = negative ? -cents : cents;
  return `${negative ? '-' : ''}${absolute / 100n}.${String(absolute % 100n).padStart(2, '0')}`;
}

export function percentToUnits(value: string): bigint {
  if (!PERCENT_PATTERN.test(value))
    throw new BadRequestException('profitSharePercentage must be valid');
  const [whole, fraction = ''] = value.split('.');
  return BigInt(whole) * 10000n + BigInt(fraction.padEnd(4, '0'));
}

export function normalizePercent(value: string): string {
  const units = percentToUnits(value);
  return `${units / 10000n}.${String(units % 10000n).padStart(4, '0')}`;
}

export function percentageOf(amountCents: bigint, percent: string): bigint {
  const units = percentToUnits(percent);
  const numerator = amountCents * units;
  return (numerator + 500000n) / 1000000n;
}
