import { BadRequestException } from '@nestjs/common';

export interface TransactionPaymentBalance {
  settledAmount: string;
  outstandingAmount: string;
  settledValue: number;
  outstandingValue: number;
}

/**
 * Normalises the amount paid/received for a transaction using integer cents.
 * Cash/bank defaults to fully settled when the caller omits the amount, while
 * credit defaults to zero. Any outstanding balance must belong to a party so
 * it can be followed through the party ledger.
 */
export function resolveTransactionPayment(options: {
  totalAmount: string | number;
  enteredAmount?: number;
  paymentMethod: 'cash' | 'bank' | 'credit';
  partyId?: string;
  amountLabel: 'Amount paid' | 'Amount received';
}): TransactionPaymentBalance {
  const totalCents = Math.round(Number(options.totalAmount) * 100);
  const defaultCents = options.paymentMethod === 'credit' ? 0 : totalCents;
  const settledCents =
    options.enteredAmount === undefined
      ? defaultCents
      : Math.round(options.enteredAmount * 100);

  if (!Number.isFinite(settledCents) || settledCents < 0) {
    throw new BadRequestException(`${options.amountLabel} cannot be negative`);
  }
  if (settledCents > totalCents) {
    throw new BadRequestException(
      `${options.amountLabel} cannot exceed total amount`,
    );
  }

  const outstandingCents = totalCents - settledCents;
  if (outstandingCents > 0 && !options.partyId) {
    throw new BadRequestException(
      'A party is required when an outstanding balance remains',
    );
  }

  return {
    settledAmount: (settledCents / 100).toFixed(2),
    outstandingAmount: (outstandingCents / 100).toFixed(2),
    settledValue: settledCents / 100,
    outstandingValue: outstandingCents / 100,
  };
}
