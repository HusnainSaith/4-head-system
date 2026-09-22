import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { DataSource, EntityManager } from 'typeorm';
import {
  centsToMoney,
  moneyToCents,
  normalizePercent,
  percentageOf,
  percentToUnits,
} from '../../common/utils/money.util';
import { paymentAccountLink } from '../accounts/dto/payment-account-selection.dto';
import { Department } from '../departments/entities/department.entity';
import { LedgerService } from '../ledger/ledger.service';
import { Party } from '../parties/entities/party.entity';
import { PartyTypeEnum } from '../../common/types/party-type.enum';
import { ReportsService } from '../reports/reports.service';
import {
  CalculateProfitPeriodDto,
  CreateInvestorDto,
  DistributeInvestorProfitDto,
  ListInvestorsDto,
  ListProfitPeriodsDto,
  RecordCapitalTransactionDto,
  InvestorAccountAction,
  RecordInvestorAccountTransactionDto,
  UpdateInvestorDto,
} from './dto/investor.dto';
import {
  InvestorCapitalTransaction,
  InvestorCapitalTransactionType,
} from './entities/investor-capital-transaction.entity';
import {
  InvestorProfitAllocation,
  InvestorProfitAllocationStatus,
} from './entities/investor-profit-allocation.entity';
import { InvestorProfitDistribution } from './entities/investor-profit-distribution.entity';
import {
  InvestorProfitPeriod,
  InvestorProfitPeriodStatus,
} from './entities/investor-profit-period.entity';
import {
  Investor,
  InvestorStatus,
  InvestorType,
} from './entities/investor.entity';

@Injectable()
export class InvestorManagementService {
  constructor(
    private readonly dataSource: DataSource,
    private readonly ledger: LedgerService,
    private readonly reports: ReportsService,
  ) {}

  async create(dto: CreateInvestorDto, actorId: string) {
    return this.dataSource.transaction('SERIALIZABLE', async (manager) => {
      await this.lockPercentageConfiguration(manager);
      const party = await manager.findOne(Party, {
        where: { id: dto.partyId },
      });
      if (!party || party.deletedAt)
        throw new NotFoundException('Investor party not found');
      if (party.partyType !== PartyTypeEnum.INVESTOR)
        throw new BadRequestException('Selected party must have investor type');
      if (await manager.findOne(Investor, { where: { partyId: dto.partyId } }))
        throw new ConflictException(
          'This party already has an investor profile',
        );
      if (
        dto.investorType === InvestorType.BROTHER &&
        (await manager.findOne(Investor, {
          where: { investorType: InvestorType.BROTHER },
        }))
      )
        throw new ConflictException(
          'A Brother investor profile already exists',
        );
      const percentage =
        dto.profitSharePercentage ??
        (dto.investorType === InvestorType.BROTHER ? '2.0000' : '0.0000');
      const normalized = normalizePercent(percentage);
      await this.validatePercentageTotal(normalized, undefined, manager);
      return manager.save(
        Investor,
        manager.create(Investor, {
          partyId: party.id,
          investorType: dto.investorType,
          profitSharePercentage: normalized,
          status: InvestorStatus.ACTIVE,
          notes: dto.notes?.trim() || undefined,
          createdBy: actorId,
          updatedBy: actorId,
        }),
      );
    });
  }

  async update(id: string, dto: UpdateInvestorDto, actorId: string) {
    return this.dataSource.transaction('SERIALIZABLE', async (manager) => {
      await this.lockPercentageConfiguration(manager);
      const investor = await manager.findOne(Investor, {
        where: { id },
        lock: { mode: 'pessimistic_write' },
      });
      if (!investor) throw new NotFoundException('Investor not found');
      const nextStatus = dto.status ?? investor.status;
      const percentage = dto.profitSharePercentage
        ? normalizePercent(dto.profitSharePercentage)
        : investor.profitSharePercentage;
      if (nextStatus === InvestorStatus.ACTIVE)
        await this.validatePercentageTotal(percentage, investor.id, manager);
      investor.profitSharePercentage = percentage;
      investor.status = nextStatus;
      if (dto.notes !== undefined)
        investor.notes = dto.notes.trim() || undefined;
      investor.updatedBy = actorId;
      return manager.save(Investor, investor);
    });
  }

  async list(query: ListInvestorsDto) {
    const qb = this.dataSource
      .getRepository(Investor)
      .createQueryBuilder('investor')
      .leftJoinAndSelect('investor.party', 'party')
      .where('investor.deleted_at IS NULL');
    if (query.status)
      qb.andWhere('investor.status = :status', { status: query.status });
    if (query.investorType)
      qb.andWhere('investor.investor_type = :investorType', {
        investorType: query.investorType,
      });
    if (query.search)
      qb.andWhere('(party.name ILIKE :search OR party.phone ILIKE :search)', {
        search: `%${query.search}%`,
      });
    const [items, total] = await qb
      .orderBy('party.name', 'ASC')
      .skip((query.page - 1) * query.limit)
      .take(query.limit)
      .getManyAndCount();
    const balanceRows = items.length
      ? ((await this.dataSource.query(
          `SELECT investor.id AS "investorId",
                  COALESCE(SUM(CASE
                    WHEN entry.source_type='opening_balance' AND entry.entry_type='debit' THEN entry.amount
                    WHEN entry.source_type='opening_balance' THEN -entry.amount
                    WHEN entry.entry_type='credit' THEN entry.amount
                    ELSE -entry.amount END),0)::text AS balance
             FROM investors investor
             LEFT JOIN ledger_entries entry ON entry.party_id=investor.party_id
            WHERE investor.id = ANY($1::uuid[])
            GROUP BY investor.id`,
          [items.map((item) => item.id)],
        )) as Array<{ investorId: string; balance: string }>)
      : [];
    const balances = new Map(
      balanceRows.map((row) => [row.investorId, row.balance]),
    );
    return {
      items: items.map((item) => ({
        ...item,
        accountBalance: balances.get(item.id) ?? '0.00',
      })),
      pagination: this.pagination(query.page, query.limit, total),
    };
  }
  async findOne(id: string) {
    const item = await this.dataSource
      .getRepository(Investor)
      .findOne({ where: { id }, relations: { party: true } });
    if (!item) throw new NotFoundException('Investor not found');
    return item;
  }

  async recordInvestment(
    id: string,
    dto: RecordCapitalTransactionDto,
    actorId: string,
  ) {
    return this.recordCapital(id, dto, actorId, false);
  }
  async recordWithdrawal(
    id: string,
    dto: RecordCapitalTransactionDto,
    actorId: string,
  ) {
    return this.recordCapital(id, dto, actorId, true);
  }

  async recordAccountTransaction(
    id: string,
    dto: RecordInvestorAccountTransactionDto,
    actorId: string,
  ) {
    if (dto.action === InvestorAccountAction.DEPOSIT) {
      this.requirePaymentMethod(dto);
      return this.recordCapital(
        id,
        { ...dto, paymentMethod: dto.paymentMethod! },
        actorId,
        false,
      );
    }
    if (dto.action === InvestorAccountAction.WITHDRAWAL) {
      this.requirePaymentMethod(dto);
      return this.recordCapital(
        id,
        { ...dto, paymentMethod: dto.paymentMethod! },
        actorId,
        true,
      );
    }
    return this.dataSource.transaction('SERIALIZABLE', async (manager) => {
      const investor = await manager.findOne(Investor, {
        where: { id },
        lock: { mode: 'pessimistic_write' },
      });
      if (!investor) throw new NotFoundException('Investor not found');
      if (investor.status !== InvestorStatus.ACTIVE)
        throw new BadRequestException(
          'Inactive investor accounts cannot be changed',
        );
      await this.requireDepartment(dto.departmentId, manager);
      if (dto.reference)
        await this.ensureCapitalReference(dto.reference, manager);

      const before = await this.accountBalance(id, manager);
      const amount = moneyToCents(dto.amount);
      const decreases = dto.action === InvestorAccountAction.LOSS;
      if (decreases && amount > before)
        throw new BadRequestException(
          'Loss exceeds the current investor account balance',
        );

      let farm: Party | undefined;
      if (dto.action === InvestorAccountAction.FARM_TRANSFER) {
        if (investor.investorType !== InvestorType.BROTHER)
          throw new BadRequestException(
            'Farm transfers are available only for the Brother investor account',
          );
        if (!dto.farmPartyId)
          throw new BadRequestException(
            'farmPartyId is required for a farm transfer',
          );
        farm =
          (await manager.findOne(Party, {
            where: { id: dto.farmPartyId },
            lock: { mode: 'pessimistic_write' },
          })) ?? undefined;
        if (!farm || farm.deletedAt || farm.partyType !== PartyTypeEnum.FARM)
          throw new NotFoundException('Active farm party not found');
        const payable = await this.farmPayableBalance(
          farm.id,
          dto.departmentId,
          manager,
        );
        if (amount > payable)
          throw new BadRequestException(
            'Transfer amount exceeds this farm payable balance',
          );
      } else if (dto.farmPartyId) {
        throw new BadRequestException(
          'farmPartyId is valid only for a farm transfer',
        );
      }

      const type =
        dto.action === InvestorAccountAction.PROFIT
          ? InvestorCapitalTransactionType.MANUAL_PROFIT
          : dto.action === InvestorAccountAction.LOSS
            ? InvestorCapitalTransactionType.MANUAL_LOSS
            : InvestorCapitalTransactionType.FARM_TRANSFER;
      const after = decreases ? before - amount : before + amount;
      const tx = await manager.save(
        InvestorCapitalTransaction,
        manager.create(InvestorCapitalTransaction, {
          investorId: id,
          departmentId: dto.departmentId,
          farmPartyId: farm?.id,
          transactionType: type,
          amount: centsToMoney(amount),
          balanceBefore: centsToMoney(before),
          balanceAfter: centsToMoney(after),
          transactionDate: dto.transactionDate,
          reference: dto.reference?.trim() || undefined,
          notes: dto.notes?.trim() || undefined,
          createdBy: actorId,
          updatedBy: actorId,
        }),
      );

      const description =
        dto.notes ??
        (type === InvestorCapitalTransactionType.MANUAL_PROFIT
          ? 'Manual investor profit'
          : type === InvestorCapitalTransactionType.MANUAL_LOSS
            ? 'Manual investor loss'
            : `Farm payable transferred from ${farm!.name}`);
      await this.ledger.post(
        type === InvestorCapitalTransactionType.FARM_TRANSFER
          ? [
              {
                departmentId: dto.departmentId,
                accountCode: 'accounts_payable',
                partyId: farm!.id,
                entryType: 'debit',
                amount: tx.amount,
                entryDate: new Date(dto.transactionDate),
                sourceType: 'investor_capital',
                sourceId: tx.id,
                description,
                createdBy: actorId,
              },
              {
                departmentId: dto.departmentId,
                accountCode: 'investor_capital',
                partyId: investor.partyId,
                entryType: 'credit',
                amount: tx.amount,
                entryDate: new Date(dto.transactionDate),
                sourceType: 'investor_capital',
                sourceId: tx.id,
                description,
                createdBy: actorId,
              },
            ]
          : decreases
            ? [
                {
                  departmentId: dto.departmentId,
                  accountCode: 'investor_capital',
                  partyId: investor.partyId,
                  entryType: 'debit',
                  amount: tx.amount,
                  entryDate: new Date(dto.transactionDate),
                  sourceType: 'investor_capital',
                  sourceId: tx.id,
                  description,
                  createdBy: actorId,
                },
                {
                  departmentId: dto.departmentId,
                  accountCode: 'retained_earnings',
                  entryType: 'credit',
                  amount: tx.amount,
                  entryDate: new Date(dto.transactionDate),
                  sourceType: 'investor_capital',
                  sourceId: tx.id,
                  description,
                  createdBy: actorId,
                },
              ]
            : [
                {
                  departmentId: dto.departmentId,
                  accountCode: 'retained_earnings',
                  entryType: 'debit',
                  amount: tx.amount,
                  entryDate: new Date(dto.transactionDate),
                  sourceType: 'investor_capital',
                  sourceId: tx.id,
                  description,
                  createdBy: actorId,
                },
                {
                  departmentId: dto.departmentId,
                  accountCode: 'investor_capital',
                  partyId: investor.partyId,
                  entryType: 'credit',
                  amount: tx.amount,
                  entryDate: new Date(dto.transactionDate),
                  sourceType: 'investor_capital',
                  sourceId: tx.id,
                  description,
                  createdBy: actorId,
                },
              ],
        manager,
      );
      return tx;
    });
  }
  private async recordCapital(
    id: string,
    dto: RecordCapitalTransactionDto,
    actorId: string,
    withdrawal: boolean,
  ) {
    return this.dataSource.transaction('SERIALIZABLE', async (manager) => {
      const investor = await manager.findOne(Investor, {
        where: { id },
        lock: { mode: 'pessimistic_write' },
      });
      if (!investor) throw new NotFoundException('Investor not found');
      if (!withdrawal && investor.status !== InvestorStatus.ACTIVE)
        throw new BadRequestException('Inactive investors cannot add capital');
      await this.requireDepartment(dto.departmentId, manager);
      if (dto.reference)
        await this.ensureCapitalReference(dto.reference, manager);
      const before = await this.accountBalance(id, manager);
      const amount = moneyToCents(dto.amount);
      if (withdrawal && amount > before)
        throw new BadRequestException(
          'Capital withdrawal exceeds the current principal',
        );
      const after = withdrawal ? before - amount : before + amount;
      const defaultType = withdrawal
        ? InvestorCapitalTransactionType.CAPITAL_WITHDRAWAL
        : before <= 0n
          ? InvestorCapitalTransactionType.INVESTMENT
          : InvestorCapitalTransactionType.ADDITIONAL_INVESTMENT;
      const allowed = withdrawal
        ? [
            InvestorCapitalTransactionType.CAPITAL_WITHDRAWAL,
            InvestorCapitalTransactionType.CAPITAL_REFUND,
          ]
        : [
            InvestorCapitalTransactionType.INVESTMENT,
            InvestorCapitalTransactionType.ADDITIONAL_INVESTMENT,
          ];
      const type = dto.transactionType ?? defaultType;
      if (!allowed.includes(type))
        throw new BadRequestException(
          'Invalid capital transaction type for this operation',
        );
      const link = paymentAccountLink(dto);
      const tx = await manager.save(
        InvestorCapitalTransaction,
        manager.create(InvestorCapitalTransaction, {
          investorId: id,
          departmentId: dto.departmentId,
          transactionType: type,
          amount: centsToMoney(amount),
          balanceBefore: centsToMoney(before),
          balanceAfter: centsToMoney(after),
          transactionDate: dto.transactionDate,
          paymentMethod: dto.paymentMethod,
          ...link,
          reference: dto.reference?.trim() || undefined,
          notes: dto.notes?.trim() || undefined,
          createdBy: actorId,
          updatedBy: actorId,
        }),
      );
      const funds = dto.paymentMethod === 'bank' ? 'bank' : 'cash';
      await this.ledger.post(
        withdrawal
          ? [
              {
                departmentId: dto.departmentId,
                accountCode: 'investor_capital',
                partyId: investor.partyId,
                entryType: 'debit',
                amount: tx.amount,
                entryDate: new Date(dto.transactionDate),
                sourceType: 'investor_capital',
                sourceId: tx.id,
                description: dto.notes ?? 'Investor capital withdrawal',
                createdBy: actorId,
              },
              {
                departmentId: dto.departmentId,
                accountCode: funds,
                ...link,
                entryType: 'credit',
                amount: tx.amount,
                entryDate: new Date(dto.transactionDate),
                sourceType: 'investor_capital',
                sourceId: tx.id,
                description: dto.notes ?? 'Investor capital withdrawal',
                createdBy: actorId,
              },
            ]
          : [
              {
                departmentId: dto.departmentId,
                accountCode: funds,
                ...link,
                entryType: 'debit',
                amount: tx.amount,
                entryDate: new Date(dto.transactionDate),
                sourceType: 'investor_capital',
                sourceId: tx.id,
                description: dto.notes ?? 'Investor capital received',
                createdBy: actorId,
              },
              {
                departmentId: dto.departmentId,
                accountCode: 'investor_capital',
                partyId: investor.partyId,
                entryType: 'credit',
                amount: tx.amount,
                entryDate: new Date(dto.transactionDate),
                sourceType: 'investor_capital',
                sourceId: tx.id,
                description: dto.notes ?? 'Investor capital received',
                createdBy: actorId,
              },
            ],
        manager,
      );
      return tx;
    });
  }

  async calculatePeriod(dto: CalculateProfitPeriodDto, actorId: string) {
    if (dto.startDate > dto.endDate)
      throw new BadRequestException('startDate must be on or before endDate');
    await this.requireDepartment(dto.departmentId, this.dataSource.manager);
    const report = await this.reports.getConsolidatedProfitLoss(
      dto.startDate,
      dto.endDate,
    );
    const revenue = moneyToCents(report.externalRevenue);
    const otherIncome = moneyToCents(report.otherIncome);
    const cogs = moneyToCents(report.totalCogs);
    const expenses = moneyToCents(report.totalExpenses);
    const payroll = moneyToCents(report.totalPayroll);
    return this.dataSource.transaction(async (manager) => {
      const duplicate = await manager.findOne(InvestorProfitPeriod, {
        where: { startDate: dto.startDate, endDate: dto.endDate },
      });
      if (duplicate)
        throw new ConflictException(
          'A profit period already exists for these dates',
        );
      return manager.save(
        InvestorProfitPeriod,
        manager.create(InvestorProfitPeriod, {
          departmentId: dto.departmentId,
          periodType: dto.periodType,
          startDate: dto.startDate,
          endDate: dto.endDate,
          grossProfit: centsToMoney(revenue + otherIncome - cogs),
          eligibleExpenses: centsToMoney(expenses + payroll),
          netProfit: report.netProfit,
          status: InvestorProfitPeriodStatus.CALCULATED,
          calculatedAt: new Date(),
          calculatedBy: actorId,
          createdBy: actorId,
          updatedBy: actorId,
        }),
      );
    });
  }

  async finalizePeriod(id: string, actorId: string) {
    return this.dataSource.transaction('SERIALIZABLE', async (manager) => {
      const period = await manager.findOne(InvestorProfitPeriod, {
        where: { id },
        lock: { mode: 'pessimistic_write' },
      });
      if (!period)
        throw new NotFoundException('Investor profit period not found');
      if (period.status !== InvestorProfitPeriodStatus.CALCULATED)
        throw new BadRequestException(
          'Profit period has already been finalized',
        );
      const investors = await manager.find(Investor, {
        where: { status: InvestorStatus.ACTIVE },
        relations: { party: true },
        order: { createdAt: 'ASC' },
      });
      const totalUnits = investors.reduce(
        (sum, item) => sum + percentToUnits(item.profitSharePercentage),
        0n,
      );
      if (totalUnits > 1000000n)
        throw new BadRequestException(
          'Active investor profit percentages exceed 100%',
        );
      const net = moneyToCents(period.netProfit);
      const eligible = net > 0n ? net : 0n;
      const allocations: InvestorProfitAllocation[] = [];
      let totalAllocated = 0n;
      for (const investor of investors) {
        const amount = percentageOf(eligible, investor.profitSharePercentage);
        totalAllocated += amount;
        allocations.push(
          await manager.save(
            InvestorProfitAllocation,
            manager.create(InvestorProfitAllocation, {
              profitPeriodId: period.id,
              investorId: investor.id,
              netProfitSnapshot: period.netProfit,
              profitSharePercentageSnapshot: investor.profitSharePercentage,
              profitAmount: centsToMoney(amount),
              distributedAmount: '0.00',
              remainingAmount: centsToMoney(amount),
              status:
                amount === 0n
                  ? InvestorProfitAllocationStatus.DISTRIBUTED
                  : InvestorProfitAllocationStatus.PENDING,
              createdBy: actorId,
              updatedBy: actorId,
            }),
          ),
        );
      }
      if (totalAllocated > 0n) {
        await this.ledger.post(
          [
            {
              departmentId: period.departmentId,
              accountCode: 'retained_earnings',
              entryType: 'debit',
              amount: centsToMoney(totalAllocated),
              entryDate: new Date(period.endDate),
              sourceType: 'investor_profit',
              sourceId: period.id,
              description: `Investor profit allocation ${period.startDate} to ${period.endDate}`,
              createdBy: actorId,
            },
            ...allocations
              .filter((a) => moneyToCents(a.profitAmount) > 0n)
              .map((allocation) => ({
                departmentId: period.departmentId,
                accountCode: 'investor_profit_payable',
                partyId: investors.find((i) => i.id === allocation.investorId)!
                  .partyId,
                entryType: 'credit' as const,
                amount: allocation.profitAmount,
                entryDate: new Date(period.endDate),
                sourceType: 'investor_profit',
                sourceId: period.id,
                description: `Investor profit allocation ${period.startDate} to ${period.endDate}`,
                createdBy: actorId,
              })),
          ],
          manager,
        );
      }
      period.status = allocations.every(
        (a) => a.status === InvestorProfitAllocationStatus.DISTRIBUTED,
      )
        ? InvestorProfitPeriodStatus.DISTRIBUTED
        : InvestorProfitPeriodStatus.FINALIZED;
      period.finalizedAt = new Date();
      period.finalizedBy = actorId;
      period.updatedBy = actorId;
      await manager.save(InvestorProfitPeriod, period);
      return this.loadPeriod(period.id, manager);
    });
  }

  async distributeProfit(
    investorId: string,
    dto: DistributeInvestorProfitDto,
    actorId: string,
  ) {
    return this.dataSource.transaction('SERIALIZABLE', async (manager) => {
      const allocation = await manager.findOne(InvestorProfitAllocation, {
        where: { id: dto.profitAllocationId, investorId },
        lock: { mode: 'pessimistic_write' },
      });
      if (!allocation)
        throw new NotFoundException('Investor profit allocation not found');
      const period = await manager.findOneOrFail(InvestorProfitPeriod, {
        where: { id: allocation.profitPeriodId },
      });
      const investor = await manager.findOneOrFail(Investor, {
        where: { id: investorId },
      });
      if (period.status === InvestorProfitPeriodStatus.CALCULATED)
        throw new BadRequestException(
          'Profit period must be finalized before distribution',
        );
      if (dto.departmentId !== period.departmentId)
        throw new BadRequestException(
          'Profit distribution must use the allocation accounting department',
        );
      if (
        dto.reference &&
        (await manager
          .getRepository(InvestorProfitDistribution)
          .createQueryBuilder('distribution')
          .where('LOWER(distribution.reference) = LOWER(:reference)', {
            reference: dto.reference.trim(),
          })
          .getOne())
      )
        throw new ConflictException(
          'Profit distribution reference already exists',
        );
      const amount = moneyToCents(dto.amount);
      const remaining = moneyToCents(allocation.remainingAmount);
      if (amount > remaining)
        throw new BadRequestException(
          'Distribution amount exceeds the remaining allocated profit',
        );
      const link = paymentAccountLink(dto);
      const distribution = await manager.save(
        InvestorProfitDistribution,
        manager.create(InvestorProfitDistribution, {
          allocationId: allocation.id,
          departmentId: dto.departmentId,
          amount: centsToMoney(amount),
          paymentMethod: dto.paymentMethod,
          ...link,
          transactionDate: dto.transactionDate,
          reference: dto.reference?.trim() || undefined,
          notes: dto.notes?.trim() || undefined,
          createdBy: actorId,
          updatedBy: actorId,
        }),
      );
      const nextRemaining = remaining - amount;
      allocation.distributedAmount = centsToMoney(
        moneyToCents(allocation.distributedAmount) + amount,
      );
      allocation.remainingAmount = centsToMoney(nextRemaining);
      allocation.status =
        nextRemaining === 0n
          ? InvestorProfitAllocationStatus.DISTRIBUTED
          : InvestorProfitAllocationStatus.PARTIALLY_DISTRIBUTED;
      allocation.updatedBy = actorId;
      await manager.save(InvestorProfitAllocation, allocation);
      const funds = dto.paymentMethod === 'bank' ? 'bank' : 'cash';
      await this.ledger.post(
        [
          {
            departmentId: dto.departmentId,
            accountCode: 'investor_profit_payable',
            partyId: investor.partyId,
            entryType: 'debit',
            amount: distribution.amount,
            entryDate: new Date(dto.transactionDate),
            sourceType: 'investor_profit',
            sourceId: distribution.id,
            description: dto.notes ?? 'Investor profit distribution',
            createdBy: actorId,
          },
          {
            departmentId: dto.departmentId,
            accountCode: funds,
            ...link,
            entryType: 'credit',
            amount: distribution.amount,
            entryDate: new Date(dto.transactionDate),
            sourceType: 'investor_profit',
            sourceId: distribution.id,
            description: dto.notes ?? 'Investor profit distribution',
            createdBy: actorId,
          },
        ],
        manager,
      );
      const pending = await manager.count(InvestorProfitAllocation, {
        where: {
          profitPeriodId: allocation.profitPeriodId,
          status: InvestorProfitAllocationStatus.PENDING,
        },
      });
      const partial = await manager.count(InvestorProfitAllocation, {
        where: {
          profitPeriodId: allocation.profitPeriodId,
          status: InvestorProfitAllocationStatus.PARTIALLY_DISTRIBUTED,
        },
      });
      if (pending + partial === 0)
        await manager.update(InvestorProfitPeriod, allocation.profitPeriodId, {
          status: InvestorProfitPeriodStatus.DISTRIBUTED,
          updatedBy: actorId,
        });
      return distribution;
    });
  }

  async investorDashboard(id: string) {
    const investor = await this.findOne(id);
    const capital = await this.accountBalance(id, this.dataSource.manager);
    const rows = await this.dataSource
      .getRepository(InvestorProfitAllocation)
      .find({ where: { investorId: id } });
    const allocated = rows.reduce(
      (sum, row) => sum + moneyToCents(row.profitAmount),
      0n,
    );
    const distributed = rows.reduce(
      (sum, row) => sum + moneyToCents(row.distributedAmount),
      0n,
    );
    const transactions = await this.dataSource
      .getRepository(InvestorCapitalTransaction)
      .find({ where: { investorId: id } });
    const totalInvested = transactions
      .filter((t) =>
        [
          InvestorCapitalTransactionType.INVESTMENT,
          InvestorCapitalTransactionType.ADDITIONAL_INVESTMENT,
          InvestorCapitalTransactionType.MANUAL_PROFIT,
          InvestorCapitalTransactionType.FARM_TRANSFER,
        ].includes(t.transactionType),
      )
      .reduce((sum, t) => sum + moneyToCents(t.amount), 0n);
    const totalWithdrawn = transactions
      .filter((t) =>
        [
          InvestorCapitalTransactionType.CAPITAL_WITHDRAWAL,
          InvestorCapitalTransactionType.CAPITAL_REFUND,
          InvestorCapitalTransactionType.MANUAL_LOSS,
        ].includes(t.transactionType),
      )
      .reduce((sum, t) => sum + moneyToCents(t.amount), 0n);
    return {
      investor,
      capital: {
        totalInvested: centsToMoney(totalInvested),
        totalWithdrawn: centsToMoney(totalWithdrawn),
        currentPrincipal: centsToMoney(capital),
      },
      profits: {
        allocated: centsToMoney(allocated),
        distributed: centsToMoney(distributed),
        remaining: centsToMoney(allocated - distributed),
      },
    };
  }

  async globalDashboard() {
    const investors = await this.dataSource.getRepository(Investor).find();
    const allocations = await this.dataSource
      .getRepository(InvestorProfitAllocation)
      .find();
    const totalCapitalRows = (await this.dataSource.query(
      `SELECT COALESCE(SUM(CASE
          WHEN entry.source_type='opening_balance' AND entry.entry_type='debit' THEN entry.amount
          WHEN entry.source_type='opening_balance' THEN -entry.amount
          WHEN entry.entry_type='credit' THEN entry.amount
          ELSE -entry.amount END),0)::text AS balance
         FROM investors investor
         LEFT JOIN ledger_entries entry ON entry.party_id=investor.party_id
        WHERE investor.deleted_at IS NULL`,
    )) as Array<{ balance: string }>;
    const totalCapital = moneyToCents(totalCapitalRows[0]?.balance ?? '0');
    const allocated = allocations.reduce(
      (sum, a) => sum + moneyToCents(a.profitAmount),
      0n,
    );
    const distributed = allocations.reduce(
      (sum, a) => sum + moneyToCents(a.distributedAmount),
      0n,
    );
    const percent = investors
      .filter((i) => i.status === InvestorStatus.ACTIVE)
      .reduce((sum, i) => sum + percentToUnits(i.profitSharePercentage), 0n);
    return {
      totalInvestors: investors.length,
      activeInvestors: investors.filter(
        (i) => i.status === InvestorStatus.ACTIVE,
      ).length,
      totalInvestorCapital: centsToMoney(totalCapital),
      totalProfitAllocated: centsToMoney(allocated),
      totalProfitDistributed: centsToMoney(distributed),
      totalProfitOutstanding: centsToMoney(allocated - distributed),
      currentProfitSharePercentageTotal: `${percent / 10000n}.${String(percent % 10000n).padStart(4, '0')}`,
    };
  }

  async capitalReport() {
    return this.dataSource.query(`
      SELECT investor.id AS "investorId", party.name AS "investorName",
        COALESCE(SUM(CASE
          WHEN entry.source_type='opening_balance' AND entry.entry_type='debit' THEN entry.amount
          WHEN entry.source_type='opening_balance' THEN -entry.amount
          WHEN entry.entry_type='credit' THEN entry.amount
          ELSE -entry.amount END),0)::text AS "currentPrincipal"
      FROM investors investor JOIN parties party ON party.id=investor.party_id
      LEFT JOIN ledger_entries entry ON entry.party_id=investor.party_id
      GROUP BY investor.id,party.name ORDER BY party.name`);
  }

  async profitReport() {
    return this.dataSource.query(`
      SELECT investor.id AS "investorId", party.name AS "investorName",
        COALESCE(SUM(allocation.profit_amount),0)::text AS allocated,
        COALESCE(SUM(allocation.distributed_amount),0)::text AS distributed,
        COALESCE(SUM(allocation.remaining_amount),0)::text AS outstanding
      FROM investors investor JOIN parties party ON party.id=investor.party_id
      LEFT JOIN investor_profit_allocations allocation ON allocation.investor_id=investor.id
      GROUP BY investor.id,party.name ORDER BY party.name`);
  }

  async ledgerForInvestor(id: string) {
    await this.findOne(id);
    const capital = await this.dataSource
      .getRepository(InvestorCapitalTransaction)
      .find({
        where: { investorId: id },
        relations: { department: true, farmParty: true },
        order: { transactionDate: 'ASC', createdAt: 'ASC' },
      });
    const transactionBalance = capital.reduce(
      (sum, transaction) =>
        sum +
        (this.increasesInvestorBalance(transaction.transactionType)
          ? moneyToCents(transaction.amount)
          : -moneyToCents(transaction.amount)),
      0n,
    );
    let running =
      (await this.accountBalance(id, this.dataSource.manager)) -
      transactionBalance;
    return {
      openingOrExternalBalance: centsToMoney(running),
      capital: capital.map((transaction) => {
        const before = running;
        running += this.increasesInvestorBalance(transaction.transactionType)
          ? moneyToCents(transaction.amount)
          : -moneyToCents(transaction.amount);
        return {
          ...transaction,
          balanceBefore: centsToMoney(before),
          balanceAfter: centsToMoney(running),
        };
      }),
      profitAllocations: await this.dataSource
        .getRepository(InvestorProfitAllocation)
        .find({
          where: { investorId: id },
          relations: { profitPeriod: true },
          order: { createdAt: 'ASC' },
        }),
      profitDistributions: await this.dataSource
        .getRepository(InvestorProfitDistribution)
        .createQueryBuilder('d')
        .leftJoinAndSelect('d.allocation', 'allocation')
        .where('allocation.investor_id = :id', { id })
        .orderBy('d.transactionDate', 'ASC')
        .addOrderBy('d.createdAt', 'ASC')
        .getMany(),
    };
  }
  async profitHistory(id: string) {
    await this.findOne(id);
    return this.dataSource.getRepository(InvestorProfitAllocation).find({
      where: { investorId: id },
      relations: { profitPeriod: true },
      order: { createdAt: 'DESC' },
    });
  }
  async listPeriods(query: ListProfitPeriodsDto) {
    const qb = this.dataSource
      .getRepository(InvestorProfitPeriod)
      .createQueryBuilder('period');
    if (query.status)
      qb.andWhere('period.status=:status', { status: query.status });
    if (query.from) qb.andWhere('period.end_date>=:from', { from: query.from });
    if (query.to) qb.andWhere('period.start_date<=:to', { to: query.to });
    const [items, total] = await qb
      .orderBy('period.startDate', 'DESC')
      .skip((query.page - 1) * query.limit)
      .take(query.limit)
      .getManyAndCount();
    return {
      items,
      pagination: this.pagination(query.page, query.limit, total),
    };
  }
  async findPeriod(id: string) {
    const item = await this.loadPeriod(id, this.dataSource.manager);
    if (!item) throw new NotFoundException('Investor profit period not found');
    return item;
  }

  private loadPeriod(id: string, manager: EntityManager) {
    return manager.getRepository(InvestorProfitPeriod).findOne({
      where: { id },
      relations: { allocations: { investor: { party: true } } },
    });
  }
  private async accountBalance(id: string, manager: EntityManager) {
    const rows = (await manager.query(
      `SELECT COALESCE(SUM(CASE
          WHEN entry.source_type='opening_balance' AND entry.entry_type='debit' THEN entry.amount
          WHEN entry.source_type='opening_balance' THEN -entry.amount
          WHEN entry.entry_type='credit' THEN entry.amount
          ELSE -entry.amount END),0)::text AS balance
         FROM investors investor
         LEFT JOIN ledger_entries entry ON entry.party_id=investor.party_id
        WHERE investor.id=$1`,
      [id],
    )) as Array<{ balance: string }>;
    return moneyToCents(rows[0]?.balance ?? '0');
  }
  private async validatePercentageTotal(
    next: string,
    excludeId: string | undefined,
    manager: EntityManager,
  ) {
    const investors = await manager.find(Investor, {
      where: { status: InvestorStatus.ACTIVE },
    });
    const total =
      investors
        .filter((i) => i.id !== excludeId)
        .reduce((sum, i) => sum + percentToUnits(i.profitSharePercentage), 0n) +
      percentToUnits(next);
    if (total > 1000000n)
      throw new BadRequestException(
        'Total active investor profit percentages cannot exceed 100%',
      );
  }
  private async lockPercentageConfiguration(manager: EntityManager) {
    await manager.query(
      `SELECT pg_advisory_xact_lock(hashtext('investor-profit-share-configuration'))`,
    );
  }
  private async requireDepartment(id: string, manager: EntityManager) {
    if (!(await manager.findOne(Department, { where: { id, isActive: true } })))
      throw new NotFoundException('Active department not found');
  }
  private async ensureCapitalReference(
    reference: string,
    manager: EntityManager,
  ) {
    if (
      await manager
        .getRepository(InvestorCapitalTransaction)
        .createQueryBuilder('transaction')
        .where('LOWER(transaction.reference) = LOWER(:reference)', {
          reference: reference.trim(),
        })
        .getOne()
    )
      throw new ConflictException(
        'Capital transaction reference already exists',
      );
  }
  private increasesInvestorBalance(type: InvestorCapitalTransactionType) {
    return [
      InvestorCapitalTransactionType.INVESTMENT,
      InvestorCapitalTransactionType.ADDITIONAL_INVESTMENT,
      InvestorCapitalTransactionType.MANUAL_PROFIT,
      InvestorCapitalTransactionType.FARM_TRANSFER,
    ].includes(type);
  }
  private requirePaymentMethod(dto: RecordInvestorAccountTransactionDto) {
    if (dto.paymentMethod !== 'cash' && dto.paymentMethod !== 'bank')
      throw new BadRequestException(
        'paymentMethod is required for deposits and withdrawals',
      );
  }
  private async farmPayableBalance(
    partyId: string,
    departmentId: string,
    manager: EntityManager,
  ) {
    const rows = (await manager.query(
      `SELECT COALESCE(SUM(CASE WHEN entry.entry_type='credit' THEN entry.amount ELSE -entry.amount END),0)::text AS balance
         FROM ledger_entries entry
         JOIN chart_of_accounts account ON account.id=entry.account_id
        WHERE entry.party_id=$1 AND entry.department_id=$2 AND account.code::text='accounts_payable'`,
      [partyId, departmentId],
    )) as Array<{ balance: string }>;
    return moneyToCents(rows[0]?.balance ?? '0');
  }
  private pagination(page: number, limit: number, total: number) {
    return {
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit),
      hasNextPage: page * limit < total,
      hasPreviousPage: page > 1,
    };
  }
}
