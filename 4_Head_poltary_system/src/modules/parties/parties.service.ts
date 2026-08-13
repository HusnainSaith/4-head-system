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
                amount > 0 ? 'accounts_receivable' : 'accounts_payable',
              partyId: saved.id,
              entryType: amount > 0 ? 'debit' : 'credit',
              amount: Math.abs(amount).toFixed(2),
              entryDate: new Date(),
              sourceType: 'opening_balance',
              sourceId: saved.id,
              description: 'Opening balance',
            },
            {
              departmentId,
              accountCode:
                amount > 0 ? 'accounts_receivable' : 'accounts_payable',
              entryType: amount > 0 ? 'credit' : 'debit',
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
    return {
      success: true,
      message: 'Parties retrieved successfully',
      data: result,
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
    if (party.partyType === PartyTypeEnum.INVESTOR) {
      throw new BadRequestException(
        'Investor balances must be paid through the investment assignment workflow',
      );
    }
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
    if (!currentBalance || Number(currentBalance) === 0) {
      throw new BadRequestException(
        'This party has no outstanding balance in the selected department',
      );
    }
    const expectedDirection =
      Number(currentBalance) > 0
        ? PartyPaymentDirection.RECEIVED
        : PartyPaymentDirection.PAID;
    if (dto.direction !== expectedDirection) {
      throw new BadRequestException(
        Number(currentBalance) > 0
          ? 'This balance must be recorded as received'
          : 'This balance must be recorded as paid',
      );
    }
    if (dto.amount > Math.abs(Number(currentBalance))) {
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
      const fundsAccount = dto.paymentMethod === 'bank' ? 'bank' : 'cash';
      await this.ledgerService.post(
        received
          ? [
              {
                departmentId,
                accountCode: fundsAccount,
                ...paymentAccountLink(dto),
                entryType: 'debit',
                amount: saved.amount,
                entryDate: new Date(dto.paymentDate),
                sourceType: 'payment',
                sourceId: saved.id,
                description: dto.notes ?? 'Payment received',
              },
              {
                departmentId,
                accountCode: 'accounts_receivable',
                partyId: id,
                entryType: 'credit',
                amount: saved.amount,
                entryDate: new Date(dto.paymentDate),
                sourceType: 'payment',
                sourceId: saved.id,
                description: dto.notes ?? 'Payment received',
              },
            ]
          : [
              {
                departmentId,
                accountCode: 'accounts_payable',
                partyId: id,
                entryType: 'debit',
                amount: saved.amount,
                entryDate: new Date(dto.paymentDate),
                sourceType: 'payment',
                sourceId: saved.id,
                description: dto.notes ?? 'Payment paid',
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
                description: dto.notes ?? 'Payment paid',
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
}
