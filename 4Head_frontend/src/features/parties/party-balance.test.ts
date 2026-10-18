import { formatPartyBalance, partyBalanceLabel, transactionPartyBalance } from './party-balance';

describe('System party balance convention', () => {
  it.each([['100.25', '+', 'Payable'], ['-100.25', '-', 'Receivable'], ['0.00', '', 'Settled']] as const)('formats %s with its accounting sign and label', (value, sign, label) => {
    const formatted = formatPartyBalance(value);
    if (sign) expect(formatted.startsWith(sign)).toBe(true);
    else expect(formatted).not.toMatch(/^[+-]/);
    expect(partyBalanceLabel(value)).toBe(label);
    expect(formatted).toContain(Number(value) === 0 ? '0.00' : '100.25');
  });
  it.each(['purchase', 'sale'] as const)('keeps unpaid %s amounts on the correct side', kind => {
    expect(transactionPartyBalance(kind, '250.50')).toBe(kind === 'purchase' ? 250.50 : -250.50);
    expect(transactionPartyBalance(kind, '0.00')).toBe(0);
  });
  it('preserves a purchase overpayment as receivable and a sale overpayment as payable', () => {
    expect(transactionPartyBalance('purchase', '-250.50')).toBe(-250.50);
    expect(transactionPartyBalance('sale', '-250.50')).toBe(250.50);
  });
});
