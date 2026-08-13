import { LedgerEntry } from '../entities/ledger-entry.entity';

export interface ILedgerRepository {
  save(entries: LedgerEntry[]): Promise<LedgerEntry[]>;
  findByPartyId(partyId: string): Promise<LedgerEntry[]>;
}
