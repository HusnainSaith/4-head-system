import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { createHash } from 'node:crypto';
import { InjectRepository } from '@nestjs/typeorm';
import { In, Like, Repository, EntityManager } from 'typeorm';
import { ChartOfAccount } from '../ledger/entities/chart-of-account.entity';
import { moneyToCents, centsToMoney } from '../../common/utils/money.util';
import { PostPartnerProfitDto } from './dto/post-partner-profit.dto';
import { LedgerEntry } from '../ledger/entities/ledger-entry.entity';
import { StockBalance } from '../inventory/entities/stock-balance.entity';
import { Expense } from '../expenses/entities/expense.entity';
import { SalaryRun } from '../employees/entities/salary-run.entity';
import { BrokerageSale } from '../brokerage/entities/brokerage-sale.entity';
import { SupplySale } from '../supply/entities/supply-sale.entity';
import { WastageSale } from '../wastage/entities/wastage-sale.entity';
import { ShopSale } from '../fresh-chicken-shop/entities/shop-sale.entity';
import { InternalTransfer } from '../supply/entities/internal-transfer.entity';
import { StockMovement } from '../inventory/entities/stock-movement.entity';
import { Department } from '../departments/entities/department.entity';
import { User } from '../users/entities/user.entity';
import { DepartmentPartnerShare } from './entities/department-partner-share.entity';
import { Party } from '../parties/entities/party.entity';
import { PartyTypeEnum } from '../../common/types/party-type.enum';
import {
  normalizePercent,
  percentToUnits,
} from '../../common/utils/money.util';
import { PartnerSharesDto } from './dto/partner-shares.dto';
import { SupplyRepository } from '../supply/supply.repository';
import { SupplyPurchase } from '../supply/entities/supply-purchase.entity';
import { pendingPayrollBonuses } from '../employees/pending-payroll-bonuses';
import { EmployeeBonus } from '../employees/entities/employee-bonus.entity';
import { salaryBalancesWithBonuses } from '../employees/salary-bonus-balance';

@Injectable()
export class ReportsRepository {
  private withManager(manager: EntityManager) {
    return new ReportsRepository(
      manager.getRepository(LedgerEntry),
      manager.getRepository(StockBalance),
      manager.getRepository(Expense),
      manager.getRepository(SalaryRun),
      manager.getRepository(BrokerageSale),
      manager.getRepository(SupplySale),
      manager.getRepository(WastageSale),
      manager.getRepository(ShopSale),
      manager.getRepository(InternalTransfer),
      manager.getRepository(StockMovement),
      manager.getRepository(Department),
    );
  }

  async postPartnerProfit(
    departmentId: string,
    dto: PostPartnerProfitDto,
    actorId: string,
    preview: (repository: ReportsRepository) => Promise<
      | {
          configured: boolean;
          netProfit: string;
          partners: { partyId: string | null; profitShare: string }[];
        }
      | undefined
    >,
  ) {
    const start = dto.startDate ?? '1970-01-01';
    const end = dto.endDate ?? new Date().toISOString().slice(0, 10);
    return this.departmentRepo.manager.transaction(async (manager) => {
      await manager.query('SELECT pg_advisory_xact_lock(hashtext($1))', [
        `partner-profit:${departmentId}`,
      ]);
      const department = await manager.findOne(Department, {
        where: { id: departmentId },
        lock: { mode: 'pessimistic_write' },
      });
      if (!department) throw new NotFoundException('Department not found');
      const target = await preview(this.withManager(manager));
      if (!target?.configured)
        throw new BadRequestException(
          'Configure partner ownership and linked accounts before posting',
        );
      if (
        moneyToCents(target.netProfit) !== moneyToCents(dto.expectedNetProfit)
      )
        throw new ConflictException(
          'Profit has changed. Refresh the report and confirm the updated amount.',
        );
      const prefix = 'Partner profit share: ';
      const description = `${prefix}${start}..${end}`;
      const previous = await manager.find(LedgerEntry, {
        where: {
          departmentId,
          sourceType: 'party_adjustment',
          description: Like(`${prefix}%`),
        },
      });
      for (const entry of previous) {
        const match =
          /^Partner profit share: (\d{4}-\d{2}-\d{2})\.\.(\d{4}-\d{2}-\d{2})$/.exec(
            entry.description ?? '',
          );
        if (
          match &&
          entry.description !== description &&
          start <= match[2] &&
          end >= match[1] &&
          !(start === match[1] && end >= match[2])
        )
          throw new ConflictException(
            'This date range overlaps profit already posted. Select a separate period, or use the exact previously posted range to apply a correction.',
          );
      }
      const current = new Map<string, bigint>();
      for (const entry of previous) {
        const range =
          /^Partner profit share: (\d{4}-\d{2}-\d{2})\.\.(\d{4}-\d{2}-\d{2})$/.exec(
            entry.description ?? '',
          );
        if (range && range[1] === start && range[2] <= end && entry.partyId)
          current.set(
            entry.partyId,
            (current.get(entry.partyId) ?? 0n) +
              moneyToCents(entry.amount) *
                (entry.entryType === 'credit' ? 1n : -1n),
          );
      }
      const desired = new Map(
        target.partners.map((partner) => [
          partner.partyId!,
          moneyToCents(partner.profitShare),
        ]),
      );
      const accounts = await manager.find(ChartOfAccount, {
        where: { code: In(['accounts_payable', 'retained_earnings']) },
      });
      const payable = accounts.find(
        (account) => account.code === 'accounts_payable',
      );
      const equity = accounts.find(
        (account) => account.code === 'retained_earnings',
      );
      if (!payable || !equity)
        throw new BadRequestException(
          'Partner payable and retained earnings accounts are required',
        );
      const hash = createHash('sha256')
        .update(`${departmentId}:${description}`)
        .digest('hex');
      const sourceId = `${hash.slice(0, 8)}-${hash.slice(8, 12)}-4${hash.slice(13, 16)}-a${hash.slice(17, 20)}-${hash.slice(20, 32)}`;
      const entries: Partial<LedgerEntry>[] = [];
      for (const partyId of new Set([...current.keys(), ...desired.keys()])) {
        const delta =
          (desired.get(partyId) ?? 0n) - (current.get(partyId) ?? 0n);
        if (delta === 0n) continue;
        const common = {
          departmentId,
          amount: centsToMoney(delta < 0n ? -delta : delta),
          entryDate: end,
          sourceType: 'party_adjustment' as const,
          sourceId,
          description,
          createdBy: actorId,
        };
        entries.push(
          {
            ...common,
            partyId,
            accountId: payable.id,
            entryType: delta > 0n ? 'credit' : 'debit',
          },
          {
            ...common,
            accountId: equity.id,
            entryType: delta > 0n ? 'debit' : 'credit',
          },
        );
      }
      if (entries.length)
        await manager.save(
          LedgerEntry,
          entries.map((entry) => manager.create(LedgerEntry, entry)),
        );
      return {
        departmentId,
        netProfit: target.netProfit,
        startDate: start,
        endDate: end,
        changed: entries.length > 0,
        message: entries.length
          ? 'Profit / loss posted to partner accounts'
          : 'This profit / loss is already posted; no duplicate entries were created',
      };
    });
  }
  constructor(
    @InjectRepository(LedgerEntry)
    private readonly ledgerRepo: Repository<LedgerEntry>,
    @InjectRepository(StockBalance)
    private readonly stockBalanceRepo: Repository<StockBalance>,
    @InjectRepository(Expense)
    private readonly expenseRepo: Repository<Expense>,
    @InjectRepository(SalaryRun)
    private readonly salaryRunRepo: Repository<SalaryRun>,
    @InjectRepository(BrokerageSale)
    private readonly brokerageSaleRepo: Repository<BrokerageSale>,
    @InjectRepository(SupplySale)
    private readonly supplySaleRepo: Repository<SupplySale>,
    @InjectRepository(WastageSale)
    private readonly wastageSaleRepo: Repository<WastageSale>,
    @InjectRepository(ShopSale)
    private readonly shopSaleRepo: Repository<ShopSale>,
    @InjectRepository(InternalTransfer)
    private readonly internalTransferRepo: Repository<InternalTransfer>,
    @InjectRepository(StockMovement)
    private readonly stockMovementRepo: Repository<StockMovement>,
    @InjectRepository(Department)
    private readonly departmentRepo: Repository<Department>,
  ) {}

  async sumExternalSales(from: Date, to: Date): Promise<number> {
    const brokerage = await this.sumTable(
      this.brokerageSaleRepo,
      'saleDate',
      from,
      to,
    );
    const supply = await this.sumTable(
      this.supplySaleRepo,
      'saleDate',
      from,
      to,
    );
    const wastage = await this.sumTable(
      this.wastageSaleRepo,
      'saleDate',
      from,
      to,
    );
    const shop = await this.sumTable(this.shopSaleRepo, 'saleDate', from, to);
    return brokerage + supply + wastage + shop;
  }

  async sumInternalTransferRevenue(from: Date, to: Date): Promise<number> {
    const result = await this.internalTransferRepo
      .createQueryBuilder('it')
      .select('COALESCE(SUM(it.totalAmount), 0)', 'sum')
      .where('it.transferDate >= :from', {
        from: from.toISOString().slice(0, 10),
      })
      .andWhere('it.transferDate < :to', { to: to.toISOString().slice(0, 10) })
      .getRawOne();
    return parseFloat(result.sum || '0');
  }

  async sumTable(
    repo: Repository<any>,
    dateField: string,
    from: Date,
    to: Date,
  ): Promise<number> {
    const query = repo
      .createQueryBuilder('t')
      .select('COALESCE(SUM(t.totalAmount), 0)', 'sum')
      .where(`t.${dateField} >= :from`, {
        from: from.toISOString().slice(0, 10),
      })
      .andWhere(`t.${dateField} < :to`, { to: to.toISOString().slice(0, 10) })
      .andWhere('t.deleted_at IS NULL');
    if (repo.metadata.findColumnWithPropertyName('status'))
      query.andWhere('t.status NOT IN (:...cancelledStatuses)', {
        cancelledStatuses: ['cancelled'],
      });
    if (repo.metadata.findColumnWithPropertyName('destinationType'))
      query.andWhere("t.destinationType = 'external'");
    const result = await query.getRawOne();
    return parseFloat(result.sum || '0');
  }

  /** Resolve partners from department membership, never from placeholder slots. */
  async savePartnerShares(
    departmentId: string,
    dto: PartnerSharesDto,
    actorId: string,
  ) {
    const equalShare = dto.allocationMode === 'equal';
    if (
      !equalShare &&
      dto.shares.reduce(
        (sum, share) => sum + percentToUnits(share.percentage ?? ''),
        0n,
      ) !== 1000000n
    )
      throw new BadRequestException(
        'Department ownership percentages must total exactly 100%',
      );
    return this.departmentRepo.manager.transaction(async (manager) => {
      // Serialize configuration changes and lock membership while validating.
      const department = await manager.findOne(Department, {
        where: { id: departmentId },
        lock: { mode: 'pessimistic_write' },
      });
      if (!department) throw new BadRequestException('Department not found');
      const users = await manager
        .getRepository(User)
        .createQueryBuilder('partner_user')
        .innerJoin('partner_user.role', 'role')
        .where('partner_user.departmentId = :departmentId', { departmentId })
        .andWhere("LOWER(TRIM(role.name)) = 'partner'")
        // TypeORM inserts lock-table aliases verbatim; avoid SQL keywords here.
        .setLock('pessimistic_write', undefined, ['partner_user'])
        .getMany();
      if (
        users.length !== dto.shares.length ||
        new Set(dto.shares.map((s) => s.userId)).size !== users.length ||
        users.some((u) => !dto.shares.some((s) => s.userId === u.id))
      )
        throw new BadRequestException(
          'Provide a percentage for every current partner in this department',
        );
      await manager.delete(DepartmentPartnerShare, { departmentId });
      for (const user of users) {
        // A user's current department supersedes an earlier department assignment.
        await manager.delete(DepartmentPartnerShare, { userId: user.id });
        let party = await manager.findOne(Party, {
          where: { userId: user.id },
        });
        // Department ownership comes from the user's role. Reuse their unique
        // linked account without reclassifying existing transactions or parties.
        if (!party)
          party = manager.create(Party, {
            userId: user.id,
            name: user.fullName,
            phone: user.phone,
            partyType: PartyTypeEnum.PARTNER,
            primaryDepartmentId: departmentId,
            openingBalance: '0.00',
            createdBy: actorId,
          });
        party = await manager.save(Party, party);
        await manager.query(
          'INSERT INTO party_departments (party_id, department_id) VALUES ($1, $2) ON CONFLICT DO NOTHING',
          [party.id, departmentId],
        );
        await manager.save(DepartmentPartnerShare, {
          departmentId,
          userId: user.id,
          partyId: party.id,
          equalShare,
          percentage: equalShare
            ? '0.0000'
            : normalizePercent(
                dto.shares.find((s) => s.userId === user.id)!.percentage!,
              ),
          updatedBy: actorId,
          updatedAt: new Date(),
        });
      }
      return { departmentId };
    });
  }

  async getDepartmentPartners() {
    return this.departmentRepo.manager
      .getRepository(User)
      .createQueryBuilder('user')
      .innerJoin('user.role', 'role')
      .innerJoin('user.department', 'department')
      .leftJoin(
        DepartmentPartnerShare,
        'share',
        'share.userId = user.id AND share.departmentId = department.id',
      )
      .leftJoin(
        Party,
        'party',
        'party.id = share.partyId AND party.userId = user.id',
      )
      .select('user.id', 'userId')
      .addSelect('user.fullName', 'partnerName')
      .addSelect('user.departmentId', 'departmentId')
      .addSelect('share.percentage', 'percentage')
      .addSelect('share.equalShare', 'equalShare')
      .addSelect('party.id', 'partyId')
      .addSelect('party.partyType', 'partyType')
      .where('LOWER(TRIM(role.name)) = :role', { role: 'partner' })
      .orderBy('user.id', 'ASC')
      .getRawMany<{
        userId: string;
        partnerName: string;
        departmentId: string;
        percentage: string | null;
        equalShare: boolean | null;
        partyId: string | null;
        partyType: string | null;
      }>();
  }

  async hasPartnerAccounts(partyIds: string[]) {
    if (!partyIds.length) return false;
    return this.departmentRepo.manager
      .getRepository(DepartmentPartnerShare)
      .exist({ where: { partyId: In(partyIds) } });
  }

  async getDepartmentProfitLoss(from: Date, to: Date, includeInactive = false) {
    const departments = await this.departmentRepo.find({
      where: includeInactive ? {} : { isActive: true },
      order: { name: 'ASC' },
    });
    const salesRepositories: Record<Department['type'], Repository<any>> = {
      BROKERAGE: this.brokerageSaleRepo,
      SUPPLY: this.supplySaleRepo,
      WASTAGE: this.wastageSaleRepo,
      FRESH_CHICKEN_SHOP: this.shopSaleRepo,
    };

    return Promise.all(
      departments.map(async (department) => {
        const manager = this.departmentRepo.manager;
        const supply =
          department.type === 'SUPPLY'
            ? new SupplyRepository(
                manager.getRepository(SupplyPurchase),
                manager.getRepository(SupplySale),
                manager.getRepository(InternalTransfer),
                manager.getRepository(Party),
              )
            : null;
        const start = from.toISOString().slice(0, 10);
        const inclusiveEnd = new Date(to);
        inclusiveEnd.setUTCDate(inclusiveEnd.getUTCDate() - 1);
        const end = inclusiveEnd.toISOString().slice(0, 10);
        const revenue = supply
          ? Number(await supply.sumActiveSaleTotal(start, end, department.id))
          : await this.sumTableByDepartment(
              salesRepositories[department.type],
              department.id,
              from,
              to,
            );
        const cogs = supply
          ? Number(
              await supply.sumActivePurchaseTotal(start, end, department.id),
            )
          : await this.sumLedgerAccount(
              department.id,
              ['cogs'],
              'debit',
              from,
              to,
              'internal_transfer',
            );
        const otherIncome = supply
          ? 0
          : await this.sumLedgerAccount(
              department.id,
              ['other_income'],
              'credit',
              from,
              to,
            );
        const operatingExpenses = await this.sumDepartmentExpenses(
          department.id,
          from,
          to,
        );
        const payrollExpenses = await this.sumLedgerAccount(
          department.id,
          ['payroll_expense'],
          'debit',
          from,
          to,
        );
        const shrinkageExpenses =
          department.type === 'SUPPLY'
            ? await this.sumDepartmentExpenses(
                department.id,
                from,
                to,
                'stock_writeoff',
              )
            : 0;
        const otherExpenses = operatingExpenses - shrinkageExpenses;
        const grossProfit = revenue + otherIncome - cogs;
        return {
          departmentId: department.id,
          departmentName: department.name,
          departmentType: department.type,
          revenue: revenue.toFixed(2),
          otherIncome: otherIncome.toFixed(2),
          cogs: cogs.toFixed(2),
          grossProfit: grossProfit.toFixed(2),
          operatingExpenses: operatingExpenses.toFixed(2),
          shrinkageExpenses: shrinkageExpenses.toFixed(2),
          otherExpenses: otherExpenses.toFixed(2),
          payrollExpenses: payrollExpenses.toFixed(2),
          netProfit: (grossProfit - otherExpenses - payrollExpenses).toFixed(2),
        };
      }),
    );
  }

  private async sumTableByDepartment(
    repo: Repository<any>,
    departmentId: string,
    from: Date,
    to: Date,
  ): Promise<number> {
    const query = repo
      .createQueryBuilder('sale')
      .select('COALESCE(SUM(sale.totalAmount), 0)', 'sum')
      .where('sale.department_id = :departmentId', { departmentId })
      .andWhere('sale.sale_date >= :from', {
        from: from.toISOString().slice(0, 10),
      })
      .andWhere('sale.sale_date < :to', { to: to.toISOString().slice(0, 10) })
      .andWhere('sale.deleted_at IS NULL');
    if (repo.metadata.findColumnWithPropertyName('status'))
      query.andWhere('sale.status NOT IN (:...cancelledStatuses)', {
        cancelledStatuses: ['cancelled'],
      });
    if (repo.metadata.findColumnWithPropertyName('destinationType'))
      query.andWhere("sale.destinationType = 'external'");
    const result = await query.getRawOne();
    return Number(result?.sum ?? 0);
  }

  /** Expense records are authoritative; imported ledgers can contain retries. */
  private async sumDepartmentExpenses(
    departmentId: string,
    from: Date,
    to: Date,
    sourceType?: string,
  ): Promise<number> {
    const query = this.expenseRepo
      .createQueryBuilder('expense')
      .select('COALESCE(SUM(expense.amount), 0)', 'sum')
      .where('expense.department_id = :departmentId', { departmentId })
      .andWhere('expense.expense_date >= :from', {
        from: from.toISOString().slice(0, 10),
      })
      .andWhere('expense.expense_date < :to', {
        to: to.toISOString().slice(0, 10),
      })
      .andWhere('expense.deleted_at IS NULL');
    if (sourceType)
      query.andWhere('expense.sourceType = :sourceType', { sourceType });
    const result = await query.getRawOne<{ sum: string }>();
    return Number(result?.sum ?? 0);
  }

  async sumLedgerAccount(
    departmentId: string | null,
    accountCodes: string[],
    entryType: 'debit' | 'credit',
    from: Date,
    to: Date,
    excludeSourceType?: string,
  ): Promise<number> {
    const qb = this.ledgerRepo
      .createQueryBuilder('le')
      .leftJoin('le.account', 'acct')
      .select(
        'COALESCE(SUM(CASE WHEN le.entry_type = :entryType THEN le.amount ELSE -le.amount END), 0)',
        'sum',
      )
      .setParameter('entryType', entryType)
      .where('le.entry_date >= :from', {
        from: from.toISOString().slice(0, 10),
      })
      .andWhere('le.entry_date < :to', { to: to.toISOString().slice(0, 10) })
      .andWhere('acct.code IN (:...codes)', { codes: accountCodes });

    if (departmentId) {
      qb.andWhere('le.department_id = :departmentId', { departmentId });
    }
    if (excludeSourceType)
      qb.andWhere('le.source_type != :excludeSourceType', {
        excludeSourceType,
      });

    const result = await qb.getRawOne();
    const pending =
      entryType === 'debit' && accountCodes.includes('payroll_expense')
        ? await pendingPayrollBonuses(
            this.ledgerRepo.manager,
            departmentId,
            from,
            to,
          )
        : 0;
    return parseFloat(result.sum || '0') + pending;
  }

  async getOutstandingBalances(departmentId?: string) {
    const qb = this.ledgerRepo
      .createQueryBuilder('le')
      .leftJoin('le.party', 'party')
      .leftJoin('le.department', 'department')
      .select('le.party_id', 'partyId')
      .addSelect('party.name', 'partyName')
      .addSelect('party.party_type', 'partyType')
      .addSelect('le.department_id', 'departmentId')
      .addSelect('department.name', 'departmentName')
      .addSelect(
        "SUM(CASE WHEN le.entry_type = 'credit' THEN CAST(le.amount AS numeric) ELSE 0 END) - SUM(CASE WHEN le.entry_type = 'debit' THEN CAST(le.amount AS numeric) ELSE 0 END)",
        'balance',
      )
      .andWhere('le.party_id IS NOT NULL')
      .groupBy('le.party_id')
      .addGroupBy('party.name')
      .addGroupBy('party.party_type')
      .addGroupBy('le.department_id')
      .addGroupBy('department.name')
      .having(
        "SUM(CASE WHEN le.entry_type = 'credit' THEN CAST(le.amount AS numeric) ELSE 0 END) - SUM(CASE WHEN le.entry_type = 'debit' THEN CAST(le.amount AS numeric) ELSE 0 END) != 0",
      );

    if (departmentId) {
      qb.andWhere('le.department_id = :departmentId', { departmentId });
    }

    return qb.getRawMany();
  }

  async getStockSummary(departmentId?: string, from?: Date, to?: Date) {
    const qb = this.stockBalanceRepo
      .createQueryBuilder('sb')
      .leftJoin(Department, 'department', 'department.id = sb.department_id')
      .select([
        'sb.product_id AS "productId"',
        'sb.department_id AS "departmentId"',
        'sb.stock_type AS "stockType"',
        'sb.quantity_kg AS "quantityKg"',
        'sb.wac AS wac',
        'department.name AS "departmentName"',
      ]);
    if (departmentId)
      qb.where('sb.department_id = :departmentId', { departmentId });
    const summary = await qb.getRawMany();
    const movements = this.stockMovementRepo
      .createQueryBuilder('m')
      .leftJoin('m.department', 'department')
      .select([
        'm.id AS id',
        'm.department_id AS "departmentId"',
        'm.stock_type AS "stockType"',
        'department.name AS "departmentName"',
        'm.movement_type AS "movementType"',
        'm.quantity_kg AS "quantityKg"',
        'm.rate_per_kg AS "ratePerKg"',
        'm.resulting_wac AS "resultingWac"',
        'm.source_type AS "sourceType"',
        'm.source_id AS "sourceId"',
        'm.movement_date AS "movementDate"',
      ]);
    if (departmentId)
      movements.andWhere('m.department_id=:departmentId', { departmentId });
    if (from) movements.andWhere('m.movement_date>=:from', { from });
    if (to) movements.andWhere('m.movement_date<:to', { to });
    return {
      summary,
      movements: await movements
        .orderBy('m.movement_date', 'DESC')
        .getRawMany(),
    };
  }

  async getExpenseBreakdown(
    from: Date,
    to: Date,
    departmentId?: string,
    categoryId?: string,
  ) {
    const qb = this.expenseRepo
      .createQueryBuilder('e')
      .leftJoin('e.category', 'category')
      .select('category.name', 'category')
      .addSelect('category.id', 'categoryId')
      .addSelect('e.department_id', 'departmentId')
      .addSelect('COALESCE(SUM(CAST(e.amount AS numeric)), 0)', 'total')
      .where('e.expenseDate >= :from', { from })
      .andWhere('e.expenseDate < :to', { to })
      .groupBy('category.name')
      .addGroupBy('category.id')
      .addGroupBy('e.department_id');

    if (departmentId)
      qb.andWhere('e.department_id = :departmentId', { departmentId });
    if (categoryId) qb.andWhere('e.category_id=:categoryId', { categoryId });

    return qb.getRawMany();
  }

  async getPayrollSummary(from: Date, to: Date, departmentId?: string) {
    const query = this.salaryRunRepo
      .createQueryBuilder('sr')
      .withDeleted()
      .leftJoinAndSelect('sr.employee', 'employee')
      .leftJoinAndSelect('employee.department', 'department')
      .where('sr.deleted_at IS NULL')
      .andWhere('MAKE_DATE(sr.period_year, sr.period_month, 1) >= :from', {
        from: from.toISOString().slice(0, 10),
      })
      .andWhere('MAKE_DATE(sr.period_year, sr.period_month, 1) < :to', {
        to: to.toISOString().slice(0, 10),
      });
    if (departmentId)
      query.andWhere('employee.department_id = :departmentId', {
        departmentId,
      });
    const runs = await query.getMany();
    const bonuses = runs.length
      ? await this.salaryRunRepo.manager.getRepository(EmployeeBonus).find({
          where: {
            employeeId: In([...new Set(runs.map((run) => run.employeeId))]),
          },
        })
      : [];
    const totals = new Map<
      string,
      {
        departmentId: string;
        departmentName: string;
        employeeId: string;
        employeeName: string;
        net: bigint;
        advances: bigint;
        bonuses: bigint;
      }
    >();
    for (const run of salaryBalancesWithBonuses(runs, bonuses)) {
      const row = totals.get(run.employeeId) ?? {
        departmentId: run.employee.departmentId,
        departmentName: run.employee.department?.name ?? '',
        employeeId: run.employeeId,
        employeeName: run.employee.fullName,
        net: 0n,
        advances: 0n,
        bonuses: 0n,
      };
      row.net += moneyToCents(run.netPayable);
      row.advances += moneyToCents(run.totalAdvancesDeducted);
      row.bonuses += moneyToCents(run.totalBonuses);
      totals.set(run.employeeId, row);
    }
    const bonusQuery = this.salaryRunRepo.manager
      .getRepository(EmployeeBonus)
      .createQueryBuilder('bonus')
      .withDeleted()
      .leftJoinAndSelect('bonus.employee', 'employee')
      .leftJoinAndSelect('employee.department', 'department')
      .where('bonus.deleted_at IS NULL')
      .andWhere('bonus.bonus_date >= :from', {
        from: from.toISOString().slice(0, 10),
      })
      .andWhere('bonus.bonus_date < :to', { to: to.toISOString().slice(0, 10) })
      .andWhere(
        'NOT EXISTS (SELECT 1 FROM salary_runs existing WHERE existing.employee_id = bonus.employee_id AND existing.deleted_at IS NULL AND existing.period_year = EXTRACT(YEAR FROM bonus.bonus_date) AND existing.period_month = EXTRACT(MONTH FROM bonus.bonus_date))',
      );
    if (departmentId)
      bonusQuery.andWhere('employee.department_id = :departmentId', {
        departmentId,
      });
    for (const bonus of await bonusQuery.getMany()) {
      const row = totals.get(bonus.employeeId) ?? {
        departmentId: bonus.employee.departmentId,
        departmentName: bonus.employee.department?.name ?? '',
        employeeId: bonus.employeeId,
        employeeName: bonus.employee.fullName,
        net: 0n,
        advances: 0n,
        bonuses: 0n,
      };
      row.net += moneyToCents(bonus.amount);
      row.bonuses += moneyToCents(bonus.amount);
      totals.set(bonus.employeeId, row);
    }
    return [...totals.values()].map(({ net, advances, bonuses, ...row }) => ({
      ...row,
      totalNetPayable: centsToMoney(net),
      totalAdvancesDeducted: centsToMoney(advances),
      totalBonuses: centsToMoney(bonuses),
    }));
  }
}
