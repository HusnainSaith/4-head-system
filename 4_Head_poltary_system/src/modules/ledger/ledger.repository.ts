import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, EntityManager } from 'typeorm';
import { LedgerEntry } from './entities/ledger-entry.entity';
import { ChartOfAccount } from './entities/chart-of-account.entity';

@Injectable()
export class LedgerRepository {
  constructor(
    @InjectRepository(LedgerEntry)
    private readonly ledgerRepo: Repository<LedgerEntry>,
    @InjectRepository(ChartOfAccount)
    private readonly coaRepo: Repository<ChartOfAccount>,
  ) {}

  async saveEntry(
    entry: Partial<LedgerEntry>,
    manager?: EntityManager,
  ): Promise<LedgerEntry> {
    const repo = manager ? manager.getRepository(LedgerEntry) : this.ledgerRepo;
    return repo.save(repo.create(entry));
  }

  async saveEntries(
    entries: Partial<LedgerEntry>[],
    manager?: EntityManager,
  ): Promise<LedgerEntry[]> {
    const repo = manager ? manager.getRepository(LedgerEntry) : this.ledgerRepo;
    return repo.save(entries.map((e) => repo.create(e)));
  }

  async findByParty(
    partyId: string,
    from: Date,
    to: Date,
  ): Promise<LedgerEntry[]> {
    return this.ledgerRepo
      .createQueryBuilder('le')
      .where('le.party_id = :partyId', { partyId })
      .andWhere('le.entry_date >= :from', { from })
      .andWhere('le.entry_date <= :to', { to })
      .orderBy('le.entry_date', 'ASC')
      .addOrderBy('le.created_at', 'ASC')
      .addOrderBy('le.id', 'ASC')
      .getMany();
  }

  async findAccountByCode(
    code: string,
    manager?: EntityManager,
  ): Promise<ChartOfAccount> {
    const repo = manager ? manager.getRepository(ChartOfAccount) : this.coaRepo;
    return repo
      .createQueryBuilder('account')
      .where('account.code = :code', { code })
      .getOneOrFail();
  }

  async findByDepartmentAndDateRange(
    departmentId: string,
    from: Date,
    to: Date,
    accountCode?: string,
  ): Promise<LedgerEntry[]> {
    const qb = this.ledgerRepo
      .createQueryBuilder('le')
      .leftJoin('le.account', 'acct')
      .where('le.department_id = :departmentId', { departmentId })
      .andWhere('le.entry_date >= :from', { from })
      .andWhere('le.entry_date <= :to', { to });

    if (accountCode) {
      qb.andWhere('acct.code = :accountCode', { accountCode });
    }

    return qb.orderBy('le.entry_date', 'ASC').getMany();
  }

  findBySource(
    sourceType: LedgerEntry['sourceType'],
    sourceId: string,
    manager?: EntityManager,
  ) {
    const repo = manager ? manager.getRepository(LedgerEntry) : this.ledgerRepo;
    return repo.find({
      where: { sourceType, sourceId },
      relations: { account: true },
    });
  }

  getPartyBalances(partyIds: string[]) {
    if (partyIds.length === 0) return Promise.resolve([]);
    return this.ledgerRepo.query(
      `
      SELECT p.id as "partyId", COALESCE(SUM(
        CASE WHEN le.entry_type = 'debit' THEN CAST(le.amount AS numeric) 
             ELSE -CAST(le.amount AS numeric) END
      ), 0) as balance
      FROM (SELECT UNNEST($1::uuid[]) as id) p
      LEFT JOIN ledger_entries le ON p.id = le.party_id
      GROUP BY p.id
      `,
      [partyIds],
    );
  }

  getDepartmentPartyBalances(departmentId: string) {
    return this.ledgerRepo
      .createQueryBuilder('le')
      .leftJoin('le.party', 'party')
      .select('le.party_id', 'partyId')
      .addSelect('party.name', 'partyName')
      .addSelect('party.party_type', 'partyType')
      .addSelect(
        "SUM(CASE WHEN le.entry_type = 'debit' THEN CAST(le.amount AS numeric) ELSE -CAST(le.amount AS numeric) END)",
        'balance',
      )
      .where('le.department_id = :departmentId', { departmentId })
      .andWhere('le.party_id IS NOT NULL')
      .andWhere('party.deleted_at IS NULL')
      .groupBy('le.party_id')
      .addGroupBy('party.name')
      .addGroupBy('party.party_type')
      .having(
        "SUM(CASE WHEN le.entry_type = 'debit' THEN CAST(le.amount AS numeric) ELSE -CAST(le.amount AS numeric) END) != 0",
      )
      .orderBy('party.name', 'ASC')
      .getRawMany<{
        partyId: string;
        partyName: string;
        partyType: string;
        balance: string;
      }>();
  }
}
