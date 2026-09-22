import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
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

@Injectable()
export class ReportsRepository {
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
      .where('it.transferDate >= :from', { from })
      .andWhere('it.transferDate < :to', { to })
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
      .where(`t.${dateField} >= :from`, { from })
      .andWhere(`t.${dateField} < :to`, { to })
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

  async getDepartmentProfitLoss(from: Date, to: Date) {
    const departments = await this.departmentRepo.find({
      where: { isActive: true },
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
        const revenue = await this.sumTableByDepartment(
          salesRepositories[department.type],
          department.id,
          from,
          to,
        );
        const cogs = await this.sumLedgerAccount(
          department.id,
          ['cogs'],
          'debit',
          from,
          to,
          'internal_transfer',
        );
        const otherIncome = await this.sumLedgerAccount(
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
          payrollExpenses: payrollExpenses.toFixed(2),
          netProfit: (
            grossProfit -
            operatingExpenses -
            payrollExpenses
          ).toFixed(2),
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
      .andWhere('sale.sale_date >= :from', { from })
      .andWhere('sale.sale_date < :to', { to })
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
  ): Promise<number> {
    const result = await this.expenseRepo
      .createQueryBuilder('expense')
      .select('COALESCE(SUM(expense.amount), 0)', 'sum')
      .where('expense.department_id = :departmentId', { departmentId })
      .andWhere('expense.expense_date >= :from', { from })
      .andWhere('expense.expense_date < :to', { to })
      .andWhere('expense.deleted_at IS NULL')
      .getRawOne<{ sum: string }>();
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
      .select('COALESCE(SUM(le.amount), 0)', 'sum')
      .where('le.entry_date >= :from', { from })
      .andWhere('le.entry_date < :to', { to })
      .andWhere('le.entry_type = :entryType', { entryType })
      .andWhere('acct.code IN (:...codes)', { codes: accountCodes });

    if (departmentId) {
      qb.andWhere('le.department_id = :departmentId', { departmentId });
    }
    if (excludeSourceType)
      qb.andWhere('le.source_type != :excludeSourceType', {
        excludeSourceType,
      });

    const result = await qb.getRawOne();
    return parseFloat(result.sum || '0');
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
    const qb = this.salaryRunRepo
      .createQueryBuilder('sr')
      .leftJoin('sr.employee', 'employee')
      .leftJoin('employee.department', 'department')
      .select('employee.department_id', 'departmentId')
      .addSelect('department.name', 'departmentName')
      .addSelect('employee.id', 'employeeId')
      .addSelect('employee.full_name', 'employeeName')
      .addSelect(
        'COALESCE(SUM(CAST(sr.netPayable AS numeric)), 0)',
        'totalNetPayable',
      )
      .addSelect(
        'COALESCE(SUM(CAST(sr.totalAdvancesDeducted AS numeric)), 0)',
        'totalAdvancesDeducted',
      )
      .addSelect(
        'COALESCE(SUM(CAST(sr.totalBonuses AS numeric)), 0)',
        'totalBonuses',
      )
      .where('sr.period_year IS NOT NULL')
      .andWhere('sr.payment_status IN (:...statuses)', {
        statuses: ['pending', 'partially_paid', 'paid'],
      });

    if (from)
      qb.andWhere('COALESCE(sr.paid_date,sr.created_at) >= :from', { from });
    if (to) qb.andWhere('COALESCE(sr.paid_date,sr.created_at) < :to', { to });
    if (departmentId)
      qb.andWhere('employee.department_id = :departmentId', { departmentId });

    return qb
      .groupBy('employee.department_id')
      .addGroupBy('department.name')
      .addGroupBy('employee.id')
      .addGroupBy('employee.full_name')
      .getRawMany();
  }
}
