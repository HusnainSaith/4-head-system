import {
  BadRequestException,
  Injectable,
  NotFoundException,
  Logger,
  Optional,
} from '@nestjs/common';
import { DataSource, EntityManager, In } from 'typeorm';
import { PartiesRepository } from './parties.repository';
import { CreatePartyDto } from './dto/create-party.dto';
import { UpdatePartyDto } from './dto/update-party.dto';
import { AdjustPartyBalanceDto } from './dto/adjust-party-balance.dto';
import { PartyStatementQueryDto } from './dto/party-statement-query.dto';
import { ListPartiesQueryDto } from './dto/list-parties-query.dto';
import { LedgerService } from '../ledger/ledger.service';
import { Party } from './entities/party.entity';
import { User } from '../users/entities/user.entity';
import { PartyPayment } from './entities/party-payment.entity';
import {
  PartyPaymentDirection,
  RecordPartyPaymentDto,
} from './dto/record-party-payment.dto';
import { InvoicesService } from '../invoices/invoices.service';
import { NotificationsService } from '../notifications/notifications.service';
import { publishBusinessDocument } from '../invoices/business-document.helper';
import { Department } from '../departments/entities/department.entity';
import { paymentAccountLink } from '../accounts/dto/payment-account-selection.dto';
import {
  PARTY_USER_ROLE_NAMES,
  PartyTypeEnum,
} from '../../common/types/party-type.enum';
import { BrokerageSale } from '../brokerage/entities/brokerage-sale.entity';
import { SupplyPurchase } from '../supply/entities/supply-purchase.entity';
import { PartySettlement } from './entities/party-settlement.entity';
import {
  CreatePartySettlementDto,
  UpdatePartySettlementDto,
} from './dto/create-party-settlement.dto';
import { LedgerEntry } from '../ledger/entities/ledger-entry.entity';

@Injectable()
export class PartiesService {
  private readonly logger = new Logger(PartiesService.name);
  constructor(
    private readonly partiesRepository: PartiesRepository,
    private readonly ledgerService: LedgerService,
    private readonly dataSource: DataSource,
    @Optional() private readonly invoicesService?: InvoicesService,
    @Optional() private readonly notificationsService?: NotificationsService,
  ) {}

  async create(dto: CreatePartyDto) {
    const { openingBalance, departmentIds, ...rest } = dto;
    const linkedUser = rest.userId
      ? await this.resolvePartyUser(rest.userId, rest.partyType)
      : undefined;
    if (linkedUser) {
      rest.name = linkedUser.fullName;
      rest.phone = linkedUser.phone ?? rest.phone;
    }
    const amount = openingBalance ?? 0;
    const normalizedDepartmentIds = this.normalizeDepartmentIds(
      departmentIds,
      rest.primaryDepartmentId,
      rest.linkedDepartmentId,
    );
    if (
      rest.partyType !== PartyTypeEnum.INTERNAL_DEPARTMENT &&
      normalizedDepartmentIds.length === 0
    ) {
      throw new BadRequestException(
        'Select at least one linked business department',
      );
    }
    rest.primaryDepartmentId ??= normalizedDepartmentIds[0];
    const departmentId = rest.primaryDepartmentId ?? rest.linkedDepartmentId;
    if (amount !== 0 && !departmentId) {
      throw new BadRequestException(
        'A primary or linked department is required for a non-zero opening balance',
      );
    }
    const party = await this.dataSource.transaction(async (manager) => {
      const repository = manager.getRepository(Party);
      const departments = await this.resolveDepartments(
        normalizedDepartmentIds,
        manager,
      );
      const saved = await repository.save(
        repository.create({
          ...rest,
          departments,
          openingBalance: amount.toFixed(2),
        }),
      );
      if (amount !== 0 && departmentId) {
        await this.ledgerService.post(
          [
            {
              departmentId,
              accountCode:
                amount > 0 ? 'accounts_payable' : 'accounts_receivable',
              partyId: saved.id,
              entryType: amount > 0 ? 'credit' : 'debit',
              amount: Math.abs(amount).toFixed(2),
              entryDate: new Date(),
              sourceType: 'opening_balance',
              sourceId: saved.id,
              description: 'Opening balance',
            },
            {
              departmentId,
              accountCode:
                amount > 0 ? 'accounts_payable' : 'accounts_receivable',
              entryType: amount > 0 ? 'debit' : 'credit',
              amount: Math.abs(amount).toFixed(2),
              entryDate: new Date(),
              sourceType: 'opening_balance',
              sourceId: saved.id,
              description: 'Opening balance control entry',
            },
          ],
          manager,
        );
      }
      return repository.findOneOrFail({
        where: { id: saved.id },
        relations: ['user', 'departments', 'primaryDepartment'],
      });
    });
    return {
      success: true,
      message: 'Party created successfully',
      data: party,
    };
  }

  async findAll(query: ListPartiesQueryDto) {
    const { page, limit, type, departmentId, search } = query;
    const result = await this.partiesRepository.findAll({
      type,
      departmentId,
      page,
      limit,
      search,
    });
    const partyIds = result.items.map((p) => p.id);
    const balanceMap = await this.ledgerService.getPartyBalances(partyIds);
    const items = result.items.map((p) => {
      const plainParty = JSON.parse(JSON.stringify(p));
      return {
        ...plainParty,
        currentBalance: balanceMap.get(p.id) ?? '0.00',
      };
    });
    return {
      success: true,
      message: 'Parties retrieved successfully',
      data: { ...result, items },
    };
  }

  async findById(id: string) {
    const party = await this.partiesRepository.findById(id);
    if (!party) {
      throw new NotFoundException(`Party with ID ${id} not found`);
    }
    return {
      success: true,
      message: 'Party retrieved successfully',
      data: party,
    };
  }

  async update(id: string, dto: UpdatePartyDto) {
    const existing = (await this.findById(id)).data;
    if (dto.userId) {
      const user = await this.resolvePartyUser(
        dto.userId,
        dto.partyType ?? existing.partyType,
      );
      dto.name = user.fullName;
      dto.phone = user.phone ?? dto.phone;
    }
    const { departmentIds, ...changes } = dto;
    const normalizedDepartmentIds = this.normalizeDepartmentIds(
      departmentIds ??
        existing.departments?.map(({ id: departmentId }) => departmentId),
      changes.primaryDepartmentId ?? existing.primaryDepartmentId,
      departmentIds === undefined ? existing.linkedDepartmentId : undefined,
    );
    if (
      (changes.partyType ?? existing.partyType) !==
        PartyTypeEnum.INTERNAL_DEPARTMENT &&
      normalizedDepartmentIds.length === 0
    ) {
      throw new BadRequestException(
        'Select at least one linked business department',
      );
    }
    if (
      changes.primaryDepartmentId &&
      !normalizedDepartmentIds.includes(changes.primaryDepartmentId)
    ) {
      throw new BadRequestException(
        'Primary department must be one of the linked departments',
      );
    }
    const updated = await this.dataSource.transaction(async (manager) => {
      const repository = manager.getRepository(Party);
      const entity = await repository.findOneOrFail({ where: { id } });
      repository.merge(entity, changes);
      entity.departments = await this.resolveDepartments(
        normalizedDepartmentIds,
        manager,
      );
      await repository.save(entity);
      return repository.findOneOrFail({
        where: { id },
        relations: [
          'user',
          'departments',
          'primaryDepartment',
          'linkedDepartment',
        ],
      });
    });
    return {
      success: true,
      message: 'Party updated successfully',
      data: updated,
    };
  }

  private normalizeDepartmentIds(
    departmentIds?: string[],
    primaryDepartmentId?: string,
    linkedDepartmentId?: string,
  ): string[] {
    return [
      ...new Set(
        [
          ...(departmentIds ?? []),
          primaryDepartmentId,
          linkedDepartmentId,
        ].filter((value): value is string => Boolean(value)),
      ),
    ];
  }

  private async resolveDepartments(
    departmentIds: string[],
    manager: EntityManager,
  ): Promise<Department[]> {
    if (departmentIds.length === 0) return [];
    const departments = await manager.getRepository(Department).find({
      where: { id: In(departmentIds), isActive: true },
    });
    if (departments.length !== departmentIds.length) {
      throw new BadRequestException(
        'One or more linked departments are invalid or inactive',
      );
    }
    return departments;
  }

  private async resolvePartyUser(userId: string, partyType?: string) {
    const user = await this.dataSource.getRepository(User).findOne({
      where: { id: userId, isActive: true },
      relations: ['role'],
    });
    const roleName = user?.role?.name.toUpperCase();
    if (
      !user ||
      !roleName ||
      !PARTY_USER_ROLE_NAMES.includes(
        roleName as (typeof PARTY_USER_ROLE_NAMES)[number],
      )
    )
      throw new BadRequestException('Selected user does not have a party role');
    if (
      partyType &&
      roleName !== 'PARTY' &&
      roleName !== partyType.toUpperCase()
    )
      throw new BadRequestException(
        'Selected user role does not match the party type',
      );
    return user;
  }

  async remove(id: string) {
    await this.findById(id);
    await this.partiesRepository.update(id, { deletedAt: new Date() });
    return {
      success: true,
      message: 'Party deleted successfully',
      data: null,
    };
  }

  async adjustBalance(id: string, dto: AdjustPartyBalanceDto, actorId: string) {
    const partyResponse = await this.findById(id);
    const party = partyResponse.data;
    const entryDate = dto.date ? new Date(dto.date) : new Date();
    const adjustmentId = await this.dataSource.query(
      `SELECT gen_random_uuid() AS id`,
    ).then((rows: { id: string }[]) => rows[0].id);
    const isIncrease = dto.amount > 0;
    await this.dataSource.query(
      `INSERT INTO ledger_entries
        (id, department_id, account_id, party_id, entry_type, amount,
         entry_date, source_type, source_id, description, created_by)
       VALUES ($1, $2,
         (SELECT id FROM chart_of_accounts WHERE code = $3),
         $4, $5, $6, $7, 'party_adjustment', $1, $8, $9)`,
      [
        adjustmentId,
        dto.departmentId,
        isIncrease ? 'accounts_payable' : 'accounts_receivable',
        id,
        isIncrease ? 'credit' : 'debit',
        Math.abs(dto.amount).toFixed(2),
        entryDate,
        dto.notes ?? (isIncrease ? 'Balance increase' : 'Balance decrease'),
        actorId,
      ],
    );
    const balance = await this.ledgerService.getPartyDepartmentBalance(
      id,
      dto.departmentId,
    );
    return {
      success: true,
      message: 'Party balance adjusted successfully',
      data: { partyId: id, departmentId: dto.departmentId, balance },
    };
  }

  async getStatement(dto: PartyStatementQueryDto) {
    if (!dto.partyId) throw new BadRequestException('Party ID is required');
    const statement = await this.ledgerService.getPartyStatement(
      dto.partyId,
      dto.startDate,
      dto.endDate,
    );
    return {
      success: true,
      message: 'Statement retrieved successfully',
      data: statement,
    };
  }

  async recordPayment(
    id: string,
    dto: RecordPartyPaymentDto,
    actorId?: string,
  ) {
    const partyResponse = await this.findById(id);
    const party = partyResponse.data;
    const departmentId =
      dto.departmentId ?? party.primaryDepartmentId ?? party.linkedDepartmentId;
    if (!departmentId) {
      throw new BadRequestException(
        'The party must have a primary or linked department before recording payments',
      );
    }
    const allowedDepartmentIds = new Set([
      ...(party.departments?.map(({ id: linkedId }) => linkedId) ?? []),
      party.primaryDepartmentId,
      party.linkedDepartmentId,
    ]);
    if (party.departments?.length && !allowedDepartmentIds.has(departmentId)) {
      throw new BadRequestException(
        'The party is not linked to the selected department',
      );
    }
    const currentBalance = await this.ledgerService.getPartyDepartmentBalance(
      id,
      departmentId,
    );
    const balance = Number(currentBalance ?? 0);
    // For 'paid' direction: cap only positive payables; zero and negative
    // balances are valid advance payments.
    if (
      dto.direction !== PartyPaymentDirection.RECEIVED &&
      balance > 0 &&
      dto.amount > balance
    ) {
      throw new BadRequestException(
        'Payment amount cannot exceed the outstanding party balance',
      );
    }
    const payment = await this.dataSource.transaction(async (manager) => {
      const repository = manager.getRepository(PartyPayment);
      const saved = await repository.save(
        repository.create({
          partyId: id,
          departmentId,
          amount: dto.amount.toFixed(2),
          direction: dto.direction,
          paymentMethod: dto.paymentMethod,
          ...paymentAccountLink(dto),
          paymentDate: dto.paymentDate,
          notes: dto.notes,
        }),
      );
      const received = dto.direction === PartyPaymentDirection.RECEIVED;
      const isAdvancePayment = !received && balance <= 0;
      const fundsAccount = dto.paymentMethod === 'bank' ? 'bank' : 'cash';

      const receivedEntries = received
        ? [
            // Cash/bank in
            {
              departmentId,
              accountCode: fundsAccount,
              ...paymentAccountLink(dto),
              entryType: 'debit' as const,
              amount: saved.amount,
              entryDate: new Date(dto.paymentDate),
              sourceType: 'payment',
              sourceId: saved.id,
              description: dto.notes ?? 'Payment received',
            },
            // A receipt from a payable party increases the payable balance.
            {
              departmentId,
              accountCode: balance > 0 ? 'accounts_payable' : 'accounts_receivable',
              partyId: id,
              entryType: 'credit' as const,
              amount: saved.amount,
              entryDate: new Date(dto.paymentDate),
              sourceType: 'payment',
              sourceId: saved.id,
              description: dto.notes ?? 'Payment received',
            },
          ]
        : null;

      await this.ledgerService.post(
        received
          ? receivedEntries!
          : [
              {
                departmentId,
                accountCode: isAdvancePayment
                  ? 'accounts_receivable'
                  : 'accounts_payable',
                partyId: id,
                entryType: 'debit',
                amount: saved.amount,
                entryDate: new Date(dto.paymentDate),
                sourceType: 'payment',
                sourceId: saved.id,
                description:
                  dto.notes ??
                  (isAdvancePayment ? 'Advance payment paid' : 'Payment paid'),
              },
              {
                departmentId,
                accountCode: fundsAccount,
                ...paymentAccountLink(dto),
                entryType: 'credit',
                amount: saved.amount,
                entryDate: new Date(dto.paymentDate),
                sourceType: 'payment',
                sourceId: saved.id,
                description:
                  dto.notes ??
                  (isAdvancePayment ? 'Advance payment paid' : 'Payment paid'),
              },
            ],
        manager,
      );
      await this.mirrorInternalDepartmentPayment(
        party,
        departmentId,
        dto,
        saved,
        manager,
        actorId,
      );
      return saved;
    });
    if (this.invoicesService && this.notificationsService && actorId)
      await publishBusinessDocument(
        this.invoicesService,
        this.notificationsService,
        {
          invoiceType: 'payment',
          departmentId,
          sourceType: 'payment',
          sourceId: payment.id,
          partyId: party.id,
          partyName: party.name,
          lineItems: [
            {
              description:
                dto.direction === PartyPaymentDirection.RECEIVED
                  ? 'Payment Received'
                  : 'Payment Paid',
              qty: 1,
              unit: 'payment',
              rate: Number(payment.amount),
              amount: Number(payment.amount),
            },
          ],
          subtotal: Number(payment.amount),
          totalAmount: Number(payment.amount),
          notes: payment.notes,
          issuedAt: new Date(payment.paymentDate).toISOString(),
        },
        actorId,
        {
          type: 'payment',
          title: 'Payment Recorded',
          message: `Payment ${dto.direction} for ${party.name}`,
          context: {
            referenceNumber: payment.id,
            amount: payment.amount,
            date: payment.paymentDate,
            status: 'Recorded',
          },
        },
        this.logger,
      );
    return {
      success: true,
      message: 'Payment recorded successfully',
      data: payment,
    };
  }

  async updatePayment(
    partyId: string,
    paymentId: string,
    dto: Partial<RecordPartyPaymentDto>,
    actorId?: string,
  ) {
    const partyResponse = await this.findById(partyId);
    const party = partyResponse.data;
    const updated = await this.dataSource.transaction(async (manager) => {
      const repository = manager.getRepository(PartyPayment);
      const payment = await repository.findOne({
        where: { id: paymentId, partyId },
      });
      if (!payment) throw new NotFoundException('Party payment not found');
      if (party.partyType === PartyTypeEnum.INTERNAL_DEPARTMENT)
        throw new BadRequestException('Internal department payments cannot be edited here');
      const dateOnly = Object.keys(dto).every((key) => key === 'paymentDate');
      const nextMethod = dto.paymentMethod ?? payment.paymentMethod;
      Object.assign(payment, {
        ...(dto.paymentDate ? { paymentDate: dto.paymentDate } : {}),
        ...(dto.amount !== undefined ? { amount: dto.amount.toFixed(2) } : {}),
        ...(dto.direction !== undefined ? { direction: dto.direction } : {}),
        ...(dto.paymentMethod !== undefined ? { paymentMethod: nextMethod } : {}),
        ...(dto.notes !== undefined ? { notes: dto.notes } : {}),
        ...(dto.paymentMethod
          ? paymentAccountLink({
              ...dto,
              paymentMethod: nextMethod,
              cashAccountId: dto.cashAccountId ?? payment.cashAccountId,
              bankAccountId: dto.bankAccountId ?? payment.bankAccountId,
              bankTransactionMethod:
                dto.bankTransactionMethod ?? payment.bankTransactionMethod,
            } as RecordPartyPaymentDto)
          : {}),
      });
      await manager.update(
        LedgerEntry,
        { sourceType: 'payment', sourceId: payment.id },
        dto.paymentDate ? { entryDate: dto.paymentDate } : {},
      );
      if (!dateOnly) {
        const entries = await manager.getRepository(LedgerEntry).find({
          where: { sourceType: 'payment', sourceId: payment.id },
          relations: { account: true },
        });
        for (const entry of entries) entry.amount = payment.amount;
        await manager.getRepository(LedgerEntry).save(entries);
      }
      const saved = await repository.save(payment);
      return saved;
    });
    return {
      success: true,
      message: 'Payment updated successfully',
      data: updated,
    };
  }

  private async mirrorInternalDepartmentPayment(
    party: Party,
    sourceDepartmentId: string,
    dto: RecordPartyPaymentDto,
    payment: PartyPayment,
    manager: EntityManager,
    actorId?: string,
  ): Promise<void> {
    if (
      party.partyType !== PartyTypeEnum.INTERNAL_DEPARTMENT ||
      !party.linkedDepartmentId ||
      party.linkedDepartmentId === sourceDepartmentId
    )
      return;

    const targetDepartmentId = party.linkedDepartmentId;
    const sourceDepartmentParty = await manager.findOne(Party, {
      where: {
        partyType: PartyTypeEnum.INTERNAL_DEPARTMENT,
        linkedDepartmentId: sourceDepartmentId,
      },
    });
    if (!sourceDepartmentParty)
      throw new BadRequestException(
        'The corresponding internal department party is missing',
      );

    const sourceReceived = dto.direction === PartyPaymentDirection.RECEIVED;
    const fundsAccount = dto.paymentMethod === 'bank' ? 'bank' : 'cash';
    await this.ledgerService.post(
      sourceReceived
        ? [
            {
              departmentId: targetDepartmentId,
              accountCode: 'accounts_payable',
              partyId: sourceDepartmentParty.id,
              entryType: 'debit',
              amount: payment.amount,
              entryDate: new Date(dto.paymentDate),
              sourceType: 'payment',
              sourceId: payment.id,
              description: dto.notes ?? 'Mirrored inter-department payment',
              createdBy: actorId,
            },
            {
              departmentId: targetDepartmentId,
              accountCode: fundsAccount,
              ...paymentAccountLink(dto),
              entryType: 'credit',
              amount: payment.amount,
              entryDate: new Date(dto.paymentDate),
              sourceType: 'payment',
              sourceId: payment.id,
              description: dto.notes ?? 'Mirrored inter-department payment',
              createdBy: actorId,
            },
          ]
        : [
            {
              departmentId: targetDepartmentId,
              accountCode: fundsAccount,
              ...paymentAccountLink(dto),
              entryType: 'debit',
              amount: payment.amount,
              entryDate: new Date(dto.paymentDate),
              sourceType: 'payment',
              sourceId: payment.id,
              description: dto.notes ?? 'Mirrored inter-department receipt',
              createdBy: actorId,
            },
            {
              departmentId: targetDepartmentId,
              accountCode: 'accounts_receivable',
              partyId: sourceDepartmentParty.id,
              entryType: 'credit',
              amount: payment.amount,
              entryDate: new Date(dto.paymentDate),
              sourceType: 'payment',
              sourceId: payment.id,
              description: dto.notes ?? 'Mirrored inter-department receipt',
              createdBy: actorId,
            },
          ],
      manager,
    );

    const [sourceDepartment, targetDepartment] = await Promise.all([
      manager.findOne(Department, { where: { id: sourceDepartmentId } }),
      manager.findOne(Department, { where: { id: targetDepartmentId } }),
    ]);
    if (
      !sourceDepartment ||
      !targetDepartment ||
      ![sourceDepartment.type, targetDepartment.type].includes('BROKERAGE') ||
      ![sourceDepartment.type, targetDepartment.type].includes('SUPPLY')
    )
      return;

    const supplyDepartmentId =
      sourceDepartment.type === 'SUPPLY'
        ? sourceDepartment.id
        : targetDepartment.id;
    await this.applyBrokerageSupplyPayment(
      supplyDepartmentId,
      payment.amount,
      manager,
    );
  }

  private async applyBrokerageSupplyPayment(
    supplyDepartmentId: string,
    amount: string,
    manager: EntityManager,
  ): Promise<void> {
    const purchases = await manager
      .getRepository(SupplyPurchase)
      .createQueryBuilder('purchase')
      .setLock('pessimistic_write')
      .where('purchase.department_id = :departmentId', {
        departmentId: supplyDepartmentId,
      })
      .andWhere('purchase.source_brokerage_sale_id IS NOT NULL')
      .andWhere('purchase.status = :status', { status: 'posted' })
      .andWhere('purchase.outstanding_amount > 0')
      .orderBy('purchase.purchase_date', 'ASC')
      .addOrderBy('purchase.created_at', 'ASC')
      .getMany();

    let remainingCents = Math.round(Number(amount) * 100);
    for (const purchase of purchases) {
      if (remainingCents <= 0) break;
      const outstandingCents = Math.round(
        Number(purchase.outstandingAmount) * 100,
      );
      const appliedCents = Math.min(remainingCents, outstandingCents);
      purchase.amountPaid = (
        (Math.round(Number(purchase.amountPaid) * 100) + appliedCents) /
        100
      ).toFixed(2);
      purchase.outstandingAmount = (
        (outstandingCents - appliedCents) /
        100
      ).toFixed(2);
      await manager.save(SupplyPurchase, purchase);

      const sale = await manager.findOne(BrokerageSale, {
        where: { id: purchase.sourceBrokerageSaleId },
        lock: { mode: 'pessimistic_write' },
      });
      if (sale) {
        sale.amountReceived = (
          (Math.round(Number(sale.amountReceived) * 100) + appliedCents) /
          100
        ).toFixed(2);
        sale.outstandingAmount = (
          Math.max(
            0,
            Math.round(Number(sale.outstandingAmount) * 100) - appliedCents,
          ) / 100
        ).toFixed(2);
        await manager.save(BrokerageSale, sale);
      }
      remainingCents -= appliedCents;
    }
  }
  /**
   * Create a party-to-party settlement transaction
   * Settles a payable party and a receivable party against each other
   * without involving Cash or Bank accounts.
   *
   * Balance convention:
   * - Positive balance = Payable (we owe them)
   * - Negative balance = Receivable (they owe us)
   *
   * Displayed settlement balance follows the party balance values returned by
   * the ledger query.
   *
   * To reduce payable (positive): debit accounts_payable
   * To reduce receivable (negative): credit accounts_receivable
   */
  async createPartySettlement(
    dto: CreatePartySettlementDto,
    actorId: string,
  ) {
    if (dto.payablePartyId === dto.receivablePartyId) {
      throw new BadRequestException(
        'Payable party and receivable party must be different',
      );
    }

    const [payablePartyResponse, receivablePartyResponse] = await Promise.all([
      this.findById(dto.payablePartyId),
      this.findById(dto.receivablePartyId),
    ]);

    const payableParty = payablePartyResponse.data;
    const receivableParty = receivablePartyResponse.data;

    const payableBalance = await this.ledgerService.getPartyDepartmentBalance(
      dto.payablePartyId,
      dto.departmentId,
    );
    const receivableBalance = await this.ledgerService.getPartyDepartmentBalance(
      dto.receivablePartyId,
      dto.departmentId,
    );

    const payableBalanceNum = Number(payableBalance ?? '0');
    const receivableBalanceNum = Number(receivableBalance ?? '0');

    if (payableBalanceNum <= 0) {
      throw new BadRequestException(
        `Payable party "${payableParty.name}" has no outstanding payable balance (current: ${payableBalanceNum})`,
      );
    }

    if (receivableBalanceNum >= 0) {
      throw new BadRequestException(
        `Receivable party "${receivableParty.name}" has no outstanding receivable balance (current: ${receivableBalanceNum})`,
      );
    }

    const maxSettlementAmount = Math.min(
      payableBalanceNum,
      Math.abs(receivableBalanceNum),
    );

    if (dto.settlementAmount > maxSettlementAmount) {
      throw new BadRequestException(
        `Settlement amount (${dto.settlementAmount}) exceeds maximum available (${maxSettlementAmount})`,
      );
    }

    const settlement = await this.dataSource.transaction(async (manager) => {
      const settlementRepo = manager.getRepository(PartySettlement);
      const settlementDate = dto.settlementDate
        ? new Date(dto.settlementDate).toISOString().split('T')[0]
        : new Date().toISOString().split('T')[0];

      const saved = await settlementRepo.save(
        settlementRepo.create({
          payablePartyId: dto.payablePartyId,
          receivablePartyId: dto.receivablePartyId,
          departmentId: dto.departmentId,
          settlementAmount: dto.settlementAmount.toFixed(2),
          settlementDate,
          reference: dto.reference,
          notes: dto.notes,
          status: 'active',
          createdBy: actorId,
        }),
      );

      await this.ledgerService.post(
        [
          {
            departmentId: dto.departmentId,
            accountCode: 'accounts_payable',
            partyId: dto.payablePartyId,
            entryType: 'debit',
            amount: dto.settlementAmount.toFixed(2),
            entryDate: new Date(settlementDate),
            sourceType: 'party_adjustment',
            sourceId: saved.id,
            description: `Settlement with ${receivableParty.name}`,
            createdBy: actorId,
          },
          {
            departmentId: dto.departmentId,
            accountCode: 'accounts_receivable',
            partyId: dto.receivablePartyId,
            entryType: 'credit',
            amount: dto.settlementAmount.toFixed(2),
            entryDate: new Date(settlementDate),
            sourceType: 'party_adjustment',
            sourceId: saved.id,
            description: `Settlement with ${payableParty.name}`,
            createdBy: actorId,
          },
        ],
        manager,
      );

      return settlementRepo.findOneOrFail({
        where: { id: saved.id },
        relations: ['payableParty', 'receivableParty', 'department'],
      });
    });

    return {
      success: true,
      message: 'Party settlement created successfully',
      data: settlement,
    };
  }

  /**
   * Reverse a party settlement transaction
   */
  async reversePartySettlement(
    settlementId: string,
    reversalReason: string,
    actorId: string,
  ) {
    const settlement = await this.dataSource.getRepository(PartySettlement).findOne({
      where: { id: settlementId },
      relations: ['payableParty', 'receivableParty'],
    });

    if (!settlement) {
      throw new NotFoundException('Settlement not found');
    }

    if (settlement.status === 'reversed') {
      throw new BadRequestException('Settlement is already reversed');
    }

    await this.dataSource.transaction(async (manager) => {
      await this.ledgerService.reverseSource(
        'party_adjustment',
        settlementId,
        actorId,
        manager,
      );

      settlement.status = 'reversed';
      settlement.reversedAt = new Date();
      settlement.reversedBy = actorId;
      settlement.reversalReason = reversalReason;
      await manager.save(PartySettlement, settlement);
    });

    return {
      success: true,
      message: 'Party settlement reversed successfully',
      data: settlement,
    };
  }

  async listPartySettlements(departmentId?: string) {
    const settlements = await this.dataSource.getRepository(PartySettlement).find({
      where: departmentId ? { departmentId } : {},
      relations: ['payableParty', 'receivableParty', 'department'],
      order: { settlementDate: 'DESC', createdAt: 'DESC' },
    });
    return {
      success: true,
      message: 'Settlements retrieved successfully',
      data: settlements,
    };
  }

  async updatePartySettlement(
    settlementId: string,
    dto: UpdatePartySettlementDto,
    actorId: string,
  ) {
    const settlement = await this.dataSource.getRepository(PartySettlement).findOne({
      where: { id: settlementId },
      relations: ['payableParty', 'receivableParty', 'department'],
    });
    if (!settlement) throw new NotFoundException('Settlement not found');
    if (settlement.status !== 'active') {
      throw new BadRequestException('Only active settlements can be edited');
    }

    const oldAmount = Number(settlement.settlementAmount);
    const newAmount = dto.settlementAmount ?? oldAmount;
    const delta = Math.round((newAmount - oldAmount) * 100) / 100;

    if (delta > 0) {
      const [payableBalance, receivableBalance] = await Promise.all([
        this.ledgerService.getPartyDepartmentBalance(
          settlement.payablePartyId,
          settlement.departmentId,
        ),
        this.ledgerService.getPartyDepartmentBalance(
          settlement.receivablePartyId,
          settlement.departmentId,
        ),
      ]);
      const available = Math.min(
        Math.max(0, Number(payableBalance ?? 0)),
        Math.max(0, Math.abs(Number(receivableBalance ?? 0))),
      );
      if (delta > available) {
        throw new BadRequestException(
          `Additional settlement amount (${delta}) exceeds maximum available (${available})`,
        );
      }
    }

    const updated = await this.dataSource.transaction(async (manager) => {
      const entryDate = new Date(dto.settlementDate ?? settlement.settlementDate);
      if (delta !== 0) {
        const amount = Math.abs(delta).toFixed(2);
        await this.ledgerService.post(
          delta > 0
            ? [
                {
                  departmentId: settlement.departmentId,
                  accountCode: 'accounts_payable',
                  partyId: settlement.payablePartyId,
                  entryType: 'debit',
                  amount,
                  entryDate,
                  sourceType: 'party_adjustment',
                  sourceId: settlement.id,
                  description: `Settlement edited with ${settlement.receivableParty.name}`,
                  createdBy: actorId,
                },
                {
                  departmentId: settlement.departmentId,
                  accountCode: 'accounts_receivable',
                  partyId: settlement.receivablePartyId,
                  entryType: 'credit',
                  amount,
                  entryDate,
                  sourceType: 'party_adjustment',
                  sourceId: settlement.id,
                  description: `Settlement edited with ${settlement.payableParty.name}`,
                  createdBy: actorId,
                },
              ]
            : [
                {
                  departmentId: settlement.departmentId,
                  accountCode: 'accounts_payable',
                  partyId: settlement.payablePartyId,
                  entryType: 'credit',
                  amount,
                  entryDate,
                  sourceType: 'party_adjustment',
                  sourceId: settlement.id,
                  description: `Settlement amount reduced with ${settlement.receivableParty.name}`,
                  createdBy: actorId,
                },
                {
                  departmentId: settlement.departmentId,
                  accountCode: 'accounts_receivable',
                  partyId: settlement.receivablePartyId,
                  entryType: 'debit',
                  amount,
                  entryDate,
                  sourceType: 'party_adjustment',
                  sourceId: settlement.id,
                  description: `Settlement amount reduced with ${settlement.payableParty.name}`,
                  createdBy: actorId,
                },
              ],
          manager,
        );
      }

      if (dto.settlementDate) {
        await manager.update(
          LedgerEntry,
          { sourceType: 'party_adjustment', sourceId: settlement.id },
          { entryDate: dto.settlementDate },
        );
      }
      settlement.settlementAmount = newAmount.toFixed(2);
      if (dto.settlementDate) settlement.settlementDate = dto.settlementDate;
      if (dto.reference !== undefined) settlement.reference = dto.reference || undefined;
      if (dto.notes !== undefined) settlement.notes = dto.notes || undefined;
      settlement.updatedBy = actorId;
      await manager.save(PartySettlement, settlement);
      return manager.findOneOrFail(PartySettlement, {
        where: { id: settlement.id },
        relations: ['payableParty', 'receivableParty', 'department'],
      });
    });

    return {
      success: true,
      message: 'Settlement updated successfully',
      data: updated,
    };
  }

  async deletePartySettlement(
    settlementId: string,
    reason: string,
    actorId: string,
  ) {
    const settlement = await this.dataSource.getRepository(PartySettlement).findOne({
      where: { id: settlementId },
      relations: ['payableParty', 'receivableParty', 'department'],
    });
    if (!settlement) throw new NotFoundException('Settlement not found');
    if (settlement.status !== 'active') {
      throw new BadRequestException('Only active settlements can be deleted');
    }

    await this.dataSource.transaction(async (manager) => {
      await this.ledgerService.reverseSource(
        'party_adjustment',
        settlement.id,
        actorId,
        manager,
      );
      settlement.status = 'reversed';
      settlement.reversedAt = new Date();
      settlement.reversedBy = actorId;
      settlement.reversalReason = reason.trim() || 'Settlement deleted';
      settlement.deletedAt = new Date();
      settlement.updatedBy = actorId;
      await manager.save(PartySettlement, settlement);
    });

    return {
      success: true,
      message: 'Settlement deleted and balances reversed successfully',
      data: null,
    };
  }

  /**
   * Get settlement history for a party
   */
  async getPartySettlementHistory(partyId: string, departmentId?: string) {
    const query = this.dataSource
      .getRepository(PartySettlement)
      .createQueryBuilder('settlement')
      .where(
        '(settlement.payable_party_id = :partyId OR settlement.receivable_party_id = :partyId)',
        { partyId },
      )
      .leftJoinAndSelect('settlement.payableParty', 'payableParty')
      .leftJoinAndSelect('settlement.receivableParty', 'receivableParty')
      .leftJoinAndSelect('settlement.department', 'department')
      .orderBy('settlement.settlement_date', 'DESC')
      .addOrderBy('settlement.created_at', 'DESC');

    if (departmentId) {
      query.andWhere('settlement.department_id = :departmentId', {
        departmentId,
      });
    }

    const settlements = await query.getMany();

    return {
      success: true,
      message: 'Settlement history retrieved successfully',
      data: settlements,
    };
  }
}
