const signedMoney = new Intl.NumberFormat('en-PK', {
  style: 'currency', currency: 'PKR', signDisplay: 'exceptZero', minimumFractionDigits: 2, maximumFractionDigits: 2,
});

/** Party balances: positive payable, negative receivable; cash and invoice totals are magnitudes. */
export function formatPartyBalance(value: string | number) {
  return signedMoney.format(Number(value));
}

export function partyBalanceLabel(value: string | number) {
  const balance = Number(value);
  return balance > 0 ? 'Payable' : balance < 0 ? 'Receivable' : 'Settled';
}

export function transactionPartyBalance(kind: 'purchase' | 'sale', outstanding: string | number) {
  const amount = Number(outstanding);
  return amount === 0 ? 0 : kind === 'purchase' ? amount : -amount;
}
