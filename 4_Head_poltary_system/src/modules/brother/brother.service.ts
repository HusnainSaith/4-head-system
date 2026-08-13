import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { DataSource, EntityManager } from 'typeorm';
import { centsToMoney, moneyToCents } from '../../common/utils/money.util';
import { PartyTypeEnum } from '../../common/types/party-type.enum';
import { LedgerService } from '../ledger/ledger.service';
import { paymentAccountLink } from '../accounts/dto/payment-account-selection.dto';
import { Party } from '../parties/entities/party.entity';
import {
  InvestorCapitalTransaction,
  InvestorCapitalTransactionType,
} from '../investor-management/entities/investor-capital-transaction.entity';
import { InvestorProfitAllocation } from '../investor-management/entities/investor-profit-allocation.entity';
import {
  Investor,
  InvestorType,
} from '../investor-management/entities/investor.entity';
import {
  ConfigureBrotherAccountDto,
  CreateBrotherAdjustmentDto,
  ListBrotherAdjustmentsDto,
  RecordBrotherPaymentDto,
  ReverseBrotherAdjustmentDto,
} from './dto/brother.dto';
import { BrotherAccount } from './entities/brother-account.entity';
import { BrotherPayment } from './entities/brother-payment.entity';
import {
  BrotherAdjustmentStatus,
  BrotherAdjustmentType,
  BrotherFarmAdjustment,
} from './entities/brother-farm-adjustment.entity';

@Injectable()
export class BrotherService {
  constructor(
    private readonly dataSource: DataSource,
    private readonly ledger: LedgerService,
  ) {}

  async configure(dto: ConfigureBrotherAccountDto, actorId: string) {
    return this.dataSource.transaction(async (manager) => {
      const party = await manager.findOne(Party, {
        where: { id: dto.partyId },
      });
      if (!party || party.deletedAt)
        throw new NotFoundException('Brother party not found');
      if (party.partyType !== PartyTypeEnum.INVESTOR)
        throw new BadRequestException(
          'Brother account must use an investor party',
        );
      const current = await manager.findOne(BrotherAccount, {
        where: { isActive: true },
        lock: { mode: 'pessimistic_write' },
      });
      if (current?.partyId === dto.partyId) return current;
      if (current)
        throw new ConflictException(
          'An active Brother account is already configured',
        );
      return manager.save(
        BrotherAccount,
        manager.create(BrotherAccount, {
          partyId: dto.partyId,
          isActive: true,
          createdBy: actorId,
          updatedBy: actorId,
        }),
      );
    });
  }

  async createAdjustment(dto: CreateBrotherAdjustmentDto, actorId: string) {
    return this.dataSource.transaction('SERIALIZABLE', async (manager) => {
      const account = await this.getActiveAccount(manager, true);
      const farm = await manager.findOne(Party, {
        where: { id: dto.farmPartyId },
        lock: { mode: 'pessimistic_write' },
      });
      if (!farm || farm.deletedAt)
        throw new NotFoundException('Farm party not found');
      if (farm.partyType !== PartyTypeEnum.FARM)
        throw new BadRequestException('Selected party must be a farm');
      if (dto.reference)
        await this.ensureUniqueReference(dto.reference, manager);

      const balances = await this.getFarmPayableBalances(farm.id, manager);
      const eligible = balances.filter(({ balance }) => balance < 0n);
      const selected = dto.departmentId
        ? eligible.find(({ departmentId }) => departmentId === dto.departmentId)
        : eligible.length === 1
          ? eligible[0]
          : undefined;
      if (!selected) {
        if (!dto.departmentId && eligible.length > 1)
          throw new BadRequestException(
            'Select a department because this farm has payable balances in multiple departments',
          );
        throw new BadRequestException(
          'The farm has no payable balance in the selected department',
        );
      }
      const amount = moneyToCents(dto.amount);
      if (amount > -selected.balance)
        throw new BadRequestException(
          'Adjustment amount exceeds the available farm payable balance.',
        );
      const brotherBefore = await this.getBrotherBalance(account.id, manager);
      const adjustment = await manager.save(
        BrotherFarmAdjustment,
        manager.create(BrotherFarmAdjustment, {
          brotherAccountId: account.id,
          farmPartyId: farm.id,
          departmentId: selected.departmentId,
          transactionType: BrotherAdjustmentType.FARM_ADJUSTMENT,
          amount: centsToMoney(amount),
          brotherBalanceBefore: centsToMoney(brotherBefore),
          brotherBalanceAfter: centsToMoney(brotherBefore + amount),
          farmBalanceBefore: centsToMoney(selected.balance),
          farmBalanceAfter: centsToMoney(selected.balance + amount),
          transactionDate: dto.transactionDate,
          reference: dto.reference?.trim() || undefined,
          notes: dto.notes?.trim() || undefined,
          status: BrotherAdjustmentStatus.ACTIVE,
          createdBy: actorId,
          updatedBy: actorId,
        }),
      );
      await this.ledger.post(
        [
          {
            departmentId: selected.departmentId,
            accountCode: 'accounts_payable',
            partyId: farm.id,
            entryType: 'debit',
            amount: adjustment.amount,
            entryDate: new Date(dto.transactionDate),
            sourceType: 'brother_adjustment',
            sourceId: adjustment.id,
            description:
              dto.notes ??
              `Brother medicine adjustment ${dto.reference ?? adjustment.id}`,
            createdBy: actorId,
          },
          {
            departmentId: selected.departmentId,
            accountCode: 'accounts_payable',
            partyId: account.partyId,
            entryType: 'credit',
            amount: adjustment.amount,
            entryDate: new Date(dto.transactionDate),
            sourceType: 'brother_adjustment',
            sourceId: adjustment.id,
            description:
              dto.notes ?? `Medicine receivable transferred from ${farm.name}`,
            createdBy: actorId,
          },
        ],
        manager,
      );
      return this.loadOne(adjustment.id, manager);
    });
  }

  async reverse(id: string, dto: ReverseBrotherAdjustmentDto, actorId: string) {
    if (!dto.reason.trim())
      throw new BadRequestException('Reversal reason is required');
    return this.dataSource.transaction('SERIALIZABLE', async (manager) => {
      const original = await manager.findOne(BrotherFarmAdjustment, {
        where: { id },
        lock: { mode: 'pessimistic_write' },
      });
      if (!original)
        throw new NotFoundException('Brother adjustment not found');
      if (
        original.transactionType !== BrotherAdjustmentType.FARM_ADJUSTMENT ||
        original.status === BrotherAdjustmentStatus.REVERSED
      )
        throw new BadRequestException(
          'Adjustment is already reversed or cannot be reversed',
        );
      await manager.findOne(Party, {
        where: { id: original.farmPartyId },
        lock: { mode: 'pessimistic_write' },
      });
      const account = await manager.findOneOrFail(BrotherAccount, {
        where: { id: original.brotherAccountId },
        lock: { mode: 'pessimistic_write' },
      });
      const farmBalance = await this.getFarmDepartmentBalance(
        original.farmPartyId,
        original.departmentId,
        manager,
      );
      const brotherBefore = await this.getBrotherBalance(account.id, manager);
      const amount = moneyToCents(original.amount);
      const departmentBalance = await this.getBrotherBalance(
        account.id,
        manager,
        original.departmentId,
      );
      if (departmentBalance < amount)
        throw new BadRequestException(
          'Brother adjustment cannot be reversed after its department balance has been paid',
        );
      const date = dto.transactionDate ?? new Date().toISOString().slice(0, 10);
      const reversal = await manager.save(
        BrotherFarmAdjustment,
        manager.create(BrotherFarmAdjustment, {
          brotherAccountId: account.id,
          farmPartyId: original.farmPartyId,
          departmentId: original.departmentId,
          transactionType: BrotherAdjustmentType.REVERSAL,
          amount: original.amount,
          brotherBalanceBefore: centsToMoney(brotherBefore),
          brotherBalanceAfter: centsToMoney(brotherBefore - amount),
          farmBalanceBefore: centsToMoney(farmBalance),
          farmBalanceAfter: centsToMoney(farmBalance - amount),
          transactionDate: date,
          notes: `Reversal: ${dto.reason.trim()}`,
          status: BrotherAdjustmentStatus.ACTIVE,
          originalTransactionId: original.id,
          reversalReason: dto.reason.trim(),
          createdBy: actorId,
          updatedBy: actorId,
        }),
      );
      original.status = BrotherAdjustmentStatus.REVERSED;
      original.reversedAt = new Date();
      original.reversedBy = actorId;
      original.reversalTransactionId = reversal.id;
      original.reversalReason = dto.reason.trim();
      original.updatedBy = actorId;
      await manager.save(BrotherFarmAdjustment, original);
      await this.ledger.post(
        [
          {
            departmentId: original.departmentId,
            accountCode: 'accounts_payable',
            partyId: account.partyId,
            entryType: 'debit',
            amount: original.amount,
            entryDate: new Date(date),
            sourceType: 'brother_adjustment',
            sourceId: reversal.id,
            description: `Reversal of Brother adjustment ${original.id}`,
            createdBy: actorId,
          },
          {
            departmentId: original.departmentId,
            accountCode: 'accounts_payable',
            partyId: original.farmPartyId,
            entryType: 'credit',
            amount: original.amount,
            entryDate: new Date(date),
            sourceType: 'brother_adjustment',
            sourceId: reversal.id,
            description: `Reversal of Brother adjustment ${original.id}`,
            createdBy: actorId,
          },
        ],
        manager,
      );
      return this.loadOne(original.id, manager);
    });
  }

  async recordPayment(dto: RecordBrotherPaymentDto, actorId: string) {
    return this.dataSource.transaction('SERIALIZABLE', async (manager) => {
      const account = await this.getActiveAccount(manager, true);
      await manager.findOne(Party, {
        where: { id: account.partyId },
        lock: { mode: 'pessimistic_write' },
      });
      if (dto.reference) {
        const duplicate = await manager
          .getRepository(BrotherPayment)
          .createQueryBuilder('payment')
          .where('LOWER(payment.reference) = LOWER(:reference)', {
            reference: dto.reference.trim(),
          })
          .getOne();
        if (duplicate)
          throw new ConflictException(
            'Brother payment reference already exists',
          );
      }
      const before = await this.getBrotherBalance(account.id, manager);
      const departmentBalance = await this.getBrotherBalance(
        account.id,
        manager,
        dto.departmentId,
      );
      const amount = moneyToCents(dto.amount);
      if (amount > departmentBalance)
        throw new BadRequestException(
          'Payment exceeds the Brother farm-adjustment balance in this department',
        );
      const link = paymentAccountLink(dto);
      const payment = await manager.save(
        BrotherPayment,
        manager.create(BrotherPayment, {
          brotherAccountId: account.id,
          departmentId: dto.departmentId,
          amount: centsToMoney(amount),
          balanceBefore: centsToMoney(before),
          balanceAfter: centsToMoney(before - amount),
          paymentMethod: dto.paymentMethod,
          ...link,
          paymentDate: dto.paymentDate,
          reference: dto.reference?.trim() || undefined,
          notes: dto.notes?.trim() || undefined,
          createdBy: actorId,
          updatedBy: actorId,
        }),
      );
      const funds = dto.paymentMethod === 'bank' ? 'bank' : 'cash';
      await this.ledger.post(
        [
          {
            departmentId: dto.departmentId,
            accountCode: 'accounts_payable',
            partyId: account.partyId,
            entryType: 'debit',
            amount: payment.amount,
            entryDate: new Date(dto.paymentDate),
            sourceType: 'brother_adjustment',
            sourceId: payment.id,
            description: dto.notes ?? 'Brother farm-adjustment payment',
            createdBy: actorId,
          },
          {
            departmentId: dto.departmentId,
            accountCode: funds,
            ...link,
            entryType: 'credit',
            amount: payment.amount,
            entryDate: new Date(dto.paymentDate),
            sourceType: 'brother_adjustment',
            sourceId: payment.id,
            description: dto.notes ?? 'Brother farm-adjustment payment',
            createdBy: actorId,
          },
        ],
        manager,
      );
      return payment;
    });
  }

  async listPayments(page = 1, limit = 20) {
    const [items, total] = await this.dataSource
      .getRepository(BrotherPayment)
      .findAndCount({
        relations: { department: true },
        order: { paymentDate: 'DESC', createdAt: 'DESC' },
        skip: (page - 1) * limit,
        take: limit,
      });
    return {
      items,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
        hasNextPage: page * limit < total,
        hasPreviousPage: page > 1,
      },
    };
  }

  async list(query: ListBrotherAdjustmentsDto) {
    const qb = this.dataSource
      .getRepository(BrotherFarmAdjustment)
      .createQueryBuilder('adjustment')
      .leftJoinAndSelect('adjustment.farmParty', 'farm')
      .leftJoinAndSelect('adjustment.department', 'department')
      .where('adjustment.deleted_at IS NULL');
    if (query.farmPartyId)
      qb.andWhere('adjustment.farm_party_id = :farmPartyId', {
        farmPartyId: query.farmPartyId,
      });
    if (query.status)
      qb.andWhere('adjustment.status = :status', { status: query.status });
    if (query.from)
      qb.andWhere('adjustment.transaction_date >= :from', { from: query.from });
    if (query.to)
      qb.andWhere('adjustment.transaction_date <= :to', { to: query.to });
    if (query.reference)
      qb.andWhere('adjustment.reference ILIKE :reference', {
        reference: `%${query.reference}%`,
      });
    if (query.search)
      qb.andWhere(
        '(farm.name ILIKE :search OR adjustment.reference ILIKE :search OR adjustment.notes ILIKE :search)',
        { search: `%${query.search}%` },
      );
    const [items, total] = await qb
      .orderBy('adjustment.transactionDate', 'DESC')
      .addOrderBy('adjustment.createdAt', 'DESC')
      .skip((query.page - 1) * query.limit)
      .take(query.limit)
      .getManyAndCount();
    return {
      items,
      pagination: {
        page: query.page,
        limit: query.limit,
        total,
        totalPages: Math.ceil(total / query.limit),
        hasNextPage: query.page * query.limit < total,
        hasPreviousPage: query.page > 1,
      },
    };
  }

  async findOne(id: string) {
    const item = await this.loadOne(id);
    if (!item) throw new NotFoundException('Brother adjustment not found');
    return item;
  }

  async statement(query: ListBrotherAdjustmentsDto) {
    const account = await this.getActiveAccount(this.dataSource.manager, false);
    const rows = (await this.dataSource.query(
      `SELECT adjustment.transaction_date AS "transactionDate", adjustment.transaction_type::text AS "transactionType",
              adjustment.amount::text AS amount, adjustment.reference, adjustment.notes,
              farm.id AS "farmPartyId", farm.name AS "farmName"
         FROM brother_farm_adjustments adjustment JOIN parties farm ON farm.id=adjustment.farm_party_id
        WHERE adjustment.brother_account_id=$1 AND ($2::uuid IS NULL OR adjustment.farm_party_id=$2)
          AND ($3::date IS NULL OR adjustment.transaction_date >= $3) AND ($4::date IS NULL OR adjustment.transaction_date <= $4)
       UNION ALL
       SELECT payment.payment_date, 'payment', payment.amount::text, payment.reference, payment.notes, NULL::uuid, NULL::varchar
         FROM brother_payments payment WHERE payment.brother_account_id=$1 AND $2::uuid IS NULL
          AND ($3::date IS NULL OR payment.payment_date >= $3) AND ($4::date IS NULL OR payment.payment_date <= $4)
       ORDER BY "transactionDate" ASC`,
      [
        account.id,
        query.farmPartyId ?? null,
        query.from ?? null,
        query.to ?? null,
      ],
    )) as Array<{
      transactionDate: string;
      transactionType: BrotherAdjustmentType | 'payment';
      amount: string;
      reference?: string;
      notes?: string;
      farmPartyId?: string;
      farmName?: string;
    }>;
    const openingRows = query.from
      ? ((await this.dataSource.query(
          `SELECT transaction_type, amount::text AS amount FROM brother_farm_adjustments
            WHERE brother_account_id=$1 AND transaction_date<$2 AND ($3::uuid IS NULL OR farm_party_id=$3)
           UNION ALL SELECT 'payment', amount::text FROM brother_payments
            WHERE brother_account_id=$1 AND payment_date<$2 AND $3::uuid IS NULL`,
          [account.id, query.from, query.farmPartyId ?? null],
        )) as Array<{ transaction_type: string; amount: string }>)
      : [];
    const signed = (type: string, amount: string) =>
      type === BrotherAdjustmentType.FARM_ADJUSTMENT
        ? moneyToCents(amount)
        : -moneyToCents(amount);
    const opening = openingRows.reduce(
      (sum, row) => sum + signed(row.transaction_type, row.amount),
      0n,
    );
    let running = opening;
    const transactions = rows.map((row) => {
      running += signed(row.transactionType, row.amount);
      return { ...row, runningBalance: centsToMoney(running) };
    });
    return {
      openingBalance: centsToMoney(opening),
      transactions,
      closingBalance: centsToMoney(running),
    };
  }

  async dashboard() {
    const account = await this.getActiveAccount(this.dataSource.manager, false);
    const farmBalance = await this.getBrotherBalance(
      account.id,
      this.dataSource.manager,
    );
    const rows = await this.dataSource
      .getRepository(BrotherFarmAdjustment)
      .createQueryBuilder('a')
      .select('a.transactionType', 'type')
      .addSelect('COALESCE(SUM(a.amount), 0)', 'total')
      .where('a.brother_account_id = :id', { id: account.id })
      .groupBy('a.transactionType')
      .getRawMany<{ type: BrotherAdjustmentType; total: string }>();
    const investor = await this.dataSource.getRepository(Investor).findOne({
      where: { partyId: account.partyId, investorType: InvestorType.BROTHER },
    });
    const investorSummary = investor
      ? await this.investorSummary(investor)
      : null;
    const paymentRow = await this.dataSource
      .getRepository(BrotherPayment)
      .createQueryBuilder('payment')
      .select('COALESCE(SUM(payment.amount),0)', 'total')
      .where('payment.brother_account_id = :id', { id: account.id })
      .getRawOne<{ total: string }>();
    return {
      farmAdjustmentBalance: centsToMoney(farmBalance),
      totalFarmAdjustments:
        rows.find((r) => r.type === BrotherAdjustmentType.FARM_ADJUSTMENT)
          ?.total ?? '0.00',
      totalReversals:
        rows.find((r) => r.type === BrotherAdjustmentType.REVERSAL)?.total ??
        '0.00',
      totalPaid: paymentRow?.total ?? '0.00',
      investor: investorSummary,
    };
  }

  private async investorSummary(investor: Investor) {
    const capital = await this.dataSource
      .getRepository(InvestorCapitalTransaction)
      .find({ where: { investorId: investor.id } });
    const principal = capital.reduce(
      (sum, tx) =>
        sum +
        (tx.transactionType === InvestorCapitalTransactionType.INVESTMENT ||
        tx.transactionType ===
          InvestorCapitalTransactionType.ADDITIONAL_INVESTMENT
          ? moneyToCents(tx.amount)
          : -moneyToCents(tx.amount)),
      0n,
    );
    const allocations = await this.dataSource
      .getRepository(InvestorProfitAllocation)
      .find({ where: { investorId: investor.id } });
    const allocated = allocations.reduce(
      (sum, row) => sum + moneyToCents(row.profitAmount),
      0n,
    );
    const distributed = allocations.reduce(
      (sum, row) => sum + moneyToCents(row.distributedAmount),
      0n,
    );
    return {
      principal: centsToMoney(principal),
      profitSharePercentage: investor.profitSharePercentage,
      undistributedProfit: centsToMoney(allocated - distributed),
      distributedProfit: centsToMoney(distributed),
    };
  }

  private async getActiveAccount(manager: EntityManager, lock: boolean) {
    const account = await manager.findOne(BrotherAccount, {
      where: { isActive: true },
      ...(lock ? { lock: { mode: 'pessimistic_write' as const } } : {}),
    });
    if (!account)
      throw new NotFoundException('Brother account is not configured');
    return account;
  }
  private async ensureUniqueReference(
    reference: string,
    manager: EntityManager,
  ) {
    const existing = await manager
      .getRepository(BrotherFarmAdjustment)
      .createQueryBuilder('adjustment')
      .where('LOWER(adjustment.reference) = LOWER(:reference)', {
        reference: reference.trim(),
      })
      .getOne();
    if (existing)
      throw new ConflictException(
        'Brother adjustment reference already exists',
      );
  }
  private async getFarmPayableBalances(
    partyId: string,
    manager: EntityManager,
  ) {
    const rows = await manager.query(
      `SELECT department_id AS "departmentId", COALESCE(SUM(CASE WHEN entry_type='debit' THEN amount ELSE -amount END),0)::text AS balance FROM ledger_entries WHERE party_id=$1 GROUP BY department_id`,
      [partyId],
    );
    return (rows as { departmentId: string; balance: string }[]).map((row) => ({
      departmentId: row.departmentId,
      balance: moneyToCents(row.balance),
    }));
  }
  private async getFarmDepartmentBalance(
    partyId: string,
    departmentId: string,
    manager: EntityManager,
  ) {
    return (
      (await this.getFarmPayableBalances(partyId, manager)).find(
        (r) => r.departmentId === departmentId,
      )?.balance ?? 0n
    );
  }
  private async getBrotherBalance(
    accountId: string,
    manager: EntityManager,
    departmentId?: string,
  ) {
    const adjustmentQuery = manager
      .getRepository(BrotherFarmAdjustment)
      .createQueryBuilder('a')
      .select(
        `COALESCE(SUM(CASE WHEN a.transactionType = 'farm_adjustment' THEN a.amount ELSE -a.amount END),0)`,
        'balance',
      )
      .where('a.brother_account_id = :accountId', { accountId });
    if (departmentId)
      adjustmentQuery.andWhere('a.department_id = :departmentId', {
        departmentId,
      });
    const row = await adjustmentQuery.getRawOne<{ balance: string }>();
    const paymentQuery = manager
      .getRepository(BrotherPayment)
      .createQueryBuilder('payment')
      .select('COALESCE(SUM(payment.amount),0)', 'total')
      .where('payment.brother_account_id = :accountId', { accountId });
    if (departmentId)
      paymentQuery.andWhere('payment.department_id = :departmentId', {
        departmentId,
      });
    const paid = await paymentQuery.getRawOne<{ total: string }>();
    return moneyToCents(row?.balance ?? '0') - moneyToCents(paid?.total ?? '0');
  }
  private loadOne(
    id: string,
    manager: EntityManager = this.dataSource.manager,
  ) {
    return manager.getRepository(BrotherFarmAdjustment).findOne({
      where: { id },
      relations: [
        'brotherAccount',
        'brotherAccount.party',
        'farmParty',
        'department',
        'originalTransaction',
      ],
    });
  }
}
