import { settlementEntries } from './settlement-entries';

describe('Signed party balance transfers', () => {
  const base = {
    departmentId: 'department',
    entryDate: new Date(),
    sourceType: 'party_adjustment',
    sourceId: 'settlement',
  };
  it.each([
    [-22755458, -16307, -22771765],
    [-148821625, 16307, -148805318],
    [100, -150, -50],
    [-100, 150, 50],
    [0, -10, -10],
    [0, 10, 10],
    [200, 150, 350],
    [-200, -150, -350],
    [0.01, -0.02, -0.01],
  ])(
    'transfers balance %s by %s to %s with correct account classification',
    (balance, change, result) => {
      const entries = settlementEntries(base, 'party', balance, change);
      const signedChange = entries.reduce(
        (sum, entry) =>
          sum + Number(entry.amount) * (entry.entryType === 'credit' ? 1 : -1),
        0,
      );
      expect(balance + signedChange).toBeCloseTo(result, 2);
      expect(entries.every((entry) => Number(entry.amount) > 0)).toBe(true);
      expect(
        entries.every((entry) =>
          ['accounts_payable', 'accounts_receivable'].includes(
            entry.accountCode,
          ),
        ),
      ).toBe(true);
      if (balance <= 0 && change < 0)
        expect(
          entries.every((entry) => entry.accountCode === 'accounts_receivable'),
        ).toBe(true);
      if (balance >= 0 && change > 0)
        expect(
          entries.every((entry) => entry.accountCode === 'accounts_payable'),
        ).toBe(true);
    },
  );
  it('splits a receivable that crosses zero into payable', () => {
    expect(settlementEntries(base, 'party', -100, 150)).toEqual([
      expect.objectContaining({
        accountCode: 'accounts_receivable',
        entryType: 'credit',
        amount: '100.00',
      }),
      expect.objectContaining({
        accountCode: 'accounts_payable',
        entryType: 'credit',
        amount: '50.00',
      }),
    ]);
  });
});
