import { Injectable } from '@nestjs/common';
import { EntityManager } from 'typeorm';
import { LedgerRepository } from './ledger.repository';
import { LedgerEntry } from './entities/ledger-entry.entity';

export interface PostEntryDto {
  departmentId: string;
  accountCode: string;
  partyId?: string;
  entryType: 'debit' | 'credit';
  amount: string;
  entryDate: Date;
  sourceType: string;
  sourceId: string;
  description?: string;
  createdBy?: string;
  cashAccountId?: string;
  bankAccountId?: string;
  bankTransactionMethod?: 'cheque' | 'app';
  chequeNumber?: string;
  appReference?: string;
}

@Injectable()
export class LedgerService {
  constructor(private readonly ledgerRepo: LedgerRepository) {}

  async post(entries: PostEntryDto[], manager?: EntityManager): Promise<void> {
    const debitCents = entries
      .filter((entry) => entry.entryType === 'debit')
      .reduce((sum, entry) => sum + this.toCents(entry.amount), 0);
    const creditCents = entries
      .filter((entry) => entry.entryType === 'credit')
      .reduce((sum, entry) => sum + this.toCents(entry.amount), 0);
    if (debitCents !== creditCents) {
      throw new Error(
        `Unbalanced ledger posting: debits ${this.fromCents(debitCents)} do not equal credits ${this.fromCents(creditCents)}`,
      );
    }

    const resolved = await Promise.all(
      entries.map(async (dto) => {
        const account = await this.ledgerRepo.findAccountByCode(
          dto.accountCode,
          manager,
        );
        return {
          departmentId: dto.departmentId,
          accountId: account.id,
          partyId: dto.partyId,
          entryType: dto.entryType,
          amount: dto.amount,
          entryDate: dto.entryDate.toISOString().slice(0, 10),
          sourceType: this.sourceType(dto.sourceType),
          sourceId: dto.sourceId,
          description: dto.description,
          createdBy: dto.createdBy,
          cashAccountId: dto.cashAccountId,
          bankAccountId: dto.bankAccountId,
          bankTransactionMethod: dto.bankTransactionMethod,
          chequeNumber: dto.chequeNumber,
          appReference: dto.appReference,
        } as Partial<LedgerEntry>;
      }),
    );

    await this.ledgerRepo.saveEntries(resolved, manager);
  }

  async getPartyStatement(partyId: string, from?: string, to?: string) {
    const start = from ? new Date(from) : new Date('1970-01-01');
    const end = to ? new Date(to) : new Date();
    const entries = await this.ledgerRepo.findByParty(partyId, start, end);

    let balanceCents = 0;
    const withBalance = entries.map((e) => {
      const amountCents = this.toCents(e.amount);
      balanceCents += e.entryType === 'debit' ? amountCents : -amountCents;
      return { ...e, runningBalance: this.fromCents(balanceCents) };
    });

    return {
      entries: withBalance,
      closingBalance: this.fromCents(balanceCents),
    };
  }

  async getPartyBalances(
    partyIds: string[],
  ): Promise<Map<string, string>> {
    const rows = await this.ledgerRepo.getPartyBalances(partyIds);
    return new Map(rows.map((r) => [r.partyId, Number(r.balance).toFixed(2)]));
  }

  async getDepartmentPartyBalances(departmentId: string) {
    const parties =
      await this.ledgerRepo.getDepartmentPartyBalances(departmentId);
    let receivableCents = 0;
    let payableCents = 0;
    for (const party of parties) {
      const cents = this.toCents(Number(party.balance).toFixed(2));
      if (cents > 0) receivableCents += cents;
      if (cents < 0) payableCents += Math.abs(cents);
    }
    return {
      departmentId,
      totalReceivable: this.fromCents(receivableCents),
      totalPayable: this.fromCents(payableCents),
      parties: parties.map((party) => ({
        ...party,
        balance: Number(party.balance).toFixed(2),
      })),
    };
  }

  async getPartyDepartmentBalance(partyId: string, departmentId: string) {
    const balances = await this.getDepartmentPartyBalances(departmentId);
    return balances.parties.find((party) => party.partyId === partyId)?.balance;
  }

  async reverseSource(
    sourceType: LedgerEntry['sourceType'],
    sourceId: string,
    createdBy: string,
    manager: EntityManager,
  ) {
    const entries = await this.ledgerRepo.findBySource(
      sourceType,
      sourceId,
      manager,
    );
    if (!entries.length)
      throw new Error('Original ledger entries were not found');
    await this.post(
      entries.map((entry) => ({
        departmentId: entry.departmentId,
        accountCode: entry.account.code,
        partyId: entry.partyId ?? undefined,
        entryType:
          entry.entryType === 'debit'
            ? ('credit' as const)
            : ('debit' as const),
        amount: entry.amount,
        entryDate: new Date(),
        sourceType,
        sourceId,
        description: 'Cancellation reversal',
        createdBy,
        cashAccountId: entry.cashAccountId,
        bankAccountId: entry.bankAccountId,
        bankTransactionMethod: entry.bankTransactionMethod,
        chequeNumber: entry.chequeNumber,
        appReference: entry.appReference,
      })),
      manager,
    );
  }

  async sumByAccount(
    departmentId: string,
    accountCode: string,
    from: Date,
    to: Date,
    entryType: 'debit' | 'credit',
    excludedSourceType?: LedgerEntry['sourceType'],
  ): Promise<string> {
    const entries = await this.ledgerRepo.findByDepartmentAndDateRange(
      departmentId,
      from,
      to,
      accountCode,
    );
    const sumCents = entries
      .filter((e) => e.sourceType !== excludedSourceType)
      .reduce(
        (acc, e) =>
          acc +
          (e.entryType === entryType
            ? this.toCents(e.amount)
            : -this.toCents(e.amount)),
        0,
      );
    return this.fromCents(sumCents);
  }

  private toCents(value: string): number {
    const match = /^(-?)(\d+)(?:\.(\d{1,2}))?$/.exec(value);
    if (!match) throw new Error(`Invalid monetary value: ${value}`);
    const cents =
      Number(match[2]) * 100 + Number((match[3] ?? '').padEnd(2, '0'));
    return match[1] === '-' ? -cents : cents;
  }

  private fromCents(cents: number): string {
    const sign = cents < 0 ? '-' : '';
    const absolute = Math.abs(cents);
    return `${sign}${Math.floor(absolute / 100)}.${String(absolute % 100).padStart(2, '0')}`;
  }

  private sourceType(value: string): LedgerEntry['sourceType'] {
    const values: LedgerEntry['sourceType'][] = [
      'purchase',
      'sale',
      'internal_transfer',
      'payment',
      'expense',
      'salary',
      'salary_withdrawal',
      'advance',
      'bonus',
      'stock_writeoff',
      'opening_balance',
      'committee',
      'investment',
      'brother_adjustment',
      'investor_capital',
      'investor_profit',
      'zakat_fund',
      'cash_adjustment',
      'party_adjustment',
    ];
    const matched = values.find((candidate) => candidate === value);
    if (!matched) throw new Error(`Invalid ledger source type: ${value}`);
    return matched;
  }
}
