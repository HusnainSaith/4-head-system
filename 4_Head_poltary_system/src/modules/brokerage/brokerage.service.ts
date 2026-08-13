import {
  Injectable,
  OnModuleInit,
  BadRequestException,
  ConflictException,
  NotFoundException,
  Logger,
  Optional,
} from '@nestjs/common';
import { DataSource, EntityManager } from 'typeorm';
import { BrokerageRepository } from './brokerage.repository';
import {
  CreateBrokeragePurchaseDto,
  CreateBrokerageSaleDto,
  ListBrokeragePurchasesQueryDto,
  ListBrokerageSalesQueryDto,
} from './dto/brokerage.dto';
import { DepartmentsService } from '../departments/departments.service';
import { InventoryService } from '../inventory/inventory.service';
import { LedgerService, PostEntryDto } from '../ledger/ledger.service';
import { ExpensesService } from '../expenses/expenses.service';
import { StockMovementSourceEnum } from '../inventory/enums/stock-movement.enum';
import { BrokeragePurchase } from './entities/brokerage-purchase.entity';
import { BrokeragePurchaseStatus } from './entities/brokerage-purchase.entity';
import {
  BrokerageSale,
  BrokerageSaleDestination,
  BrokerageSaleStatus,
} from './entities/brokerage-sale.entity';
import { InvoicesService } from '../invoices/invoices.service';
import { NotificationsService } from '../notifications/notifications.service';
import { publishBusinessDocument } from '../invoices/business-document.helper';
import { resolveTransactionPayment } from '../ledger/transaction-payment.helper';
import { SupplyPurchase } from '../supply/entities/supply-purchase.entity';
import { Party } from '../parties/entities/party.entity';
import { paymentAccountLink } from '../accounts/dto/payment-account-selection.dto';
import { Vehicle } from '../vehicles/entities/vehicle.entity';
import {
  InvestmentAssignment,
  InvestmentAssignmentStatus,
} from '../investments/entities/investment-assignment.entity';

@Injectable()
export class BrokerageService implements OnModuleInit {
  private readonly logger = new Logger(BrokerageService.name);
  private brokerageDepartmentId: string;
  private supplyDepartmentId: string;

  constructor(
    private readonly brokerageRepository: BrokerageRepository,
    private readonly departmentsService: DepartmentsService,
    private readonly inventoryService: InventoryService,
    private readonly ledgerService: LedgerService,
    private readonly dataSource: DataSource,
    private readonly expensesService?: ExpensesService,
    @Optional() private readonly invoicesService?: InvoicesService,
    @Optional() private readonly notificationsService?: NotificationsService,
  ) {}

  async onModuleInit() {
    try {
      const [brokerage, supply] = await Promise.all([
        this.departmentsService.findByType('BROKERAGE'),
        this.departmentsService.findByType('SUPPLY'),
      ]);
      this.brokerageDepartmentId = brokerage.id;
      this.supplyDepartmentId = supply.id;
    } catch {
      this.logger.warn(
        'Brokerage department not found — run `npm run seed` to initialise departments.',
      );
    }
  }

  private async requireInternalParty(
    manager: EntityManager,
    representedDepartmentId: string,
  ): Promise<Party> {
    const party = await manager.findOne(Party, {
      where: { linkedDepartmentId: representedDepartmentId },
    });
    if (!party) {
      throw new ConflictException(
        'Internal department parties are missing. Run the database seed before recording this transfer.',
      );
    }
    return party;
  }

  private ensureBrokerageDepartment() {
    if (!this.brokerageDepartmentId) {
      throw new Error(
        'Brokerage department not initialised. Run `npm run seed` first.',
      );
    }
  }

  private async validateVehicle(
    vehicleId: string | undefined,
    manager: EntityManager,
  ): Promise<void> {
    if (!vehicleId) return;
    const vehicle = await manager.findOne(Vehicle, {
      where: { id: vehicleId, isActive: true },
    });
    if (!vehicle || vehicle.departmentId !== this.brokerageDepartmentId)
      throw new BadRequestException(
        'Select an active vehicle assigned to Brokerage',
      );
  }

  async createPurchase(dto: CreateBrokeragePurchaseDto, createdBy: string) {
    this.ensureBrokerageDepartment();
    const saved = await this.dataSource.transaction(async (manager) => {
      await this.validateVehicle(dto.vehicleId, manager);
      const totalAmount = (dto.quantityKg * dto.ratePerKg).toFixed(2);
      const payment = resolveTransactionPayment({
        totalAmount,
        enteredAmount: dto.amountPaid,
        paymentMethod: dto.paymentMethod,
        ...paymentAccountLink(dto),
        partyId: dto.partyId,
        amountLabel: 'Amount paid',
      });
      const purchase = manager.create(BrokeragePurchase, {
        departmentId: this.brokerageDepartmentId,
        partyId: dto.partyId,
        vehicleId: dto.vehicleId,
        quantityKg: dto.quantityKg.toFixed(3),
        ratePerKg: dto.ratePerKg.toFixed(2),
        totalAmount,
        amountPaid: payment.settledAmount,
        outstandingAmount: payment.outstandingAmount,
        paymentMethod: dto.paymentMethod,
        ...paymentAccountLink(dto),
        purchaseDate: new Date(dto.purchaseDate),
        description: dto.description,
        createdBy,
        updatedBy: createdBy,
      } as Partial<BrokeragePurchase>);

      const savedPurchase = await manager.save(BrokeragePurchase, purchase);

      await this.inventoryService.applyPurchaseIn(
        this.brokerageDepartmentId,
        dto.quantityKg,
        dto.ratePerKg,
        StockMovementSourceEnum.PURCHASE,
        savedPurchase.id,
        new Date(dto.purchaseDate),
        manager,
      );

      const entries: PostEntryDto[] = [
        {
          departmentId: this.brokerageDepartmentId,
          accountCode: 'cogs',
          entryType: 'debit',
          amount: totalAmount,
          entryDate: new Date(dto.purchaseDate),
          sourceType: StockMovementSourceEnum.PURCHASE,
          sourceId: savedPurchase.id,
          description: `Brokerage purchase ${savedPurchase.id}`,
          createdBy,
        },
      ];
      if (payment.settledValue > 0)
        entries.push({
          departmentId: this.brokerageDepartmentId,
          accountCode: dto.paymentMethod === 'bank' ? 'bank' : 'cash',
          ...paymentAccountLink(dto),
          entryType: 'credit',
          amount: payment.settledAmount,
          entryDate: new Date(dto.purchaseDate),
          sourceType: StockMovementSourceEnum.PURCHASE,
          sourceId: savedPurchase.id,
          description: `Brokerage purchase payment ${savedPurchase.id}`,
          createdBy,
        });
      if (payment.outstandingValue > 0)
        entries.push({
          departmentId: this.brokerageDepartmentId,
          accountCode: 'accounts_payable',
          partyId: dto.partyId,
          entryType: 'credit',
          amount: payment.outstandingAmount,
          entryDate: new Date(dto.purchaseDate),
          sourceType: StockMovementSourceEnum.PURCHASE,
          sourceId: savedPurchase.id,
          description: `Brokerage purchase payable ${savedPurchase.id}`,
          createdBy,
        });
      await this.ledgerService.post(entries, manager);

      return savedPurchase;
    });
    if (this.invoicesService && this.notificationsService)
      await publishBusinessDocument(
        this.invoicesService,
        this.notificationsService,
        {
          invoiceType: StockMovementSourceEnum.PURCHASE,
          departmentId: saved.departmentId,
          sourceType: StockMovementSourceEnum.PURCHASE,
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
          notes: saved.description,
          issuedAt: new Date(saved.purchaseDate).toISOString(),
        },
        createdBy,
        {
          type: StockMovementSourceEnum.PURCHASE,
          title: 'Brokerage Purchase Recorded',
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

  async findAllPurchases(
    query: ListBrokeragePurchasesQueryDto = new ListBrokeragePurchasesQueryDto(),
  ) {
    return this.brokerageRepository.findAllPurchasesPaginated(query);
  }

  async findPurchaseById(id: string) {
    const purchase = await this.brokerageRepository.findPurchaseById(id);
    if (!purchase) {
      throw new NotFoundException('Brokerage purchase not found');
    }
    return purchase;
  }

  async updatePurchase(id: string, dto: Partial<CreateBrokeragePurchaseDto>) {
    return this.brokerageRepository.updatePurchase(id, {
      ...dto,
      quantityKg: dto.quantityKg?.toFixed(3),
      ratePerKg: dto.ratePerKg?.toFixed(2),
    } as any);
  }

  async deletePurchase(id: string, actorId: string) {
    return this.dataSource.transaction(async (manager) => {
      const purchase = await manager.findOne(BrokeragePurchase, {
        where: { id },
        lock: { mode: 'pessimistic_write' },
      });
      if (!purchase)
        throw new NotFoundException('Brokerage purchase not found');
      if (purchase.status === 'cancelled')
        throw new BadRequestException(
          'Brokerage purchase is already cancelled',
        );
      const investment = await manager.findOne(InvestmentAssignment, {
        where: [
          { purchaseId: id, status: InvestmentAssignmentStatus.ACTIVE },
          { purchaseId: id, status: InvestmentAssignmentStatus.SETTLED },
        ],
      });
      if (investment)
        throw new BadRequestException(
          'Cancel the linked investment assignment before cancelling this purchase',
        );
      await this.inventoryService.reverseSourceMovement(
        this.brokerageDepartmentId,
        StockMovementSourceEnum.PURCHASE,
        id,
        manager,
      );
      await this.ledgerService.reverseSource('purchase', id, actorId, manager);
      await manager.update(BrokeragePurchase, id, {
        status: BrokeragePurchaseStatus.CANCELLED,
        cancelledAt: new Date(),
        cancelledBy: actorId,
        updatedBy: actorId,
      });
    });
  }

  async createSale(dto: CreateBrokerageSaleDto, createdBy: string) {
    this.ensureBrokerageDepartment();
    const saved = await this.dataSource.transaction(async (manager) => {
      await this.validateVehicle(dto.vehicleId, manager);
      const isSupplyTransfer =
        dto.destinationType === BrokerageSaleDestination.SUPPLY;
      const [supplyParty, brokerageParty] = isSupplyTransfer
        ? await Promise.all([
            this.requireInternalParty(manager, this.supplyDepartmentId),
            this.requireInternalParty(manager, this.brokerageDepartmentId),
          ])
        : [undefined, undefined];
      const totalAmount = (dto.quantityKg * dto.ratePerKg).toFixed(2);
      const payment = resolveTransactionPayment({
        totalAmount,
        enteredAmount: dto.amountReceived,
        paymentMethod: dto.paymentMethod,
        ...paymentAccountLink(dto),
        partyId: isSupplyTransfer ? supplyParty?.id : dto.partyId,
        amountLabel: 'Amount received',
      });

      // Save the sale first so we have its ID for the stock movement
      const sale = manager.create(BrokerageSale, {
        departmentId: this.brokerageDepartmentId,
        partyId: isSupplyTransfer ? supplyParty?.id : dto.partyId,
        vehicleId: dto.vehicleId,
        quantityKg: dto.quantityKg.toFixed(3),
        ratePerKg: dto.ratePerKg.toFixed(2),
        totalAmount,
        amountReceived: payment.settledAmount,
        outstandingAmount: payment.outstandingAmount,
        commissionPerKg: '0',
        commissionAmount: '0',
        paymentMethod: dto.paymentMethod,
        ...paymentAccountLink(dto),
        destinationType:
          dto.destinationType ?? BrokerageSaleDestination.EXTERNAL,
        saleDate: new Date(dto.saleDate),
        description: dto.description,
        createdBy,
        updatedBy: createdBy,
      } as Partial<BrokerageSale>);

      const savedSale = await manager.save(BrokerageSale, sale);

      const { currentWac } = await this.inventoryService.applySaleOut(
        this.brokerageDepartmentId,
        dto.quantityKg,
        StockMovementSourceEnum.SALE,
        savedSale.id,
        new Date(dto.saleDate),
        manager,
      );

      const commission_per_kg = (dto.ratePerKg - currentWac).toFixed(2);
      const commissionAmount = (
        parseFloat(commission_per_kg) * dto.quantityKg
      ).toFixed(2);

      savedSale.commissionPerKg = commission_per_kg;
      savedSale.commissionAmount = commissionAmount;
      await manager.save(BrokerageSale, savedSale);

      const entries: PostEntryDto[] = [
        {
          departmentId: this.brokerageDepartmentId,
          accountCode: 'revenue',
          entryType: 'credit',
          amount: totalAmount,
          entryDate: new Date(dto.saleDate),
          sourceType: StockMovementSourceEnum.SALE,
          sourceId: savedSale.id,
          description: `Brokerage sale revenue ${savedSale.id}`,
          createdBy,
        },
      ];
      if (payment.settledValue > 0)
        entries.push({
          departmentId: this.brokerageDepartmentId,
          accountCode: dto.paymentMethod === 'bank' ? 'bank' : 'cash',
          ...paymentAccountLink(dto),
          entryType: 'debit',
          amount: payment.settledAmount,
          entryDate: new Date(dto.saleDate),
          sourceType: StockMovementSourceEnum.SALE,
          sourceId: savedSale.id,
          description: `Brokerage sale receipt ${savedSale.id}`,
          createdBy,
        });
      if (payment.outstandingValue > 0)
        entries.push({
          departmentId: this.brokerageDepartmentId,
          accountCode: 'accounts_receivable',
          partyId: savedSale.partyId,
          entryType: 'debit',
          amount: payment.outstandingAmount,
          entryDate: new Date(dto.saleDate),
          sourceType: StockMovementSourceEnum.SALE,
          sourceId: savedSale.id,
          description: `Brokerage sale receivable ${savedSale.id}`,
          createdBy,
        });
      await this.ledgerService.post(entries, manager);

      if (isSupplyTransfer) {
        const supplyPurchase = await manager.save(
          SupplyPurchase,
          manager.create(SupplyPurchase, {
            departmentId: this.supplyDepartmentId,
            partyId: brokerageParty?.id,
            quantityKg: dto.quantityKg.toFixed(3),
            ratePerKg: dto.ratePerKg.toFixed(2),
            totalAmount,
            paymentMethod: dto.paymentMethod,
            amountPaid: payment.settledAmount,
            outstandingAmount: payment.outstandingAmount,
            purchaseDate: new Date(dto.saleDate),
            vehicleId: dto.vehicleId,
            status: 'posted',
            notes:
              dto.description ??
              `Automatically received from Brokerage sale ${savedSale.id}`,
            sourceBrokerageSaleId: savedSale.id,
            createdBy,
            updatedBy: createdBy,
          } as Partial<SupplyPurchase>),
        );

        await this.inventoryService.applyPurchaseIn(
          this.supplyDepartmentId,
          dto.quantityKg,
          dto.ratePerKg,
          StockMovementSourceEnum.INTERNAL_TRANSFER,
          supplyPurchase.id,
          new Date(dto.saleDate),
          manager,
        );
        const supplyEntries: PostEntryDto[] = [
          {
            departmentId: this.supplyDepartmentId,
            accountCode: 'inventory',
            entryType: 'debit',
            amount: totalAmount,
            entryDate: new Date(dto.saleDate),
            sourceType: 'internal_transfer',
            sourceId: supplyPurchase.id,
            description: `Inventory received from Brokerage sale ${savedSale.id}`,
            createdBy,
          },
        ];
        if (payment.settledValue > 0)
          supplyEntries.push({
            departmentId: this.supplyDepartmentId,
            accountCode: dto.paymentMethod === 'bank' ? 'bank' : 'cash',
            ...paymentAccountLink(dto),
            entryType: 'credit',
            amount: payment.settledAmount,
            entryDate: new Date(dto.saleDate),
            sourceType: 'internal_transfer',
            sourceId: supplyPurchase.id,
            description: `Payment to Brokerage for sale ${savedSale.id}`,
            createdBy,
          });
        if (payment.outstandingValue > 0)
          supplyEntries.push({
            departmentId: this.supplyDepartmentId,
            accountCode: 'accounts_payable',
            partyId: brokerageParty?.id,
            entryType: 'credit',
            amount: payment.outstandingAmount,
            entryDate: new Date(dto.saleDate),
            sourceType: 'internal_transfer',
            sourceId: supplyPurchase.id,
            description: `Payable for Brokerage sale ${savedSale.id}`,
            createdBy,
          });
        await this.ledgerService.post(supplyEntries, manager);
      }

      return savedSale;
    });
    if (this.invoicesService && this.notificationsService)
      await publishBusinessDocument(
        this.invoicesService,
        this.notificationsService,
        {
          invoiceType: StockMovementSourceEnum.SALE,
          departmentId: saved.departmentId,
          sourceType: StockMovementSourceEnum.SALE,
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
          notes: saved.description,
          issuedAt: new Date(saved.saleDate).toISOString(),
        },
        createdBy,
        {
          type: StockMovementSourceEnum.SALE,
          title: 'Brokerage Sale Recorded',
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

  async findAllSales(
    query: ListBrokerageSalesQueryDto = new ListBrokerageSalesQueryDto(),
  ) {
    return this.brokerageRepository.findAllSalesPaginated(query);
  }

  async findSaleById(id: string) {
    const sale = await this.brokerageRepository.findSaleById(id);
    if (!sale) {
      throw new NotFoundException('Brokerage sale not found');
    }
    return sale;
  }

  async updateSale(id: string, dto: Partial<CreateBrokerageSaleDto>) {
    const sale = await this.findSaleById(id);
    if (sale.destinationType === BrokerageSaleDestination.SUPPLY)
      throw new ConflictException(
        'A posted Brokerage-to-Supply transfer cannot be edited; cancel and recreate it',
      );
    return this.brokerageRepository.updateSale(id, {
      ...dto,
      quantityKg: dto.quantityKg?.toFixed(3),
      ratePerKg: dto.ratePerKg?.toFixed(2),
    } as any);
  }

  async deleteSale(id: string, actorId: string) {
    return this.dataSource.transaction(async (manager) => {
      const sale = await manager.findOne(BrokerageSale, { where: { id } });
      if (!sale) throw new NotFoundException('Brokerage sale not found');
      if (sale.status === 'cancelled')
        throw new BadRequestException('Brokerage sale is already cancelled');
      const mirroredPurchase = await manager.findOne(SupplyPurchase, {
        where: { sourceBrokerageSaleId: id },
      });
      if (mirroredPurchase && mirroredPurchase.status !== 'cancelled') {
        await this.inventoryService.reverseSourceMovement(
          this.supplyDepartmentId,
          StockMovementSourceEnum.INTERNAL_TRANSFER,
          mirroredPurchase.id,
          manager,
        );
        await this.ledgerService.reverseSource(
          'internal_transfer',
          mirroredPurchase.id,
          actorId,
          manager,
        );
        await manager.update(SupplyPurchase, mirroredPurchase.id, {
          status: 'cancelled',
          cancelledAt: new Date(),
          cancelledBy: actorId,
          updatedBy: actorId,
        });
      }
      await this.inventoryService.reverseSourceMovement(
        this.brokerageDepartmentId,
        StockMovementSourceEnum.SALE,
        id,
        manager,
      );
      await this.ledgerService.reverseSource('sale', id, actorId, manager);
      await manager.update(BrokerageSale, id, {
        status: BrokerageSaleStatus.CANCELLED,
        cancelledAt: new Date(),
        cancelledBy: actorId,
        updatedBy: actorId,
      });
    });
  }

  async getStock() {
    this.ensureBrokerageDepartment();
    return this.inventoryService.getBalance(this.brokerageDepartmentId);
  }

  async createStockWriteoff(dto: Partial<any>, createdBy: string) {
    this.ensureBrokerageDepartment();
    if (!dto.quantityKg || !dto.writeoffDate || !dto.reason) {
      throw new BadRequestException(
        'quantityKg, writeoffDate, and reason are required',
      );
    }
    const savedWriteoff = await this.dataSource.transaction((manager) =>
      this.inventoryService.createWriteoff(
        { ...dto, departmentId: this.brokerageDepartmentId },
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
          sourceType: StockMovementSourceEnum.STOCK_WRITEOFF,
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
          title: 'Brokerage Stock Write-off',
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
    this.ensureBrokerageDepartment();
    const startDate = from ? new Date(from) : new Date('1970-01-01');
    const endDate = to ? new Date(to) : new Date();

    const revenue = await this.ledgerService.sumByAccount(
      this.brokerageDepartmentId,
      'revenue',
      startDate,
      endDate,
      'credit',
    );
    const cogs = await this.ledgerService.sumByAccount(
      this.brokerageDepartmentId,
      'cogs',
      startDate,
      endDate,
      'debit',
    );
    const operatingExpenses = await this.ledgerService.sumByAccount(
      this.brokerageDepartmentId,
      'operating_expense',
      startDate,
      endDate,
      'debit',
    );
    const payrollExpenses = await this.ledgerService.sumByAccount(
      this.brokerageDepartmentId,
      'payroll_expense',
      startDate,
      endDate,
      'debit',
    );

    const netProfit = (
      parseFloat(revenue) -
      parseFloat(cogs) -
      parseFloat(operatingExpenses) -
      parseFloat(payrollExpenses)
    ).toFixed(2);

    return {
      revenue,
      cogs,
      operatingExpenses,
      payrollExpenses,
      netProfit,
    };
  }
}
