import {
  Injectable,
  OnModuleInit,
  BadRequestException,
  NotFoundException,
  Logger,
  ConflictException,
  Optional,
} from '@nestjs/common';
import { DataSource, EntityManager } from 'typeorm';
import { SupplyRepository } from './supply.repository';
import { DepartmentsService } from '../departments/departments.service';
import { InventoryService } from '../inventory/inventory.service';
import { LedgerService, PostEntryDto } from '../ledger/ledger.service';
import { SupplyPurchase } from './entities/supply-purchase.entity';
import { SupplySale } from './entities/supply-sale.entity';
import { InternalTransfer } from './entities/internal-transfer.entity';
import { StockMovement } from '../inventory/entities/stock-movement.entity';
import { Party } from '../parties/entities/party.entity';
import { StockMovementSourceEnum } from '../inventory/enums/stock-movement.enum';
import { StockType } from '../inventory/enums/stock-type.enum';
import { PartyTypeEnum } from '../../common/types/party-type.enum';
import { Vehicle } from '../vehicles/entities/vehicle.entity';
import { ExpensesService } from '../expenses/expenses.service';
import { InvoicesService } from '../invoices/invoices.service';
import { NotificationsService } from '../notifications/notifications.service';
import {
  publishBusinessDocument,
  publishBusinessNotification,
} from '../invoices/business-document.helper';
import { resolveTransactionPayment } from '../ledger/transaction-payment.helper';
import { paymentAccountLink } from '../accounts/dto/payment-account-selection.dto';
import {
  CreateSupplyPurchaseDto,
  CreateSupplySaleDto,
  CreateInternalTransferDto,
  SettleTransferDto,
  SupplyListQueryDto,
  TransferListQueryDto,
} from './dto/supply.dto';

@Injectable()
export class SupplyService implements OnModuleInit {
  private readonly logger = new Logger(SupplyService.name);
  private supplyDeptId: string;
  private shopDeptId: string;
  private shopInternalPartyId: string;
  private supplyInternalPartyId: string;

  constructor(
    private readonly supplyRepository: SupplyRepository,
    private readonly departmentsService: DepartmentsService,
    private readonly inventoryService: InventoryService,
    private readonly ledgerService: LedgerService,
    private readonly dataSource: DataSource,
    private readonly expensesService?: ExpensesService,
    @Optional() private readonly invoicesService?: InvoicesService,
    @Optional() private readonly notificationsService?: NotificationsService,
  ) {}

  private async validateReferences(
    manager: EntityManager,
    partyId: string | undefined,
    partyType: PartyTypeEnum,
    vehicleId?: string,
  ) {
    if (partyId) {
      const party = await manager.findOne(Party, {
        where: { id: partyId, partyType },
      });
      if (!party)
        throw new BadRequestException(
          `Selected party must be a ${partyType} party`,
        );
    }
    if (vehicleId) {
      const vehicle = await manager.findOne(Vehicle, {
        where: {
          id: vehicleId,
          isActive: true,
          departmentId: this.supplyDeptId,
        },
      });
      if (!vehicle)
        throw new BadRequestException(
          'Selected vehicle must be active and assigned to Supply',
        );
    }
  }

  async onModuleInit() {
    try {
      const [supply, shop] = await Promise.all([
        this.departmentsService.findByType('SUPPLY'),
        this.departmentsService.findByType('FRESH_CHICKEN_SHOP'),
      ]);
      this.supplyDeptId = supply.id;
      this.shopDeptId = shop.id;

      const [shopParty, supplyParty] = await Promise.all([
        this.supplyRepository.findInternalPartyByDepartmentId(shop.id),
        this.supplyRepository.findInternalPartyByDepartmentId(supply.id),
      ]);
      this.shopInternalPartyId = shopParty?.id ?? '';
      this.supplyInternalPartyId = supplyParty?.id ?? '';
    } catch {
      this.logger.warn(
        'Supply/FreshChickenShop departments not found — run `npm run seed` to initialise departments.',
      );
    }
  }

  async createPurchase(dto: CreateSupplyPurchaseDto, createdBy: string) {
    const saved = await this.dataSource.transaction(async (manager) => {
      await this.validateReferences(
        manager,
        dto.partyId,
        PartyTypeEnum.BROKER,
        dto.vehicleId,
      );
      const totalAmount = (dto.quantityKg * dto.ratePerKg).toFixed(2);
      const payment = resolveTransactionPayment({
        totalAmount,
        enteredAmount: dto.amountPaid,
        paymentMethod: dto.paymentMethod,
        ...paymentAccountLink(dto),
        partyId: dto.partyId,
        amountLabel: 'Amount paid',
      });
      const purchase = await manager.save(
        SupplyPurchase,
        manager.create(SupplyPurchase, {
          departmentId: this.supplyDeptId,
          partyId: dto.partyId,
          quantityKg: dto.quantityKg.toFixed(3),
          ratePerKg: dto.ratePerKg.toFixed(2),
          totalAmount,
          paymentMethod: dto.paymentMethod,
          ...paymentAccountLink(dto),
          amountPaid: payment.settledAmount,
          outstandingAmount: payment.outstandingAmount,
          purchaseDate: new Date(dto.purchaseDate),
          vehicleId: dto.vehicleId,
          status: 'posted',
          notes: dto.notes,
          createdBy,
          updatedBy: createdBy,
        } as Partial<SupplyPurchase>),
      );

      await this.inventoryService.applyPurchaseIn(
        this.supplyDeptId,
        dto.quantityKg,
        dto.ratePerKg,
        StockMovementSourceEnum.PURCHASE,
        purchase.id,
        new Date(dto.purchaseDate),
        manager,
      );

      const entries: PostEntryDto[] = [
        {
          departmentId: this.supplyDeptId,
          accountCode: 'cogs',
          entryType: 'debit',
          amount: totalAmount,
          entryDate: new Date(dto.purchaseDate),
          sourceType: 'purchase',
          sourceId: purchase.id,
          createdBy,
        },
      ];
      if (payment.settledValue > 0)
        entries.push({
          departmentId: this.supplyDeptId,
          accountCode: dto.paymentMethod === 'bank' ? 'bank' : 'cash',
          ...paymentAccountLink(dto),
          entryType: 'credit',
          amount: payment.settledAmount,
          entryDate: new Date(dto.purchaseDate),
          sourceType: 'purchase',
          sourceId: purchase.id,
          createdBy,
        });
      if (payment.outstandingValue > 0)
        entries.push({
          departmentId: this.supplyDeptId,
          accountCode: 'accounts_payable',
          partyId: dto.partyId,
          entryType: 'credit',
          amount: payment.outstandingAmount,
          entryDate: new Date(dto.purchaseDate),
          sourceType: 'purchase',
          sourceId: purchase.id,
          createdBy,
        });
      await this.ledgerService.post(entries, manager);

      return purchase;
    });
    if (this.invoicesService && this.notificationsService)
      await publishBusinessDocument(
        this.invoicesService,
        this.notificationsService,
        {
          invoiceType: 'purchase',
          departmentId: saved.departmentId,
          sourceType: 'purchase',
          sourceId: saved.id,
          partyId: saved.partyId,
          lineItems: [
            {
              description: 'Chicken Purchase',
              qty: Number(saved.quantityKg),
              unit: 'kg',
              rate: Number(saved.ratePerKg),
              amount: Number(saved.totalAmount),
            },
          ],
          subtotal: Number(saved.totalAmount),
          totalAmount: Number(saved.totalAmount),
          notes: saved.notes,
          issuedAt: new Date(saved.purchaseDate).toISOString(),
        },
        createdBy,
        {
          type: 'purchase',
          title: 'Supply Purchase Recorded',
          message: `Purchase of ${saved.quantityKg}kg recorded`,
          context: {
            amount: saved.totalAmount,
            date: String(saved.purchaseDate),
            status: saved.status,
          },
        },
        this.logger,
      );
    return saved;
  }

  findAllPurchases(query: SupplyListQueryDto) {
    return this.supplyRepository.findAllPurchases(query);
  }

  async findPurchaseById(id: string) {
    const p = await this.supplyRepository.findPurchaseById(id);
    if (!p) throw new NotFoundException('Supply purchase not found');
    return p;
  }

  updatePurchase(_id: string, _dto: Partial<CreateSupplyPurchaseDto>) {
    void _id;
    void _dto;
    throw new ConflictException(
      'Posted purchases cannot be overwritten; cancel and recreate the transaction',
    );
  }

  async softDeletePurchase(id: string, actorId: string) {
    const saved = await this.dataSource.transaction(async (manager) => {
      const purchase = await this.supplyRepository.findPurchaseById(
        id,
        manager,
      );
      if (!purchase) throw new NotFoundException('Supply purchase not found');
      if (purchase.status === 'cancelled')
        throw new ConflictException('Supply purchase is already cancelled');
      if (purchase.sourceBrokerageSaleId)
        throw new ConflictException(
          'This purchase was generated by Brokerage; cancel the source Brokerage sale instead',
        );
      await this.inventoryService.reverseSourceMovement(
        this.supplyDeptId,
        StockMovementSourceEnum.PURCHASE,
        id,
        manager,
      );
      await this.ledgerService.reverseSource('purchase', id, actorId, manager);
      return this.supplyRepository.updatePurchase(
        id,
        { status: 'cancelled', cancelledAt: new Date() },
        manager,
      );
    });
    if (this.notificationsService)
      await publishBusinessNotification(
        this.notificationsService,
        {
          type: 'purchase',
          title: 'Transaction Cancelled',
          message: 'Supply purchase was cancelled',
          recipientUserId: actorId,
          sourceType: 'purchase',
          sourceId: id,
          context: {
            amount: saved.totalAmount,
            date: String(saved.purchaseDate),
            status: 'Cancelled',
          },
        },
        this.logger,
      );
    return saved;
  }

  async createSale(dto: CreateSupplySaleDto, createdBy: string) {
    const balance = await this.inventoryService.getBalance(this.supplyDeptId);
    if (Number(balance.quantityKg) < dto.quantityKg) {
      throw new BadRequestException(
        `Insufficient stock. Available: ${balance.quantityKg}kg`,
      );
    }
    const saved = await this.dataSource.transaction(async (manager) => {
      const balance = await this.inventoryService.getBalance(this.supplyDeptId);
      const currentWac = Number(balance.wac);
      const totalAmount = (dto.quantityKg * dto.ratePerKg).toFixed(2);
      const commissionPerKg = (dto.ratePerKg - currentWac).toFixed(2);
      const payment = resolveTransactionPayment({
        totalAmount,
        enteredAmount: dto.amountReceived,
        paymentMethod: dto.paymentMethod,
        ...paymentAccountLink(dto),
        partyId: dto.partyId,
        amountLabel: 'Amount received',
      });

      const sale = await manager.save(
        SupplySale,
        manager.create(SupplySale, {
          departmentId: this.supplyDeptId,
          partyId: dto.partyId,
          quantityKg: dto.quantityKg.toFixed(3),
          ratePerKg: dto.ratePerKg.toFixed(2),
          commissionPerKg,
          totalAmount,
          paymentMethod: dto.paymentMethod,
          ...paymentAccountLink(dto),
          amountReceived: payment.settledAmount,
          outstandingAmount: payment.outstandingAmount,
          saleDate: new Date(dto.saleDate),
          vehicleId: dto.vehicleId,
          status: 'posted',
          notes: dto.notes,
          createdBy,
          updatedBy: createdBy,
        } as Partial<SupplySale>),
      );

      await this.inventoryService.applySaleOut(
        this.supplyDeptId,
        dto.quantityKg,
        StockMovementSourceEnum.SALE,
        sale.id,
        new Date(dto.saleDate),
        manager,
      );

      const entries: PostEntryDto[] = [
        {
          departmentId: this.supplyDeptId,
          accountCode: 'revenue',
          entryType: 'credit',
          amount: totalAmount,
          entryDate: new Date(dto.saleDate),
          sourceType: 'sale',
          sourceId: sale.id,
          createdBy,
        },
      ];
      if (payment.settledValue > 0)
        entries.push({
          departmentId: this.supplyDeptId,
          accountCode: dto.paymentMethod === 'bank' ? 'bank' : 'cash',
          ...paymentAccountLink(dto),
          entryType: 'debit',
          amount: payment.settledAmount,
          entryDate: new Date(dto.saleDate),
          sourceType: 'sale',
          sourceId: sale.id,
          createdBy,
        });
      if (payment.outstandingValue > 0)
        entries.push({
          departmentId: this.supplyDeptId,
          accountCode: 'accounts_receivable',
          partyId: dto.partyId,
          entryType: 'debit',
          amount: payment.outstandingAmount,
          entryDate: new Date(dto.saleDate),
          sourceType: 'sale',
          sourceId: sale.id,
          createdBy,
        });
      await this.ledgerService.post(entries, manager);

      return sale;
    });
    if (this.invoicesService && this.notificationsService)
      await publishBusinessDocument(
        this.invoicesService,
        this.notificationsService,
        {
          invoiceType: 'sale',
          departmentId: saved.departmentId,
          sourceType: 'sale',
          sourceId: saved.id,
          partyId: saved.partyId,
          lineItems: [
            {
              description: 'Chicken Sale',
              qty: Number(saved.quantityKg),
              unit: 'kg',
              rate: Number(saved.ratePerKg),
              amount: Number(saved.totalAmount),
            },
          ],
          subtotal: Number(saved.totalAmount),
          totalAmount: Number(saved.totalAmount),
          notes: saved.notes,
          issuedAt: new Date(saved.saleDate).toISOString(),
        },
        createdBy,
        {
          type: 'sale',
          title: 'Supply Sale Recorded',
          message: `Sale of ${saved.quantityKg}kg recorded`,
          context: {
            amount: saved.totalAmount,
            date: String(saved.saleDate),
            status: saved.status,
          },
        },
        this.logger,
      );
    return saved;
  }

  findAllSales(query: SupplyListQueryDto) {
    return this.supplyRepository.findAllSales(query);
  }

  async findSaleById(id: string) {
    const s = await this.supplyRepository.findSaleById(id);
    if (!s) throw new NotFoundException('Supply sale not found');
    return s;
  }

  updateSale(_id: string, _dto: Partial<CreateSupplySaleDto>) {
    void _id;
    void _dto;
    throw new ConflictException(
      'Posted sales cannot be overwritten; cancel and recreate the transaction',
    );
  }

  async softDeleteSale(id: string, actorId: string) {
    const saved = await this.dataSource.transaction(async (manager) => {
      const sale = await this.supplyRepository.findSaleById(id, manager);
      if (!sale) throw new NotFoundException('Supply sale not found');
      if (sale.status === 'cancelled')
        throw new ConflictException('Supply sale is already cancelled');
      await this.inventoryService.reverseSourceMovement(
        this.supplyDeptId,
        StockMovementSourceEnum.SALE,
        id,
        manager,
      );
      await this.ledgerService.reverseSource('sale', id, actorId, manager);
      return this.supplyRepository.updateSale(
        id,
        { status: 'cancelled', cancelledAt: new Date() },
        manager,
      );
    });
    if (this.notificationsService)
      await publishBusinessNotification(
        this.notificationsService,
        {
          type: 'sale',
          title: 'Transaction Cancelled',
          message: 'Supply sale was cancelled',
          recipientUserId: actorId,
          sourceType: 'sale',
          sourceId: id,
          context: {
            amount: saved.totalAmount,
            date: String(saved.saleDate),
            status: 'Cancelled',
          },
        },
        this.logger,
      );
    return saved;
  }

  async createInternalTransfer(
    dto: CreateInternalTransferDto,
    createdBy: string,
  ) {
    const saved = await this.dataSource.transaction(async (manager) => {
      await this.validateReferences(
        manager,
        undefined,
        PartyTypeEnum.SHOP_OWNER,
        dto.vehicleId,
      );
      // internal transfer
      const qty = dto.quantityKg;
      const rate = dto.internalRatePerKg;
      const totalAmount = (qty * rate).toFixed(2);

      const transfer = await manager.save(
        InternalTransfer,
        manager.create(InternalTransfer, {
          fromDepartmentId: this.supplyDeptId,
          toDepartmentId: this.shopDeptId,
          quantityKg: qty.toFixed(3),
          internalRatePerKg: rate.toFixed(2),
          totalAmount,
          settlementStatus: 'unsettled',
          amountSettled: '0',
          remainingBalance: totalAmount,
          transferDate: new Date(dto.transferDate),
          vehicleId: dto.vehicleId,
          notes: dto.notes,
          createdBy,
          updatedBy: createdBy,
        } as Partial<InternalTransfer>),
      );

      const { currentWac } = await this.inventoryService.applySaleOut(
        this.supplyDeptId,
        qty,
        StockMovementSourceEnum.INTERNAL_TRANSFER,
        transfer.id,
        new Date(dto.transferDate),
        manager,
      );

      await this.inventoryService.applyTransferIn(
        this.shopDeptId,
        qty,
        rate,
        transfer.id,
        new Date(dto.transferDate),
        manager,
        StockType.LIVE,
      );

      const cogsCost = (qty * currentWac).toFixed(2);

      await this.ledgerService.post(
        [
          // Supply side
          {
            departmentId: this.supplyDeptId,
            accountCode: 'cogs',
            entryType: 'debit',
            amount: cogsCost,
            entryDate: new Date(dto.transferDate),
            sourceType: 'internal_transfer',
            sourceId: transfer.id,
            createdBy,
          },
          {
            departmentId: this.supplyDeptId,
            accountCode: 'inventory',
            entryType: 'credit',
            amount: cogsCost,
            entryDate: new Date(dto.transferDate),
            sourceType: 'internal_transfer',
            sourceId: transfer.id,
            createdBy,
          },
          {
            departmentId: this.supplyDeptId,
            accountCode: 'revenue',
            entryType: 'credit',
            amount: totalAmount,
            entryDate: new Date(dto.transferDate),
            sourceType: 'internal_transfer',
            sourceId: transfer.id,
            createdBy,
          },
          {
            departmentId: this.supplyDeptId,
            accountCode: 'accounts_receivable',
            partyId: this.shopInternalPartyId || undefined,
            entryType: 'debit',
            amount: totalAmount,
            entryDate: new Date(dto.transferDate),
            sourceType: 'internal_transfer',
            sourceId: transfer.id,
            createdBy,
          },
          // Shop side
          {
            departmentId: this.shopDeptId,
            accountCode: 'inventory',
            entryType: 'debit',
            amount: totalAmount,
            entryDate: new Date(dto.transferDate),
            sourceType: 'internal_transfer',
            sourceId: transfer.id,
            createdBy,
          },
          {
            departmentId: this.shopDeptId,
            accountCode: 'accounts_payable',
            partyId: this.supplyInternalPartyId || undefined,
            entryType: 'credit',
            amount: totalAmount,
            entryDate: new Date(dto.transferDate),
            sourceType: 'internal_transfer',
            sourceId: transfer.id,
            createdBy,
          },
        ],
        manager,
      );

      return transfer;
    });
    if (this.invoicesService && this.notificationsService)
      await publishBusinessDocument(
        this.invoicesService,
        this.notificationsService,
        {
          invoiceType: 'transfer',
          departmentId: saved.fromDepartmentId,
          sourceType: 'internal_transfer',
          sourceId: saved.id,
          lineItems: [
            {
              description: 'Internal chicken transfer',
              qty: Number(saved.quantityKg),
              unit: 'kg',
              rate: Number(saved.internalRatePerKg),
              amount: Number(saved.totalAmount),
            },
          ],
          subtotal: Number(saved.totalAmount),
          totalAmount: Number(saved.totalAmount),
          notes: saved.notes,
          issuedAt: new Date(saved.transferDate).toISOString(),
        },
        createdBy,
        {
          type: 'transfer',
          title: 'Internal Transfer Recorded',
          message: `${saved.quantityKg}kg transferred`,
          context: {
            amount: saved.totalAmount,
            date: String(saved.transferDate),
            status: saved.settlementStatus,
          },
        },
        this.logger,
      );
    return saved;
  }

  findAllTransfers(query: TransferListQueryDto) {
    return this.supplyRepository.findAllTransfers(query);
  }

  async findTransferById(id: string) {
    const t = await this.supplyRepository.findTransferById(id);
    if (!t) throw new NotFoundException('Internal transfer not found');
    return t;
  }

  updateTransfer(_id: string, _dto: Partial<CreateInternalTransferDto>) {
    void _id;
    void _dto;
    throw new ConflictException('Posted transfers cannot be overwritten');
  }

  async settleTransfer(id: string, dto: SettleTransferDto, actorId: string) {
    const saved = await this.dataSource.transaction(async (manager) => {
      const transfer = await this.supplyRepository.findTransferById(
        id,
        manager,
        true,
      );
      if (!transfer) throw new NotFoundException('Internal transfer not found');
      if (transfer.settlementStatus === 'settled')
        throw new ConflictException(
          'Internal transfer is already fully settled',
        );
      const totalAmount = Number(transfer.totalAmount);
      const alreadySettled = Number(transfer.amountSettled);
      const newSettled = alreadySettled + dto.amount;
      if (newSettled > totalAmount)
        throw new BadRequestException(
          'Settlement amount exceeds outstanding balance',
        );
      const settlementStatus: InternalTransfer['settlementStatus'] =
        newSettled === totalAmount ? 'settled' : 'partially_settled';
      await this.ledgerService.post(
        [
          {
            departmentId: this.supplyDeptId,
            accountCode: dto.paymentMethod,
            ...paymentAccountLink(dto),
            entryType: 'debit',
            amount: dto.amount.toFixed(2),
            entryDate: new Date(dto.settlementDate),
            sourceType: 'payment',
            sourceId: transfer.id,
            createdBy: actorId,
          },
          {
            departmentId: this.supplyDeptId,
            accountCode: 'accounts_receivable',
            partyId: this.shopInternalPartyId || undefined,
            entryType: 'credit',
            amount: dto.amount.toFixed(2),
            entryDate: new Date(dto.settlementDate),
            sourceType: 'payment',
            sourceId: transfer.id,
            createdBy: actorId,
          },
        ],
        manager,
      );
      return this.supplyRepository.updateTransfer(
        id,
        {
          amountSettled: newSettled.toFixed(2),
          remainingBalance: (totalAmount - newSettled).toFixed(2),
          settlementStatus,
        },
        manager,
      );
    });
    if (this.notificationsService)
      await publishBusinessNotification(
        this.notificationsService,
        {
          type: 'payment',
          title: 'Transfer Settlement Recorded',
          message: `Settlement of Rs. ${dto.amount.toFixed(2)} recorded`,
          recipientUserId: actorId,
          sourceType: 'payment',
          sourceId: id,
          context: {
            amount: dto.amount.toFixed(2),
            date: dto.settlementDate,
            status: saved.settlementStatus,
            referenceNumber: id,
          },
        },
        this.logger,
      );
    return saved;
  }

  getStock() {
    return this.inventoryService.getBalance(this.supplyDeptId);
  }

  async createStockWriteoff(dto: any, createdBy: string) {
    if (!dto.quantityKg || !dto.writeoffDate || !dto.reason) {
      throw new BadRequestException(
        'quantityKg, writeoffDate, and reason are required',
      );
    }
    const savedWriteoff = await this.dataSource.transaction((manager) =>
      this.inventoryService.createWriteoff(
        { ...dto, departmentId: this.supplyDeptId },
        createdBy,
        manager,
      ),
    );
    if (this.invoicesService && this.notificationsService)
      await publishBusinessDocument(
        this.invoicesService,
        this.notificationsService,
        {
          invoiceType: 'writeoff',
          departmentId: savedWriteoff.departmentId,
          sourceType: 'stock_writeoff',
          sourceId: savedWriteoff.id,
          lineItems: [
            {
              description: savedWriteoff.reason,
              qty: Number(savedWriteoff.quantityKg),
              unit: 'kg',
              rate:
                Number(savedWriteoff.valuationAmount) /
                Number(savedWriteoff.quantityKg),
              amount: Number(savedWriteoff.valuationAmount),
            },
          ],
          subtotal: Number(savedWriteoff.valuationAmount),
          totalAmount: Number(savedWriteoff.valuationAmount),
          notes: savedWriteoff.note,
          issuedAt: new Date(savedWriteoff.writeoffDate).toISOString(),
        },
        createdBy,
        {
          type: 'writeoff',
          title: 'Supply Stock Write-off',
          message: `${savedWriteoff.quantityKg}kg written off`,
          context: {
            amount: savedWriteoff.valuationAmount,
            date: String(savedWriteoff.writeoffDate),
            status: 'Recorded',
          },
        },
        this.logger,
      );
    return savedWriteoff;
  }

  async getProfitLoss(from?: string, to?: string) {
    const startDate = from ? new Date(from) : new Date('1970-01-01');
    const endDate = to ? new Date(to) : new Date();

    const report = async (excludeInternal: boolean) => {
      const [revenue, cogs, operatingExpenses, payrollExpenses] =
        await Promise.all([
          this.ledgerService.sumByAccount(
            this.supplyDeptId,
            'revenue',
            startDate,
            endDate,
            'credit',
            excludeInternal ? 'internal_transfer' : undefined,
          ),
          this.sumOutboundCogs(startDate, endDate, !excludeInternal),
          this.ledgerService.sumByAccount(
            this.supplyDeptId,
            'operating_expense',
            startDate,
            endDate,
            'debit',
          ),
          this.ledgerService.sumByAccount(
            this.supplyDeptId,
            'payroll_expense',
            startDate,
            endDate,
            'debit',
          ),
        ]);

      const grossProfit = (Number(revenue) - Number(cogs)).toFixed(2);
      const netProfit = (
        Number(grossProfit) -
        Number(operatingExpenses) -
        Number(payrollExpenses)
      ).toFixed(2);
      return {
        revenue,
        cogs,
        grossProfit,
        operatingExpenses,
        payroll: payrollExpenses,
        netProfit,
      };
    };
    const [externalOnly, includingInternalTransfers] = await Promise.all([
      report(true),
      report(false),
    ]);
    return { externalOnly, includingInternalTransfers };
  }

  /**
   * Departmental P&L must expense only stock that left Supply during the
   * period. Purchase ledger entries represent inventory acquisition and are
   * unsuitable for splitting external sales from internal transfers. Each
   * immutable outbound movement stores the authoritative WAC used by the
   * inventory service at posting time.
   */
  private async sumOutboundCogs(
    from: Date,
    to: Date,
    includeInternalTransfers: boolean,
  ): Promise<string> {
    const sourceTypes = includeInternalTransfers
      ? ['sale', 'internal_transfer']
      : ['sale'];
    const result = await this.dataSource
      .getRepository(StockMovement)
      .createQueryBuilder('movement')
      .select(
        'COALESCE(SUM(CAST(movement.quantityKg AS numeric) * CAST(movement.ratePerKg AS numeric)), 0)',
        'total',
      )
      .where('movement.department_id = :departmentId', {
        departmentId: this.supplyDeptId,
      })
      .andWhere('movement.movement_date >= :from', { from })
      .andWhere('movement.movement_date <= :to', { to })
      .andWhere('movement.movement_type = :movementType', {
        movementType: 'sale_out',
      })
      .andWhere('movement.source_type IN (:...sourceTypes)', {
        sourceTypes,
      })
      .getRawOne<{ total: string }>();
    return Number(result?.total ?? 0).toFixed(2);
  }
}
