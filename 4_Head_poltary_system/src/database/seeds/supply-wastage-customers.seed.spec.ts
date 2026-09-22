import { getMetadataArgsStorage } from 'typeorm';
import { Party } from '../../modules/parties/entities/party.entity';
import {
  getSupplySeedPartyRoleName,
  SUPPLY_PARTY_SEED_ENTRIES,
} from './supply-wastage-customers.seed';

describe('supply party seed data', () => {
  it('uses the PARTY role and keeps the exact supply ledger list', () => {
    expect(getSupplySeedPartyRoleName()).toBe('PARTY');
    expect(SUPPLY_PARTY_SEED_ENTRIES).toHaveLength(138);
    expect(
      SUPPLY_PARTY_SEED_ENTRIES.every((entry) => entry.email.endsWith('@supply.local')),
    ).toBe(true);

    const balances = SUPPLY_PARTY_SEED_ENTRIES.filter(
      (entry) => entry.openingBalance !== undefined,
    );

    expect(balances.length).toBe(138);

    for (const entry of balances) {
      const balance = Number(entry.openingBalance ?? '0');
      const expectedAccount =
        balance >= 0 ? 'accounts_payable' : 'accounts_receivable';

      expect(expectedAccount).toBe(
        balance >= 0 ? 'accounts_payable' : 'accounts_receivable',
      );
      expect(entry.fullName.trim().length).toBeGreaterThan(0);
    }
  });

  it('does not enforce a global unique party name', () => {
    const uniqueNames = getMetadataArgsStorage().uniques.filter((unique) => {
      const columns = (unique as any).columns ?? [];
      const names = columns.map((column: any) =>
        typeof column === 'string' ? column : column.propertyName,
      );
      return unique.target === Party && names.includes('name');
    });

    expect(uniqueNames).toHaveLength(0);
  });
});
