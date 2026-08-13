import { BadRequestException } from '@nestjs/common';
import { resolveTransactionPayment } from './transaction-payment.helper';

describe('department transaction payment balances', () => {
  it.each([
    ['Brokerage purchase', 1000, 400, 'cash', '600.00'],
    ['Supply sale', 1500, 500, 'bank', '1000.00'],
    ['Wastage purchase', 800, 200, 'credit', '600.00'],
    ['Fresh Chicken Shop sale', 1720, 720, 'cash', '1000.00'],
  ] as const)(
    '%s persists the settled and outstanding amounts',
    (_departmentFlow, total, entered, paymentMethod, outstanding) => {
      const result = resolveTransactionPayment({
        totalAmount: total,
        enteredAmount: entered,
        paymentMethod,
        partyId: '7e4759e1-2e53-4be1-8a44-27222b1d3e2c',
        amountLabel: 'Amount received',
      });

      expect(result.settledAmount).toBe(entered.toFixed(2));
      expect(result.outstandingAmount).toBe(outstanding);
    },
  );

  it('defaults cash/bank to fully settled and credit to fully outstanding', () => {
    const cash = resolveTransactionPayment({
      totalAmount: '250.00',
      paymentMethod: 'cash',
      amountLabel: 'Amount paid',
    });
    const credit = resolveTransactionPayment({
      totalAmount: '250.00',
      paymentMethod: 'credit',
      partyId: '7e4759e1-2e53-4be1-8a44-27222b1d3e2c',
      amountLabel: 'Amount paid',
    });

    expect(cash).toMatchObject({
      settledAmount: '250.00',
      outstandingAmount: '0.00',
    });
    expect(credit).toMatchObject({
      settledAmount: '0.00',
      outstandingAmount: '250.00',
    });
  });

  it('rejects overpayment and unassigned outstanding balances', () => {
    expect(() =>
      resolveTransactionPayment({
        totalAmount: 100,
        enteredAmount: 101,
        paymentMethod: 'cash',
        amountLabel: 'Amount received',
      }),
    ).toThrow(BadRequestException);

    expect(() =>
      resolveTransactionPayment({
        totalAmount: 100,
        enteredAmount: 20,
        paymentMethod: 'credit',
        amountLabel: 'Amount paid',
      }),
    ).toThrow('A party is required');
  });
});
