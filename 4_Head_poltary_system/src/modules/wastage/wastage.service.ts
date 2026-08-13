import {
  Injectable,
  OnModuleInit,
  NotFoundException,
  Logger,
  BadRequestException,
  Optional,
} from '@nestjs/common';
import { DataSource, EntityManager } from 'typeorm';
import { WastageRepository } from './wastage.repository';
import { DepartmentsService } from '../departments/departments.service';
import { InventoryService } from '../inventory/inventory.service';
import { LedgerService, PostEntryDto } from '../ledger/ledger.service';
import { WastagePurchase } from './entities/wastage-purchase.entity';
import { WastageSale } from './entities/wastage-sale.entity';
import {
  CreateWastagePurchaseDto,
  CreateWastageSaleDto,
} from './dto/wastage.dto';
import { InvoicesService } from '../invoices/invoices.service';
import { NotificationsService } from '../notifications/notifications.service';
import { publishBusinessDocument } from '../invoices/business-document.helper';
import { resolveTransactionPayment } from '../ledger/transaction-payment.helper';
import { StockMovementSourceEnum } from '../inventory/enums/stock-movement.enum';
import { StockWriteoffDto } from '../inventory/dto/stock-writeoff.dto';
import { Vehicle } from '../vehicles/entities/vehicle.entity';
import { paymentAccountLink } from '../accounts/dto/payment-account-selection.dto';

@Injectable()
export class WastageService implements OnModuleInit {
  private readonly logger = new Logger(WastageService.name);
  private wastageDeptId: string;

  constructor(
    private readonly wastageRepository: WastageRepository,
    private readonly departmentsService: DepartmentsService,
    private readonly inventoryService: InventoryService,
    private readonly ledgerService: LedgerService,
    private readonly dataSource: DataSource,
    @Optional() private readonly invoicesService?: InvoicesService,
    @Optional() private readonly notificationsService?: NotificationsService,
  ) {}

  async onModuleInit() {
    try {
      const dept = await this.departmentsService.findByType('WASTAGE');
      this.wastageDeptId = dept.id;
    } catch {
      this.logger.warn(
        'Wastage department not found — run `npm run seed` to initialise departments.',
      );
    }
  }

  async createPurchase(dto: CreateWastagePurchaseDto, createdBy: string) {
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

      const purchase = await manager.save(
        WastagePurchase,
        manager.create(WastagePurchase, {
          departmentId: this.wastageDeptId,
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
          notes: dto.notes,
          createdBy,
          updatedBy: createdBy,
        } as Partial<WastagePurchase>),
      );

      await this.inventoryService.applyPurchaseIn(
        this.wastageDeptId,
        dto.quantityKg,
        dto.ratePerKg,
        StockMovementSourceEnum.PURCHASE,
        purchase.id,
        new Date(dto.purchaseDate),
        manager,
      );

      const entries: PostEntryDto[] = [
        {
          departmentId: this.wastageDeptId,
          accountCode: 'cogs',
          entryType: 'debit',
          amount: totalAmount,
          entryDate: new Date(dto.purchaseDate),
          sourceType: StockMovementSourceEnum.PURCHASE,
          sourceId: purchase.id,
          createdBy,
        },
      ];
      if (payment.settledValue > 0)
        entries.push({
          departmentId: this.wastageDeptId,
          accountCode: dto.paymentMethod === 'bank' ? 'bank' : 'cash',
          ...paymentAccountLink(dto),
          entryType: 'credit',
          amount: payment.settledAmount,
          entryDate: new Date(dto.purchaseDate),
          sourceType: StockMovementSourceEnum.PURCHASE,
          sourceId: purchase.id,
          createdBy,
        });
      if (payment.outstandingValue > 0)
        entries.push({
          departmentId: this.wastageDeptId,
          accountCode: 'accounts_payable',
          partyId: dto.partyId,
          entryType: 'credit',
          amount: payment.outstandingAmount,
          entryDate: new Date(dto.purchaseDate),
          sourceType: StockMovementSourceEnum.PURCHASE,
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
          invoiceType: StockMovementSourceEnum.PURCHASE,
          departmentId: saved.departmentId,
          sourceType: StockMovementSourceEnum.PURCHASE,
          sourceId: saved.id,
          partyId: saved.partyId,
          lineItems: [
            {
              description: 'Wastage Purchase',
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
          type: StockMovementSourceEnum.PURCHASE,
          title: 'Wastage Purchase Recorded',
          message: `Purchase of ${saved.quantityKg}kg recorded`,
          context: {
            amount: saved.totalAmount,
            date: String(saved.purchaseDate),
            status: 'Posted',
          },
        },
        this.logger,
      );
    return saved;
  }

  findAllPurchases() {
    return this.wastageRepository.findAllPurchases();
  }

  async findPurchaseById(id: string) {
    const p = await this.wastageRepository.findPurchaseById(id);
    if (!p) throw new NotFoundException('Wastage purchase not found');
    return p;
  }

  updatePurchase(id: string, dto: Partial<CreateWastagePurchaseDto>) {
    return this.wastageRepository.updatePurchase(id, dto as any);
  }

  async softDeletePurchase(id: string, actorId: string) {
    return this.dataSource.transaction(async (manager) => {
      const purchase = await this.wastageRepository.findPurchaseById(id);
      if (!purchase) throw new NotFoundException('Wastage purchase not found');
      await this.inventoryService.reverseSourceMovement(
        this.wastageDeptId,
        StockMovementSourceEnum.PURCHASE,
        id,
        manager,
      );
      await this.ledgerService.reverseSource('purchase', id, actorId, manager);
      await manager.update(WastagePurchase, id, {
        deletedAt: new Date(),
        updatedBy: actorId,
      });
    });
  }

  async createSale(dto: CreateWastageSaleDto, createdBy: string) {
    const balance = await this.inventoryService.getBalance(this.wastageDeptId);
    if (parseFloat(balance.quantityKg as any) < dto.quantityKg) {
      throw new BadRequestException(
        `Insufficient stock. Available: ${balance.quantityKg}kg`,
      );
    }
    const saved = await this.dataSource.transaction(async (manager) => {
      await this.validateVehicle(dto.vehicleId, manager);
      const totalAmount = (dto.quantityKg * dto.ratePerKg).toFixed(2);
      const payment = resolveTransactionPayment({
        totalAmount,
        enteredAmount: dto.amountReceived,
        paymentMethod: dto.paymentMethod,
        ...paymentAccountLink(dto),
        partyId: dto.partyId,
        amountLabel: 'Amount received',
      });
      const sale = await manager.save(
        WastageSale,
        manager.create(WastageSale, {
          departmentId: this.wastageDeptId,
          partyId: dto.partyId,
          quantityKg: dto.quantityKg.toFixed(3),
          ratePerKg: dto.ratePerKg.toFixed(2),
          commissionPerKg: '0.00',
          totalAmount,
          paymentMethod: dto.paymentMethod,
          ...paymentAccountLink(dto),
          amountReceived: payment.settledAmount,
          outstandingAmount: payment.outstandingAmount,
          saleDate: new Date(dto.saleDate),
          vehicleId: dto.vehicleId,
          notes: dto.notes,
          createdBy,
          updatedBy: createdBy,
        } as Partial<WastageSale>),
      );

      const { currentWac } = await this.inventoryService.applySaleOut(
        this.wastageDeptId,
        dto.quantityKg,
        StockMovementSourceEnum.SALE,
        sale.id,
        new Date(dto.saleDate),
        manager,
      );

      sale.commissionPerKg = (dto.ratePerKg - currentWac).toFixed(2);
      await manager.save(WastageSale, sale);

      const entries: PostEntryDto[] = [
        {
          departmentId: this.wastageDeptId,
          accountCode: 'revenue',
          entryType: 'credit',
          amount: totalAmount,
          entryDate: new Date(dto.saleDate),
          sourceType: StockMovementSourceEnum.SALE,
          sourceId: sale.id,
          createdBy,
        },
      ];
      if (payment.settledValue > 0)
        entries.push({
          departmentId: this.wastageDeptId,
          accountCode: dto.paymentMethod === 'bank' ? 'bank' : 'cash',
          ...paymentAccountLink(dto),
          entryType: 'debit',
          amount: payment.settledAmount,
          entryDate: new Date(dto.saleDate),
          sourceType: StockMovementSourceEnum.SALE,
          sourceId: sale.id,
          createdBy,
        });
      if (payment.outstandingValue > 0)
        entries.push({
          departmentId: this.wastageDeptId,
          accountCode: 'accounts_receivable',
          partyId: dto.partyId,
          entryType: 'debit',
          amount: payment.outstandingAmount,
          entryDate: new Date(dto.saleDate),
          sourceType: StockMovementSourceEnum.SALE,
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
          invoiceType: StockMovementSourceEnum.SALE,
          departmentId: saved.departmentId,
          sourceType: StockMovementSourceEnum.SALE,
          sourceId: saved.id,
          partyId: saved.partyId,
          lineItems: [
            {
              description: 'Wastage Sale',
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
          type: StockMovementSourceEnum.SALE,
          title: 'Wastage Sale Recorded',
          message: `Sale of ${saved.quantityKg}kg recorded`,
          context: {
            amount: saved.totalAmount,
            date: String(saved.saleDate),
            status: 'Posted',
          },
        },
        this.logger,
      );
    return saved;
  }

  findAllSales() {
    return this.wastageRepository.findAllSales();
  }

  private async validateVehicle(
    vehicleId: string | undefined,
    manager: EntityManager,
  ): Promise<void> {
    if (!vehicleId) return;
    const vehicle = await manager.findOne(Vehicle, {
      where: { id: vehicleId, isActive: true },
    });
    if (!vehicle || vehicle.departmentId !== this.wastageDeptId)
      throw new BadRequestException(
        'Select an active vehicle assigned to Wastage',
      );
  }

  async findSaleById(id: string) {
    const s = await this.wastageRepository.findSaleById(id);
    if (!s) throw new NotFoundException('Wastage sale not found');
    return s;
  }

  updateSale(id: string, dto: Partial<CreateWastageSaleDto>) {
    return this.wastageRepository.updateSale(id, dto as any);
  }

  async softDeleteSale(id: string, actorId: string) {
    return this.dataSource.transaction(async (manager) => {
      const sale = await this.wastageRepository.findSaleById(id);
      if (!sale) throw new NotFoundException('Wastage sale not found');
      await this.inventoryService.reverseSourceMovement(
        this.wastageDeptId,
        StockMovementSourceEnum.SALE,
        id,
        manager,
      );
      await this.ledgerService.reverseSource('sale', id, actorId, manager);
      await manager.update(WastageSale, id, {
        deletedAt: new Date(),
        updatedBy: actorId,
      });
    });
  }

  getStock() {
    return this.inventoryService.getBalance(this.wastageDeptId);
  }

  async createStockWriteoff(dto: StockWriteoffDto, createdBy: string) {
    return this.dataSource.transaction((manager) =>
      this.inventoryService.createWriteoff(
        { ...dto, departmentId: this.wastageDeptId },
        createdBy,
        manager,
      ),
    );
  }

  async getProfitLoss(from?: string, to?: string) {
    const startDate = from ? new Date(from) : new Date('1970-01-01');
    const endDate = to ? new Date(to) : new Date();

    const [revenue, cogs, operatingExpenses, payrollExpenses] =
      await Promise.all([
        this.ledgerService.sumByAccount(
          this.wastageDeptId,
          'revenue',
          startDate,
          endDate,
          'credit',
        ),
        this.ledgerService.sumByAccount(
          this.wastageDeptId,
          'cogs',
          startDate,
          endDate,
          'debit',
        ),
        this.ledgerService.sumByAccount(
          this.wastageDeptId,
          'operating_expense',
          startDate,
          endDate,
          'debit',
        ),
        this.ledgerService.sumByAccount(
          this.wastageDeptId,
          'payroll_expense',
          startDate,
          endDate,
          'debit',
        ),
      ]);

    const grossProfit = (parseFloat(revenue) - parseFloat(cogs)).toFixed(2);
    const netProfit = (
      parseFloat(grossProfit) -
      parseFloat(operatingExpenses) -
      parseFloat(payrollExpenses)
    ).toFixed(2);

    return {
      revenue,
      cogs,
      grossProfit,
      operatingExpenses,
      payrollExpenses,
      netProfit,
    };
  }
}
