import type { PostEntryDto } from '../ledger/ledger.service';

/** Split a signed balance transfer at zero so payable/receivable accounts stay correct. */
export function settlementEntries(
  base: Omit<PostEntryDto, 'partyId' | 'accountCode' | 'entryType' | 'amount'>,
  partyId: string,
  balance: number,
  change: number,
): PostEntryDto[] {
  const amount = Math.round(Math.abs(change) * 100);
  const balanceCents = Math.round(balance * 100);
  const reducing = Math.min(
    amount,
    change < 0 ? Math.max(0, balanceCents) : Math.max(0, -balanceCents),
  );
  const entryType = change < 0 ? 'debit' : 'credit';
  return [
    {
      ...base,
      partyId,
      entryType,
      accountCode: change < 0 ? 'accounts_payable' : 'accounts_receivable',
      amount: (reducing / 100).toFixed(2),
    },
    {
      ...base,
      partyId,
      entryType,
      accountCode: change < 0 ? 'accounts_receivable' : 'accounts_payable',
      amount: ((amount - reducing) / 100).toFixed(2),
    },
  ].filter((entry) => Number(entry.amount) > 0) as PostEntryDto[];
}
