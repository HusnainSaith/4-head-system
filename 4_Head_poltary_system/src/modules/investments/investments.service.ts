import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { DataSource, EntityManager } from 'typeorm';
import { PartyTypeEnum } from '../../common/types/party-type.enum';
import { paymentAccountLink } from '../accounts/dto/payment-account-selection.dto';
import {
  BrokeragePurchase,
  BrokeragePurchaseStatus,
} from '../brokerage/entities/brokerage-purchase.entity';
import { LedgerService, PostEntryDto } from '../ledger/ledger.service';
import { Party } from '../parties/entities/party.entity';
import {
  CreateInvestmentAssignmentDto,
  ListInvestmentAssignmentsQueryDto,
  RecordInvestmentPaymentDto,
  UpdateInvestmentAssignmentDto,
} from './dto/investment.dto';
import {
  InvestmentAssignment,
  InvestmentAssignmentStatus,
  InvestmentAssignmentType,
  InvestmentOutcome,
} from './entities/investment-assignment.entity';
import { InvestmentPayment } from './entities/investment-payment.entity';

@Injectable()
export class InvestmentsService {
  constructor(
    private readonly dataSource: DataSource,
    private readonly ledger: LedgerService,
  ) {}

  async create(dto: CreateInvestmentAssignmentDto, actorId: string) {
    return this.dataSource.transaction(async (manager) => {
      const purchase = await manager.findOne(BrokeragePurchase, {
        where: { id: dto.purchaseId },
        relations: ['party'],
        lock: { mode: 'pessimistic_write' },
      });
      this.validatePurchase(purchase);

      const investor = await manager.findOne(Party, {
        where: { id: dto.investorPartyId },
      });
      if (!investor || investor.deletedAt)
        throw new NotFoundException('Investor party not found');
      if (investor.partyType !== PartyTypeEnum.INVESTOR)
        throw new BadRequestException('The selected party must be an investor');
      if (investor.id === purchase!.partyId)
        throw new BadRequestException(
          'The farm and investor must be different parties',
        );

      const outcome = dto.outcome ?? InvestmentOutcome.PROFIT;
      const returnRate = this.resolveReturnRate(
        dto.assignmentType,
        dto.returnRate,
        outcome,
      );
      const principalCents = this.toCents(dto.principalAmount);
      const availableCents = this.toCents(purchase!.outstandingAmount);
      if (principalCents > availableCents)
        throw new BadRequestException(
          'Investment amount cannot exceed the remaining purchase balance',
        );
      const returnCents = Math.round((principalCents * returnRate) / 100);
      const totalCents =
        outcome === InvestmentOutcome.PROFIT
          ? principalCents + returnCents
          : principalCents - returnCents;
      if (totalCents < 0)
        throw new BadRequestException(
          'Loss cannot exceed the investment principal',
        );

      const assignment = await manager.save(
        InvestmentAssignment,
        manager.create(InvestmentAssignment, {
          departmentId: purchase!.departmentId,
          purchaseId: purchase!.id,
          farmPartyId: purchase!.partyId,
          investorPartyId: investor.id,
          assignmentType: dto.assignmentType,
          outcome,
          principalAmount: this.money(principalCents),
          returnRate: returnRate.toFixed(4),
          returnAmount: this.money(returnCents),
          totalPayable: this.money(totalCents),
          amountPaid: '0.00',
          outstandingAmount: this.money(totalCents),
          assignmentDate: dto.assignmentDate,
          externalReference: dto.externalReference?.trim() || undefined,
          notes: dto.notes?.trim() || undefined,
          status:
            totalCents === 0
              ? InvestmentAssignmentStatus.SETTLED
              : InvestmentAssignmentStatus.ACTIVE,
          createdBy: actorId,
          updatedBy: actorId,
        }),
      );

      purchase!.financedAmount = this.money(
        this.toCents(purchase!.financedAmount ?? '0') + principalCents,
      );
      purchase!.outstandingAmount = this.money(availableCents - principalCents);
      purchase!.updatedBy = actorId;
      await manager.save(BrokeragePurchase, purchase!);
      await this.postAssignment(assignment, manager, actorId);
      return this.loadOne(assignment.id, manager);
    });
  }

  async list(query: ListInvestmentAssignmentsQueryDto) {
    const page = query.page ?? 1;
    const limit = query.limit ?? 20;
    const builder = this.dataSource
      .getRepository(InvestmentAssignment)
      .createQueryBuilder('assignment')
      .leftJoinAndSelect('assignment.investorParty', 'investor')
      .leftJoinAndSelect('assignment.farmParty', 'farm')
      .leftJoinAndSelect('assignment.purchase', 'purchase')
      .where('assignment.deleted_at IS NULL');
    if (query.status)
      builder.andWhere('assignment.status = :status', { status: query.status });
    if (query.investorPartyId)
      builder.andWhere('assignment.investor_party_id = :investorPartyId', {
        investorPartyId: query.investorPartyId,
      });
    if (query.from)
      builder.andWhere('assignment.assignment_date >= :from', {
        from: query.from,
      });
    if (query.to)
      builder.andWhere('assignment.assignment_date <= :to', { to: query.to });
    const [items, total] = await builder
      .orderBy('assignment.assignmentDate', 'DESC')
      .addOrderBy('assignment.createdAt', 'DESC')
      .skip((page - 1) * limit)
      .take(limit)
      .getManyAndCount();
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

  async findOne(id: string) {
    const assignment = await this.loadOne(id);
    if (!assignment)
      throw new NotFoundException('Investment assignment not found');
    return assignment;
  }

  async update(
    id: string,
    dto: UpdateInvestmentAssignmentDto,
    actorId: string,
  ) {
    const assignment = await this.findOne(id);
    if (assignment.status === InvestmentAssignmentStatus.CANCELLED)
      throw new BadRequestException('Cancelled assignments cannot be edited');
    if (dto.externalReference !== undefined)
      assignment.externalReference = dto.externalReference.trim() || undefined;
    if (dto.notes !== undefined)
      assignment.notes = dto.notes.trim() || undefined;
    assignment.updatedBy = actorId;
    return this.dataSource.getRepository(InvestmentAssignment).save(assignment);
  }

  async recordPayment(
    id: string,
    dto: RecordInvestmentPaymentDto,
    actorId: string,
  ) {
    return this.dataSource.transaction(async (manager) => {
      const assignment = await manager.findOne(InvestmentAssignment, {
        where: { id },
        lock: { mode: 'pessimistic_write' },
      });
      if (!assignment)
        throw new NotFoundException('Investment assignment not found');
      if (assignment.status !== InvestmentAssignmentStatus.ACTIVE)
        throw new BadRequestException(
          'Only active assignments can receive payments',
        );
      const amountCents = Math.round(dto.amount * 100);
      const outstandingCents = this.toCents(assignment.outstandingAmount);
      if (amountCents > outstandingCents)
        throw new BadRequestException(
          'Payment cannot exceed the outstanding investor balance',
        );
      const accountLink = paymentAccountLink(dto);
      const payment = await manager.save(
        InvestmentPayment,
        manager.create(InvestmentPayment, {
          assignmentId: id,
          amount: this.money(amountCents),
          paymentMethod: dto.paymentMethod,
          paymentDate: dto.paymentDate,
          ...accountLink,
          notes: dto.notes?.trim() || undefined,
          createdBy: actorId,
          updatedBy: actorId,
        }),
      );
      const remainingCents = outstandingCents - amountCents;
      assignment.amountPaid = this.money(
        this.toCents(assignment.amountPaid) + amountCents,
      );
      assignment.outstandingAmount = this.money(remainingCents);
      assignment.status =
        remainingCents === 0
          ? InvestmentAssignmentStatus.SETTLED
          : InvestmentAssignmentStatus.ACTIVE;
      assignment.updatedBy = actorId;
      await manager.save(InvestmentAssignment, assignment);
      await this.ledger.post(
        [
          {
            departmentId: assignment.departmentId,
            accountCode: 'accounts_payable',
            partyId: assignment.investorPartyId,
            entryType: 'debit',
            amount: payment.amount,
            entryDate: new Date(dto.paymentDate),
            sourceType: 'payment',
            sourceId: payment.id,
            description: dto.notes ?? `Investor payment for assignment ${id}`,
            createdBy: actorId,
          },
          {
            departmentId: assignment.departmentId,
            accountCode: dto.paymentMethod === 'bank' ? 'bank' : 'cash',
            ...accountLink,
            entryType: 'credit',
            amount: payment.amount,
            entryDate: new Date(dto.paymentDate),
            sourceType: 'payment',
            sourceId: payment.id,
            description: dto.notes ?? `Investor payment for assignment ${id}`,
            createdBy: actorId,
          },
        ],
        manager,
      );
      return this.loadOne(id, manager);
    });
  }

  async cancel(id: string, reason: string, actorId: string) {
    if (!reason.trim())
      throw new BadRequestException('Cancellation reason is required');
    return this.dataSource.transaction(async (manager) => {
      const assignment = await manager.findOne(InvestmentAssignment, {
        where: { id },
        lock: { mode: 'pessimistic_write' },
      });
      if (!assignment)
        throw new NotFoundException('Investment assignment not found');
      if (assignment.status === InvestmentAssignmentStatus.CANCELLED)
        throw new BadRequestException(
          'Investment assignment is already cancelled',
        );
      if (this.toCents(assignment.amountPaid) > 0)
        throw new BadRequestException(
          'An assignment with investor payments cannot be cancelled',
        );
      const purchase = await manager.findOne(BrokeragePurchase, {
        where: { id: assignment.purchaseId },
        lock: { mode: 'pessimistic_write' },
      });
      if (!purchase) throw new NotFoundException('Linked purchase not found');
      await this.ledger.reverseSource(
        'investment',
        assignment.id,
        actorId,
        manager,
      );
      purchase.financedAmount = this.money(
        Math.max(
          0,
          this.toCents(purchase.financedAmount ?? '0') -
            this.toCents(assignment.principalAmount),
        ),
      );
      purchase.outstandingAmount = this.money(
        this.toCents(purchase.outstandingAmount) +
          this.toCents(assignment.principalAmount),
      );
      purchase.updatedBy = actorId;
      await manager.save(BrokeragePurchase, purchase);
      assignment.status = InvestmentAssignmentStatus.CANCELLED;
      assignment.cancelledAt = new Date();
      assignment.cancelledBy = actorId;
      assignment.cancellationReason = reason.trim();
      assignment.outstandingAmount = '0.00';
      assignment.updatedBy = actorId;
      await manager.save(InvestmentAssignment, assignment);
      return this.loadOne(id, manager);
    });
  }

  async summary() {
    const [row] = await this.dataSource.query(`
      SELECT
        COALESCE(SUM(principal_amount) FILTER (WHERE status <> 'cancelled'), 0) AS principal,
        COALESCE(SUM(CASE WHEN outcome = 'profit' THEN return_amount ELSE -return_amount END)
          FILTER (WHERE status <> 'cancelled'), 0) AS net_return,
        COALESCE(SUM(amount_paid) FILTER (WHERE status <> 'cancelled'), 0) AS paid,
        COALESCE(SUM(outstanding_amount) FILTER (WHERE status = 'active'), 0) AS outstanding
      FROM investment_assignments WHERE deleted_at IS NULL`);
    return {
      totalPrincipal: Number(row.principal).toFixed(2),
      netInvestorReturn: Number(row.net_return).toFixed(2),
      totalPaid: Number(row.paid).toFixed(2),
      totalOutstanding: Number(row.outstanding).toFixed(2),
    };
  }

  private validatePurchase(purchase: BrokeragePurchase | null): void {
    if (!purchase || purchase.deletedAt)
      throw new NotFoundException('Brokerage purchase not found');
    if (purchase.status !== BrokeragePurchaseStatus.ACTIVE)
      throw new BadRequestException('Only active purchases can be assigned');
    if (!purchase.partyId || purchase.party?.partyType !== PartyTypeEnum.FARM)
      throw new BadRequestException('The purchase must belong to a farm party');
    if (
      purchase.paymentMethod !== 'credit' ||
      this.toCents(purchase.outstandingAmount) <= 0
    )
      throw new BadRequestException(
        'Investor funding requires an active credit purchase with a remaining balance',
      );
  }

  private resolveReturnRate(
    type: InvestmentAssignmentType,
    rate: number | undefined,
    _outcome: InvestmentOutcome,
  ): number {
    if (type === InvestmentAssignmentType.FARM_SETTLEMENT) {
      throw new BadRequestException(
        'Farm medicine balances must use the explicit Brother farm-adjustment workflow; no automatic percentage is applied',
      );
    }
    if (rate === undefined)
      throw new BadRequestException(
        'A fixed return percentage is required for an investment',
      );
    return rate;
  }

  private async postAssignment(
    assignment: InvestmentAssignment,
    manager: EntityManager,
    actorId: string,
  ): Promise<void> {
    const entries: PostEntryDto[] = [
      {
        departmentId: assignment.departmentId,
        accountCode: 'accounts_payable',
        partyId: assignment.farmPartyId,
        entryType: 'debit',
        amount: assignment.principalAmount,
        entryDate: new Date(assignment.assignmentDate),
        sourceType: 'investment',
        sourceId: assignment.id,
        description: `Farm payable transferred to investor for purchase ${assignment.purchaseId}`,
        createdBy: actorId,
      },
      {
        departmentId: assignment.departmentId,
        accountCode: 'accounts_payable',
        partyId: assignment.investorPartyId,
        entryType: 'credit',
        amount: assignment.totalPayable,
        entryDate: new Date(assignment.assignmentDate),
        sourceType: 'investment',
        sourceId: assignment.id,
        description: `Investor balance for purchase ${assignment.purchaseId}`,
        createdBy: actorId,
      },
    ];
    if (this.toCents(assignment.returnAmount) > 0) {
      entries.push({
        departmentId: assignment.departmentId,
        accountCode:
          assignment.outcome === InvestmentOutcome.PROFIT
            ? 'operating_expense'
            : 'other_income',
        entryType:
          assignment.outcome === InvestmentOutcome.PROFIT ? 'debit' : 'credit',
        amount: assignment.returnAmount,
        entryDate: new Date(assignment.assignmentDate),
        sourceType: 'investment',
        sourceId: assignment.id,
        description:
          assignment.outcome === InvestmentOutcome.PROFIT
            ? 'Investor fixed return expense'
            : 'Investor fixed loss transferred to business',
        createdBy: actorId,
      });
    }
    await this.ledger.post(entries, manager);
  }

  private loadOne(
    id: string,
    manager: EntityManager = this.dataSource.manager,
  ) {
    return manager.getRepository(InvestmentAssignment).findOne({
      where: { id },
      relations: ['investorParty', 'farmParty', 'purchase', 'payments'],
      order: { payments: { paymentDate: 'DESC' } },
    });
  }

  private toCents(value: string | number): number {
    const number = Number(value);
    if (!Number.isFinite(number))
      throw new BadRequestException('Invalid monetary amount');
    return Math.round(number * 100);
  }

  private money(cents: number): string {
    return (cents / 100).toFixed(2);
  }
}
