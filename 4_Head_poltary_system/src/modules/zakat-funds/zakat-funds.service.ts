import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, EntityManager, IsNull, Repository } from 'typeorm';
import { paymentAccountLink } from '../accounts/dto/payment-account-selection.dto';
import { BankAccount } from '../accounts/entities/bank-account.entity';
import { CashAccount } from '../accounts/entities/cash-account.entity';
import { Department } from '../departments/entities/department.entity';
import { LedgerService } from '../ledger/ledger.service';
import { Party } from '../parties/entities/party.entity';
import {
  ListZakatFundsDto,
  RecordZakatFundPaymentDto,
  ReverseZakatFundDto,
  SettleZakatFundDto,
  SettlementSplitDto,
} from './dto/zakat-fund.dto';
import {
  ZakatFundPayment,
  ZakatFundStatus,
  ZakatFundType,
} from './entities/zakat-fund-payment.entity';
import { ZakatFundSettlementSplit } from './entities/zakat-fund-settlement-split.entity';
import {
  ZakatFundAllocationMethod,
  ZakatFundSettlement,
} from './entities/zakat-fund-settlement.entity';

@Injectable()
export class ZakatFundsService {
  constructor(
    private readonly dataSource: DataSource,
    private readonly ledger: LedgerService,
    @InjectRepository(ZakatFundPayment)
    private readonly payments: Repository<ZakatFundPayment>,
    @InjectRepository(ZakatFundSettlement)
    private readonly settlements: Repository<ZakatFundSettlement>,
  ) {}

  async dashboard(query: ListZakatFundsDto) {
    const conditions: string[] = ['p.deleted_at IS NULL'];
    const values: unknown[] = [];
    const bind = (value: unknown) => {
      values.push(value);
      return `$${values.length}`;
    };
    if (query.departmentId)
      conditions.push(`p.department_id = ${bind(query.departmentId)}`);
    if (query.accountType)
      conditions.push(`p.account_type = ${bind(query.accountType)}`);
    if (query.calendarYear)
      conditions.push(`p.calendar_year = ${bind(query.calendarYear)}`);
    const [summary] = await this.dataSource.query(
      `SELECT COALESCE(SUM(p.amount) FILTER (WHERE p.status = 'active'), 0) AS paid,
              COALESCE((SELECT SUM(s.total_amount) FROM zakat_fund_settlements s
                WHERE s.status = 'active' AND s.deleted_at IS NULL
                  ${query.departmentId ? `AND s.department_id = ${bind(query.departmentId)}` : ''}
                  ${query.accountType ? `AND s.account_type = ${bind(query.accountType)}` : ''}
                  ${query.calendarYear ? `AND s.calendar_year = ${bind(query.calendarYear)}` : ''}), 0) AS settled
         FROM zakat_fund_payments p WHERE ${conditions.join(' AND ')}`,
      values,
    );
    const paid = this.toCents(summary.paid);
    const settled = this.toCents(summary.settled);
    return {
      paid: this.fromCents(paid),
      settled: this.fromCents(settled),
      outstanding: this.fromCents(paid - settled),
    };
  }

  listPayments(query: ListZakatFundsDto) {
    return this.payments.find({
      where: {
        departmentId: query.departmentId,
        accountType: query.accountType,
        calendarYear: query.calendarYear,
        status: query.status,
      },
      relations: { department: true, cashAccount: true, bankAccount: true },
      order: { paymentDate: 'DESC', createdAt: 'DESC' },
      take: 500,
    });
  }

  listSettlements(query: ListZakatFundsDto) {
    return this.settlements.find({
      where: {
        departmentId: query.departmentId,
        accountType: query.accountType,
        calendarYear: query.calendarYear,
        status: query.status,
      },
      relations: { department: true, splits: { party: true } },
      order: { settlementDate: 'DESC', createdAt: 'DESC' },
      take: 500,
    });
  }

  recordPayment(dto: RecordZakatFundPaymentDto, actorId: string) {
    return this.dataSource.transaction('SERIALIZABLE', async (manager) => {
      await this.lockPeriod(
        manager,
        dto.departmentId,
        dto.accountType,
        this.year(dto.paymentDate),
      );
      await this.requireDepartment(manager, dto.departmentId);
      await this.requireUniqueReference(manager, dto.reference);
      const amount = this.positiveMoney(dto.amount);
      let accountLink: ReturnType<typeof paymentAccountLink>;
      try {
        accountLink = paymentAccountLink(dto);
      } catch (error) {
        throw new BadRequestException((error as Error).message);
      }
      if (dto.paymentMethod === 'cash') {
        const cashAccount = await manager.findOne(CashAccount, {
          where: {
            id: dto.cashAccountId,
            departmentId: dto.departmentId,
            isActive: true,
            deletedAt: IsNull(),
          },
        });
        if (!cashAccount)
          throw new BadRequestException(
            'Select an active cash account for the same department',
          );
      } else {
        const bankAccount = await manager.findOne(BankAccount, {
          where: {
            id: dto.bankAccountId,
            isActive: true,
            deletedAt: IsNull(),
          },
        });
        if (!bankAccount)
          throw new BadRequestException('Select an active bank account');
      }
      const payment = await manager.save(
        ZakatFundPayment,
        manager.create(ZakatFundPayment, {
          ...dto,
          ...accountLink,
          amount,
          recipientName: dto.recipientName.trim(),
          reference: dto.reference?.trim() || undefined,
          notes: dto.notes?.trim() || undefined,
          calendarYear: this.year(dto.paymentDate),
          createdBy: actorId,
          updatedBy: actorId,
        }),
      );
      const fundsCode = dto.paymentMethod === 'cash' ? 'cash' : 'bank';
      await this.ledger.post(
        [
          {
            departmentId: dto.departmentId,
            accountCode: 'operating_expense',
            entryType: 'debit',
            amount,
            entryDate: new Date(dto.paymentDate),
            sourceType: 'zakat_fund',
            sourceId: payment.id,
            description: `${dto.accountType === ZakatFundType.ZAKAT ? 'Zakat' : 'Fund'} paid to ${payment.recipientName}`,
            createdBy: actorId,
          },
          {
            departmentId: dto.departmentId,
            accountCode: fundsCode,
            entryType: 'credit',
            amount,
            entryDate: new Date(dto.paymentDate),
            sourceType: 'zakat_fund',
            sourceId: payment.id,
            description: `${dto.accountType === ZakatFundType.ZAKAT ? 'Zakat' : 'Fund'} payment`,
            createdBy: actorId,
            ...accountLink,
          },
        ],
        manager,
      );
      return payment;
    });
  }

  settle(dto: SettleZakatFundDto, actorId: string) {
    return this.dataSource.transaction('SERIALIZABLE', async (manager) => {
      await this.lockPeriod(
        manager,
        dto.departmentId,
        dto.accountType,
        dto.calendarYear,
      );
      await this.requireDepartment(manager, dto.departmentId);
      await this.requireUniqueReference(manager, dto.reference);
      const outstanding = await this.outstandingCents(
        manager,
        dto.departmentId,
        dto.accountType,
        dto.calendarYear,
      );
      if (outstanding <= 0)
        throw new BadRequestException(
          'There is no unallocated balance for this account and year',
        );
      const partyIds = dto.splits.map((split) => split.partyId);
      if (new Set(partyIds).size !== partyIds.length)
        throw new BadRequestException('Each party can be selected only once');
      const partyCount = await manager.count(Party, {
        where: {
          id: partyIds.length === 1 ? partyIds[0] : undefined,
          deletedAt: IsNull(),
        },
      });
      if (partyIds.length === 1 ? partyCount !== 1 : false)
        throw new BadRequestException('A selected party does not exist');
      if (partyIds.length > 1) {
        const rows = await manager
          .createQueryBuilder(Party, 'party')
          .where('party.id IN (:...partyIds)', { partyIds })
          .andWhere('party.deleted_at IS NULL')
          .getCount();
        if (rows !== partyIds.length)
          throw new BadRequestException('A selected party does not exist');
      }
      const allocations = this.allocate(
        outstanding,
        dto.allocationMethod,
        dto.splits,
      );
      const settlement = await manager.save(
        ZakatFundSettlement,
        manager.create(ZakatFundSettlement, {
          departmentId: dto.departmentId,
          accountType: dto.accountType,
          calendarYear: dto.calendarYear,
          totalAmount: this.fromCents(outstanding),
          settlementDate: dto.settlementDate,
          allocationMethod: dto.allocationMethod,
          reference: dto.reference?.trim() || undefined,
          notes: dto.notes?.trim() || undefined,
          createdBy: actorId,
          updatedBy: actorId,
        }),
      );
      settlement.splits = await manager.save(
        ZakatFundSettlementSplit,
        allocations.map((allocation) =>
          manager.create(ZakatFundSettlementSplit, {
            settlementId: settlement.id,
            partyId: allocation.partyId,
            amount: this.fromCents(allocation.cents),
            percentage: allocation.percentage,
          }),
        ),
      );
      await this.ledger.post(
        [
          ...allocations.map((allocation) => ({
            departmentId: dto.departmentId,
            accountCode: 'accounts_payable',
            partyId: allocation.partyId,
            entryType: 'debit' as const,
            amount: this.fromCents(allocation.cents),
            entryDate: new Date(dto.settlementDate),
            sourceType: 'zakat_fund',
            sourceId: settlement.id,
            description: `${dto.calendarYear} ${dto.accountType} allocation to party`,
            createdBy: actorId,
          })),
          {
            departmentId: dto.departmentId,
            accountCode: 'operating_expense',
            entryType: 'credit',
            amount: this.fromCents(outstanding),
            entryDate: new Date(dto.settlementDate),
            sourceType: 'zakat_fund',
            sourceId: settlement.id,
            description: `${dto.calendarYear} ${dto.accountType} year-end allocation`,
            createdBy: actorId,
          },
        ],
        manager,
      );
      return settlement;
    });
  }

  reversePayment(id: string, dto: ReverseZakatFundDto, actorId: string) {
    return this.dataSource.transaction('SERIALIZABLE', async (manager) => {
      const payment = await manager.findOne(ZakatFundPayment, {
        where: { id, deletedAt: IsNull() },
      });
      if (!payment) throw new NotFoundException('Zakat/fund payment not found');
      if (payment.status === ZakatFundStatus.REVERSED)
        throw new ConflictException('Payment is already reversed');
      await this.lockPeriod(
        manager,
        payment.departmentId,
        payment.accountType,
        payment.calendarYear,
      );
      const outstanding = await this.outstandingCents(
        manager,
        payment.departmentId,
        payment.accountType,
        payment.calendarYear,
      );
      if (outstanding < this.toCents(payment.amount))
        throw new BadRequestException(
          'Reverse the related year-end settlement before reversing this payment',
        );
      await this.ledger.reverseSource(
        'zakat_fund',
        payment.id,
        actorId,
        manager,
      );
      payment.status = ZakatFundStatus.REVERSED;
      payment.reversalReason = dto.reason.trim();
      payment.reversedAt = new Date();
      payment.reversedBy = actorId;
      payment.updatedBy = actorId;
      return manager.save(payment);
    });
  }

  reverseSettlement(id: string, dto: ReverseZakatFundDto, actorId: string) {
    return this.dataSource.transaction('SERIALIZABLE', async (manager) => {
      const settlement = await manager.findOne(ZakatFundSettlement, {
        where: { id, deletedAt: IsNull() },
      });
      if (!settlement)
        throw new NotFoundException('Year-end settlement not found');
      if (settlement.status === ZakatFundStatus.REVERSED)
        throw new ConflictException('Settlement is already reversed');
      await this.lockPeriod(
        manager,
        settlement.departmentId,
        settlement.accountType,
        settlement.calendarYear,
      );
      await this.ledger.reverseSource(
        'zakat_fund',
        settlement.id,
        actorId,
        manager,
      );
      settlement.status = ZakatFundStatus.REVERSED;
      settlement.reversalReason = dto.reason.trim();
      settlement.reversedAt = new Date();
      settlement.reversedBy = actorId;
      settlement.updatedBy = actorId;
      return manager.save(settlement);
    });
  }

  private allocate(
    total: number,
    method: ZakatFundAllocationMethod,
    splits: SettlementSplitDto[],
  ) {
    if (total < splits.length)
      throw new BadRequestException(
        'The balance is too small to allocate at least Rs 0.01 to every party',
      );
    if (method === ZakatFundAllocationMethod.EQUAL) {
      const base = Math.floor(total / splits.length);
      return splits.map((split, index) => ({
        partyId: split.partyId,
        cents: index === splits.length - 1 ? total - base * index : base,
        percentage: undefined,
      }));
    }
    if (method === ZakatFundAllocationMethod.MANUAL) {
      const result = splits.map((split) => ({
        partyId: split.partyId,
        cents: this.toCents(this.positiveMoney(split.amount ?? '0')),
        percentage: undefined,
      }));
      if (result.reduce((sum, row) => sum + row.cents, 0) !== total)
        throw new BadRequestException(
          `Manual party amounts must total ${this.fromCents(total)}`,
        );
      if (result.some((row) => row.cents <= 0))
        throw new BadRequestException('Every party amount must be positive');
      return result;
    }
    const units = splits.map((split) => this.percentageUnits(split.percentage));
    if (units.reduce((sum, value) => sum + value, 0) !== 1_000_000)
      throw new BadRequestException(
        'Party percentages must total exactly 100%',
      );
    let allocated = 0;
    const result = splits.map((split, index) => {
      const cents =
        index === splits.length - 1
          ? total - allocated
          : Math.round((total * units[index]) / 1_000_000);
      allocated += cents;
      return {
        partyId: split.partyId,
        cents,
        percentage: this.fromPercentageUnits(units[index]),
      };
    });
    if (result.some((row) => row.cents <= 0))
      throw new BadRequestException(
        'Every percentage must allocate at least Rs 0.01',
      );
    return result;
  }

  private async outstandingCents(
    manager: EntityManager,
    departmentId: string,
    type: ZakatFundType,
    year: number,
  ) {
    const [row] = await manager.query(
      `SELECT COALESCE((SELECT SUM(amount) FROM zakat_fund_payments WHERE department_id=$1 AND account_type=$2 AND calendar_year=$3 AND status='active' AND deleted_at IS NULL),0)
            - COALESCE((SELECT SUM(total_amount) FROM zakat_fund_settlements WHERE department_id=$1 AND account_type=$2 AND calendar_year=$3 AND status='active' AND deleted_at IS NULL),0) AS outstanding`,
      [departmentId, type, year],
    );
    return this.toCents(row.outstanding);
  }

  private async requireDepartment(manager: EntityManager, id: string) {
    const department = await manager.findOne(Department, {
      where: { id, isActive: true },
    });
    if (!department)
      throw new BadRequestException('An active department is required');
  }

  private async requireUniqueReference(
    manager: EntityManager,
    reference?: string,
  ) {
    const normalized = reference?.trim();
    if (!normalized) return;
    const [row] = await manager.query(
      `SELECT EXISTS(SELECT 1 FROM zakat_fund_payments WHERE lower(reference)=lower($1) AND deleted_at IS NULL)
           OR EXISTS(SELECT 1 FROM zakat_fund_settlements WHERE lower(reference)=lower($1) AND deleted_at IS NULL) AS duplicate`,
      [normalized],
    );
    if (row.duplicate) throw new ConflictException('Reference already exists');
  }

  private lockPeriod(
    manager: EntityManager,
    departmentId: string,
    type: ZakatFundType,
    year: number,
  ) {
    return manager.query('SELECT pg_advisory_xact_lock(hashtext($1))', [
      `zakat-fund:${departmentId}:${type}:${year}`,
    ]);
  }

  private year(date: string) {
    return Number(date.slice(0, 4));
  }

  private positiveMoney(value: string) {
    const cents = this.toCents(value);
    if (cents <= 0)
      throw new BadRequestException('Amount must be greater than zero');
    return this.fromCents(cents);
  }

  private toCents(value: string | number): number {
    const normalized = String(value);
    const match = /^(-?)(\d+)(?:\.(\d{1,2}))?$/.exec(normalized);
    if (!match)
      throw new BadRequestException(`Invalid monetary value: ${normalized}`);
    const result =
      Number(match[2]) * 100 + Number((match[3] ?? '').padEnd(2, '0'));
    if (!Number.isSafeInteger(result))
      throw new BadRequestException('Amount is too large');
    return match[1] ? -result : result;
  }

  private fromCents(cents: number) {
    return `${cents < 0 ? '-' : ''}${Math.floor(Math.abs(cents) / 100)}.${String(Math.abs(cents) % 100).padStart(2, '0')}`;
  }

  private percentageUnits(value?: string) {
    if (!value)
      throw new BadRequestException('Every party requires a percentage');
    const [whole, decimal = ''] = value.split('.');
    return Number(whole) * 10_000 + Number(decimal.padEnd(4, '0'));
  }

  private fromPercentageUnits(units: number) {
    return `${Math.floor(units / 10_000)}.${String(units % 10_000).padStart(4, '0')}`;
  }
}
