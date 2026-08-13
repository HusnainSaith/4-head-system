import {
  Injectable,
  OnModuleInit,
  NotFoundException,
  BadRequestException,
  Logger,
  Optional,
} from '@nestjs/common';
import { DataSource, EntityManager } from 'typeorm';
import { FreshChickenShopRepository } from './fresh-chicken-shop.repository';
import { DepartmentsService } from '../departments/departments.service';
import { InventoryService } from '../inventory/inventory.service';
import { LedgerService, PostEntryDto } from '../ledger/ledger.service';
import { ShopSale } from './entities/shop-sale.entity';
import { CreateShopSaleDto } from './dto/shop.dto';
import { StockWriteoffDto } from '../inventory/dto/stock-writeoff.dto';
import { InvoicesService } from '../invoices/invoices.service';
import { NotificationsService } from '../notifications/notifications.service';
import { publishBusinessDocument } from '../invoices/business-document.helper';
import { resolveTransactionPayment } from '../ledger/transaction-payment.helper';
import { StockMovementSourceEnum } from '../inventory/enums/stock-movement.enum';
import { Expense } from '../expenses/entities/expense.entity';
import { StockType } from '../inventory/enums/stock-type.enum';
import { ShopDressingBatch } from './entities/shop-dressing-batch.entity';
import { Vehicle } from '../vehicles/entities/vehicle.entity';
import { paymentAccountLink } from '../accounts/dto/payment-account-selection.dto';
import {
  CreateDressingBatchDto,
  DressingBatchQueryDto,
} from './dto/dressing-batch.dto';

@Injectable()
export class FreshChickenShopService implements OnModuleInit {
  private readonly logger = new Logger(FreshChickenShopService.name);
  private shopDeptId: string;

  constructor(
    private readonly shopRepository: FreshChickenShopRepository,
    private readonly departmentsService: DepartmentsService,
    private readonly inventoryService: InventoryService,
    private readonly ledgerService: LedgerService,
    private readonly dataSource: DataSource,
    @Optional() private readonly invoicesService?: InvoicesService,
    @Optional() private readonly notificationsService?: NotificationsService,
  ) {}

  async onModuleInit() {
    const dept = await this.departmentsService.findByType('FRESH_CHICKEN_SHOP');
    this.shopDeptId = dept.id;
  }

  async createSale(dto: CreateShopSaleDto, createdBy: string) {
    const saved = await this.dataSource.transaction(async (manager) => {
      await this.validateVehicle(dto.vehicleId, manager);
      const totalAmount = (dto.quantityKg * dto.ratePerKg).toFixed(2);
      const payment = resolveTransactionPayment({
        totalAmount,
        enteredAmount: dto.amountReceived,
        paymentMethod: dto.paymentMethod,
        ...paymentAccountLink(dto),
        partyId: dto.customerPartyId,
        amountLabel: 'Amount received',
      });
      const sale = await manager.save(
        ShopSale,
        manager.create(ShopSale, {
          departmentId: this.shopDeptId,
          customerPartyId: dto.customerPartyId,
          vehicleId: dto.vehicleId,
          quantityKg: dto.quantityKg.toFixed(3),
          ratePerKg: dto.ratePerKg.toFixed(2),
          wacAtSale: '0.0000',
          totalAmount,
          profitMarginPerKg: '0.00',
          paymentMethod: dto.paymentMethod,
          ...paymentAccountLink(dto),
          amountReceived: payment.settledAmount,
          outstandingAmount: payment.outstandingAmount,
          saleDate: new Date(dto.saleDate),
          notes: dto.notes,
          createdBy,
          updatedBy: createdBy,
        } as Partial<ShopSale>),
      );
      const { currentWac } = await this.inventoryService.applySaleOut(
        this.shopDeptId,
        dto.quantityKg,
        StockMovementSourceEnum.SALE,
        sale.id,
        new Date(dto.saleDate),
        manager,
        StockType.DRESSED,
      );

      sale.wacAtSale = currentWac.toFixed(4);
      sale.profitMarginPerKg = (dto.ratePerKg - currentWac).toFixed(2);
      await manager.save(ShopSale, sale);
      const cogsAmount = (dto.quantityKg * currentWac).toFixed(2);

      const entries: PostEntryDto[] = [
        {
          departmentId: this.shopDeptId,
          accountCode: 'revenue',
          entryType: 'credit',
          amount: totalAmount,
          entryDate: new Date(dto.saleDate),
          sourceType: StockMovementSourceEnum.SALE,
          sourceId: sale.id,
          createdBy,
        },
        {
          departmentId: this.shopDeptId,
          accountCode: 'cogs',
          entryType: 'debit',
          amount: cogsAmount,
          entryDate: new Date(dto.saleDate),
          sourceType: StockMovementSourceEnum.SALE,
          sourceId: sale.id,
          createdBy,
        },
        {
          departmentId: this.shopDeptId,
          accountCode: 'inventory',
          entryType: 'credit',
          amount: cogsAmount,
          entryDate: new Date(dto.saleDate),
          sourceType: StockMovementSourceEnum.SALE,
          sourceId: sale.id,
          createdBy,
        },
      ];
      if (payment.settledValue > 0)
        entries.push({
          departmentId: this.shopDeptId,
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
          departmentId: this.shopDeptId,
          accountCode: 'accounts_receivable',
          partyId: dto.customerPartyId,
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
          partyId: saved.customerPartyId,
          lineItems: [
            {
              description: 'Retail chicken sale',
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
          title: 'Shop Sale Recorded',
          message: `Retail sale of ${saved.quantityKg}kg dressed stock recorded`,
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

  private async validateVehicle(
    vehicleId: string | undefined,
    manager: EntityManager,
  ): Promise<void> {
    if (!vehicleId) return;
    const vehicle = await manager.findOne(Vehicle, {
      where: { id: vehicleId, isActive: true },
    });
    if (!vehicle || vehicle.departmentId !== this.shopDeptId)
      throw new BadRequestException(
        'Select an active vehicle assigned to Fresh Chicken Shop',
      );
  }

  findAllSales() {
    return this.shopRepository.findAllSales();
  }

  async findSaleById(id: string) {
    const s = await this.shopRepository.findSaleById(id);
    if (!s) throw new NotFoundException('Shop sale not found');
    return s;
  }

  updateSale(id: string, dto: Partial<CreateShopSaleDto>) {
    return this.shopRepository.updateSale(id, dto as any);
  }

  async softDeleteSale(id: string, actorId: string) {
    return this.dataSource.transaction(async (manager) => {
      const sale = await this.shopRepository.findSaleById(id);
      if (!sale) throw new NotFoundException('Shop sale not found');
      await this.inventoryService.reverseSourceMovement(
        this.shopDeptId,
        StockMovementSourceEnum.SALE,
        id,
        manager,
      );
      await this.ledgerService.reverseSource('sale', id, actorId, manager);
      const processingExpenses = await manager.find(Expense, {
        where: { sourceType: 'processing_loss', sourceId: id } as any,
      });
      for (const expense of processingExpenses) {
        await this.ledgerService.reverseSource(
          'expense',
          expense.id,
          actorId,
          manager,
        );
        await manager.update(Expense, expense.id, {
          deletedAt: new Date(),
          updatedBy: actorId,
        });
      }
      await manager.update(ShopSale, id, {
        deletedAt: new Date(),
        updatedBy: actorId,
      });
    });
  }

  getIncomingTransfers() {
    return this.shopRepository.findIncomingTransfers(this.shopDeptId);
  }

  async getStock(type?: StockType) {
    if (type && ![StockType.LIVE, StockType.DRESSED].includes(type)) {
      throw new BadRequestException('Shop stock type must be live or dressed');
    }
    if (type) return this.inventoryService.getBalance(this.shopDeptId, type);
    const [live, dressed] = await Promise.all([
      this.inventoryService.getBalance(this.shopDeptId, StockType.LIVE),
      this.inventoryService.getBalance(this.shopDeptId, StockType.DRESSED),
    ]);
    return { live, dressed };
  }

  async createStockWriteoff(dto: StockWriteoffDto, createdBy: string) {
    if (
      ![StockType.LIVE, StockType.DRESSED].includes(dto.stockType as StockType)
    ) {
      throw new BadRequestException(
        'Select live or dressed stock for Shop shrinkage',
      );
    }
    const saved = await this.dataSource.transaction((manager) =>
      this.inventoryService.createWriteoff(
        { ...dto, departmentId: this.shopDeptId },
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
          departmentId: saved.departmentId,
          sourceType: StockMovementSourceEnum.STOCK_WRITEOFF,
          sourceId: saved.id,
          lineItems: [
            {
              description: saved.reason,
              qty: Number(saved.quantityKg),
              unit: 'kg',
              rate: Number(saved.valuationAmount) / Number(saved.quantityKg),
              amount: Number(saved.valuationAmount),
            },
          ],
          subtotal: Number(saved.valuationAmount),
          totalAmount: Number(saved.valuationAmount),
          notes: saved.note,
          issuedAt: new Date(saved.writeoffDate).toISOString(),
        },
        createdBy,
        {
          type: 'writeoff',
          title: 'Shop Stock Write-off',
          message: `${saved.quantityKg}kg written off`,
          context: {
            amount: saved.valuationAmount,
            date: String(saved.writeoffDate),
            status: 'Recorded',
          },
        },
        this.logger,
      );
    return saved;
  }

  listDressingBatches(query: DressingBatchQueryDto) {
    return this.shopRepository.findBatches(
      query.from ? new Date(query.from) : undefined,
      query.to ? new Date(query.to) : undefined,
    );
  }

  async getDressingBatch(id: string) {
    const batch = await this.shopRepository.findBatchById(id);
    if (!batch) throw new NotFoundException('Dressing batch not found');
    return batch;
  }

  async createDressingBatch(dto: CreateDressingBatchDto, createdBy: string) {
    if (dto.dressedWeightKg > dto.liveWeightKg) {
      throw new BadRequestException('Dressed weight cannot exceed live weight');
    }
    return this.dataSource.transaction(async (manager) => {
      const batch = await manager.save(
        ShopDressingBatch,
        manager.create(ShopDressingBatch, {
          departmentId: this.shopDeptId,
          liveWeightKg: dto.liveWeightKg.toFixed(3),
          dressedWeightKg: dto.dressedWeightKg.toFixed(3),
          liveWacAtProcessing: '0.0000',
          dressedCostPerKg: '0.0000',
          processingLossAmount: '0.00',
          batchDate: new Date(dto.batchDate),
          notes: dto.notes,
          createdBy,
          updatedBy: createdBy,
        }),
      );
      const result = await this.inventoryService.applyDressingBatch(
        this.shopDeptId,
        dto.liveWeightKg,
        dto.dressedWeightKg,
        batch.id,
        new Date(dto.batchDate),
        createdBy,
        manager,
      );
      batch.liveWacAtProcessing = result.liveWac.toFixed(4);
      batch.dressedCostPerKg = result.liveWac.toFixed(4);
      batch.processingLossAmount = result.processingLossAmount.toFixed(2);
      return manager.save(ShopDressingBatch, batch);
    });
  }

  async updateDressingBatch(
    id: string,
    dto: Partial<CreateDressingBatchDto>,
    actorId: string,
  ) {
    const batch = await this.getDressingBatch(id);
    if (
      dto.liveWeightKg !== undefined ||
      dto.dressedWeightKg !== undefined ||
      dto.batchDate !== undefined
    ) {
      throw new BadRequestException(
        'Posted batch quantities and date are immutable; delete and recreate an unconsumed batch',
      );
    }
    await this.dataSource.getRepository(ShopDressingBatch).update(id, {
      notes: dto.notes,
      updatedBy: actorId,
    });
    return this.getDressingBatch(batch.id);
  }

  async deleteDressingBatch(id: string, actorId: string) {
    const batch = await this.getDressingBatch(id);
    await this.dataSource.transaction(async (manager) => {
      await this.inventoryService.reverseDressingBatch(
        this.shopDeptId,
        batch.id,
        actorId,
        manager,
      );
      const expenses = await manager.find(Expense, {
        where: { sourceType: 'processing_loss', sourceId: batch.id } as any,
      });
      for (const expense of expenses) {
        await this.ledgerService.reverseSource(
          'expense',
          expense.id,
          actorId,
          manager,
        );
        await manager.update(Expense, expense.id, {
          deletedAt: new Date(),
          updatedBy: actorId,
        });
      }
      await manager.update(ShopDressingBatch, batch.id, {
        deletedAt: new Date(),
        updatedBy: actorId,
      });
    });
    return { success: true };
  }

  async getProcessingYield(query: DressingBatchQueryDto) {
    const batches = await this.listDressingBatches(query);
    const liveWeightKg = batches.reduce(
      (sum, item) => sum + Number(item.liveWeightKg),
      0,
    );
    const dressedWeightKg = batches.reduce(
      (sum, item) => sum + Number(item.dressedWeightKg),
      0,
    );
    const processingLossAmount = batches.reduce(
      (sum, item) => sum + Number(item.processingLossAmount),
      0,
    );
    return {
      liveWeightKg: liveWeightKg.toFixed(3),
      dressedWeightKg: dressedWeightKg.toFixed(3),
      shrinkageKg: (liveWeightKg - dressedWeightKg).toFixed(3),
      yieldPercentage:
        liveWeightKg === 0
          ? '0.00'
          : ((dressedWeightKg / liveWeightKg) * 100).toFixed(2),
      processingLossAmount: processingLossAmount.toFixed(2),
      batchCount: batches.length,
    };
  }

  async getProfitLoss(from?: string, to?: string) {
    const startDate = from ? new Date(from) : new Date('1970-01-01');
    const endDate = to ? new Date(to) : new Date();

    const [revenue, cogs, operatingExpenses, payrollExpenses] =
      await Promise.all([
        this.ledgerService.sumByAccount(
          this.shopDeptId,
          'revenue',
          startDate,
          endDate,
          'credit',
        ),
        this.ledgerService.sumByAccount(
          this.shopDeptId,
          'cogs',
          startDate,
          endDate,
          'debit',
        ),
        this.ledgerService.sumByAccount(
          this.shopDeptId,
          'operating_expense',
          startDate,
          endDate,
          'debit',
        ),
        this.ledgerService.sumByAccount(
          this.shopDeptId,
          'payroll_expense',
          startDate,
          endDate,
          'debit',
        ),
      ]);

    const netProfit = (
      parseFloat(revenue) -
      parseFloat(cogs) -
      parseFloat(operatingExpenses) -
      parseFloat(payrollExpenses)
    ).toFixed(2);

    return { revenue, cogs, operatingExpenses, payrollExpenses, netProfit };
  }
}
