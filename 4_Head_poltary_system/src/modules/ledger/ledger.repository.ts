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
  ): Promise<Array<LedgerEntry & {
    quantityKg?: string;
    ratePerKg?: string;
    totalAmount?: string;
  }>> {
    const result = await this.ledgerRepo
      .createQueryBuilder('le')
      .leftJoin(
        'supply_purchases',
        'supplyPurchase',
        "supplyPurchase.id = le.source_id AND le.source_type = 'purchase'",
      )
      .leftJoin(
        'supply_sales',
        'supplySale',
        "supplySale.id = le.source_id AND le.source_type = 'sale'",
      )
      .leftJoin(
        'brokerage_purchases',
        'brokeragePurchase',
        "brokeragePurchase.id = le.source_id AND le.source_type = 'purchase'",
      )
      .leftJoin(
        'brokerage_sales',
        'brokerageSale',
        "brokerageSale.id = le.source_id AND le.source_type = 'sale'",
      )
      .addSelect(
        'COALESCE(supplyPurchase.quantity_kg, supplySale.quantity_kg, brokeragePurchase.quantity_kg, brokerageSale.quantity_kg)',
        'transactionQuantityKg',
      )
      .addSelect(
        'COALESCE(supplyPurchase.rate_per_kg, supplySale.rate_per_kg, brokeragePurchase.rate_per_kg, brokerageSale.rate_per_kg)',
        'transactionRatePerKg',
      )
      .addSelect(
        'COALESCE(supplyPurchase.total_amount, supplySale.total_amount, brokeragePurchase.total_amount, brokerageSale.total_amount)',
        'transactionTotalAmount',
      )
      .where('le.party_id = :partyId', { partyId })
      .andWhere('le.entry_date >= :from', { from })
      .andWhere('le.entry_date <= :to', { to })
      .orderBy('le.entry_date', 'ASC')
      .addOrderBy('le.created_at', 'ASC')
      .addOrderBy('le.id', 'ASC')
      .getRawAndEntities();

    return result.entities.map((entry, index) => {
      const raw = result.raw[index] as {
        transactionQuantityKg?: string;
        transactionRatePerKg?: string;
        transactionTotalAmount?: string;
      };
      return Object.assign(entry, {
        quantityKg: raw.transactionQuantityKg,
        ratePerKg: raw.transactionRatePerKg,
        totalAmount: raw.transactionTotalAmount,
      });
    });
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
    from: string,
    to: string,
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
        CASE
          WHEN le.entry_type = 'credit' THEN CAST(le.amount AS numeric)
          ELSE -CAST(le.amount AS numeric)
        END
      ), 0) as balance
      FROM (SELECT UNNEST($1::uuid[]) as id) p
      LEFT JOIN ledger_entries le ON p.id = le.party_id
      GROUP BY p.id
      `,
      [partyIds],
    );
  }

  getDepartmentPartyBalances(departmentId: string) {
    return this.ledgerRepo.manager
      .createQueryBuilder()
      .select('party.id', 'partyId')
      .addSelect('party.name', 'partyName')
      .addSelect('party.party_type', 'partyType')
      .addSelect(
        `COALESCE(SUM(CASE
          WHEN le.entry_type = 'credit' THEN CAST(le.amount AS numeric)
          ELSE -CAST(le.amount AS numeric)
        END), 0)`,
        'balance',
      )
      .from('parties', 'party')
      .leftJoin(
        'party_departments',
        'pd',
        'pd.party_id = party.id AND pd.department_id = :departmentId',
        { departmentId },
      )
      .leftJoin(
        'ledger_entries',
        'le',
        'le.party_id = party.id AND le.department_id = :departmentId',
        { departmentId },
      )
      .where(
        '(party.primary_department_id = :departmentId OR party.linked_department_id = :departmentId OR pd.department_id IS NOT NULL)',
        { departmentId },
      )
      .andWhere('party.deleted_at IS NULL')
      .groupBy('party.id')
      .addGroupBy('party.name')
      .addGroupBy('party.party_type')
      .orderBy('party.name', 'ASC')
      .getRawMany<{
        partyId: string;
        partyName: string;
        partyType: string;
        balance: string;
      }>();
  }
}
